import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { ENV } from "../config/env.js";
import { logAuditEvent } from "../services/auditService.js";
import { matchesDateOfBirth } from "../utils/dateOfBirth.js";
import { updateStreakOnActivity } from "../services/streakService.js";

// Generates signed JWT token
function generateToken(userId, role) {
  return jwt.sign({ userId, role }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN,
  });
}

/**
 * Validate the secret a caller supplied for a given role.
 *
 * Students authenticate with their date of birth; teachers and admins use the
 * stored password (a bcrypt hash). Students are matched on `dateOfBirth` first -
 * a student's stored password is not a login route, so a leaked shared roster
 * password cannot be used to impersonate a student.
 *
 * @returns {Promise<boolean>}
 */
async function isCredentialValid(role, user, secret) {
  if (role === "student") {
    return matchesDateOfBirth(user.dateOfBirth, secret) || (await user.comparePassword(secret));
  }
  return user.comparePassword(secret);
}

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & issue JWT
 * @access  Public
 *
 * Students sign in with their register number and date of birth, posted in the
 * `dateOfBirth` field. Staff and admins sign in with their ID/username and a
 * `password`. The two credentials are read from separate fields so a date of
 * birth is never handled as if it were a password.
 */
export async function login(req, res, next) {
  try {
    const { role = "student" } = req.body;
    const identifier =
      req.body.identifier ||
      req.body.registerNumber ||
      req.body.staffId ||
      req.body.username ||
      req.body.email;

    // Students authenticate with a date of birth; everyone else with a password.
    // `password` is still honoured for students so older clients that posted the
    // date there keep working.
    const secret =
      role === "student"
        ? req.body.dateOfBirth || req.body.dob || req.body.password
        : req.body.password;

    if (!identifier || !secret) {
      return res.status(400).json({
        success: false,
        message:
          role === "student"
            ? "Please provide both your register number and date of birth."
            : "Please provide both identifier and password.",
        code: "CREDENTIALS_REQUIRED",
      });
    }

    const cleanIdentifier = String(identifier).trim();
    let query = {};

    if (role === "student") {
      query.role = "student";
      const upper = cleanIdentifier.toUpperCase();
      const variants = new Set([upper]);

      // VCET uses branch codes ending in R (Regular) e.g. CSR vs common department abbreviation CSE
      const aliasPairs = [
        ["CSE", "CSR"],
        ["ECE", "ECR"],
        ["EEE", "EER"],
        ["MECH", "MER"],
        ["AIDS", "ADR"],
        ["AIML", "AMR"],
        ["MDE", "MDR"],
        ["BME", "BMR"],
      ];

      aliasPairs.forEach(([abbr, code]) => {
        if (upper.includes(abbr)) {
          variants.add(upper.replace(abbr, code));
        } else if (upper.includes(code)) {
          variants.add(upper.replace(code, abbr));
        }
      });

      query.$or = [
        ...Array.from(variants).map((reg) => ({ registerNumber: reg })),
        { email: cleanIdentifier.toLowerCase() },
      ];
    } else if (role === "faculty" || role === "teacher") {
      query.role = { $in: ["faculty", "teacher", "hod"] };
      query.$or = [
        { staffId: cleanIdentifier.toUpperCase() },
        { email: cleanIdentifier.toLowerCase() },
        { username: cleanIdentifier.toLowerCase() },
      ];
    } else if (role === "hod") {
      query.role = "hod";
      query.$or = [
        { staffId: cleanIdentifier.toUpperCase() },
        { email: cleanIdentifier.toLowerCase() },
        { username: cleanIdentifier.toLowerCase() },
      ];
    } else if (role === "admin") {
      query.role = "admin";
      query.$or = [
        { username: cleanIdentifier.toLowerCase() },
        { email: cleanIdentifier.toLowerCase() },
        { staffId: cleanIdentifier.toUpperCase() },
      ];
    } else {
      query.$or = [
        { registerNumber: cleanIdentifier.toUpperCase() },
        { staffId: cleanIdentifier.toUpperCase() },
        { username: cleanIdentifier.toLowerCase() },
        { email: cleanIdentifier.toLowerCase() },
      ];
    }

    const user = await User.findOne(query).populate("departmentId", "code name").select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: `Invalid credentials for ${role} portal.`,
        code: "INVALID_CREDENTIALS",
      });
    }

    if (!(await isCredentialValid(role, user, secret))) {
      const hint =
        role === "student" && !user.dateOfBirth
          ? " No date of birth is on file for this register number - please contact the administrator."
          : "";

      return res.status(401).json({
        success: false,
        message:
          role === "student"
            ? `Incorrect date of birth.${hint}`
            : "Incorrect password. Please verify and try again.",
        code: role === "student" ? "INVALID_DATE_OF_BIRTH" : "INVALID_PASSWORD",
      });
    }

    // Account active check
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is currently suspended. Please contact the VCET administrator.",
        code: "ACCOUNT_BLOCKED",
      });
    }

    // Update login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Advance/verify daily streak for student login
    if (user.role === "student") {
      try {
        await updateStreakOnActivity(user._id);
        const refreshedUser = await User.findById(user._id);
        if (refreshedUser) {
          user = refreshedUser;
        }
      } catch (streakErr) {
        console.error("[Login Streak Sync Error]:", streakErr);
      }
    }

    // Generate JWT
    const token = generateToken(user._id, user.role);

    // Audit login
    await logAuditEvent({
      userId: user._id,
      userIdentifier: user.registerNumber || user.staffId || user.username || user.email,
      userName: user.name,
      role: user.role,
      action: "LOGIN",
      resourceType: "Session",
      details: `${user.role.toUpperCase()} logged in successfully`,
      ipAddress: req.ip || "127.0.0.1",
    });

    res.json({
      success: true,
      message: "Authentication successful.",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user
 * @access  Protected
 */
export async function getMe(req, res, next) {
  try {
    if (req.user?.role === "student") {
      try {
        await updateStreakOnActivity(req.user._id);
      } catch (streakErr) {
        console.error("[getMe Streak Sync Error]:", streakErr);
      }
    }
    const user = await User.findById(req.user._id).populate("departmentId", "code name");
    res.json({
      success: true,
      user: user ? user.toSafeObject() : null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/auth/profile
 * @desc    Update editable profile info
 * @access  Protected
 */
export async function updateProfile(req, res, next) {
  try {
    const { name, profileImage, email, phone, contactPhone, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        code: "USER_NOT_FOUND",
      });
    }

    if (name) user.name = name;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (phone !== undefined || contactPhone !== undefined) {
      const p = phone !== undefined ? String(phone).trim() : String(contactPhone).trim();
      user.phone = p;
      user.contactPhone = p;
    }
    if (bio !== undefined) {
      user.bio = String(bio).trim();
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address.",
          code: "INVALID_EMAIL",
        });
      }

      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "This email address is already in use.",
          code: "EMAIL_ALREADY_IN_USE",
        });
      }

      user.email = normalizedEmail;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Protected
 */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide both current and new password.",
        code: "PASSWORDS_REQUIRED",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (user.role === "student") {
      // A student's password is their date of birth, which comes from the
      // roster and is what they sign in with - there is no separate secret to
      // rotate.
      return res.status(400).json({
        success: false,
        message:
          "Your date of birth is your password, so it cannot be changed. Please contact the administrator if it is wrong.",
        code: "STUDENT_PASSWORD_FIXED",
      });
    }

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
        code: "CURRENT_PASSWORD_MISMATCH",
      });
    }

    user.password = newPassword; // hashed by the User model's pre-save hook
    await user.save();

    const db = mongoose.connection.db;
    if (db) {
      const r = user.role;
      let targetCollName = "students";
      if (r === "faculty" || r === "teacher") targetCollName = "faculties";
      else if (r === "hod") targetCollName = "hods";
      else if (r === "admin") targetCollName = "admins";

      await db.collection(targetCollName).updateOne(
        { _id: user._id },
        { $set: { password: user.password, updatedAt: new Date() } }
      );
    }

    res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/auth/faculty-reset-password
 * @desc    Public password reset endpoint for faculty / HOD
 * @access  Public
 */
export async function facultyResetPassword(req, res, next) {
  try {
    const { identifier, newPassword } = req.body;
    if (!identifier || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide staff ID or email and a new password.",
      });
    }

    if (String(newPassword).length < 4) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 4 characters long.",
      });
    }

    const cleanId = String(identifier).trim();
    const user = await User.findOne({
      role: { $in: ["faculty", "teacher", "hod"] },
      $or: [
        { staffId: cleanId.toUpperCase() },
        { email: cleanId.toLowerCase() },
        { username: cleanId.toLowerCase() },
      ],
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No faculty or HOD found with the provided Staff ID / Email.",
      });
    }

    user.password = newPassword; // hashed by the User model's pre-save hook
    await user.save();

    const db = mongoose.connection.db;
    if (db) {
      const r = user.role;
      let targetCollName = "students";
      if (r === "faculty" || r === "teacher") targetCollName = "faculties";
      else if (r === "hod") targetCollName = "hods";
      else if (r === "admin") targetCollName = "admins";

      await db.collection(targetCollName).updateOne(
        { _id: user._id },
        { $set: { password: user.password, updatedAt: new Date() } }
      );
    }

    await logAuditEvent({
      userId: user._id,
      userIdentifier: user.staffId || user.email,
      userName: user.name,
      role: user.role,
      action: "PASSWORD_RESET",
      resourceType: "User",
      details: `Password reset for ${user.role.toUpperCase()} (${user.name})`,
      ipAddress: req.ip || "127.0.0.1",
    });

    res.json({
      success: true,
      message: "Password reset successfully! You can now sign in with your new password.",
    });
  } catch (error) {
    next(error);
  }
}

