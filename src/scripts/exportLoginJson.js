/**
 * Convert the Techverse roster workbook into the JSON files that
 * `src/scripts/seedLoginJson.js` seeds into MongoDB.
 *
 * Usage:
 *   npm run export:logins
 *   npm run export:logins -- "path/to/roster.xlsx"
 *
 * Output (`src/data/logins/`):
 *   students/<CODE>.json   one file per department, students carry their year
 *                          of study and their batch range ("2025 - 2029")
 *   faculty.json           teaching staff without an HOD designation
 *   hod.json               rows whose designation says HOD
 *   admin.json             the ADMIN sheet
 *   index.json             counts, warnings and generation metadata
 *
 * Class data is deliberately absent. A student is located by department +
 * year + batch range, so no Class document, classId, semester or section is
 * written anywhere.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";

import {
  ALL_DEPARTMENTS,
  emailFromRegisterNumber,
  getDepartmentMeta,
  normalizeCourseCode,
  parseBatchYear,
  parseRegisterNumber,
  resolveCurrentAcademicYear,
  yearOfStudyFromBatch,
} from "../data/departments.js";
import { parseDateOfBirth } from "../utils/dateOfBirth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_EXCEL_PATH = path.resolve(
  __dirname,
  "../../../New folder/Techverse student and faculty data  (1).xlsx"
);
const OUTPUT_DIR = path.resolve(__dirname, "../data/logins");
const STUDENTS_DIR = path.join(OUTPUT_DIR, "students");

const ROMAN_TO_NUMBER = { I: 1, II: 2, III: 3, IV: 4 };

/**
 * Sections of the STAFFS sheet that are not teaching departments: their rows
 * have no academic department to be attached to and are reported as skipped.
 */
const EXCLUDED_STAFF_SECTIONS = new Set([
  "Non Teaching",
  "Library",
  "Placement",
  "Physical Education",
  "COE",
  "Administrative Office",
  "General Office",
]);

/**
 * Section heading -> department code. The sheet uses its own spellings
 * ("Civil", "AI & DS", "CSE (Cyber Security)") that do not always match the
 * register-number grammar, so the mapping is stated rather than inferred.
 * `null` means the section belongs to nobody in particular (the Principal).
 */
const STAFF_SECTION_TO_DEPARTMENT = {
  Mathematics: "SH",
  Physics: "SH",
  Chemistry: "SH",
  English: "SH",
  Tamil: "SH",
  "Gl. Engg.": "SH",
  "Students Councellsor": "SH",
  BME: "BME",
  Civil: "CIVIL",
  CSE: "CSE",
  "CSE (AIML)": "AIML",
  "CSE (Cyber Security)": "CYS",
  EEE: "EEE",
  ECE: "ECE",
  MECH: "MECH",
  MDE: "MDE",
  IT: "IT",
  "AI & DS": "AI&DS",
  MBA: "MBA",
  "(none)": null,
};

const KNOWN_STAFF_SECTIONS = new Set([
  ...Object.keys(STAFF_SECTION_TO_DEPARTMENT),
  ...EXCLUDED_STAFF_SECTIONS,
]);

function pad(value) {
  return String(value).padStart(2, "0");
}

/**
 * Read an Excel date cell (serial number, Date or `dd/mm/yyyy` text) into a
 * `YYYY-MM-DD` string. Returns null for anything that is not a real past
 * calendar date, so a bad birthday is reported instead of stored.
 */
function readDateOfBirth(value) {
  let candidate = null;

  if (value instanceof Date) {
    candidate = `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(
      value.getUTCDate()
    )}`;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      candidate = `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
    }
  } else if (value !== null && value !== undefined && String(value).trim() !== "") {
    const text = String(value).trim();
    const dayFirst = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (dayFirst) {
      candidate = `${dayFirst[3]}-${pad(dayFirst[2])}-${pad(dayFirst[1])}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      candidate = text;
    }
  }

  if (!candidate) return null;

  const date = parseDateOfBirth(candidate);
  if (!date || date.getTime() > Date.now()) return null;
  return candidate;
}

/**
 * Normalise the free-text designation used across the STAFFS sheet
 * ("AP/CSE", "ASP / Maths", "Prof. & HOD - BME", "Prof. & Coordinator").
 */
function normalizeDesignation(raw) {
  const designation = String(raw || "").trim();
  if (!designation) return "Assistant Professor";
  if (/\bHOD\b|Head of/i.test(designation)) return "Head of the Department (HOD)";
  if (/principal/i.test(designation)) return "Principal";
  if (/dean/i.test(designation)) return "Dean";
  if (/\basst\.?\s+professor|\bassistant\s+professor/i.test(designation)) {
    return "Assistant Professor";
  }
  if (/prof/i.test(designation)) return "Professor";
  if (/\basp\b/i.test(designation)) return "Assistant Professor";
  if (/\bap\b/i.test(designation)) return "Assistant Professor";
  if (/lectur/i.test(designation)) return "Lecturer";
  return designation;
}

function readStudents(workbook, warnings) {
  const sheet = workbook.Sheets.STUDENT;
  if (!sheet) throw new Error("Sheet 'STUDENT' not found in the workbook.");

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const academicYear = resolveCurrentAcademicYear();
  const students = [];
  const seen = new Set();
  let currentYear = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const firstCell = String(row[0] ?? "").trim();
    const yearHeader = firstCell.match(/^(I|II|III|IV)\s*YEAR/i);
    if (yearHeader) {
      currentYear = ROMAN_TO_NUMBER[yearHeader[1].toUpperCase()];
      continue;
    }

    const registerNumber = String(row[1] ?? "").trim().toUpperCase();
    if (!registerNumber) continue;

    const parsedRegister = parseRegisterNumber(registerNumber);
    if (!parsedRegister) {
      if (registerNumber.startsWith("7329")) {
        warnings.push(`row ${i + 1}: unreadable register number "${registerNumber}" - skipped`);
      }
      continue;
    }

    if (seen.has(registerNumber)) {
      warnings.push(`row ${i + 1}: duplicate register number ${registerNumber} - skipped`);
      continue;
    }
    seen.add(registerNumber);

    const name = String(row[2] ?? "").trim();
    if (!name) {
      warnings.push(`row ${i + 1}: ${registerNumber} has no name - skipped`);
      continue;
    }

    const dateOfBirth = readDateOfBirth(row[3]);
    if (!dateOfBirth) {
      warnings.push(`row ${i + 1}: ${registerNumber} has no readable date of birth`);
    }

    const rawBatch = String(row[4] ?? "").trim();
    const batch = parseBatchYear(rawBatch);
    if (!batch && rawBatch) {
      warnings.push(`row ${i + 1}: ${registerNumber} has unreadable batch "${rawBatch}"`);
    }

    const courseFullname = String(row[5] ?? "").trim();
    const shortName = String(row[6] ?? "").trim();
    const courseCode =
      normalizeCourseCode(shortName) ||
      normalizeCourseCode(courseFullname) ||
      parsedRegister.departmentCode ||
      "CSE";
    const department = getDepartmentMeta(courseCode);

    const derived = yearOfStudyFromBatch(batch?.startYear, academicYear);
    const year = currentYear ?? derived.year;

    if (currentYear && batch?.startYear && derived.year !== currentYear) {
      warnings.push(
        `row ${i + 1}: ${registerNumber} sits under the ${currentYear}${ordinalSuffix(
          currentYear
        )} Year heading but batch ${rawBatch} reads as year ${derived.year} - using the heading`
      );
    }

    students.push({
      registerNumber,
      name,
      email: emailFromRegisterNumber(registerNumber),
      dateOfBirth,
      year,
      batch: batch?.label ?? rawBatch ?? null,
      batchStartYear: batch?.startYear ?? null,
      batchEndYear: batch?.endYear ?? null,
      courseCode,
      courseName: department?.name || courseFullname || courseCode,
      departmentCode: courseCode,
    });
  }

  students.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.batch !== b.batch) return String(a.batch).localeCompare(String(b.batch));
    return a.registerNumber.localeCompare(b.registerNumber);
  });

  return students;
}

function ordinalSuffix(year) {
  return { 1: "st", 2: "nd", 3: "rd", 4: "th" }[year] || "th";
}

function readStaff(workbook, warnings) {
  const sheet = workbook.Sheets.STAFFS;
  if (!sheet) throw new Error("Sheet 'STAFFS' not found in the workbook.");

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const faculty = [];
  const hods = [];
  const skipped = { noStaffId: 0, nonTeaching: 0 };
  const seen = new Set();
  let section = "(none)";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const col0 = String(row[0] ?? "").trim();
    const col1 = String(row[1] ?? "").trim();
    const col3 = String(row[3] ?? "").trim().toUpperCase();

    if (col3 === "") {
      if (!col1) {
        // Section/title heading sitting alone in column A ("Placement").
        if (col0 && KNOWN_STAFF_SECTIONS.has(col0)) section = col0;
        continue;
      }
      if (!col0) {
        // Section heading sitting in column B ("Mathematics").
        if (KNOWN_STAFF_SECTIONS.has(col1)) section = col1;
        continue;
      }
      // A named row with a serial number but no staff ID.
      skipped.noStaffId += 1;
      continue;
    }

    if (col3 === "STAFF ID") continue;

    const name = col1;
    if (!name) continue;

    if (EXCLUDED_STAFF_SECTIONS.has(section)) {
      skipped.nonTeaching += 1;
      continue;
    }

    if (seen.has(col3)) {
      warnings.push(`row ${i + 1}: duplicate staff ID ${col3} - skipped`);
      continue;
    }
    seen.add(col3);

    const rawDesignation = String(row[2] ?? "").trim();
    const rawPassword = String(row[4] ?? "").trim();
    const isHod = /\bHOD\b|Head of/i.test(rawDesignation);
    const departmentCode = STAFF_SECTION_TO_DEPARTMENT[section] ?? null;

    const record = {
      name,
      staffId: col3,
      email: `${col3.toLowerCase()}@vcet.ac.in`,
      designation: normalizeDesignation(rawDesignation),
      sourceDesignation: rawDesignation,
      section,
      departmentCode,
      isActive: true,
    };
    if (rawPassword) record.password = rawPassword;

    (isHod ? hods : faculty).push(record);
  }

  const sorter = (a, b) =>
    String(a.departmentCode || "ZZ").localeCompare(String(b.departmentCode || "ZZ")) ||
    a.staffId.localeCompare(b.staffId);

  faculty.sort(sorter);
  hods.sort(sorter);

  return { faculty, hods, skipped };
}

function readAdmins(workbook, warnings) {
  const sheet = workbook.Sheets.ADMIN;
  if (!sheet) {
    warnings.push("Sheet 'ADMIN' not found - no admin records exported");
    return [];
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const admins = [];

  for (let i = 1; i < rows.length; i++) {
    const name = String(rows[i][0] ?? "").trim();
    const password = String(rows[i][1] ?? "").trim();
    if (!name) continue;
    if (!password) {
      warnings.push(`ADMIN row ${i + 1}: "${name}" has no password - skipped`);
      continue;
    }

    const username = name.toLowerCase().replace(/[^a-z0-9._-]/g, "");
    admins.push({
      name,
      username,
      email: `${username}@vcet.ac.in`,
      password,
    });
  }

  return admins;
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function exportLoginJson(excelPath = DEFAULT_EXCEL_PATH) {
  const resolvedPath = path.resolve(excelPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Excel file not found at: ${resolvedPath}`);
  }

  console.log(`Reading workbook: ${resolvedPath}`);
  const workbook = xlsx.readFile(resolvedPath);
  console.log(`Sheets: ${workbook.SheetNames.join(", ")}`);

  const warnings = [];
  const students = readStudents(workbook, warnings);
  const { faculty, hods, skipped } = readStaff(workbook, warnings);
  const admins = readAdmins(workbook, warnings);

  // Fresh output tree so departments that disappear from the workbook do not
  // leave stale JSON files behind.
  fs.rmSync(STUDENTS_DIR, { recursive: true, force: true });
  fs.mkdirSync(STUDENTS_DIR, { recursive: true });

  const byDepartment = new Map();
  for (const student of students) {
    if (!byDepartment.has(student.departmentCode)) byDepartment.set(student.departmentCode, []);
    byDepartment.get(student.departmentCode).push(student);
  }

  const departmentFiles = [];
  for (const [code, entries] of [...byDepartment.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const fileName = `${code.replace(/[^A-Za-z&0-9_-]/g, "_")}.json`;
    writeJson(path.join(STUDENTS_DIR, fileName), entries);
    departmentFiles.push({ code, file: `students/${fileName}`, count: entries.length });
  }

  writeJson(path.join(OUTPUT_DIR, "faculty.json"), faculty);
  writeJson(path.join(OUTPUT_DIR, "hod.json"), hods);
  writeJson(path.join(OUTPUT_DIR, "admin.json"), admins);

  const hodlessDepartments = [
    ...new Set(faculty.map((member) => member.departmentCode).filter(Boolean)),
  ]
    .filter((code) => !hods.some((hod) => hod.departmentCode === code))
    .sort();
  if (hodlessDepartments.length) {
    warnings.push(
      `the roster names no HOD for: ${hodlessDepartments.join(", ")} - ` +
        `those departments seed without an HOD login`
    );
  }

  const index = {
    generatedAt: new Date().toISOString(),
    source: path.basename(resolvedPath),
    academicYear: resolveCurrentAcademicYear(),
    passwords: {
      student: "the student's own date of birth (YYYY-MM-DD)",
      staff: "vcet@2026",
      admin: "the password in the ADMIN sheet",
    },
    counts: {
      students: students.length,
      faculty: faculty.length,
      hod: hods.length,
      admin: admins.length,
      studentsByDepartment: Object.fromEntries(
        departmentFiles.map((entry) => [entry.code, entry.count])
      ),
    },
    departments: departmentFiles,
    skippedRows: {
      staffWithoutStaffId: skipped.noStaffId,
      nonTeachingStaff: skipped.nonTeaching,
    },
    warnings,
  };
  writeJson(path.join(OUTPUT_DIR, "index.json"), index);

  console.log("");
  console.log(`Students  : ${students.length} across ${departmentFiles.length} departments`);
  for (const entry of departmentFiles) {
    console.log(`  ${entry.code.padEnd(6)} ${String(entry.count).padStart(4)}  ${entry.file}`);
  }
  console.log(`Faculty   : ${faculty.length}`);
  console.log(`HOD       : ${hods.length}`);
  console.log(`Admin     : ${admins.length}`);
  console.log(
    `Skipped   : ${skipped.nonTeaching} non-teaching/support staff, ` +
      `${skipped.noStaffId} rows without a staff ID`
  );
  console.log(`Warnings  : ${warnings.length}`);
  for (const warning of warnings.slice(0, 20)) console.log(`  ${warning}`);
  if (warnings.length > 20) console.log(`  ... and ${warnings.length - 20} more`);
  console.log("");
  console.log(`Written to ${OUTPUT_DIR}`);
  console.log(
    "Credentials: students sign in with their date of birth, staff with " +
      "vcet@2026, admin with the password in the ADMIN sheet."
  );

  return index;
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith("exportLoginJson.js");
if (isDirectRun) {
  try {
    exportLoginJson(process.argv[2] || DEFAULT_EXCEL_PATH);
  } catch (error) {
    console.error(`Export failed: ${error.message}`);
    process.exit(1);
  }
}
