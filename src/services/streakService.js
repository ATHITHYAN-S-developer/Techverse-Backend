import { Enrollment } from "../models/Enrollment.js";
import { User } from "../models/User.js";
import { awardPoints } from "./pointsService.js";

export async function updateStreakOnActivity(studentId) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const user = await User.findById(studentId);
    if (!user || user.role !== "student") return null;

    const lastDate = user.streak?.lastActiveDate;

    if (lastDate === today) {
      return {
        currentStreak: user.streak?.currentStreak || 1,
        longestStreak: user.streak?.longestStreak || 1,
        bonusAwarded: 0,
      };
    }

    let newStreak = 1;
    if (lastDate) {
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      const diffDays = Math.round((todayObj - lastDateObj) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak = (user.streak?.currentStreak || 0) + 1;
      }
    }

    const longestStreak = Math.max(user.streak?.longestStreak || 1, newStreak);

    user.streak = {
      currentStreak: newStreak,
      longestStreak,
      lastActiveDate: today,
      freezeCount: user.streak?.freezeCount || 0,
    };

    let bonus = 0;
    if (newStreak === 7) {
      bonus = 50;
      await awardPoints(studentId, 50, "streak_7", "7-Day Consistent Streak Bonus!");
    } else if (newStreak === 30) {
      bonus = 200;
      await awardPoints(studentId, 200, "streak_30", "30-Day Legend Streak Bonus!");
    }

    await user.save();

    return {
      currentStreak: newStreak,
      longestStreak,
      bonusAwarded: bonus,
    };
  } catch (error) {
    console.error("[Streak Service Error]:", error);
    return null;
  }
}

export async function updateStudentStreak(enrollment) {
  if (!enrollment) return null;
  return updateStreakOnActivity(enrollment.studentId);
}

export const updateStreak = updateStreakOnActivity;

export default {
  updateStreak,
  updateStreakOnActivity,
  updateStudentStreak,
};
