import mongoose from "mongoose";
await mongoose.connect("mongodb://127.0.0.1:27017/techverse");
const db = mongoose.connection.db;
for (const name of ["mcqquestions","dailytests","testattempts","aptitudecategories","codingproblems"]) {
  const c = db.collection(name);
  const n = await c.countDocuments();
  console.log(`\n=== ${name} (${n}) ===`);
  const docs = await c.find({}).limit(2).toArray();
  for (const d of docs) {
    console.log(json(d).slice(0, 900));
  }
}
function json(d){ return JSON.stringify(d, null, 1).slice(0,900); }
await mongoose.disconnect();
