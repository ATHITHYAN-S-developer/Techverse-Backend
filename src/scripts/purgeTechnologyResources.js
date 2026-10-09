import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Resource } from "../models/Resource.js";

/**
 * One-off cleanup for the removed Technology tab.
 *
 * Deletes every Resource still carrying the retired `type: "technology"` value
 * so no document is left outside the Resource enum. Reads are not validated by
 * mongoose, but any later save of a leftover document would throw a
 * ValidationError, so run this once after deploying the enum change.
 *
 * Idempotent: a second run reports 0 deleted.
 */

const RETIRED_TYPE = "technology";

async function purgeTechnologyResources() {
  try {
    await connectDB();

    const matches = await Resource.find({ type: RETIRED_TYPE })
      .select("title type")
      .lean();

    if (matches.length === 0) {
      console.log(`\n✅ No resources with type "${RETIRED_TYPE}" found - nothing to purge.`);
      await mongoose.connection.close();
      return;
    }

    console.log(`\n🔍 Found ${matches.length} resource(s) with type "${RETIRED_TYPE}":`);
    for (const doc of matches) {
      console.log(`   - ${doc.title}`);
    }

    const { deletedCount } = await Resource.deleteMany({ type: RETIRED_TYPE });

    console.log(`\n✅ Purged ${deletedCount} resource(s) with type "${RETIRED_TYPE}".`);

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Purge failed:", error);
    process.exit(1);
  }
}

purgeTechnologyResources();
