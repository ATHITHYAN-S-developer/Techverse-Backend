import mongoose from "mongoose";

const aptitudeCategorySchema = new mongoose.Schema(
  {
    categoryId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    domain: { type: String, required: true },
    icon: { type: String, default: "BookOpen" },
    formulaCount: { type: Number, default: 0 },
    questionCount: { type: Number, default: 0 },
    concepts: [{ type: String }],
    formulas: [
      {
        name: String,
        expr: String,
      },
    ],
    examples: [
      {
        q: String,
        solution: String,
      },
    ],
    practiceQuestions: [
      {
        id: String,
        q: String,
        options: [{ type: String }],
        correct: Number,
        explanation: String,
      },
    ],
  },
  { timestamps: true }
);

export const AptitudeCategory = mongoose.model("AptitudeCategory", aptitudeCategorySchema);
