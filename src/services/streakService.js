import { User } from "../models/User.js";

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
      return { ok: false, currentStreak: 0, longestStreak: 0, error: "USER_NOT_FOUND" };
    }
    if (user.role !== "student") {
      return { ok: false, currentStreak: 0, longestStreak: 0, error: "NOT_A_STUDENT" };
    }

    const lastDate = user.streak?.lastActiveDate || null;

    if (lastDate === today) {
      return {
        ok: true,
        advanced: false,
        currentStreak: user.streak?.currentStreak || 0,
        longestStreak: user.streak?.longestStreak || 0,
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

    await user.save();

    return {
      ok: true,
      advanced: true,
      currentStreak: newStreak,
      longestStreak,
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
