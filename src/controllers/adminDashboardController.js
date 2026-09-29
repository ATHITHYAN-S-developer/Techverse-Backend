import {
  getDashboardSummary,
  getAdminNotifications,
  searchAdminEntities,
  getViolationTotals,
} from "../services/adminDashboardService.js";

/**
 * @route   GET /api/admin/dashboard
 * @desc    Complete executive control center payload: 8 KPI tiles, 7-day
 *          activity telemetry, department distribution, course completion
 *          velocity, recent activity feed and visitor traffic.
 * @access  Protected (Admin only)
 * @query   days       telemetry window in days (1-30, default 7)
 * @query   courseLimit number of flagship courses (default 5)
 * @query   activityLimit number of feed entries (default 12)
 */
export async function getDashboard(req, res, next) {
  try {
    const days = Number(req.query.days) || 7;
    const payload = await getDashboardSummary({
      days,
      courseLimit: req.query.courseLimit,
      activityLimit: req.query.activityLimit,
    });

    res.json({
      success: true,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/admin/dashboard/notifications
 * @desc    System alert centre: proctoring violations, pending uploads,
 *          suspended accounts and recently issued certificates.
 * @access  Protected (Admin only)
 */
export async function getNotifications(req, res, next) {
  try {
    const notifications = await getAdminNotifications(req.query.limit);

    res.json({
      success: true,
      count: notifications.length,
      unreadCount: notifications.length,
      notifications,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/admin/dashboard/search
 * @desc    Cross-entity search backing the Ctrl+K command palette.
 * @access  Protected (Admin only)
 * @query   q     search term (minimum 2 characters)
 * @query   limit maximum results per group (default 5)
 */
export async function searchDashboard(req, res, next) {
  try {
    const result = await searchAdminEntities(req.query.q, req.query.limit);

    res.json({
      success: true,
      ...result,
      total: result.groups.reduce((sum, group) => sum + group.items.length, 0),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/admin/dashboard/violations-summary
 * @desc    Proctoring violation totals for the admin header badge.
 * @access  Protected (Admin only)
 * @query   hours lookback window in hours (default 24)
 */
export async function getViolationSummary(req, res, next) {
  try {
    const hours = Number(req.query.hours) || 24;
    const totals = await getViolationTotals(hours);

    res.json({
      success: true,
      windowHours: hours,
      ...totals,
    });
  } catch (error) {
    next(error);
  }
}
