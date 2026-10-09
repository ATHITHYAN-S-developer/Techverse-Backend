import bcrypt from "bcryptjs";

/**
 * Password hashing helpers shared by the User model, controllers, seeders and
 * the migration script.
 *
 * Passwords are stored as bcrypt hashes. Because the platform historically kept
 * passwords in plain text (including students' dates of birth), every read path
 * also understands a legacy plain-text value so nothing breaks before the
 * `hash:passwords` migration has been run. A successful legacy comparison is the
 * signal to re-hash on the next write.
 */

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

// A bcrypt hash always looks like `$2a$10$...`, `$2b$...` or `$2y$...`.
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/** True when the stored value is already a bcrypt hash. */
export function isHashed(value) {
  return BCRYPT_HASH_PATTERN.test(String(value || ""));
}

/** Hash a plain-text password. Returns the input unchanged if it is already a hash. */
export async function hashPassword(plain) {
  const value = String(plain ?? "");
  if (!value) return value;
  if (isHashed(value)) return value;
  return bcrypt.hash(value, BCRYPT_ROUNDS);
}

/** Hash a plain-text password synchronously (for one-off scripts). */
export function hashPasswordSync(plain) {
  const value = String(plain ?? "");
  if (!value) return value;
  if (isHashed(value)) return value;
  return bcrypt.hashSync(value, BCRYPT_ROUNDS);
}

/**
 * Verify a plain-text password against a stored value.
 *
 * Handles both bcrypt hashes and legacy plain-text values, so it is safe to call
 * while some accounts have not yet been migrated.
 *
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plain, stored) {
  const entered = String(plain ?? "");
  const storedValue = String(stored ?? "");
  if (!storedValue) return false;

  if (isHashed(storedValue)) {
    return bcrypt.compare(entered, storedValue);
  }

  // Legacy plain-text comparison (timing is not a concern here because the
  // account is migrated to a hash on the first successful login / write).
  return entered === storedValue;
}

/**
 * Hash the password inside a Mongo update document in place.
 *
 * Covers top-level `password`, `$set.password` and `$setOnInsert.password`, which
 * are the shapes used by upserts in the seeding / import scripts. Query
 * middleware (findOneAndUpdate, updateOne, updateMany) calls this so bulk writes
 * never store plain text.
 */
export async function hashUpdatePasswords(update) {
  if (!update || typeof update !== "object") return update;

  if (update.password && !isHashed(update.password)) {
    update.password = await hashPassword(update.password);
  }
  if (update.$set && update.$set.password && !isHashed(update.$set.password)) {
    update.$set.password = await hashPassword(update.$set.password);
  }
  if (
    update.$setOnInsert &&
    update.$setOnInsert.password &&
    !isHashed(update.$setOnInsert.password)
  ) {
    update.$setOnInsert.password = await hashPassword(update.$setOnInsert.password);
  }

  return update;
}
