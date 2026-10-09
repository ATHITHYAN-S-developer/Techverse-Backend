import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Resource } from "../models/Resource.js";
import { TechPulsePost } from "../models/TechPulsePost.js";

/**
 * One-off move of the retired `type: "updates"` resources into the dedicated
 * Tech Pulse collection.
 *
 * Rows with no external URL (junk/test posts) are not copied. After a
 * successful run every `type: "updates"` resource row is deleted, which is
 * what makes dropping "updates" from the Resource enum safe.
 *
 * Idempotent: existing posts are matched by title. Use --dry-run to preview.
 *
 * Usage:
 *   npm run migrate:tech-pulse
 *   npm run migrate:tech-pulse -- --dry-run
 */

const RETIRED_TYPE = "updates";

function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") };
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags;
  return String(tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function migrateTechPulse() {
  const { dryRun } = parseArgs(process.argv);

  try {
    await connectDB();

    const legacy = await Resource.find({ type: RETIRED_TYPE }).lean();
    const migratable = legacy.filter((doc) => String(doc.externalUrl || doc.url || "").trim());
    const skipped = legacy.filter((doc) => !String(doc.externalUrl || doc.url || "").trim());

    console.log(`\n🔍 Found ${legacy.length} resource(s) with type "${RETIRED_TYPE}"`);
    console.log(`   → ${migratable.length} will be migrated, ${skipped.length} skipped (no URL)`);
    for (const doc of migratable) console.log(`   ✓ ${doc.title}`);
    for (const doc of skipped) console.log(`   ✗ ${doc.title} (no external URL)`);

    if (dryRun) {
      console.log("\n⏸  Dry run - nothing written.");
      await mongoose.connection.close();
      return;
    }

    if (migratable.length === 0) {
      if (legacy.length > 0) {
        const { deletedCount } = await Resource.deleteMany({ type: RETIRED_TYPE });
        console.log(`\n🗑  Deleted ${deletedCount} unmigratable resource(s).`);
      } else {
        console.log(`\n✅ No resources with type "${RETIRED_TYPE}" found - nothing to migrate.`);
      }
      await mongoose.connection.close();
      return;
    }

    const admin = await User.findOne({ role: "admin" }).select("_id");

    let inserted = 0;
    let updated = 0;

    for (const doc of migratable) {
      const createdBy = doc.uploadedBy || admin?._id;
      if (!createdBy) throw new Error("No uploader and no admin user to own migrated posts.");

      const result = await TechPulsePost.findOneAndUpdate(
        { title: doc.title },
        {
          $setOnInsert: { createdBy },
          $set: {
            title: doc.title,
            url: String(doc.externalUrl || doc.url).trim(),
            description: doc.description || "",
            category: doc.category || "General",
            platform: doc.platform || "",
            tags: normalizeTags(doc.tags),
            featured: Boolean(doc.featured),
            isPublished: doc.isPublished !== false,
          },
        },
        { upsert: true, new: true }
      );

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    const { deletedCount } = await Resource.deleteMany({ type: RETIRED_TYPE });

    console.log(`\n✅ Migrated ${migratable.length} post(s) -> ${inserted} inserted, ${updated} updated`);
    console.log(`🗑  Deleted ${deletedCount} legacy resource(s) with type "${RETIRED_TYPE}"`);

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateTechPulse();
