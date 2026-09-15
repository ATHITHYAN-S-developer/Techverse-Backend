import { Announcement } from "../models/Announcement.js";
import { getPagination } from "../utils/pagination.js";
import { logAuditEvent } from "../services/auditService.js";

/**
 * @route   GET /api/announcements
 * @desc    Get announcements with target filters
 * @access  Public
 */
export async function getAnnouncements(req, res, next) {
  try {
    const { departmentId, targetAudience, category, priority, isPinned } = req.query;
    const { page, limit, skip } = getPagination(req.query, 15);

    const query = { isActive: true };

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
        .populate("createdBy", "name staffId role username")
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
      .populate("createdBy", "name staffId role username");

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

    // Teacher isolation: If teacher, target department must be teacher's assigned department
    let targetDept = departmentId;
    if (req.user.role === "teacher") {
      targetDept = req.user.departmentId;
    }

    // Handle uploaded image via Multer
    let finalImage = "";
    let finalImageUrl = imageUrl || "";

    if (req.file) {
      finalImage = req.file.filename;
      finalImageUrl = `/uploads/announcements/${req.file.filename}`;
    }

    const newAnnouncement = await Announcement.create({
      title,
      description: finalDescription,
      content: finalDescription,
      category,
      priority: priority.toLowerCase(),
      image: finalImage,
      imageUrl: finalImageUrl,
      departmentId: targetDept || null,
      targetAudience,
      isPinned: isPinned === "true" || isPinned === true,
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      createdBy: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
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
    if (updates.description) updates.content = updates.description;
    if (updates.content) updates.description = updates.content;

    // Handle new uploaded image if provided
    if (req.file) {
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
 * @desc    Soft delete announcement
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

    announcement.isActive = false;
    await announcement.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "DELETE",
      resourceType: "Announcement",
      resourceId: announcement._id.toString(),
      details: `Removed announcement '${announcement.title}'`,
    });

    res.json({
      success: true,
      message: "Announcement removed.",
    });
  } catch (error) {
    next(error);
  }
}
