import mongoose from "mongoose";
import { Announcement } from "../models/Announcement.js";
import { getPagination } from "../utils/pagination.js";
import { logAuditEvent } from "../services/auditService.js";
import { deleteUploadedFile } from "../utils/fileUpload.js";

/**
 * @route   GET /api/announcements
 * @desc    Get announcements with target filters
 * @access  Public
 */
export async function getAnnouncements(req, res, next) {
  try {
    const { departmentId, targetAudience, category, priority, isPinned, all } = req.query;
    const { page, limit, skip } = getPagination(req.query, 100);

    const query = {};
    if (all !== "true") {
      query.isActive = true;
      const now = new Date();
      // Only show circulars whose publishDate has arrived and have not expired
      query.publishDate = { $lte: now };
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { expiryDate: null },
            { expiryDate: { $exists: false } },
            { expiryDate: { $gt: now } },
          ],
        },
      ];
    }

    if (departmentId) {
      query.$or = [{ departmentId: null }, { departmentId }, { departmentId: { $exists: false } }];
    }
    if (targetAudience) {
      query.targetAudience = { $in: ["all", targetAudience] };
    }
    if (category && category !== "all") query.category = category;
    if (priority) query.priority = priority.toLowerCase();
    if (isPinned !== undefined) query.isPinned = isPinned === "true";

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .populate("departmentId", "code name")
        .populate({
          path: "createdBy",
          select: "name staffId role username email departmentId departmentName departmentCode department",
          populate: { path: "departmentId", select: "code name" },
        })
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Announcement.countDocuments(query),
    ]);

    res.json({
      success: true,
      announcements,
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
 * @route   GET /api/announcements/:id
 * @desc    Get single announcement
 * @access  Public
 */
export async function getAnnouncementById(req, res, next) {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate("departmentId", "code name")
      .populate({
        path: "createdBy",
        select: "name staffId role username email departmentId departmentName departmentCode department",
        populate: { path: "departmentId", select: "code name" },
      });

    if (!announcement || !announcement.isActive) {
      return res.status(404).json({ success: false, message: "Announcement not found." });
    }

    res.json({ success: true, announcement });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/announcements
 * @desc    Create announcement with optional poster image
 * @access  Protected (Teacher / Admin)
 */
export async function createAnnouncement(req, res, next) {
  try {
    const {
      title,
      description,
      content,
      category = "General",
      priority = "normal",
      departmentId,
      targetAudience = "all",
      isPinned = false,
      publishDate,
      expiryDate,
      imageUrl,
    } = req.body;

    const finalDescription = description || content;

    if (!title || !finalDescription) {
      return res.status(400).json({ success: false, message: "Title and description are required." });
    }

    // Deadline / End Date validation (stored in the existing `expiryDate` field).
    if (
      expiryDate !== undefined &&
      expiryDate !== null &&
      expiryDate !== "" &&
      Number.isNaN(new Date(expiryDate).getTime())
    ) {
      return res.status(400).json({ success: false, message: "The deadline/end date must be a valid date." });
    }
    // Faculty (teacher) publishes always need a deadline so announcements can be
    // classified CURRENT / UPCOMING / ENDED automatically (slideshow + past grid).
    if (
      req.user.role !== "admin" &&
      (expiryDate === undefined || expiryDate === null || expiryDate === "")
    ) {
      return res.status(400).json({ success: false, message: "Please select a deadline/end date." });
    }

    // Determine author's true department name
    const userDeptName =
      req.user.departmentName ||
      req.user.department ||
      req.user.departmentId?.name ||
      (req.user.departmentCode ? `${req.user.departmentCode} Department` : "") ||
      "";

    // Teacher / Faculty isolation: target department defaults to teacher's assigned department
    let targetDept = departmentId;
    if (req.user.role === "teacher" || req.user.role === "faculty" || req.user.role === "hod") {
      targetDept = req.user.departmentId?._id || req.user.departmentId;
    }
    if (!targetDept || targetDept === "All" || targetDept === "all" || !mongoose.Types.ObjectId.isValid(targetDept)) {
      targetDept = null;
    }

    // Process target departments (support array or comma-separated string)
    let depts = [];
    if (Array.isArray(req.body.departments)) {
      depts = req.body.departments;
    } else if (typeof req.body.departments === "string" && req.body.departments.trim()) {
      try {
        const parsed = JSON.parse(req.body.departments);
        depts = Array.isArray(parsed) ? parsed : [req.body.departments];
      } catch {
        depts = req.body.departments.split(",").map((s) => s.trim());
      }
    } else if (req.body.department) {
      depts = req.body.department.split(",").map((s) => s.trim());
    }
    depts = depts.filter(Boolean);

    // If faculty/teacher published and depts is default or legacy "CSE Department", adapt to their real department
    if (
      (req.user.role === "teacher" || req.user.role === "faculty") &&
      userDeptName &&
      (!depts.length || (depts.length === 1 && depts[0] === "CSE Department" && userDeptName !== "CSE Department"))
    ) {
      depts = [userDeptName];
    }

    if (!depts.length) depts = ["All"];
    const primaryDeptString = depts.includes("All") ? "All" : depts.join(", ");

    // Handle uploaded image via Multer
    let finalImage = "";
    let finalImageUrl = imageUrl || "";

    if (req.file) {
      finalImage = req.file.filename;
      finalImageUrl = `/uploads/announcements/${req.file.filename}`;
    }

    const normalizedPriority = (priority || "normal").toLowerCase();

    const newAnnouncement = await Announcement.create({
      title,
      description: finalDescription,
      content: finalDescription,
      category,
      priority: normalizedPriority,
      image: finalImage,
      imageUrl: finalImageUrl,
      departmentId: targetDept,
      department: primaryDeptString,
      departments: depts,
      targetAudience: targetAudience || "all",
      isPinned: isPinned === "true" || isPinned === true,
      publishDate: publishDate && !Number.isNaN(new Date(publishDate).getTime()) ? new Date(publishDate) : new Date(),
      expiryDate: expiryDate && !Number.isNaN(new Date(expiryDate).getTime()) ? new Date(expiryDate) : null,
      createdBy: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
      authorDepartment: userDeptName || (req.user.role === "admin" ? "Administration" : "VCET Official"),
      likes: [],
      likesCount: 0,
      isActive: true,
    });

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "CREATE",
      resourceType: "Announcement",
      resourceId: newAnnouncement._id.toString(),
      details: `Published announcement '${newAnnouncement.title}'`,
    });

    res.status(201).json({
      success: true,
      message: "Announcement created successfully.",
      announcement: newAnnouncement,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/announcements/:id
 * @desc    Update announcement with optional new poster image
 * @access  Protected (Teacher / Admin)
 */
export async function updateAnnouncement(req, res, next) {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found." });
    }

    // Teacher isolation check
    if (req.user.role === "teacher") {
      const isOwner = announcement.createdBy?.toString() === req.user._id.toString();
      const isSameDept = announcement.departmentId?.toString() === req.user.departmentId?.toString();
      if (!isOwner && !isSameDept) {
        return res.status(403).json({
          success: false,
          message: "You can only edit announcements created within your assigned department.",
        });
      }
    }

    const updates = { ...req.body };
    // Normalize deadline: empty string can't be stored in a Date field.
    if (updates.expiryDate === "" || updates.expiryDate === null || updates.expiryDate === "null") {
      updates.expiryDate = null;
    } else if (
      updates.expiryDate !== undefined &&
      Number.isNaN(new Date(updates.expiryDate).getTime())
    ) {
      return res.status(400).json({ success: false, message: "The deadline/end date must be a valid date." });
    } else if (updates.expiryDate) {
      updates.expiryDate = new Date(updates.expiryDate);
    }

    if (updates.publishDate && !Number.isNaN(new Date(updates.publishDate).getTime())) {
      updates.publishDate = new Date(updates.publishDate);
    }

    // Process departments if provided
    if (updates.departments !== undefined || updates.department !== undefined) {
      let depts = [];
      if (Array.isArray(updates.departments)) {
        depts = updates.departments;
      } else if (typeof updates.departments === "string" && updates.departments.trim()) {
        try {
          const parsed = JSON.parse(updates.departments);
          depts = Array.isArray(parsed) ? parsed : [updates.departments];
        } catch {
          depts = updates.departments.split(",").map((s) => s.trim());
        }
      } else if (updates.department) {
        depts = updates.department.split(",").map((s) => s.trim());
      }
      depts = depts.filter(Boolean);
      if (!depts.length) depts = ["All"];
      updates.departments = depts;
      updates.department = depts.includes("All") ? "All" : depts.join(", ");
    }

    if (updates.departmentId !== undefined) {
      if (!updates.departmentId || updates.departmentId === "All" || !mongoose.Types.ObjectId.isValid(updates.departmentId)) {
        updates.departmentId = null;
      }
    }
    if (updates.isPinned !== undefined) {
      updates.isPinned = updates.isPinned === "true" || updates.isPinned === true;
    }
    if (updates.priority) {
      updates.priority = updates.priority.toLowerCase();
    }

    // Issuer identity always comes from the authenticated session — never trust the client.
    delete updates.createdBy;
    delete updates.authorName;
    delete updates.authorRole;
    delete updates._id;
    delete updates.createdAt;
    if (updates.description) updates.content = updates.description;
    if (updates.content) updates.description = updates.content;

    // Handle new uploaded image if provided
    if (req.file) {
      if (announcement.image || announcement.imageUrl) {
        deleteUploadedFile(announcement.imageUrl || announcement.image, "announcements");
      }
      updates.image = req.file.filename;
      updates.imageUrl = `/uploads/announcements/${req.file.filename}`;
    }

    Object.assign(announcement, updates);
    await announcement.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "UPDATE",
      resourceType: "Announcement",
      resourceId: announcement._id.toString(),
      details: `Updated announcement '${announcement.title}'`,
    });

    res.json({
      success: true,
      message: "Announcement updated.",
      announcement,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/announcements/:id
 * @desc    Delete announcement permanently
 * @access  Protected (Teacher / Admin)
 */
export async function deleteAnnouncement(req, res, next) {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found." });
    }

    if (req.user.role === "teacher") {
      const isOwner = announcement.createdBy?.toString() === req.user._id.toString();
      const isSameDept = announcement.departmentId?.toString() === req.user.departmentId?.toString();
      if (!isOwner && !isSameDept) {
        return res.status(403).json({
          success: false,
          message: "You can only delete announcements within your assigned department.",
        });
      }
    }

    // Permanently remove image file from filesystem if one exists
    if (announcement.image || announcement.imageUrl) {
      deleteUploadedFile(announcement.imageUrl || announcement.image, "announcements");
    }

    await Announcement.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "DELETE",
      resourceType: "Announcement",
      resourceId: req.params.id,
      details: `Permanently removed announcement '${announcement.title}'`,
    });

    res.json({
      success: true,
      message: "Announcement permanently removed.",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/announcements/:id/like
 * @desc    Toggle like on an announcement
 * @access  Public (Optionally Authenticated)
 */
export async function toggleLikeAnnouncement(req, res, next) {
  try {
    const isId = mongoose.Types.ObjectId.isValid(req.params.id);
    const announcement = isId
      ? await Announcement.findById(req.params.id)
      : await Announcement.findOne({ title: req.params.id });

    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found." });
    }

    if (!Array.isArray(announcement.likes)) {
      announcement.likes = [];
    }

    const userId = req.user?._id;
    let isLiked = false;

    if (userId) {
      const idx = announcement.likes.findIndex((id) => id && id.toString() === userId.toString());
      if (idx > -1) {
        announcement.likes.splice(idx, 1);
        isLiked = false;
      } else {
        announcement.likes.push(userId);
        isLiked = true;
      }
      announcement.likesCount = announcement.likes.length;
    } else {
      const action = req.body?.action || "toggle";
      if (action === "unlike") {
        announcement.likesCount = Math.max(0, (announcement.likesCount || 1) - 1);
        isLiked = false;
      } else {
        announcement.likesCount = (announcement.likesCount || 0) + 1;
        isLiked = true;
      }
    }

    await announcement.save();

    res.json({
      success: true,
      isLiked,
      likesCount: announcement.likesCount,
    });
  } catch (error) {
    next(error);
  }
}

