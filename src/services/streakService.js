import { User } from "../models/User.js";
import { awardPoints } from "./pointsService.js";

const STREAK_BONUSES = {
  7: { points: 50, type: "streak_7", description: "7-Day Consistent Streak Bonus!" },
  14: { points: 100, type: "streak_14", description: "14-Day Consistency Streak Bonus!" },
  30: { points: 200, type: "streak_30", description: "30-Day Legend Streak Bonus!" },
};

/**
 * Local calendar day as YYYY-MM-DD. Uses the server's local timezone rather
 * than UTC so a student in IST does not have the day roll over at 05:30.
 */
export function toLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Whole days between two YYYY-MM-DD keys, interpreted as local midnights. */
function daysBetween(fromKey, toKey) {
  const from = new Date(`${fromKey}T00:00:00`);
  const to = new Date(`${toKey}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.round((to - from) / 86400000);
}

/**
 * Records activity for a student and advances their daily streak.
 * Idempotent per calendar day: calling it repeatedly on the same day is a
 * no-op that returns the unchanged streak.
 */
export async function updateStreakOnActivity(studentId) {
  const today = toLocalDayKey();

  try {
    const user = await User.findById(studentId);
    if (!user) {
      return { ok: false, currentStreak: 0, longestStreak: 0, bonusAwarded: 0, error: "USER_NOT_FOUND" };
    }
    if (user.role !== "student") {
      return { ok: false, currentStreak: 0, longestStreak: 0, bonusAwarded: 0, error: "NOT_A_STUDENT" };
    }

    const lastDate = user.streak?.lastActiveDate || null;

    if (lastDate === today) {
      return {
        ok: true,
        advanced: false,
        currentStreak: user.streak?.currentStreak || 0,
        longestStreak: user.streak?.longestStreak || 0,
        bonusAwarded: 0,
      };
    }

    const previousStreak = user.streak?.currentStreak || 0;
    let newStreak = 1;
    let preserved = false;

    if (lastDate) {
      const diffDays = daysBetween(lastDate, today);
      if (diffDays === 1) {
        newStreak = previousStreak + 1;
      } else if (diffDays !== null && diffDays > 1 && (user.streak?.freezeCount || 0) > 0) {
        // A freeze covers exactly one missed day and keeps the streak alive.
        user.streak.freezeCount = user.streak.freezeCount - 1;
        newStreak = previousStreak + 1;
        preserved = true;
      }
      // diffDays <= 0 means a clock skew or a repeat; treat as a new streak.
    }

    const longestStreak = Math.max(user.streak?.longestStreak || 0, newStreak);

    user.streak.currentStreak = newStreak;
    user.streak.longestStreak = longestStreak;
    user.streak.lastActiveDate = today;
    if (user.streak.freezeCount === undefined) user.streak.freezeCount = 0;

    let bonus = 0;
    const bonusRule = STREAK_BONUSES[newStreak];
    if (bonusRule) {
      bonus = bonusRule.points;
      await awardPoints(studentId, bonusRule.points, bonusRule.type, bonusRule.description);
    }

    await user.save();

    return {
      ok: true,
      advanced: true,
      currentStreak: newStreak,
      longestStreak,
      freezeUsed: preserved,
      bonusAwarded: bonus,
    };
  } catch (error) {
    console.error("[Streak Service Error]:", error);
    return {
      ok: false,
      currentStreak: 0,
      longestStreak: 0,
      bonusAwarded: 0,
      error: error?.message || "STREAK_UPDATE_FAILED",
    };
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
  toLocalDayKey,
};
