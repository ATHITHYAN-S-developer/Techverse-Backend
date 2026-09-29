import mongoose from "mongoose";
import { Point } from "../models/Point.js";
import { User } from "../models/User.js";

export const POINT_TYPES = [
  "daily_test",
  "streak_7",
  "streak_14",
  "streak_30",
  "perfect_score",
  "module_completion",
  "course_completion",
  "coding_challenge",
  "bonus",
];

const POINTS_PER_LEVEL = 300;

const levelForPoints = (total) => Math.floor(total / POINTS_PER_LEVEL) + 1;

/**
 * Awards points to a student. Writes a ledger row in `Point` and updates the
 * denormalised `User.points` aggregate used by the leaderboard.
 *
 * Supports both call styles:
 *   awardPoints(studentId, points, type, description)
 *   awardPoints({ studentId, points, type, description, courseId, referenceId })
 */
export async function awardPoints(param1, param2, param3, param4) {
  let studentId, courseId, type, points, description, referenceId;

  // A Mongoose ObjectId is typeof "object", so a plain `typeof` check routed
  // every positional call (studentId, points, ...) into the object branch and
  // read studentId as undefined. Only treat it as the object form when it is a
  // real plain object carrying award fields.
  const isObjectForm =
    param1 !== null &&
    typeof param1 === "object" &&
    !mongoose.Types.ObjectId.isValid(param1) &&
    ("studentId" in param1 || "userId" in param1 || "points" in param1);

  if (isObjectForm) {
    studentId = param1.studentId || param1.userId;
    courseId = param1.courseId || null;
    type = param1.type;
    points = param1.points || 0;
    description = param1.description || "Activity points";
    referenceId = param1.referenceId || "";
  } else {
    studentId = param1;
    points = Number(param2) || 0;
    type = param2 && param3 && !POINT_TYPES.includes(param3) ? "bonus" : param3;
    description = param4 || "Activity points";
    courseId = null;
    referenceId = "";
  }

  // Guard against the enum rejecting the write. "activity" was never a valid
  // Point.type, so any caller that omitted one silently lost its ledger row.
  if (!POINT_TYPES.includes(type)) type = "bonus";

  if (!studentId || !points) {
    return { ok: false, record: null, error: "INVALID_AWARD" };
  }

  try {
    const record = await Point.create({
      studentId,
      courseId,
      type,
      points,
      description,
      referenceId,
    });

    const user = await User.findById(studentId);
    if (!user || user.role !== "student") {
      return { ok: true, record, totalPoints: null, error: null };
    }

    const updatedTotal = (user.points?.totalPoints || 0) + points;
    user.points.totalPoints = updatedTotal;
    user.points.level = levelForPoints(updatedTotal);
    user.points.rank = user.points?.rank || 1;
    await user.save();

    return { ok: true, record, totalPoints: updatedTotal, error: null };
  } catch (error) {
    console.error("[Points Service Error]:", error);
    return { ok: false, record: null, error: error?.message || "AWARD_FAILED" };
  }
}

export async function getStudentTotalPoints(studentId) {
  const result = await Point.aggregate([
    { $match: { studentId } },
    { $group: { _id: null, total: { $sum: "$points" } } },
  ]);
  return result[0]?.total || 0;
}

export default {
  awardPoints,
  getStudentTotalPoints,
  POINT_TYPES,
};
