/**
 * Canonical department catalog for VCET and the register-number grammar.
 *
 * Register numbers follow `<collegeCode><admissionYear><branch><section><roll>`
 * for example:
 *   732925AMR001  -> college 7329, admitted 2025, branch AM, section R, roll 001
 *   732924CSR014  -> college 7329, admitted 2024, branch CS, section R, roll 014
 *   732926CSR101  -> college 7329, admitted 2026, branch CS, section R, roll 101
 *
 * Because the admission year is part of the register number, the same
 * `CSR101` roll can legitimately exist for several batches (732922CSR101,
 * 732925CSR101, 732926CSR101). Every batch is therefore stored as its own
 * User document keyed on the *full* register number.
 */

import { parseDateOfBirth as parseDateOfBirthValue } from "../utils/dateOfBirth.js";

/** `R` regular intake, `L` lateral entry, anything else falls back to `A`. */
const SECTION_ALIASES = {
  R: "R",
  L: "L",
  A: "A",
};

export const DEPARTMENT_CATALOG = [
  {
    code: "CSE",
    name: "Computer Science & Engineering",
    icon: "Cpu",
    color: "#0284c7",
    description: "Department of Computer Science and Engineering, VCET",
  },
  {
    code: "ECE",
    name: "Electronics & Communication Engineering",
    icon: "Radio",
    color: "#db2777",
    description: "Department of Electronics and Communication Engineering, VCET",
  },
  {
    code: "EEE",
    name: "Electrical & Electronics Engineering",
    icon: "Zap",
    color: "#d97706",
    description: "Department of Electrical and Electronics Engineering, VCET",
  },
  {
    code: "CIVIL",
    name: "Civil Engineering",
    icon: "Building",
    color: "#059669",
    description: "Department of Civil Engineering, VCET",
  },
  {
    code: "AIML",
    name: "Artificial Intelligence & Machine Learning",
    icon: "Brain",
    color: "#7c3aed",
    description: "B.E. Artificial Intelligence & Machine Learning, VCET",
  },
  {
    code: "BME",
    name: "Bio Medical Engineering",
    icon: "HeartPulse",
    color: "#16a34a",
    description: "B.E. Bio Medical Engineering, VCET",
  },
  {
    code: "MDE",
    name: "Medical Electronics",
    icon: "Activity",
    color: "#ea580c",
    description: "B.E. Medical Electronics, VCET",
  },
  {
    code: "AI&DS",
    name: "Artificial Intelligence & Data Science",
    icon: "Brain",
    color: "#9333ea",
    description: "Department of Artificial Intelligence and Data Science, VCET",
  },
  {
    code: "IT",
    name: "Information Technology",
    icon: "Network",
    color: "#0891b2",
    description: "Department of Information Technology, VCET",
  },
  {
    code: "MECH",
    name: "Mechanical Engineering",
    icon: "Cog",
    color: "#dc2626",
    description: "Department of Mechanical Engineering, VCET",
  },
  {
    code: "MBA",
    name: "Master of Business Administration",
    icon: "Briefcase",
    color: "#2563eb",
    description: "Department of Management Studies (MBA), VCET",
  },
  {
    code: "MEAE",
    name: "M.E. Applied Electronics",
    icon: "Cpu",
    color: "#0891b2",
    description: "M.E. Applied Electronics, VCET",
  },
  {
    code: "MEBME",
    name: "M.E. Bio Medical Engineering",
    icon: "HeartPulse",
    color: "#059669",
    description: "M.E. Bio Medical Engineering, VCET",
  },
  {
    code: "MECSE",
    name: "M.E. Computer Science and Engineering",
    icon: "Server",
    color: "#7c3aed",
    description: "M.E. Computer Science and Engineering, VCET",
  },
];

const CATALOG_BY_CODE = new Map(DEPARTMENT_CATALOG.map((dept) => [dept.code, dept]));

/** Two-letter branch prefixes seen in register numbers mapped to a department. */
const BRANCH_PREFIX_TO_DEPARTMENT = {
  CS: "CSE",
  EC: "ECE",
  EE: "EEE",
  CE: "CIVIL",
  CV: "CIVIL",
  AI: "AIML",
  AM: "AIML",
  BM: "BME",
  MD: "MDE",
  IT: "IT",
  ME: "MECH",
  AE: "MEAE",
  BP: "MEBME",
  CP: "MECSE",
  MB: "MBA",
};

/**
 * Academic year a cohort is currently in. The academic year rolls over in
 * June/July, so on 2026-09-28 the running academic year is 2026 - 2027.
 * Pass an explicit value to make an import deterministic.
 */
export function resolveCurrentAcademicYear(date = new Date()) {
  const month = date.getMonth() + 1; // 1-12
  return month >= 6 ? date.getFullYear() : date.getFullYear() - 1;
}

export function getDepartmentMeta(code) {
  if (!code) return null;
  return CATALOG_BY_CODE.get(String(code).trim().toUpperCase()) || null;
}

export function getDepartmentColor(code) {
  return getDepartmentMeta(code)?.color || "#64748b";
}

/**
 * Strip the "B.E. " prefix / parenthetical alias from the portal's `Short name`
 * column, so "B.E. CSE(AIML)" and "B.E. CIVIL" both resolve to a real code.
 */
export function normalizeCourseCode(input) {
  if (!input) return "";
  let code = String(input).trim();

  if (/^MBA$/i.test(code) || /Business Administration/i.test(code)) return "MBA";
  if (/M\.?E\.?\s*AE/i.test(code) || /Applied Electronics/i.test(code)) return "MEAE";
  if (/M\.?E\.?\s*BME/i.test(code) || (/Bio\s*Medical/i.test(code) && /M\.?E/i.test(code))) return "MEBME";
  if (/M\.?E\.?\s*CSE/i.test(code) || (/Computer\s*Science/i.test(code) && /M\.?E/i.test(code))) return "MECSE";

  const alias = code.match(/\(([A-Z&]+)\)\s*$/i);
  if (alias) {
    const candidate = alias[1].toUpperCase();
    if (CATALOG_BY_CODE.has(candidate)) return candidate;
    code = code.replace(alias[0], "");
  }

  code = code
    .replace(/^b\.?\s*e\.?\s*/i, "")
    .replace(/^b\.?\s*tech\.?\s*/i, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z&]/g, "");

  if (CATALOG_BY_CODE.has(code)) return code;
  if (BRANCH_PREFIX_TO_DEPARTMENT[code]) return BRANCH_PREFIX_TO_DEPARTMENT[code];
  return code;
}

/**
 * Parse a register number into its parts. Returns `null` for anything that does
 * not look like a VCET register number rather than throwing, so a single bad
 * row never aborts an import.
 */
export function parseRegisterNumber(input) {
  const value = String(input || "").trim().toUpperCase();
  const match = value.match(/^(\d{4})(\d{2})([A-Z]{2,4})(\d{1,4})$/);
  if (!match) return null;

  const [, collegeCode, admissionYear, branch, roll] = match;
  const prefix = branch.slice(0, 2);
  const sectionLetter = branch.length > 2 ? branch.slice(-1) : "A";

  return {
    registerNumber: value,
    collegeCode,
    admissionYear: Number(admissionYear),
    branch,
    section: SECTION_ALIASES[sectionLetter] || "A",
    rollNumber: roll.padStart(3, "0"),
    departmentCode: BRANCH_PREFIX_TO_DEPARTMENT[prefix] || null,
  };
}

/** "2025 - 2029" / "2023-2027" / 2025 -> { startYear, endYear }. */
export function parseBatchYear(input) {
  if (input === null || input === undefined || input === "") return null;

  const numbers = String(input)
    .match(/\d{4}/g);
  if (!numbers || numbers.length === 0) return null;

  const startYear = Number(numbers[0]);
  const endYear = numbers.length > 1 ? Number(numbers[1]) : startYear + 4;
  return { startYear, endYear, label: `${startYear} - ${endYear}` };
}

/**
 * Map a batch to the year of study / semester it corresponds to. Intakes that
 * start in the future are clamped to the first year so a 2026 roster lands in
 * year I rather than an out-of-range year.
 */
export function yearOfStudyFromBatch(batchStartYear, academicYear = resolveCurrentAcademicYear()) {
  if (!Number.isFinite(batchStartYear)) return { year: 1, semester: 1 };

  const raw = academicYear - batchStartYear + 1;
  const year = Math.min(Math.max(raw, 1), 4);
  const semester = Math.min(Math.max((year - 1) * 2 + 1, 1), 8);
  return { year, semester };
}

/** "I" / "II" / "III" / "IV" label for a year of study. */
export function romanizeYear(year) {
  return { 1: "I", 2: "II", 3: "III", 4: "IV" }[year] || "I";
}

const ROMAN_TO_NUMBER = { I: 1, II: 2, III: 3, IV: 4 };

/** Accepts 3, "3", "III", "III Year", "3rd Year" -> 1..4 or null. */
export function parseYearOfStudy(input) {
  if (input === null || input === undefined || input === "") return null;

  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.min(Math.max(Math.round(input), 1), 4);
  }

  const text = String(input).trim().toUpperCase();
  if (/^\d+$/.test(text)) return Math.min(Math.max(Number(text), 1), 4);

  const roman = text.match(/\b(I|II|III|IV)\b/);
  if (roman) return ROMAN_TO_NUMBER[roman[1]];

  return null;
}

/**
 * Parse the roster's `dd/MM/yyyy` date of birth. Impossible or future calendar
 * dates (a common data-entry slip, e.g. `01/04/2025`) return `null` so the
 * importer records the student and reports the bad value instead of persisting
 * a wrong birthday.
 *
 * Shares its calendar parsing with `utils/dateOfBirth.js`, which is also what
 * student login uses, so a value accepted here is always accepted there.
 */
export function parseDateOfBirth(input) {
  const date = parseDateOfBirthValue(input);
  if (!date) return null;

  if (date.getTime() > Date.now()) return null;

  return date;
}

/**
 * Sanity-check a date of birth against the cohort it belongs to.
 *
 * A future-date check is not enough on its own: `01/04/2025` is in the past
 * today, yet it is still impossible for a student in a 2025-2029 batch. This
 * returns a human-readable warning instead of a value, because the roster is
 * the source of truth and a suspicious birthday should still be imported and
 * reviewed by a human rather than silently dropped.
 *
 * @param {Date|null} dateOfBirth parsed DOB, or null when unparseable
 * @param {number} [batchStartYear] first year of the student's batch
 * @returns {string|null} warning text, or null when the date looks reasonable
 */
export function checkDateOfBirthPlausibility(dateOfBirth, batchStartYear) {
  if (!(dateOfBirth instanceof Date) || Number.isNaN(dateOfBirth.getTime())) {
    return null;
  }

  const age = yearsBetween(dateOfBirth, new Date());
  if (age < 14) {
    return `implausible for a degree cohort: age ${age}`;
  }
  if (age > 60) {
    return `unusually old for a degree cohort: age ${age}`;
  }

  if (Number.isFinite(batchStartYear)) {
    const ageAtAdmission = yearsBetween(dateOfBirth, new Date(Number(batchStartYear), 5, 1));
    if (ageAtAdmission < 15) {
      return `age ${ageAtAdmission} at admission for batch ${batchStartYear}`;
    }
  }

  return null;
}

/** Completed years between two dates, floored at 0. */
function yearsBetween(from, to) {
  let years = to.getFullYear() - from.getFullYear();
  const beforeAnniversary =
    to.getMonth() < from.getMonth() ||
    (to.getMonth() === from.getMonth() && to.getDate() < from.getDate());
  if (beforeAnniversary) years -= 1;
  return years;
}

/** Deterministic portal email so re-imports never collide on the unique index. */
export function emailFromRegisterNumber(registerNumber) {
  return `${String(registerNumber).trim().toLowerCase()}@vcet.ac.in`;
}
