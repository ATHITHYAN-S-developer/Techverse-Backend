import { Point } from "../models/Point.js";
import { User } from "../models/User.js";

export async function awardPoints(param1, param2, param3, param4) {
  try {
    let studentId, courseId, type, points, description, referenceId;

    if (typeof param1 === "object" && param1 !== null) {
      studentId = param1.studentId || param1.userId;
      courseId = param1.courseId || null;
      type = param1.type || "activity";
      points = param1.points || 0;
      description = param1.description || "Activity points";
      referenceId = param1.referenceId || "";
    } else {
      studentId = param1;
      points = Number(param2) || 0;
      type = param3 || "activity";
      description = param4 || "Activity points";
      courseId = null;
      referenceId = "";
    }

    if (!studentId || !points) return null;

    const record = await Point.create({
      studentId,
      courseId,
      type,
      points,
      description,
      referenceId,
    });

    // Update student User model points aggregate
    const user = await User.findById(studentId);
    if (user && user.role === "student") {
      const current = user.points?.totalPoints || 0;
      const updatedTotal = current + points;
      const level = Math.floor(updatedTotal / 300) + 1;
      user.points = {
        totalPoints: updatedTotal,
        level,
        rank: user.points?.rank || 1,
      };
      await user.save();
    }

    return record;
  } catch (error) {
    console.error("[Points Service Error]:", error);
    return null;
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
};
