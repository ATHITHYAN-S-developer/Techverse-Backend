import { User } from "../models/User.js";

/**
 * Local calendar day as YYYY-MM-DD.
 */
export function toLocalDayKey(date = new Date()) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date.trim())) {
    return date.trim().substring(0, 10);
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}-${String(fallback.getDate()).padStart(2, "0")}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses any date string, ISO timestamp, or Date into local midnight Date object
 */
function parseDayDate(val) {
  if (!val) return null;
  if (typeof val === "string") {
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Whole days between two day keys/dates
 */
export function daysBetween(fromVal, toVal) {
  const from = parseDayDate(fromVal);
  const to = parseDayDate(toVal);
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / 86400000);
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
      return { ok: false, currentStreak: 0, longestStreak: 0, error: "USER_NOT_FOUND" };
    }
    if (user.role !== "student") {
      return { ok: false, currentStreak: 0, longestStreak: 0, error: "NOT_A_STUDENT" };
    }

    if (!user.streak) {
      user.streak = { currentStreak: 0, longestStreak: 0, lastActiveDate: null, freezeCount: 1 };
    }

    const lastDate = user.streak.lastActiveDate || null;
    const previousStreak = Number(user.streak.currentStreak) || 0;
    const longestStreak = Number(user.streak.longestStreak) || 0;

    // Already recorded activity today
    if (lastDate && toLocalDayKey(lastDate) === today) {
      return {
        ok: true,
        advanced: false,
        currentStreak: Math.max(previousStreak, 1),
        longestStreak: Math.max(longestStreak, previousStreak, 1),
      };
    }

    let newStreak = 1;
    let preserved = false;

    if (lastDate) {
      const diffDays = daysBetween(lastDate, today);

      if (diffDays === 0) {
        // Same calendar day
        newStreak = Math.max(previousStreak, 1);
      } else if (diffDays === 1) {
        // Consecutive calendar day -> advance streak!
        newStreak = previousStreak + 1;
      } else if (diffDays === 2) {
        // 1 missed day: use freeze or grace to preserve the streak
        newStreak = previousStreak + 1;
        preserved = true;
        if ((user.streak.freezeCount || 0) > 0) {
          user.streak.freezeCount -= 1;
        }
      } else {
        // More than 2 days gap -> restart streak at 1
        newStreak = 1;
      }
    } else {
      // First day
      newStreak = 1;
    }

    const updatedLongest = Math.max(longestStreak, newStreak);

    user.streak.currentStreak = newStreak;
    user.streak.longestStreak = updatedLongest;
    user.streak.lastActiveDate = today;
    if (user.streak.freezeCount === undefined) user.streak.freezeCount = 1;

    await user.save();

    return {
      ok: true,
      advanced: true,
      currentStreak: newStreak,
      longestStreak: updatedLongest,
      freezeUsed: preserved,
    };
  } catch (error) {
    console.error("[Streak Service Error]:", error);
    return {
      ok: false,
      currentStreak: 0,
      longestStreak: 0,
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
