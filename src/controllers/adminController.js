import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { getPagination } from "../utils/pagination.js";
import { logAuditEvent } from "../services/auditService.js";
import { parseDateOfBirth, studentPassword } from "../utils/dateOfBirth.js";

/**
 * @route   GET /api/admin/users
 * @desc    Get users list with role/dept filters & pagination
 * @access  Protected (Admin only)
 */
export async function getUsers(req, res, next) {
  try {
    const { role, departmentId, departmentCode, isActive, search } = req.query;
    const { page, limit, skip } = getPagination(req.query, 20);

    const query = {};
    if (role) {
      if (role === "faculty" || role === "teacher") {
        query.role = { $in: ["faculty", "teacher", "hod"] };
      } else {
        query.role = role;
      }
    }
    if (isActive !== undefined) query.isActive = isActive === "true";

    if (departmentId) {
      query.departmentId = departmentId;
    } else if (departmentCode) {
      // Resolve the branch code so callers (and the student roster screen) do not
      // have to know the ObjectId behind a branch.
      const department = await Department.findOne({
        code: String(departmentCode).trim().toUpperCase(),
      }).select("_id");
      if (!department) {
        return res.json({
          success: true,
          users: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
      query.departmentId = department._id;
    }

    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: safe, $options: "i" } },
        { registerNumber: { $regex: safe, $options: "i" } },
        { staffId: { $regex: safe, $options: "i" } },
        { username: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
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
    const { role, name, email, password, registerNumber, staffId, username, departmentId, designation, dateOfBirth } = req.body;

    if (!role || !name) {
      return res.status(400).json({ success: false, message: "Role and Name are required." });
    }

    let accountPassword = password;
    let studentDateOfBirth;

    if (role === "student") {
      // A student signs in with their date of birth, which is also their
      // password - there is no separate secret to invent here.
      studentDateOfBirth = parseDateOfBirth(dateOfBirth);
      if (!studentDateOfBirth) {
        return res.status(400).json({
          success: false,
          message: "A student's date of birth is required - it is also their password.",
        });
      }
      accountPassword = studentPassword(studentDateOfBirth);
    } else if (!accountPassword) {
      return res.status(400).json({ success: false, message: "Password is required." });
    }

    const newUser = await User.create({
      role,
      name,
      email: email?.toLowerCase(),
      password: accountPassword, // hashed by the User model's pre-save hook
      dateOfBirth: studentDateOfBirth,
      registerNumber: registerNumber?.toUpperCase(),
      staffId: staffId?.toUpperCase(),
      username: username?.toLowerCase(),
      departmentId,
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

    let password = newPassword;
    let message = "Password reset successfully.";

    if (user.role === "student") {
      // Students sign in with their date of birth, so that is what the
      // password holds - the value the admin typed is not used.
      const studentDob = studentPassword(user.dateOfBirth);
      if (!studentDob) {
        return res.status(400).json({
          success: false,
          message: "This student has no date of birth on file, so no password can be set.",
        });
      }
      password = studentDob;
      message = `Password reset to the student's date of birth: ${studentDob}`;
    }

    user.password = password;
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
      message,
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
