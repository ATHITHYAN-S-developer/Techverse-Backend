import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ENV } from "../config/env.js";
import { logAuditEvent } from "../services/auditService.js";
import { matchesDateOfBirth } from "../utils/dateOfBirth.js";

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
 * stored plain-text password. Students are matched on `dateOfBirth` only - a
 * student's stored password is not a login route, so a leaked shared roster
 * password cannot be used to impersonate a student.
 */
function isCredentialValid(role, user, secret) {
  if (role === "student") {
    return matchesDateOfBirth(user.dateOfBirth, secret);
  }
  return user.comparePassword(secret);
}

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & issue JWT
 * @access  Public
 *
 * Students sign in with their register number and date of birth. Staff and
 * admins sign in with their ID/username and a password. The frontend posts the
 * secret in the same `password` field for every role, so the credential is
 * interpreted according to the role.
 */
export async function login(req, res, next) {
  try {
    const { role = "student", password } = req.body;
    const identifier =
      req.body.identifier ||
      req.body.registerNumber ||
      req.body.staffId ||
      req.body.username ||
      req.body.email;

    if (!identifier || !password) {
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
    let query = { role };

    if (role === "student") {
      query.$or = [
        { registerNumber: cleanIdentifier.toUpperCase() },
        { email: cleanIdentifier.toLowerCase() },
      ];
    } else if (role === "teacher") {
      query.$or = [
        { staffId: cleanIdentifier.toUpperCase() },
        { email: cleanIdentifier.toLowerCase() },
        { username: cleanIdentifier.toLowerCase() },
      ];
    } else if (role === "admin") {
      query.$or = [
        { username: cleanIdentifier.toLowerCase() },
        { email: cleanIdentifier.toLowerCase() },
      ];
    }

    const user = await User.findOne(query).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: `Invalid credentials for ${role} portal.`,
        code: "INVALID_CREDENTIALS",
      });
    }

    if (!isCredentialValid(role, user, password)) {
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
    const { name, profileImage } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (profileImage !== undefined) user.profileImage = profileImage;

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

    if (!user.comparePassword(currentPassword)) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
        code: "CURRENT_PASSWORD_MISMATCH",
      });
    }

    user.password = newPassword; // Plain text
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
}
