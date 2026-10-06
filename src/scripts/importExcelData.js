/**
 * Import student and faculty data from Excel spreadsheet into MongoDB.
 *
 * Usage:
 *   node src/scripts/importExcelData.js
 *   npm run import:excel
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import xlsx from "xlsx";

import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { Class } from "../models/Class.js";
import {
  DEPARTMENT_CATALOG,
  emailFromRegisterNumber,
  getDepartmentColor,
  getDepartmentMeta,
  normalizeCourseCode,
  parseBatchYear,
  parseRegisterNumber,
  romanizeYear,
} from "../data/departments.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_EXCEL_PATH = path.resolve(
  __dirname,
  "../../../Techverse student and faculty data  (1).xlsx"
);
const DEFAULT_PASSWORD = "student123";

/**
 * Convert Excel serial date or string to UTC midnight Date.
 */
function parseExcelDob(rawDob) {
  if (!rawDob) return null;
  if (typeof rawDob === "number") {
    try {
      const parsed = xlsx.SSF.parse_date_code(rawDob);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
      }
    } catch {
      // Fallback
    }
  }

  const str = String(rawDob).trim();
  const match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }

  return null;
}

async function upsertDepartments(codes) {
  const map = new Map();

  for (const code of codes) {
    const meta = getDepartmentMeta(code);
    if (!meta) continue;

    const existing = await Department.findOneAndUpdate(
      { code: meta.code },
      {
        $set: {
          name: meta.name,
          color: getDepartmentColor(meta.code),
          isActive: true,
        },
        $setOnInsert: { icon: meta.icon, description: meta.description },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    map.set(meta.code, existing);
  }

  return map;
}

async function upsertClass(departmentDoc, year, semester, section) {
  const className = `${romanizeYear(year)} ${departmentDoc.code} - ${section}`;

  return Class.findOneAndUpdate(
    {
      departmentId: departmentDoc._id,
      year,
      semester,
      section,
    },
    {
      $set: { className, isActive: true },
      $setOnInsert: { classAdvisor: "" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function importFromExcel(filePath = DEFAULT_EXCEL_PATH) {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Excel file not found at: ${resolvedPath}`);
  }

  console.log(`📊 Reading Excel file: ${resolvedPath}`);
  const workbook = xlsx.readFile(resolvedPath);
  console.log(`Sheets found: ${workbook.SheetNames.join(", ")}`);

  // ---- 1. Parse STUDENT sheet ----
  const studentSheet = workbook.Sheets["STUDENT"];
  if (!studentSheet) {
    throw new Error("Sheet 'STUDENT' not found in Excel workbook.");
  }

  const rows = xlsx.utils.sheet_to_json(studentSheet, { header: 1 });
  console.log(`Total rows in STUDENT sheet: ${rows.length}`);

  let currentYear = 2; // Default to year 2 if unspecified
  const parsedStudents = [];
  const seenRegisterNos = new Set();
  const departmentCodes = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const r0 = String(row[0] || "").trim();
    const r1 = String(row[1] || "").trim().toUpperCase();

    // Check for Year section header
    if (/IV\s*YEAR/i.test(r0)) {
      currentYear = 4;
      continue;
    } else if (/III\s*YEAR/i.test(r0)) {
      currentYear = 3;
      continue;
    } else if (/II\s*YEAR/i.test(r0)) {
      currentYear = 2;
      continue;
    } else if (/I\s*YEAR/i.test(r0)) {
      currentYear = 1;
      continue;
    }

    // Skip column headers or rows without valid register number
    if (!r1.startsWith("7329")) continue;

    const registerNumber = r1;
    if (seenRegisterNos.has(registerNumber)) continue;
    seenRegisterNos.add(registerNumber);

    const parsedReg = parseRegisterNumber(registerNumber);
    const name = String(row[2] || "").trim();
    const rawDob = row[3];
    const rawBatch = String(row[4] || "").trim();
    const courseFullname = String(row[5] || "").trim();
    const shortName = String(row[6] || "").trim();

    const courseCode =
      normalizeCourseCode(shortName) ||
      normalizeCourseCode(courseFullname) ||
      parsedReg?.departmentCode ||
      "CSE";

    departmentCodes.add(courseCode);

    const dateOfBirth = parseExcelDob(rawDob);
    const batch = parseBatchYear(rawBatch);

    const year = currentYear;
    // Map year to odd semester (Fall/Odd term: 1->1, 2->3, 3->5, 4->7)
    const semester = Math.min(Math.max((year - 1) * 2 + 1, 1), 8);
    const section = parsedReg?.section || "A";

    parsedStudents.push({
      registerNumber,
      name: name || `Student ${registerNumber}`,
      email: emailFromRegisterNumber(registerNumber),
      dateOfBirth,
      courseCode,
      courseName: courseFullname || getDepartmentMeta(courseCode)?.name || courseCode,
      batchStartYear: batch?.startYear ?? null,
      batchEndYear: batch?.endYear ?? null,
      batchLabel: batch?.label ?? rawBatch,
      year,
      semester,
      section,
    });
  }

  console.log(`Parsed ${parsedStudents.length} unique student records.`);

  // Connect to DB if not connected
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  // Ensure Departments
  console.log("🏫 Ensuring departments in MongoDB...");
  const deptMap = await upsertDepartments([...departmentCodes]);
  console.log(`✅ ${deptMap.size} departments verified.`);

  // Ensure Classes
  console.log("👥 Ensuring classes in MongoDB...");
  const classCache = new Map();
  for (const s of parsedStudents) {
    const deptDoc = deptMap.get(s.courseCode);
    if (!deptDoc) continue;
    const classKey = `${deptDoc._id}_${s.year}_${s.semester}_${s.section}`;
    if (!classCache.has(classKey)) {
      const cls = await upsertClass(deptDoc, s.year, s.semester, s.section);
      classCache.set(classKey, cls);
    }
  }
  console.log(`✅ ${classCache.size} classes verified.`);

  // Bulk Upsert Students
  console.log("💾 Upserting students into MongoDB in chunks...");
  const CHUNK_SIZE = 500;
  let totalUpserted = 0;

  for (let i = 0; i < parsedStudents.length; i += CHUNK_SIZE) {
    const chunk = parsedStudents.slice(i, i + CHUNK_SIZE);
    const ops = chunk.map((student) => {
      const deptDoc = deptMap.get(student.courseCode);
      const classKey = `${deptDoc?._id}_${student.year}_${student.semester}_${student.section}`;
      const classDoc = classCache.get(classKey);

      const setFields = {
        name: student.name,
        email: student.email,
        role: "student",
        departmentId: deptDoc?._id,
        classId: classDoc?._id,
        year: student.year,
        semester: student.semester,
        section: student.section,
        courseCode: student.courseCode,
        courseName: student.courseName,
        batchStartYear: student.batchStartYear,
        batchEndYear: student.batchEndYear,
        isActive: true,
      };

      if (student.dateOfBirth) {
        setFields.dateOfBirth = student.dateOfBirth;
      }

      return {
        updateOne: {
          filter: { registerNumber: student.registerNumber },
          update: {
            $set: setFields,
            $setOnInsert: {
              password: DEFAULT_PASSWORD,
              points: { totalPoints: 0, level: 1, rank: 1 },
              streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null, freezeCount: 0 },
            },
          },
          upsert: true,
        },
      };
    });

    const res = await User.bulkWrite(ops, { ordered: false });
    totalUpserted += (res.upsertedCount || 0) + (res.modifiedCount || 0) + (res.matchedCount || 0);
    console.log(`  Processed batch ${Math.min(i + CHUNK_SIZE, parsedStudents.length)} / ${parsedStudents.length}...`);
  }

  console.log(`🎉 Student import complete! Total handled: ${totalUpserted}`);

  // ---- 2. Parse STAFFS sheet (if any non-empty rows) ----
  const staffSheet = workbook.Sheets["STAFFS"];
  if (staffSheet) {
    const staffRows = xlsx.utils.sheet_to_json(staffSheet, { header: 1 });
    let staffCount = 0;
    for (let i = 1; i < staffRows.length; i++) {
      const row = staffRows[i];
      if (!row || row.length === 0) continue;
      const name = String(row[1] || "").trim();
      const deptName = String(row[2] || "").trim();
      const staffId = String(row[3] || "").trim().toUpperCase();
      const password = String(row[4] || "").trim() || "faculty123";

      if (!staffId || !name) continue;

      const normDept = normalizeCourseCode(deptName) || "CSE";
      const deptDoc = deptMap.get(normDept);
      const isHod = staffId.includes("104") || staffId.includes("HOD") || /HOD/i.test(name);

      await User.findOneAndUpdate(
        { staffId },
        {
          $set: {
            name,
            email: `${staffId.toLowerCase()}@vcet.ac.in`,
            role: isHod ? "hod" : "faculty",
            departmentId: deptDoc?._id,
            designation: isHod ? "Head of the Department (HOD)" : "Assistant Professor",
            isActive: true,
          },
          $setOnInsert: { password },
        },
        { upsert: true, new: true }
      );
      staffCount++;
    }
    if (staffCount > 0) {
      console.log(`👨‍🏫 Upserted ${staffCount} faculty/staff members from STAFFS sheet.`);
    }
  }

  // Summary counts
  const totalStudents = await User.countDocuments({ role: "student" });
  const totalFaculty = await User.countDocuments({ role: { $in: ["faculty", "teacher", "hod"] } });
  console.log(`\n📊 Database Totals:`);
  console.log(`  Total Students : ${totalStudents}`);
  console.log(`  Total Faculty  : ${totalFaculty}`);

  return { totalStudents, totalFaculty, importedStudents: parsedStudents.length };
}

// Auto-run if called directly
const isDirectRun = process.argv[1] && process.argv[1].endsWith("importExcelData.js");
if (isDirectRun) {
  const customPath = process.argv[2] || DEFAULT_EXCEL_PATH;
  importFromExcel(customPath)
    .then(async () => {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB. Done!");
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ Error importing Excel data:", err);
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      process.exit(1);
    });
}
