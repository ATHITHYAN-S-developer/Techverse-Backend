import { AuditLog } from "../models/AuditLog.js";

export async function logAuditEvent({
  userId = null,
  userIdentifier = "",
  userName = "System",
  role = "system",
  action,
  resourceType,
  resourceId = "",
  departmentId = null,
  details = "",
  ipAddress = "127.0.0.1",
  metadata = {},
}) {
  try {
    const log = await AuditLog.create({
      userId,
      userIdentifier,
      userName,
      role,
      action,
      resourceType,
      resourceId,
      departmentId,
      details,
      ipAddress,
      metadata,
      timestamp: new Date(),
    });
    return log;
  } catch (error) {
    console.error("[Audit Service Logging Error]:", error);
    return null;
  }
}
