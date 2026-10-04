import { PlacementEvent } from "../models/PlacementEvent.js";
import { getPagination } from "../utils/pagination.js";
import { logAuditEvent } from "../services/auditService.js";

/**
 * Normalise a client date into UTC midnight.
 * "2026-10-15" and "2026-10-15T00:00:00.000Z" both land on the same instant, so
 * the page's `String(date).slice(0, 10)` always returns the intended day.
 */
function toUtcMidnight(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function isValidDate(value) {
  if (value === undefined || value === null || value === "") return false;
  return !Number.isNaN(new Date(value).getTime());
}

function resolvePosterFields({ poster, imageUrl, image, file }) {
  let finalImage = image || "";
  let finalImageUrl = imageUrl || "";
  let finalPoster = poster || "";

  if (file) {
    finalImage = file.filename;
    finalImageUrl = `/uploads/placement-events/${file.filename}`;
    finalPoster = finalImageUrl;
  } else if (finalImage && !finalImageUrl && !finalPoster) {
    finalImageUrl = finalImage.startsWith("http") ? finalImage : `/uploads/placement-events/${finalImage}`;
    finalPoster = finalImageUrl;
  }

  return { image: finalImage, imageUrl: finalImageUrl, poster: finalPoster };
}

/**
 * @route   GET /api/placement-events
 * @desc    List placement drives for the /placement page
 * @access  Public
 *
 * The frontend requires the exact envelope `{ success, placementEvents }` —
 * frontend/src/services/placementEventService.js treats any other shape as
 * "no events" and flags the backend as unreachable.
 */
export async function getPlacementEvents(req, res, next) {
  try {
    const { category, departmentId, search, includePast, all } = req.query;
    const { page: safePage, limit: safeLimit, skip } = getPagination(req.query, 100);

    const query = {};
    if (all !== "true") {
      query.isActive = true;
    }

    if (category && category !== "all") query.category = category;
    if (departmentId) query.departmentId = departmentId;
    if (search) {
      const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: rx }, { subtitle: rx }, { organiser: rx }, { description: rx }];
    }
    if (includePast === "false") {
      query.date = { $gte: toUtcMidnight(new Date()) };
    }

    const [placementEvents, total] = await Promise.all([
      PlacementEvent.find(query)
        .populate("departmentId", "code name")
        .populate("createdBy", "name staffId role username email")
        .sort({ isPinned: -1, postedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      PlacementEvent.countDocuments(query),
    ]);

    res.json({
      success: true,
      placementEvents,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/placement-events/:id
 * @desc    Get a single placement event
 * @access  Public
 */
export async function getPlacementEventById(req, res, next) {
  try {
    const placementEvent = await PlacementEvent.findById(req.params.id)
      .populate("departmentId", "code name")
      .populate("createdBy", "name staffId role username email");

    if (!placementEvent || !placementEvent.isActive) {
      return res.status(404).json({ success: false, message: "Placement event not found." });
    }

    res.json({ success: true, placementEvent });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/placement-events
 * @desc    Create a placement event with an optional poster image
 * @access  Protected (Teacher / Admin)
 */
export async function createPlacementEvent(req, res, next) {
  try {
    const {
      title,
      subtitle,
      badge,
      category = "it-software",
      date,
      time = "",
      venue = "VCET Campus",
      organiser = "Career Development Cell",
      departmentId,
      description = "",
      tags = [],
      linkUrl = "",
      linkText = "View Details",
      postedAt,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: "Title is required." });
    }
    if (!isValidDate(date)) {
      return res.status(400).json({ success: false, message: "A valid event date is required." });
    }

    // Teacher isolation: teachers may only publish into their own department.
    let targetDept = departmentId || null;
    if (req.user.role === "teacher") {
      targetDept = req.user.departmentId || null;
    }

    const posterFields = resolvePosterFields({ ...req.body, file: req.file });

    const placementEvent = await PlacementEvent.create({
      title: String(title).trim(),
      subtitle,
      badge,
      category,
      date: toUtcMidnight(date),
      time,
      venue,
      organiser,
      departmentId: targetDept,
      description,
      tags: Array.isArray(tags) ? tags : String(tags).split(",").map((t) => t.trim()).filter(Boolean),
      linkUrl,
      linkText,
      postedAt: isValidDate(postedAt) ? new Date(postedAt) : new Date(),
      createdBy: req.user._id,
      isActive: true,
      ...posterFields,
    });

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "CREATE",
      resourceType: "PlacementEvent",
      resourceId: placementEvent._id.toString(),
      details: `Created placement event '${placementEvent.title}'`,
    });

    res.status(201).json({
      success: true,
      message: "Placement event created successfully.",
      placementEvent,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/placement-events/:id
 * @desc    Update a placement event with an optional new poster
 * @access  Protected (Teacher / Admin)
 */
export async function updatePlacementEvent(req, res, next) {
  try {
    const placementEvent = await PlacementEvent.findById(req.params.id);
    if (!placementEvent) {
      return res.status(404).json({ success: false, message: "Placement event not found." });
    }

    if (req.user.role === "teacher") {
      const isOwner = placementEvent.createdBy?.toString() === req.user._id.toString();
      const isSameDept = placementEvent.departmentId?.toString() === req.user.departmentId?.toString();
      if (!isOwner && !isSameDept) {
        return res.status(403).json({
          success: false,
          message: "You can only edit placement events created within your assigned department.",
        });
      }
    }

    const updates = { ...req.body };
    // Issuer identity and storage internals always come from the session.
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.createdBy;

    if (updates.date !== undefined) {
      if (!isValidDate(updates.date)) {
        return res.status(400).json({ success: false, message: "The event date must be a valid date." });
      }
      updates.date = toUtcMidnight(updates.date);
    }

    if (updates.tags !== undefined && !Array.isArray(updates.tags)) {
      updates.tags = String(updates.tags).split(",").map((t) => t.trim()).filter(Boolean);
    }

    Object.assign(placementEvent, resolvePosterFields({ ...placementEvent.toObject(), ...updates, file: req.file }));
    await placementEvent.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "UPDATE",
      resourceType: "PlacementEvent",
      resourceId: placementEvent._id.toString(),
      details: `Updated placement event '${placementEvent.title}'`,
    });

    res.json({
      success: true,
      message: "Placement event updated.",
      placementEvent,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/placement-events/:id
 * @desc    Delete a placement event permanently
 * @access  Protected (Teacher / Admin)
 */
export async function deletePlacementEvent(req, res, next) {
  try {
    const placementEvent = await PlacementEvent.findById(req.params.id);
    if (!placementEvent) {
      return res.status(404).json({ success: false, message: "Placement event not found." });
    }

    if (req.user.role === "teacher") {
      const isOwner = placementEvent.createdBy?.toString() === req.user._id.toString();
      const isSameDept = placementEvent.departmentId?.toString() === req.user.departmentId?.toString();
      if (!isOwner && !isSameDept) {
        return res.status(403).json({
          success: false,
          message: "You can only delete placement events within your assigned department.",
        });
      }
    }

    await PlacementEvent.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "DELETE",
      resourceType: "PlacementEvent",
      resourceId: req.params.id,
      details: `Permanently removed placement event '${placementEvent.title}'`,
    });

    res.json({
      success: true,
      message: "Placement event permanently removed.",
    });
  } catch (error) {
    next(error);
  }
}
