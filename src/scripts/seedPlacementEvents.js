/**
 * Idempotent placement-event seeder.
 *
 * The /placement drives originally lived only in MongoDB — no model, controller
 * or route was committed, and no seed script referenced the collection, so a
 * full `npm run seed` would have silently destroyed every drive on the page.
 * This script restores them from src/data/placementEvents.json, which is the
 * source of truth for the collection.
 *
 * Unlike seedDatabase.js this NEVER clears the collection. It is a no-op when
 * placement events already exist, so it is safe to run on a live database.
 *
 * Usage:
 *   npm run seed:placement            # insert only if the collection is empty
 *   npm run seed:placement -- --force # wipe and re-insert from the JSON file
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import { PlacementEvent } from "../models/PlacementEvent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "../data/placementEvents.json");
const force = process.argv.includes("--force");

/**
 * Collapse any timestamp to UTC midnight. The page compares
 * `String(date).slice(0, 10)` against today's date, so the calendar day must sit
 * on the intended UTC date regardless of the machine's timezone.
 */
function toUtcMidnight(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function run() {
  await connectDB();

  const existing = await PlacementEvent.countDocuments({});

  if (existing > 0 && !force) {
    console.log(`\u2139\uFE0F  ${existing} placement event(s) already present - nothing to do.`);
    console.log("   Run with --force to re-seed from the JSON file.\n");
    process.exit(0);
  }

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`\u274C Seed file not found: ${DATA_FILE}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const docs = raw
    .map((d) => ({
      ...d,
      date: toUtcMidnight(d.date),
      poster: d.poster || d.imageUrl || d.image || "",
    }))
    .filter((d) => d.title && d.date);

  if (force && existing > 0) {
    await PlacementEvent.deleteMany({});
    console.log(`\uD83D\uDDD1\uFE0F  Cleared ${existing} existing placement event(s).`);
  }

  const inserted = await PlacementEvent.insertMany(docs);
  console.log(`\u2705 Inserted ${inserted.length} placement event(s).`);

  const now = new Date().toISOString().slice(0, 10);
  const past = inserted.filter((d) => d.date.toISOString().slice(0, 10) < now);
  if (past.length > 0) {
    console.log(
      `\u26A0\uFE0F  ${past.length} event(s) are dated in the past and will be hidden by the page.`
    );
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("\u274C Placement event seed failed:", err.message);
  process.exit(1);
});
