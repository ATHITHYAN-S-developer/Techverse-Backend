import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logo: { type: String, default: "" },
    tagline: { type: String, default: "" },
    packageRange: { type: String, default: "" },
    eligibility: { type: String, default: "" },
    description: { type: String, default: "" },
    rounds: [
      {
        round: String,
        title: String,
        duration: String,
        details: String,
        tips: String,
      },
    ],
    sampleQuestions: [{ type: String }],
    pattern: { type: String, default: "" },
    testLink: { type: String, default: "" },
    salary: { type: String, default: "" },
    role: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Company = mongoose.model("Company", companySchema);
