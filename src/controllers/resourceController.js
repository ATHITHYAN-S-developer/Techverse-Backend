import { Resource } from "../models/Resource.js";
import { getPagination } from "../utils/pagination.js";
import { generateCustomId } from "../utils/generateId.js";
import { logAuditEvent } from "../services/auditService.js";

/**
 * @route   GET /api/resources
 * @desc    Get resources with filtering and pagination
 * @access  Public
 */
export async function getResources(req, res, next) {
  try {
    const { departmentId, subjectId, classId, type, unit, search } = req.query;
    const { page, limit, skip } = getPagination(req.query, 20);

    const query = { isPublished: true };

    if (departmentId) query.departmentId = departmentId;
    if (subjectId) query.subjectId = subjectId;
    if (classId) query.classId = classId;
    if (type) query.type = type;
    if (unit) query.unit = Number(unit);

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const [resources, total] = await Promise.all([
      Resource.find(query)
        .populate("departmentId", "code name")
        .populate("subjectId", "code name")
        .populate("uploadedBy", "name staffId role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Resource.countDocuments(query),
    ]);

    res.json({
      success: true,
      resources,
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
 * @route   GET /api/resources/:id
 * @desc    Get single resource
 * @access  Public
 */
export async function getResourceById(req, res, next) {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate("departmentId", "code name")
      .populate("subjectId", "code name")
      .populate("uploadedBy", "name staffId role");

    if (!resource || resource.status !== "active") {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    res.json({ success: true, resource });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/resources
 * @desc    Upload / create new resource
 * @access  Protected (Teacher / Admin)
 */
export async function createResource(req, res, next) {
  try {
    const {
      title,
      description,
      departmentId,
      subjectId,
      classId,
      type = "notes",
      fileUrl,
      fileSize,
      fileType,
      unit,
      tags = [],
    } = req.body;

    if (!title || !departmentId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "Title, Department ID, and Subject ID are required.",
      });
    }

    // Auto-derive file information if uploaded via multipart
    let finalFileUrl = fileUrl;
    let finalFileSize = fileSize;
    let finalFileType = fileType;

    if (req.file) {
      finalFileUrl = `/uploads/${req.file.filename}`;
      finalFileSize = `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`;
      finalFileType = req.file.mimetype;
    }

    const _id = generateCustomId("res");

    const newResource = await Resource.create({
      _id,
      title,
      description,
      departmentId,
      subjectId,
      classId,
      type,
      fileUrl: finalFileUrl || "https://vcet.ac.in/resources/sample.pdf",
      fileSize: finalFileSize || "2.4 MB",
      fileType: finalFileType || "application/pdf",
      unit: unit ? Number(unit) : undefined,
      tags: Array.isArray(tags) ? tags : String(tags).split(",").map(t => t.trim()),
      uploadedBy: req.user._id,
      uploaderRole: req.user.role,
    });

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "CREATE",
      resourceType: "Resource",
      resourceId: newResource._id,
      details: `Created resource '${newResource.title}' in department '${departmentId}'`,
    });

    res.status(201).json({
      success: true,
      message: "Resource uploaded successfully.",
      resource: newResource,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/resources/:id
 * @desc    Update resource
 * @access  Protected (Teacher / Admin)
 */
export async function updateResource(req, res, next) {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    // Enforce teacher department isolation
    if (req.user.role === "teacher" && resource.departmentId !== req.user.departmentId) {
      return res.status(403).json({
        success: false,
        message: "You can only modify resources within your assigned department.",
      });
    }

    Object.assign(resource, req.body);
    await resource.save();

    res.json({
      success: true,
      message: "Resource updated successfully.",
      resource,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/resources/:id
 * @desc    Soft delete resource
 * @access  Protected (Teacher / Admin)
 */
export async function deleteResource(req, res, next) {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    if (req.user.role === "teacher" && resource.departmentId !== req.user.departmentId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete resources within your assigned department.",
      });
    }

    resource.status = "archived";
    await resource.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "DELETE",
      resourceType: "Resource",
      resourceId: resource._id,
      details: `Deleted/archived resource '${resource.title}'`,
    });

    res.json({
      success: true,
      message: "Resource removed successfully.",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/resources/:id/download
 * @desc    Increment download counter
 * @access  Public
 */
export async function trackDownload(req, res, next) {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    res.json({
      success: true,
      downloadCount: resource.downloadCount,
    });
  } catch (error) {
    next(error);
  }
}
