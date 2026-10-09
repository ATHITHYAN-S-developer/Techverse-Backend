/**
 * One-off migration: replace every stored plain-text password with a bcrypt hash.
 *
 * Usage:
 *   npm run hash:passwords            # migrate
 *   npm run hash:passwords -- --dry-run
 *
 * What it does:
 *   - scans the `users` collection (the single source of truth for auth) and any
 *     legacy mirror collections (students / faculties / hods / admins)
 *   - hashes every value that is not already a bcrypt hash
 *   - is idempotent: bcrypt hashes are left untouched, so it is safe to re-run
 *
 * The application also understands legacy plain-text values on login, so logins
 * keep working whether or not this migration has been run yet.
 */

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { hashPassword, isHashed } from "../utils/password.js";

const LEGACY_COLLECTIONS = ["students", "faculties", "hods", "admins"];
const HASH_CONCURRENCY = 100;

function parseArgs(argv) {
  const args = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run" || arg === "-n") args.dryRun = true;
  }
  return args;
}

async function collectionNames(db) {
  const existing = new Set(
    (await db.listCollections().toArray()).map((c) => c.name)
  );
  return ["users", ...LEGACY_COLLECTIONS].filter((name) => existing.has(name));
}

async function migrateCollection(db, name, { dryRun }) {
  const collection = db.collection(name);
  const docs = await collection
    .find({ password: { $exists: true, $type: "string" } })
    .project({ _id: 1, password: 1 })
    .toArray();

  const plain = docs.filter((doc) => !isHashed(doc.password));
  if (plain.length === 0) {
    console.log(`  ${name.padEnd(10)}: ${docs.length} password(s), all already hashed`);
    return { scanned: docs.length, migrated: 0 };
  }

  if (dryRun) {
    console.log(
      `  ${name.padEnd(10)}: ${plain.length} of ${docs.length} password(s) would be hashed`
    );
    return { scanned: docs.length, migrated: plain.length };
  }

  let migrated = 0;
  for (let i = 0; i < plain.length; i += HASH_CONCURRENCY) {
    const batch = plain.slice(i, i + HASH_CONCURRENCY);
    const hashed = await Promise.all(
      batch.map(async (doc) => ({ _id: doc._id, password: await hashPassword(doc.password) }))
    );
    await collection.bulkWrite(
      hashed.map((doc) => ({
        updateOne: { filter: { _id: doc._id }, update: { $set: { password: doc.password } } },
      })),
      { ordered: false }
    );
    migrated += hashed.length;
    const done = Math.min(i + HASH_CONCURRENCY, plain.length);
    process.stdout.write(`\r  ${name.padEnd(10)}: hashed ${done}/${plain.length}`);
  }
  process.stdout.write("\n");
  return { scanned: docs.length, migrated };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(
    `🔐 Hashing plain-text passwords${args.dryRun ? " (dry run - no writes)" : ""}\n`
  );

  const conn = await connectDB();
  if (!conn) {
    console.error("❌ Could not connect to MongoDB. Aborting.");
    process.exit(1);
  }

  const db = mongoose.connection.db;
  let totalScanned = 0;
  let totalMigrated = 0;

  for (const name of await collectionNames(db)) {
    const { scanned, migrated } = await migrateCollection(db, name, args);
    totalScanned += scanned;
    totalMigrated += migrated;
  }

  console.log(
    `\n${args.dryRun ? "Would migrate" : "Migrated"} ${totalMigrated} of ${totalScanned} password(s).`
  );

  await mongoose.disconnect();
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(`\n❌ Migration failed: ${error.message}`);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exit(1);
  });
