import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { TechPulsePost } from "../models/TechPulsePost.js";
import { TECH_PULSE_KINDS, toHttpUrl } from "../utils/techPulseValidate.js";
import { deleteUploadedFile } from "../utils/fileUpload.js";

/**
 * Introduces the `kind` discriminator to existing Tech Pulse posts.
 *
 * What it does (idempotent, safe to re-run):
 *   1. Backfills `kind: "website"` on any post that has no kind yet.
 *   2. Deletes leftover junk test posts: title must match EXACTLY AND the post
 *      must be missing the fields its kind needs. Uploaded logos of deleted
 *      posts are removed from disk too.
 *
 * Safety: every run first exports the whole collection to a timestamped file
 * under backups/ (gitignored) unless --skip-backup is passed. Use --dry-run to
 * preview without writing anything.
 *
 * Usage:
 *   npm run migrate:tech-pulse-kinds -- --dry-run
 *   npm run migrate:tech-pulse-kinds
 *   npm run migrate:tech-pulse-kinds -- --skip-backup
 */

const JUNK_TITLES = ["zxxzzx", "summa"];
const BACKUP_DIR = path.resolve(process.cwd(), "backups");

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    skipBackup: argv.includes("--skip-backup"),
  };
}

/**
 * A post is only junk when the title matches exactly AND its required fields
 * are missing or unusable. "Unusable" matters: the two leftover test posts
 * carry a `url`, but it is a random string rather than an http(s) link, so
 * there is nothing a reader could open. Nothing with a real link is removed.
 */
function isJunk(doc) {
  const title = String(doc.title ?? "").trim();
  if (!JUNK_TITLES.includes(title)) return false;

  const kind = doc.kind || "website";
  if (kind === "youtube" || kind === "website") return !toHttpUrl(doc.url);
  if (kind === "app") {
    return (
      !toHttpUrl(doc.playStoreUrl) && !toHttpUrl(doc.appStoreUrl) && !toHttpUrl(doc.webUrl)
    );
  }
  if (kind === "roadmap") {
    const steps = Array.isArray(doc.steps) ? doc.steps : [];
    return steps.length === 0 || steps.some((step) => !step?.title || !toHttpUrl(step?.url));
  }
  return true;
}

function writeBackup(docs) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(BACKUP_DIR, `tech-pulse-${stamp}.json`);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(docs, null, 2), "utf8");
  return file;
}

async function migrateTechPulseKinds() {
  const { dryRun, skipBackup } = parseArgs(process.argv);

  try {
    await connectDB();

    const docs = await TechPulsePost.find({}).lean();
    const total = docs.length;

    const unknownKind = docs.filter(
      (doc) => doc.kind !== undefined && doc.kind !== null && !TECH_PULSE_KINDS.includes(doc.kind)
    );
    const junk = docs.filter(isJunk);
    const junkIds = new Set(junk.map((doc) => String(doc._id)));
    // Junk is deleted, not backfilled — don't waste a write on a doomed row.
    const needsKind = docs.filter(
      (doc) => (doc.kind === undefined || doc.kind === null) && !junkIds.has(String(doc._id))
    );

    console.log(`\n🔍 Found ${total} Tech Pulse post(s)`);
    console.log(`   → ${needsKind.length} will be backfilled with kind "website"`);
    console.log(`   → ${junk.length} junk post(s) will be deleted`);
    console.log(`   → ${unknownKind.length} post(s) hold an unknown kind (left untouched)`);
    for (const doc of needsKind) console.log(`   + kind: website  ← ${doc.title}`);
    for (const doc of junk) console.log(`   - delete          ← ${doc.title} (kind: ${doc.kind || "website"})`);
    for (const doc of unknownKind) console.log(`   ! unknown kind "${doc.kind}" ← ${doc.title}`);

    if (needsKind.length === 0 && junk.length === 0) {
      console.log("\n✅ Nothing to change - Tech Pulse kinds are already migrated.");
      await mongoose.connection.close();
      return;
    }

    if (dryRun) {
      console.log("\n⏸  Dry run - nothing written, no backup created.");
      await mongoose.connection.close();
      return;
    }

    if (!skipBackup) {
      const backupPath = writeBackup(docs);
      console.log(`\n💾 Backed up ${total} post(s) → ${path.relative(process.cwd(), backupPath)}`);
    }

    let backfilled = 0;
    if (needsKind.length > 0) {
      const result = await TechPulsePost.updateMany(
        { _id: { $in: needsKind.map((doc) => doc._id) } },
        { $set: { kind: "website" } }
      );
      backfilled = result.modifiedCount;
      console.log(`✅ Backfilled kind on ${backfilled} post(s)`);
    }

    let deleted = 0;
    for (const doc of junk) {
      const logo = String(doc.logoUrl || "").trim();
      if (logo) deleteUploadedFile(logo, "tech-pulse");
      const result = await TechPulsePost.deleteOne({ _id: doc._id });
      if (result.deletedCount) {
        deleted += 1;
        console.log(`🗑  Deleted junk post "${doc.title}"${logo ? " (removed uploaded logo)" : ""}`);
      }
    }

    console.log(`\n✅ Done → ${backfilled} kind(s) backfilled, ${deleted} junk post(s) deleted`);
    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateTechPulseKinds();
