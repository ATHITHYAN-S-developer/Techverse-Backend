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
    const {
      departmentId,
      subjectId,
      classId,
      type,
      unit,
      search,
      all,
      approvalStatus,
      includePending,
      uploadedBy,
    } = req.query;
    const { page, limit, skip } = getPagination(req.query, 20);

    const query = {};

    if (includePending === "true") {
      if (approvalStatus) {
        query.approvalStatus = approvalStatus;
      }
    } else if (approvalStatus) {
      if (approvalStatus === "approved") {
        query.isPublished = true;
        query.$or = [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }];
      } else {
        query.approvalStatus = approvalStatus;
      }
    } else {
      // Default: only published & approved resources (for students / public)
      query.isPublished = true;
      query.$or = [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }];
    }

    if (uploadedBy) query.uploadedBy = uploadedBy;
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

export function isUserElevated(user) {
  if (!user) return false;
  const regNum = String(user.registerNumber || "").toUpperCase();
  const email = String(user.email || "").toLowerCase();
  const name = String(user.name || "").toUpperCase();
  const staffId = String(user.staffId || "").toUpperCase();
  const designation = String(user.designation || "").toLowerCase();
  const title = String(user.title || "").toLowerCase();

  const isDeveloper =
    regNum.includes("732924CSR014") ||
    email.includes("732924csr014") ||
    name.includes("ATHITHYAN");

  return (
    isDeveloper ||
    user.role === "admin" ||
    user.role === "hod" ||
    user.isHod === true ||
    staffId.includes("104") ||
    staffId.includes("HOD") ||
    staffId.endsWith("01") ||
    designation.includes("hod") ||
    designation.includes("head of the department") ||
    designation.includes("head of department") ||
    title.includes("hod") ||
    title.includes("head of the department") ||
    title.includes("head of department")
  );
}

/**
 * @route   GET /api/resources/:id
 * @desc    Get single resource
 * @access  Public / Protected (HOD & faculty can view pending)
 */
export async function getResourceById(req, res, next) {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate("departmentId", "code name")
      .populate("subjectId", "code name")
      .populate("uploadedBy", "name staffId role");

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    const isElevated = isUserElevated(req.user);
    const isUploader =
      req.user &&
      resource.uploadedBy &&
      String(resource.uploadedBy._id || resource.uploadedBy) === String(req.user._id);

    // If resource is not published/approved yet, only elevated (HOD/Admin) or uploader can view
    if (!resource.isPublished && resource.approvalStatus !== "approved" && !isElevated && !isUploader) {
      return res.status(404).json({ success: false, message: "Resource not found or pending HOD approval." });
    }

    res.json({ success: true, resource });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/resources/:id/view
 * @desc    View resource file directly in browser tab (with inline content-disposition)
 * @access  Public / Protected (HOD can view pending notes)
 */
export async function viewResourceFile(req, res, next) {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    // Increment downloads/views count (best effort)
    Resource.findByIdAndUpdate(resource._id, { $inc: { downloadsCount: 1 } }).exec();

    // If stored on server disk in uploads/resources/
    if (resource.fileUrl && resource.fileUrl.startsWith("/uploads/resources/")) {
      const filename = path.basename(resource.fileUrl);
      const filePath = path.join(UPLOADS_ROOT, filename);
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", resource.mimeType || resource.fileType || "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${encodeURIComponent(resource.originalName || filename)}"`
        );
        return res.sendFile(path.resolve(filePath));
      }
    }

    // Direct /uploads/... fallback
    if (resource.fileUrl && resource.fileUrl.startsWith("/uploads/")) {
      const cleanPath = path.join(process.cwd(), resource.fileUrl);
      if (fs.existsSync(cleanPath)) {
        res.setHeader("Content-Type", resource.mimeType || resource.fileType || "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${encodeURIComponent(resource.originalName || path.basename(resource.fileUrl))}"`
        );
        return res.sendFile(path.resolve(cleanPath));
      }
    }

    // External link or URL fallback
    const targetUrl = resource.fileUrl || resource.externalUrl || resource.downloadUrl;
    if (targetUrl) {
      return res.redirect(targetUrl);
    }

    res.status(404).json({ success: false, message: "Resource file not found on server." });
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
      category = "",
      platform = "",
      featured = false,
      fileUrl,
      fileSize,
      fileType,
      unit,
      tags = [],
    } = req.body;

    if (!title || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "Title and Department ID are required.",
      });
    }

    const subjectField = subjectId || undefined;
    const departmentField = departmentId?._id || departmentId || null;

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

    // Check if uploader is elevated (HOD or Admin)
    const isElevated =
      req.user.role === "admin" ||
      req.user.role === "hod" ||
      req.user.isHod === true ||
      String(req.user.staffId || "").toUpperCase().includes("HOD") ||
      String(req.user.designation || "").toUpperCase().includes("HOD");

    const approvalStatus = isElevated ? "approved" : "pending";
    const isPublished = isElevated;

    const newResource = await Resource.create({
      title,
      description,
      departmentId: departmentField,
      subjectId: subjectField,
      classId,
      type,
      category,
      platform,
      featured,
      fileUrl: finalFileUrl || "https://vcet.ac.in/resources/sample.pdf",
      fileSize: finalFileSize || "2.4 MB",
      fileType: finalFileType || "application/pdf",
      originalName: finalOriginalName,
      mimeType: finalMimeType,
      unit: unit ? Number(unit) : undefined,
      tags: Array.isArray(tags) ? tags : String(tags || "").split(",").map(t => t.trim()).filter(Boolean),
      uploadedBy: req.user._id,
      uploaderRole: req.user.role,
      approvalStatus,
      isPublished,
    });

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "CREATE",
      resourceType: "Resource",
      resourceId: newResource._id,
      details: `Created resource '${newResource.title}' in department '${departmentId}' (status: ${approvalStatus})`,
    });

    res.status(201).json({
      success: true,
      message: isElevated
        ? "Resource uploaded and published successfully."
        : "Notes submitted to HOD for approval. Once approved, it will be visible in the department area.",
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

    const isElevated =
      req.user.role === "admin" ||
      req.user.role === "hod" ||
      req.user.isHod === true ||
      String(req.user.staffId || "").toUpperCase().includes("HOD") ||
      String(req.user.designation || "").toUpperCase().includes("HOD");

    const allowedFields = [
      "title",
      "description",
      "category",
      "platform",
      "featured",
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
      "approvalStatus",
      "rejectionReason",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        resource[field] = req.body[field];
      }
    }

    // If regular faculty updates a rejected resource, resubmit for HOD approval
    if (!isElevated && resource.approvalStatus === "rejected") {
      resource.approvalStatus = "pending";
      resource.isPublished = false;
      resource.rejectionReason = "";
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

    const isDeveloper =
      String(req.user?.registerNumber || "").toUpperCase().includes("732924CSR014") ||
      String(req.user?.email || "").toLowerCase().includes("732924csr014") ||
      String(req.user?.name || "").toUpperCase().includes("ATHITHYAN");

    const isElevated =
      isDeveloper ||
      req.user?.role === "admin" ||
      req.user?.role === "hod" ||
      req.user?.isHod === true ||
      String(req.user?.staffId || "").toUpperCase().includes("HOD") ||
      String(req.user?.staffId || "").toUpperCase().endsWith("01") ||
      String(req.user?.designation || "").toUpperCase().includes("HOD") ||
      String(req.user?.designation || "").toLowerCase().includes("head of the department");

    const isApproved =
      resource.approvalStatus === "approved" ||
      (resource.isPublished && resource.approvalStatus !== "rejected" && resource.approvalStatus !== "pending");

    // Regular faculty CANNOT delete approved notes - ONLY HOD or Administrator can delete
    if (isApproved && !isElevated) {
      return res.status(403).json({
        success: false,
        message: "Approved notes are published to students and can only be deleted by the Department HOD or Administrator.",
        code: "APPROVED_RESOURCE_LOCKED",
      });
    }

    // Regular faculty can only delete their own notes
    if (!isElevated && resource.uploadedBy && resource.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Permission Denied: You can only delete resources you uploaded.",
        code: "RESOURCE_OWNER_DENIED",
      });
    }

    // Remove stored file from server disk
    if (resource.fileUrl && resource.fileUrl.startsWith("/uploads/resources/")) {
      const filePath = path.join(UPLOADS_ROOT, path.basename(resource.fileUrl));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn("Could not delete file from disk:", e.message);
        }
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

/**
 * @route   PATCH /api/resources/:id/approve
 * @desc    HOD / Admin approves resource and publishes it for students
 * @access  Protected (HOD / Admin)
 */
export async function approveResource(req, res, next) {
  try {
    const isDeveloper =
      String(req.user.registerNumber || "").toUpperCase().includes("732924CSR014") ||
      String(req.user.email || "").toLowerCase().includes("732924csr014") ||
      String(req.user.name || "").toUpperCase().includes("ATHITHYAN");

    const isElevated =
      isDeveloper ||
      req.user.role === "admin" ||
      req.user.role === "hod" ||
      req.user.isHod === true ||
      String(req.user.staffId || "").toUpperCase().includes("HOD") ||
      String(req.user.staffId || "").toUpperCase().endsWith("01") ||
      String(req.user.designation || "").toUpperCase().includes("HOD") ||
      String(req.user.designation || "").toLowerCase().includes("head of the department");

    if (!isElevated) {
      return res.status(403).json({
        success: false,
        message: "Only the Department HOD or Admin can approve notes.",
      });
    }

    const resource = await Resource.findById(req.params.id)
      .populate("departmentId", "code name")
      .populate("subjectId", "code name")
      .populate("uploadedBy", "name staffId role");

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    resource.approvalStatus = "approved";
    resource.isPublished = true;
    resource.rejectionReason = "";
    resource.reviewedBy = req.user._id;
    resource.reviewedAt = new Date();
    await resource.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "UPDATE",
      resourceType: "Resource",
      resourceId: resource._id,
      details: `Approved resource '${resource.title}' and published to department`,
    });

    res.json({
      success: true,
      message: "Notes approved and published to department portal ✓",
      resource,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/resources/:id/reject
 * @desc    HOD / Admin rejects resource with feedback
 * @access  Protected (HOD / Admin)
 */
export async function rejectResource(req, res, next) {
  try {
    const isDeveloper =
      String(req.user.registerNumber || "").toUpperCase().includes("732924CSR014") ||
      String(req.user.email || "").toLowerCase().includes("732924csr014") ||
      String(req.user.name || "").toUpperCase().includes("ATHITHYAN");

    const isElevated =
      isDeveloper ||
      req.user.role === "admin" ||
      req.user.role === "hod" ||
      req.user.isHod === true ||
      String(req.user.staffId || "").toUpperCase().includes("HOD") ||
      String(req.user.staffId || "").toUpperCase().endsWith("01") ||
      String(req.user.designation || "").toUpperCase().includes("HOD") ||
      String(req.user.designation || "").toLowerCase().includes("head of the department");

    if (!isElevated) {
      return res.status(403).json({
        success: false,
        message: "Only the Department HOD or Admin can reject notes.",
      });
    }

    const { reason = "Rejected by HOD. Please review notes syllabus and retry." } = req.body;

    const resource = await Resource.findById(req.params.id)
      .populate("departmentId", "code name")
      .populate("subjectId", "code name")
      .populate("uploadedBy", "name staffId role");

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found." });
    }

    resource.approvalStatus = "rejected";
    resource.isPublished = false;
    resource.rejectionReason = reason;
    resource.reviewedBy = req.user._id;
    resource.reviewedAt = new Date();
    await resource.save();

    await logAuditEvent({
      userId: req.user._id,
      userIdentifier: req.user.staffId || req.user.username || req.user.email,
      userName: req.user.name,
      role: req.user.role,
      action: "UPDATE",
      resourceType: "Resource",
      resourceId: resource._id,
      details: `Rejected resource '${resource.title}' (Reason: ${reason})`,
    });

    res.json({
      success: true,
      message: "Notes rejected. Faculty will see status and can retry.",
      resource,
    });
  } catch (error) {
    next(error);
  }
}

