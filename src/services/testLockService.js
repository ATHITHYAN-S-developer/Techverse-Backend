import { TestLock } from "../models/TestLock.js";

/**
 * Returns the currently active (unexpired) lock for a student + test, if any.
 */
export async function getActiveTestLock(studentId, testId) {
  if (!studentId || !testId) return null;
  return TestLock.findOne({
    studentId,
    testId,
    unlockAt: { $gt: new Date() },
  }).sort({ unlockAt: -1 });
}

/**
 * Build a human readable reason and metadata payload from a lock document.
 */
export function describeTestLock(lock) {
  if (!lock) return null;
  return {
    isLocked: true,
    lockType: "violation",
    lockReason: lock.reason || "This test is temporarily locked due to security violations.",
    lockedAt: lock.lockedAt,
    unlockAt: lock.unlockAt,
    lockHours: lock.lockHours,
    violationsCount: lock.violationsCount,
    remainingMs: Math.max(0, new Date(lock.unlockAt).getTime() - Date.now()),
  };
}

/**
 * Create (or replace) a violation lock for a student + test.
 * Returns the created lock document.
 */
export async function createTestLock({
  studentId,
  testType = "mcq",
  testId,
  courseId = null,
  moduleId = null,
  hours = 0,
  violationsCount = 0,
  reason = "",
} = {}) {
  const safeHours = Number(hours);
  if (!studentId || !testId || !Number.isFinite(safeHours) || safeHours <= 0) {
    return null;
  }

  const lockedAt = new Date();
  const unlockAt = new Date(lockedAt.getTime() + safeHours * 60 * 60 * 1000);

  // Remove any previous locks for this test so only the newest one is authoritative.
  await TestLock.deleteMany({ studentId, testId });

  return TestLock.create({
    studentId,
    testType,
    testId,
    courseId,
    moduleId,
    lockHours: safeHours,
    violationsCount,
    reason:
      reason ||
      `Test auto-submitted after ${violationsCount} security violations. Locked for ${safeHours} hour(s).`,
    lockedAt,
    unlockAt,
  });
}
