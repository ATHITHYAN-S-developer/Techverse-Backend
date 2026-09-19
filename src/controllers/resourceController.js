import fs from "fs";
import path from "path";
import { Resource } from "../models/Resource.js";
import { Department } from "../models/Department.js";
import { Subject } from "../models/Subject.js";
import { getPagination } from "../utils/pagination.js";
import { logAuditEvent } from "../services/auditService.js";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads", "resources");

/**
 * @route   GET /api/resources
 * @desc    Get resources with filtering and pagination
 * @access  Public
 */
export async function getResources(req, res, next) {
  try {
    const { departmentId, subjectId, classId, type, unit, search, all } = req.query;
    const { page, limit, skip } = getPagination(req.query, 20);

    const query = { isPublished: true };

    if (departmentId) query.departmentId = departmentId;
    if (subjectId) query.subjectId = subjectId;
    if (classId) query.classId = classId;
    if (type) query.type = type;
    if (unit) query.unit = Number(unit);

    // Hidden content belonging to deactivated departments/subjects
    if (all !== "true") {
      const activeDeptIds = await Department.find({ isActive: true }).distinct("_id");
      if (departmentId) {
        query.$and = [{ departmentId: { $in: activeDeptIds } }];
      } else {
        query.departmentId = { $in: activeDeptIds };
      }

      if (!subjectId) {
        const activeSubjectIds = await Subject.find({ isActive: true }).distinct("_id");
        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              { subjectId: { $in: activeSubjectIds } },
              { subjectId: null },
              { subjectId: { $exists: false } },
            ],
          },
        ];
      }
    }

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

    if (!resource || !resource.isPublished) {
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
    let finalFileUrl = fileUrl || req.body.externalUrl || "";
    let finalFileSize = fileSize;
    let finalFileType = fileType;
    let finalOriginalName = "";
    let finalMimeType = "";

    if (req.file) {
      finalFileUrl = `/uploads/resources/${req.file.filename}`;
      finalFileSize = `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`;
      finalFileType = req.file.mimetype;
      finalOriginalName = req.file.originalname;
      finalMimeType = req.file.mimetype;
    }

    const newResource = await Resource.create({
      title,
      description,
      departmentId,
      subjectId,
      classId,
      type,
      fileUrl: finalFileUrl || "https://vcet.ac.in/resources/sample.pdf",
      fileSize: finalFileSize || "2.4 MB",
      fileType: finalFileType || "application/pdf",
      originalName: finalOriginalName,
      mimeType: finalMimeType,
      unit: unit ? Number(unit) : undefined,
      tags: Array.isArray(tags) ? tags : String(tags || "").split(",").map(t => t.trim()).filter(Boolean),
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
    const resource = req.targetResource || (await Resource.findById(req.params.id));
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    const allowedFields = [
      "title",
      "description",
      "subjectId",
      "classId",
      "type",
      "unit",
      "tags",
      "fileUrl",
      "externalUrl",
      "downloadUrl",
      "fileSize",
      "isPublished",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        resource[field] = req.body[field];
      }
    }

    // Optional file replacement
    if (req.file) {
      // Remove previous stored file (if it lived on this server)
      if (resource.fileUrl && resource.fileUrl.startsWith("/uploads/resources/")) {
        const oldPath = path.join(UPLOADS_ROOT, path.basename(resource.fileUrl));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      resource.fileUrl = `/uploads/resources/${req.file.filename}`;
      resource.fileSize = `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`;
      resource.fileType = req.file.mimetype;
      resource.originalName = req.file.originalname;
      resource.mimeType = req.file.mimetype;
    }

    if (resource.tags && typeof resource.tags === "string") {
      resource.tags = resource.tags.split(",").map(t => t.trim()).filter(Boolean);
    }

    await resource.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "UPDATE",
      resourceType: "Resource",
      resourceId: resource._id,
      details: `Updated resource '${resource.title}'`,
    });

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
 * @desc    Hard delete resource + remove stored file
 * @access  Protected (Teacher / Admin)
 */
export async function deleteResource(req, res, next) {
  try {
    const resource = req.targetResource || (await Resource.findById(req.params.id));
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    // Remove stored file from server disk
    if (resource.fileUrl && resource.fileUrl.startsWith("/uploads/resources/")) {
      const filePath = path.join(UPLOADS_ROOT, path.basename(resource.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await resource.deleteOne();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "DELETE",
      resourceType: "Resource",
      resourceId: resource._id,
      details: `Deleted resource '${resource.title}'${resource.originalName ? ` (${resource.originalName})` : ""}`,
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
      { $inc: { downloadsCount: 1 } },
      { new: true }
    );

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    res.json({
      success: true,
      downloadsCount: resource.downloadsCount,
    });
  } catch (error) {
    next(error);
  }
}
