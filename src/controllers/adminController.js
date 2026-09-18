import { User } from "../models/User.js";
import { getPagination } from "../utils/pagination.js";
import { logAuditEvent } from "../services/auditService.js";

/**
 * @route   GET /api/admin/users
 * @desc    Get users list with role/dept filters & pagination
 * @access  Protected (Admin only)
 */
export async function getUsers(req, res, next) {
  try {
    const { role, departmentId, isActive, search } = req.query;
    const { page, limit, skip } = getPagination(req.query, 20);

    const query = {};
    if (role) query.role = role;
    if (departmentId) query.departmentId = departmentId;
    if (isActive !== undefined) query.isActive = isActive === "true";

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { registerNumber: { $regex: search, $options: "i" } },
        { staffId: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .populate("departmentId", "code name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      users: users.map((u) => u.toSafeObject()),
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

/**
 * @route   POST /api/admin/users
 * @desc    Create new user (Student / Teacher / Admin)
 * @access  Protected (Admin only)
 */
export async function createUser(req, res, next) {
  try {
    const { role, name, email, password, registerNumber, staffId, username, departmentId, classId, designation } = req.body;

    if (!role || !name || !password) {
      return res.status(400).json({ success: false, message: "Role, Name, and Password are required." });
    }

    const newUser = await User.create({
      role,
      name,
      email: email?.toLowerCase(),
      password, // Plain text storage
      registerNumber: registerNumber?.toUpperCase(),
      staffId: staffId?.toUpperCase(),
      username: username?.toLowerCase(),
      departmentId,
      classId,
      designation,
      isActive: true,
    });

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "CREATE",
      resourceType: "User",
      resourceId: newUser._id.toString(),
      details: `Created new ${role}: ${name} (${registerNumber || staffId || username || email})`,
    });

    res.status(201).json({
      success: true,
      message: `${role} account created successfully.`,
      user: newUser.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Toggle block/unblock status
 * @access  Protected (Admin only)
 */
export async function toggleUserStatus(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.isActive = !user.isActive;
    await user.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: user.isActive ? "UNBLOCK" : "BLOCK",
      resourceType: "User",
      resourceId: user._id.toString(),
      details: `${user.isActive ? "Unblocked" : "Blocked"} user: ${user.name}`,
    });

    res.json({
      success: true,
      message: `User ${user.isActive ? "activated" : "blocked"} successfully.`,
      isActive: user.isActive,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/admin/users/:id/reset-password
 * @desc    Reset user password
 * @access  Protected (Admin only)
 */
export async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ success: false, message: "New password is required." });
    }

    const user = await User.findById(req.params.id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.password = newPassword; // Plain text
    await user.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "UPDATE",
      resourceType: "User",
      resourceId: user._id.toString(),
      details: `Reset password for user: ${user.name}`,
    });

    res.json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user profile (incl. department assignment)
 * @access  Protected (Admin only)
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const allowed = ["name", "email", "staffId", "username", "registerNumber", "designation", "classId", "departmentId", "phone", "profileImage"];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates[field] = field === "email" ? req.body[field].toLowerCase() : req.body[field];
      }
    }

    // Uniqueness pre-checks (friendly 400 instead of duplicate key error)
    const uniqueFields = ["email", "staffId", "username", "registerNumber"];
    for (const field of uniqueFields) {
      if (updates[field] === undefined) continue;
      const conflict = await User.findOne({
        [field]: new RegExp(`^${updates[field].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        _id: { $ne: user._id },
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: `Another user already uses this ${field}.`,
        });
      }
    }

    Object.assign(user, updates);
    await user.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "UPDATE",
      resourceType: "User",
      resourceId: user._id.toString(),
      details: `Updated user profile: ${user.name}${updates.departmentId ? " (reassigned department)" : ""}`,
    });

    res.json({
      success: true,
      message: "User updated successfully.",
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Permanently delete user account
 * @access  Protected (Admin only)
 */
export async function deleteUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const { name, role, staffId, registerNumber, email, username, _id } = user;
    await user.deleteOne();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "DELETE",
      resourceType: "User",
      resourceId: _id.toString(),
      details: `Permanently deleted ${role} account: ${name} (${staffId || registerNumber || username || email})`,
    });

    res.json({
      success: true,
      message: "User account permanently deleted.",
    });
  } catch (error) {
    next(error);
  }
}
