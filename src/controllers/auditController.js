import { AuditLog } from "../models/AuditLog.js";
import { getPagination } from "../utils/pagination.js";

/**
 * @route   GET /api/audit-logs
 * @desc    Get paginated audit logs with action / role / user filter
 * @access  Protected (Admin only)
 */
export async function getAuditLogs(req, res, next) {
  try {
    const { action, role, search } = req.query;
    const { page, limit, skip } = getPagination(req.query, 25);

    const query = {};
    if (action) query.action = action;
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { userIdentifier: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
        { resourceType: { $regex: search, $options: "i" } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}
