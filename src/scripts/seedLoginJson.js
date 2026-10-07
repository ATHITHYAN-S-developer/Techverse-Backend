/**
 * Seed MongoDB with the login records produced by `npm run export:logins`.
 *
 * Usage:
 *   npm run seed:logins
 *   npm run seed:logins -- --dry-run
 *   npm run seed:logins -- --only students,faculty
 *
 * What it does:
 *   - upserts every department (catalogued ones plus the staff-only CYS and
 *     SH) so `departmentId` always resolves
 *   - upserts into the `users` collection only - that is the single collection
 *     `authController` reads at login
 *   - never creates a Class document and strips any stale classId/semester/
 *     section from existing students: a student is identified by department,
 *     year and batch range instead
 *   - stores each student's password as their own date of birth (the roster is
 *     the source of truth for it), and the admin password from the ADMIN sheet;
 *     staff get `vcet@2026` on insert only, so re-running never overwrites a
 *     password someone has already changed
 */

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

import { connectDB } from "../config/db.js";
import { ALL_DEPARTMENTS } from "../data/departments.js";
import { Department } from "../models/Department.js";
import { User } from "../models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGIN_DIR = path.resolve(__dirname, "../data/logins");
const STUDENTS_DIR = path.join(LOGIN_DIR, "students");
/** Password given to staff who have never been seeded before. */
const STAFF_DEFAULT_PASSWORD = "vcet@2026";

const SECTIONS = ["departments", "students", "faculty", "hod", "admin"];

function parseArgs(argv) {
  const args = { dryRun: false, only: null };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--only" || arg.startsWith("--only=")) {
      const value = arg.includes("=")
        ? arg.slice(arg.indexOf("=") + 1)
        : (argv[i + 1] || "").startsWith("--")
          ? ""
          : argv[++i];
      args.only = new Set(
        value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      );
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const unknown = args.only
    ? [...args.only].filter((entry) => !SECTIONS.includes(entry))
    : [];
  if (unknown.length) {
    throw new Error(
      `Unknown section(s): ${unknown.join(", ")}. Valid: ${SECTIONS.join(", ")}`
    );
  }

  return args;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readStudentRecords() {
  if (!fs.existsSync(STUDENTS_DIR)) return [];
  return fs
    .readdirSync(STUDENTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .flatMap((file) => readJson(path.join(STUDENTS_DIR, file)));
}

function describeResult(result, errors) {
  const created = (result.upsertedCount || 0) + (result.insertedCount || 0);
  const updated = result.modifiedCount || 0;
  const unchanged = (result.matchedCount || 0) - updated;
  return `created ${created}, updated ${updated}, already current ${unchanged}` +
    (errors.length ? `, ${errors.length} failed` : "");
}

function printErrors(errors) {
  for (const error of errors.slice(0, 10)) {
    console.error(`  ✗ ${error.message}`);
  }
  if (errors.length > 10) {
    console.error(`  ... and ${errors.length - 10} more`);
  }
}

async function seedDepartments() {
  let created = 0;
  let updated = 0;

  for (const department of ALL_DEPARTMENTS) {
    const result = await Department.updateOne(
      { code: department.code },
      {
        $set: {
          name: department.name,
          color: department.color,
          isActive: true,
        },
        $setOnInsert: {
          icon: department.icon,
          description: department.description,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount) created += 1;
    else if (result.modifiedCount) updated += 1;
  }

  const departmentMap = new Map(
    (await Department.find({}).lean()).map((doc) => [doc.code, doc._id])
  );

  console.log(
    `Departments: created ${created}, updated ${updated}, unchanged ${
      ALL_DEPARTMENTS.length - created - updated
    }`
  );
  return departmentMap;
}

async function runBulk(operations) {
  if (!operations.length) return { result: null, errors: [] };
  try {
    const result = await User.bulkWrite(operations, { ordered: false });
    return { result, errors: [] };
  } catch (error) {
    // bulkWrite reports per-operation failures in `writeErrors` while still
    // applying every other operation because we asked for ordered:false.
    const errors = error.writeErrors
      ? error.writeErrors.map((entry) => entry.err)
      : [{ message: error.message }];
    return { result: error.result, errors };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const enabled = (section) => !args.only || args.only.has(section);

  const indexPath = path.join(LOGIN_DIR, "index.json");
  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `${indexPath} not found - run \`npm run export:logins\` first`
    );
  }
  const index = readJson(indexPath);

  const students = readStudentRecords();
  const faculty = readJson(path.join(LOGIN_DIR, "faculty.json"));
  const hods = readJson(path.join(LOGIN_DIR, "hod.json"));
  const admins = readJson(path.join(LOGIN_DIR, "admin.json"));

  console.log(`Source: ${index.source || LOGIN_DIR}`);
  console.log(
    `Planned: ${students.length} students, ${faculty.length} faculty, ` +
      `${hods.length} hod, ${admins.length} admin` +
      (args.dryRun ? " (dry run - nothing written)" : "")
  );
  if (args.only) console.log(`Sections: ${[...args.only].join(", ")}`);

  if (args.dryRun) {
    if (enabled("departments")) {
      console.log(`Departments: would upsert ${ALL_DEPARTMENTS.length} records`);
    }
    console.log("\nDry run complete - no database writes were made.");
    return;
  }

  const conn = await connectDB();
  if (!conn) throw new Error("Could not connect to MongoDB.");

  try {
    let departmentMap = new Map();
    if (enabled("departments")) {
      departmentMap = await seedDepartments();
    } else {
      departmentMap = new Map(
        (await Department.find({}).lean()).map((doc) => [doc.code, doc._id])
      );
    }

    if (enabled("students")) {
      const operations = students.map((student) => {
        const departmentId = departmentMap.get(student.departmentCode);
        const document = {
          role: "student",
          name: student.name,
          email: student.email,
          registerNumber: student.registerNumber,
          departmentId,
          departmentCode: student.departmentCode,
          courseCode: student.courseCode,
          courseName: student.courseName,
          year: student.year,
          batchStartYear: student.batchStartYear,
          batchEndYear: student.batchEndYear,
          isActive: true,
        };
        if (student.dateOfBirth) {
          document.dateOfBirth = new Date(`${student.dateOfBirth}T00:00:00.000Z`);
          // A student signs in with their date of birth, so that is exactly
          // what the stored password holds - in the same ISO form the login
          // form sends. It is mirrored from the roster on every run, just
          // like the date of birth itself.
          document.password = student.dateOfBirth;
        }

        const update = {
          $set: document,
          $unset: { classId: "", semester: "", section: "" },
        };
        if (!student.dateOfBirth) {
          update.$setOnInsert = { password: STAFF_DEFAULT_PASSWORD };
        }

        return {
          updateOne: {
            filter: { registerNumber: student.registerNumber },
            update,
            upsert: true,
          },
        };
      });

      const { result, errors } = await runBulk(operations);
      console.log(`Students  : ${result ? describeResult(result, errors) : "0 records"}`);
      printErrors(errors);
    }

    for (const [section, records, role] of [
      ["faculty", faculty, "faculty"],
      ["hod", hods, "hod"],
    ]) {
      if (!enabled(section)) continue;

      const operations = records.map((member) => ({
        updateOne: {
          filter: { staffId: member.staffId },
          update: {
            $set: {
              role,
              name: member.name,
              email: member.email,
              staffId: member.staffId,
              designation: member.designation,
              departmentId: departmentMap.get(member.departmentCode) ?? null,
              departmentCode: member.departmentCode,
              isActive: true,
            },
            $setOnInsert: { password: STAFF_DEFAULT_PASSWORD },
          },
          upsert: true,
        },
      }));

      const { result, errors } = await runBulk(operations);
      console.log(
        `${role === "hod" ? "HOD      " : "Faculty  "}: ${result ? describeResult(result, errors) : "0 records"}`
      );
      printErrors(errors);
    }

    if (enabled("admin")) {
      const operations = admins.map((admin) => ({
        updateOne: {
          filter: { username: admin.username },
          update: {
            $set: {
              role: "admin",
              name: admin.name,
              username: admin.username,
              email: admin.email,
              password: admin.password,
              isActive: true,
            },
          },
          upsert: true,
        },
      }));

      const { result, errors } = await runBulk(operations);
      console.log(`Admin     : ${result ? describeResult(result, errors) : "0 records"}`);
      printErrors(errors);
    }

    const summary = await Promise.all(
      ["student", "faculty", "hod", "admin"].map((role) =>
        User.countDocuments({ role })
      )
    );
    const [studentCount, facultyCount, hodCount, adminCount] = summary;
    const classLinked = await User.countDocuments({
      role: "student",
      classId: { $exists: true },
    });

    console.log("");
    console.log(`users collection now holds:`);
    console.log(`  students ${studentCount}`);
    console.log(`  faculty  ${facultyCount}`);
    console.log(`  hod      ${hodCount}`);
    console.log(`  admin    ${adminCount}`);
    console.log(`  students still carrying a classId: ${classLinked}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(`\nSeed failed: ${error.message}`);
    process.exit(1);
  }
);
