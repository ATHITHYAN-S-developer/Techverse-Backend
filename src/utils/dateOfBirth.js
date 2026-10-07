/**
 * Date-of-birth helpers shared by the roster importer and student login.
 *
 * Students authenticate with their register number and date of birth, so the
 * value typed on the login form has to be understood in the same formats the
 * roster accepts. Storing and comparing happen in UTC to match how the importer
 * persists `User.dateOfBirth` (UTC midnight), which keeps the comparison immune
 * to the server's local timezone.
 */

/**
 * Split a date of birth into calendar parts, accepting the formats a student is
 * likely to type plus the format used in the roster CSV.
 *
 * Supported: `dd/MM/yyyy`, `dd-MM-yyyy`, `dd.MM.yyyy`, `yyyy-MM-dd`.
 * Ambiguous numeric input is always read as day-first, matching the roster and
 * Indian convention - `01/04/2025` is 1 April, never 4 January.
 *
 * @returns {{year: number, month: number, day: number}|null} null when the
 *   value is not a real calendar date.
 */
export function parseDateOfBirthParts(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  let year;
  let month;
  let day;

  // Check for delimited date: dd/MM/yyyy, dd-MM-yyyy, yyyy-MM-dd
  const parts = raw.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})$/);
  if (parts) {
    if (parts[1].length === 4) {
      // ISO order: yyyy-MM-dd
      year = Number(parts[1]);
      month = Number(parts[2]);
      day = Number(parts[3]);
    } else {
      // Day-first: dd/MM/yyyy
      day = Number(parts[1]);
      month = Number(parts[2]);
      year = Number(parts[3]);
    }
  } else if (/^\d{8}$/.test(raw)) {
    // Pure 8-digit numbers from mobile keyboards: DDMMYYYY or YYYYMMDD
    const last4 = Number(raw.substring(4, 8));
    const first4 = Number(raw.substring(0, 4));
    const middle2 = Number(raw.substring(2, 4));
    const first2 = Number(raw.substring(0, 2));

    if (last4 >= 1900 && last4 <= 2100 && middle2 >= 1 && middle2 <= 12 && first2 >= 1 && first2 <= 31) {
      // DDMMYYYY (Standard Indian student format e.g. 20092007)
      day = first2;
      month = middle2;
      year = last4;
    } else if (first4 >= 1900 && first4 <= 2100) {
      // YYYYMMDD
      year = first4;
      month = Number(raw.substring(4, 6));
      day = Number(raw.substring(6, 8));
    } else {
      // Fallback: DDMMYYYY
      day = first2;
      month = middle2;
      year = last4;
    }
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;

  // Rejects impossible dates such as 31/02, which Date would silently roll over.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/** Calendar parts as a UTC-midnight Date, or null when unparseable. */
export function parseDateOfBirth(input) {
  const parts = parseDateOfBirthParts(input);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

/**
 * Compare a student-supplied date of birth against the stored one.
 *
 * @param {Date|string|null|undefined} storedValue `User.dateOfBirth`
 * @param {string} input what the student typed on the login form
 */
export function matchesDateOfBirth(storedValue, input) {
  if (!storedValue) return false;

  const stored =
    storedValue instanceof Date ? storedValue : new Date(storedValue);
  if (Number.isNaN(stored.getTime())) return false;

  const typed = parseDateOfBirthParts(input);
  if (!typed) return false;

  return (
    stored.getUTCFullYear() === typed.year &&
    stored.getUTCMonth() + 1 === typed.month &&
    stored.getUTCDate() === typed.day
  );
}

/**
 * The password a student's account holds: their own date of birth, in the ISO
 * form the login form sends. Students sign in with a date of birth, so the
 * password field mirrors it rather than carrying a separate secret that would
 * never be used.
 *
 * @param {Date|string|null|undefined} dateOfBirth `User.dateOfBirth`
 * @returns {string|null} `yyyy-MM-dd`, or null when there is no usable date
 */
export function studentPassword(dateOfBirth) {
  const date =
    dateOfBirth instanceof Date ? dateOfBirth : parseDateOfBirth(dateOfBirth);
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}
