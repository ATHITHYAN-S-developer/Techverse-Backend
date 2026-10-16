import mongoose from "mongoose";
await mongoose.connect("mongodb://127.0.0.1:27017/techverse");
const db = mongoose.connection.db;
const cols = (await db.listCollections().toArray()).map(c => c.name).sort();
console.log("collections:", cols.join(", "));

for (const name of ["codingtests","courseassessments","coursemodules"]) {
  const c = db.collection(name);
  const n = await c.countDocuments();
  console.log(`\n=== ${name} (${n}) ===`);
  const docs = await c.find({}).limit(3).toArray();
  for (const d of docs) {
    const keys = Object.keys(d);
    console.log(" doc", String(d._id), "keys:", keys.join(", "));
    if (d.mcqs) console.log("   mcqs:", d.mcqs.length, "sample:", JSON.stringify(d.mcqs[0]));
    if (d.questions) console.log("   questions:", d.questions.length, "sample:", JSON.stringify(d.questions[0]).slice(0,200));
    if (d.problems) console.log("   problems:", d.problems.length);
  }
}
// look for any collection with mcqs
for (const name of cols) {
  const c = db.collection(name);
  const withMcq = await c.countDocuments({ mcqs: { $exists: true, $ne: [] } });
  if (withMcq > 0) console.log(`\n${name}: ${withMcq} docs with non-empty mcqs`);
}
await mongoose.disconnect();
