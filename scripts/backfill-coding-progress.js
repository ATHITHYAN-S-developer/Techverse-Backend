import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { CodingSubmission } from "../src/models/CodingSubmission.js";
import { CodingProgress } from "../src/models/CodingProgress.js";

async function backfillCodingProgress() {
  await connectDB();

  const stripped = await CodingSubmission.updateMany(
    { sourceCode: { $exists: true } },
    { $unset: { sourceCode: 1 } }
  );
  console.log(`✔ Stripped stored source code from ${stripped.modifiedCount} submission(s).`);

  const subs = await CodingSubmission.find({}).sort({ submittedAt: 1, _id: 1 }).lean();
  const grouped = new Map();

  for (const s of subs) {
    const key = `${String(s.studentId)}|${String(s.codingTestId)}|${String(s.problemId)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(s);
  }

  let upserted = 0;
  for (const [key, list] of grouped) {
    const [studentId, codingTestId, problemId] = key.split("|");
    const accepted = list.filter((s) => s.status === "Accepted");
    const last = list[list.length - 1];

    await CodingProgress.updateOne(
      { studentId, codingTestId, problemId },
      {
        $set: {
          done: accepted.length > 0,
          solvedAt: accepted.length ? accepted[0].submittedAt : null,
          attempts: list.length,
          language: last?.language || null,
          lastStatus: last?.status || null,
          lastSubmittedAt: last?.submittedAt || null,
        },
        $max: { bestScore: Math.max(...list.map((s) => s.score || 0)) },
      },
      { upsert: true }
    );
    upserted++;
  }

  const progressCount = await CodingProgress.countDocuments();
  console.log(`✔ Upserted ${upserted} progress row(s). Total CodingProgress docs: ${progressCount}.`);
  await mongoose.disconnect();
}

backfillCodingProgress()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
  });