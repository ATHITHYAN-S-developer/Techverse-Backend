/**
 * Import the student roster from `src/data/studentRoster.csv` into MongoDB.
 *
 *   npm run import:students                 # upsert, never destroys data
 *   npm run import:students -- --dry-run    # parse + report only, no writes
 *   npm run import:students -- --file path/to/other-batch.csv
 *
 * The script is idempotent: every student is upserted on the *full* register
 * number, so re-running it after adding a new batch only inserts the new rows
 * and refreshes the profile fields of existing ones. Passwords and gamification
 * aggregates already present on a user are never touched.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

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
  parseDateOfBirth,
  checkDateOfBirthPlausibility,
  parseRegisterNumber,
  parseYearOfStudy,
  resolveCurrentAcademicYear,
  romanizeYear,
  yearOfStudyFromBatch,
} from "../data/departments.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");
const DEFAULT_ROSTER = path.join(DATA_DIR, "studentRoster.csv");
const DEFAULT_PASSWORD = "vcet@2026";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const fileFlagIndex = argv.findIndex((arg) => arg === "--file" || arg === "-f");
const explicitFiles =
  fileFlagIndex !== -1 && argv[fileFlagIndex + 1] ? [argv[fileFlagIndex + 1]] : null;

/**
 * By default every roster in `src/data` is imported: the main roster plus any
 * `studentRoster.*.csv` supplement (for example an earlier intake that predates
 * the current one). Duplicate register numbers across files are reported and
 * the first occurrence wins, so ordering is deterministic.
 */
function resolveRosterFiles() {
  if (explicitFiles) {
    return explicitFiles.map((file) => path.resolve(process.cwd(), file));
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((name) => /^studentRoster.*\.csv$/i.test(name))
    .sort((a, b) => {
      if (a === "studentRoster.csv") return -1;
      if (b === "studentRoster.csv") return 1;
      return a.localeCompare(b);
    })
    .map((name) => path.join(DATA_DIR, name));

  return files.length > 0 ? files : [DEFAULT_ROSTER];
}

const rosterFiles = resolveRosterFiles();
const academicYearFlagIndex = argv.indexOf("--academic-year");
const ACADEMIC_YEAR =
  academicYearFlagIndex !== -1 && argv[academicYearFlagIndex + 1]
    ? Number(argv[academicYearFlagIndex + 1])
    : resolveCurrentAcademicYear();

/** Minimal RFC 4180 parser - handles quoted fields, escaped quotes and CRLF. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim() !== ""));
}

const WARNING_LIMIT = 20;

/**
 * Compare only the fields the import owns. `dateOfBirth` is optional, so a
 * roster row with an unreadable DOB is compared against `null`.
 */
function profileMatches(before, profile) {
  const keys = Object.keys(profile);
  return keys.every((key) => {
    const expected = profile[key];
    const actual = before[key];

    if (expected instanceof Date) {
      return actual instanceof Date && actual.getTime() === expected.getTime();
    }
    if (expected === null || expected === undefined) return actual == null;
    if (actual === null || actual === undefined) return false;

    if (expected?._id) return String(expected._id) === String(actual?._id ?? actual);
    return String(expected) === String(actual);
  });
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

/** Parse one roster file into normalised student records, collecting warnings. */
function readRosterFile(file, { seen, students, warnings }) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const body = rows.slice(1);

  const column = {
    registerNumber: header.indexOf("registernumber"),
    name: header.indexOf("name"),
    dateOfBirth: header.indexOf("dateofbirth"),
    batchYear: header.indexOf("batchyear"),
    courseCode: header.indexOf("coursecode"),
    // Optional overrides: when a roster states the year of study explicitly it
    // wins over the value derived from the batch range.
    year: header.indexOf("year"),
    semester: header.indexOf("semester"),
  };

  const required = ["registerNumber", "name", "batchYear", "courseCode"];
  const missing = required.filter((key) => column[key] === -1);
  if (missing.length > 0) {
    throw new Error(
      `${path.basename(file)} is missing required column(s): ${missing.join(", ")}. ` +
        `Found: ${header.join(", ")}`
    );
  }

  console.log(`Parsed ${body.length} roster rows from ${path.basename(file)}`);
  console.log("");

  let used = 0;
  body.forEach((cells, index) => {
    const line = index + 2; // +1 for the header, +1 for 1-based lines
    const where = `${path.basename(file)}:${line}`;
    const registerNumber = String(cells[column.registerNumber] || "").trim().toUpperCase();
    const name = String(cells[column.name] || "").trim();
    const rawDob = String(cells[column.dateOfBirth] || "").trim();
    const rawBatch = String(cells[column.batchYear] || "").trim();
    const rawCourse = String(cells[column.courseCode] || "").trim();

    if (!registerNumber) {
      warnings.push({ where, registerNumber, reason: "missing register number - row skipped" });
      return;
    }
    if (!name) {
      warnings.push({ where, registerNumber, reason: "missing name - row skipped" });
      return;
    }
    if (seen.has(registerNumber)) {
      warnings.push({
        where,
        registerNumber,
        reason: "duplicate register number (already seen in an earlier file) - row skipped",
      });
      return;
    }
    seen.add(registerNumber);

    const parsedRegister = parseRegisterNumber(registerNumber);
    if (!parsedRegister) {
      warnings.push({
        where,
        registerNumber,
        reason: "unrecognised register number format - row skipped",
      });
      return;
    }

    const courseCode = normalizeCourseCode(rawCourse) || parsedRegister.departmentCode;
    if (!courseCode || !getDepartmentMeta(courseCode)) {
      warnings.push({
        where,
        registerNumber,
        reason: `unknown course "${rawCourse}" - row skipped`,
      });
      return;
    }

    if (courseCode !== parsedRegister.departmentCode && parsedRegister.departmentCode) {
      warnings.push({
        where,
        registerNumber,
        reason: `course column "${courseCode}" does not match register-number branch "${parsedRegister.departmentCode}"; using the course column`,
      });
    }

    const dateOfBirth = parseDateOfBirth(rawDob);
    if (!dateOfBirth && rawDob) {
      warnings.push({
        where,
        registerNumber,
        reason: `date of birth "${rawDob}" is not a valid past date - student imported without a DOB`,
      });
    }

    const batch = parseBatchYear(rawBatch);
    if (!batch && rawBatch) {
      warnings.push({ where, registerNumber, reason: `unreadable batch year "${rawBatch}"` });
    }

    // Warn-only: a birthday that is impossible for the cohort is still imported
    // so the roster stays the source of truth, but it is reported for review.
    const dobConcern = checkDateOfBirthPlausibility(dateOfBirth, batch?.startYear);
    if (dobConcern) {
      warnings.push({
        where,
        registerNumber,
        reason: `date of birth "${rawDob}" is ${dobConcern} - imported as supplied, please verify`,
      });
    }

    const derived = yearOfStudyFromBatch(batch?.startYear, ACADEMIC_YEAR);
    const explicitYear =
      column.year !== -1 ? parseYearOfStudy(String(cells[column.year] || "").trim()) : null;
    const rawSemester =
      column.semester !== -1 ? Number(String(cells[column.semester] || "").trim()) : NaN;

    const year = explicitYear ?? derived.year;
    const semester =
      Number.isFinite(rawSemester) && rawSemester >= 1 && rawSemester <= 8
        ? rawSemester
        : derived.semester;

    students.push({
      registerNumber,
      name,
      email: emailFromRegisterNumber(registerNumber),
      dateOfBirth,
      courseCode,
      courseName: getDepartmentMeta(courseCode).name,
      batchStartYear: batch?.startYear ?? null,
      batchEndYear: batch?.endYear ?? null,
      batchLabel: batch?.label ?? rawBatch,
      year,
      semester,
      section: parsedRegister.section,
    });
    used += 1;
  });

  return used;
}

async function main() {
  console.log(`Rosters: ${rosterFiles.map((f) => path.basename(f)).join(", ")}`);
  console.log(`Mode   : ${dryRun ? "DRY RUN (no writes)" : "UPSERT"}`);
  console.log(`Academic year: ${ACADEMIC_YEAR}`);
  console.log("");

  for (const file of rosterFiles) {
    if (!fs.existsSync(file)) throw new Error(`Roster file not found: ${file}`);
  }

  // ---- Validate + normalise ------------------------------------------------
  const warnings = [];
  const seen = new Set();
  const students = [];
  let rowsRead = 0;

  for (const file of rosterFiles) {
    const read = readRosterFile(file, { seen, students, warnings });
    rowsRead += read;
  }

  const skipped = rowsRead - students.length;
  console.log(`Usable  : ${students.length} students (${skipped} skipped)`);
  console.log("");

  const byCourse = new Map();
  for (const student of students) {
    byCourse.set(student.courseCode, (byCourse.get(student.courseCode) || 0) + 1);
  }
  const branches = [...byCourse.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`Branches: ${branches.length}`);
  for (const [code, count] of branches) {
    console.log(`  ${code.padEnd(6)} ${String(count).padStart(4)}`);
  }
  console.log("");

  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length}`);
    for (const warning of warnings.slice(0, WARNING_LIMIT)) {
      console.log(`  ${warning.where} ${warning.registerNumber || "-"}: ${warning.reason}`);
    }
    if (warnings.length > WARNING_LIMIT) {
      console.log(`  ... and ${warnings.length - WARNING_LIMIT} more`);
    }
    console.log("");
  }

  if (dryRun) {
    console.log("Dry run complete - database untouched.");
    return;
  }

  // ---- Persist ------------------------------------------------------------
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Could not connect to MongoDB - nothing was written.");
  }

  const departmentMap = await upsertDepartments(students.map((s) => s.courseCode));
  console.log(`Departments: ${departmentMap.size} ensured`);

  const classCache = new Map();
  const results = { inserted: 0, updated: 0, unchanged: 0, failed: 0 };

  for (const student of students) {
    try {
      const departmentDoc = departmentMap.get(student.courseCode);
      if (!departmentDoc) {
        results.failed += 1;
        continue;
      }

      const classKey = `${departmentDoc._id}|${student.year}|${student.semester}|${student.section}`;
      if (!classCache.has(classKey)) {
        classCache.set(
          classKey,
          await upsertClass(departmentDoc, student.year, student.semester, student.section)
        );
      }
      const classDoc = classCache.get(classKey);

      const profile = {
        name: student.name,
        email: student.email,
        role: "student",
        departmentId: departmentDoc._id,
        classId: classDoc._id,
        year: student.year,
        semester: student.semester,
        section: student.section,
        courseCode: student.courseCode,
        courseName: student.courseName,
        batchStartYear: student.batchStartYear,
        batchEndYear: student.batchEndYear,
        isActive: true,
      };
      if (student.dateOfBirth) profile.dateOfBirth = student.dateOfBirth;

      const before = await User.findOne({ registerNumber: student.registerNumber })
        .select(
          "role name email dateOfBirth courseCode courseName departmentId classId year semester section batchStartYear batchEndYear isActive"
        )
        .lean();

      await User.findOneAndUpdate(
        { registerNumber: student.registerNumber },
        {
          $set: profile,
          // Credentials are only seeded on first insert; an existing password
          // (possibly changed by the student) is preserved.
          $setOnInsert: { password: DEFAULT_PASSWORD },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (!before) {
        results.inserted += 1;
      } else if (profileMatches(before, profile)) {
        results.unchanged += 1;
      } else {
        results.updated += 1;
      }
    } catch (error) {
      results.failed += 1;
      console.error(`  ! ${student.registerNumber}: ${error.message}`);
    }
  }

  console.log(`Classes    : ${classCache.size} ensured`);
  console.log(
    `Imported   : ${results.inserted} new, ${results.updated} updated, ` +
      `${results.unchanged} unchanged, ${results.failed} failed`
  );

  const totalStudents = await User.countDocuments({ role: "student" });
  const activeStudents = await User.countDocuments({ role: "student", isActive: true });
  console.log(`Total students in DB: ${totalStudents} (${activeStudents} active)`);

  await mongoose.disconnect();
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(`\nImport failed: ${error.message}`);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(1);
  });

export { DEPARTMENT_CATALOG };
