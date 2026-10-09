import { TechPulsePost } from "../models/TechPulsePost.js";
import { deleteUploadedFile } from "../utils/fileUpload.js";
import { logAuditEvent } from "../services/auditService.js";

const LOGO_FOLDER = "tech-pulse";

const auditActor = (req, action, post, details) =>
  logAuditEvent({
    userId: req.user._id,
    userIdentifier: req.user.staffId || req.user.username || req.user.email,
    userName: req.user.name,
    role: req.user.role,
    action,
    resourceType: "TechPulsePost",
    resourceId: post?._id?.toString(),
    details,
  });

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags;
  return String(tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function toBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return value === "true" || value === true;
}

/**
 * @route   GET /api/tech-pulse
 * @desc    Published Tech Pulse posts, newest first
 * @access  Public
 */
export async function getTechPulsePosts(req, res, next) {
  try {
    const posts = await TechPulsePost.find({ isPublished: true })
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 });

    res.json({ success: true, posts });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/tech-pulse/count
 * @desc    Number of published posts (homepage badge)
 * @access  Public
 */
export async function getTechPulseCount(req, res, next) {
  try {
    const count = await TechPulsePost.countDocuments({ isPublished: true });
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/tech-pulse/admin
 * @desc    Every post including drafts, for the admin manager
 * @access  Protected (Admin)
 */
export async function getTechPulseAdminPosts(req, res, next) {
  try {
    const posts = await TechPulsePost.find()
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 });

    res.json({ success: true, posts });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/tech-pulse/:id
 * @desc    Single post
 * @access  Public
 */
export async function getTechPulsePostById(req, res, next) {
  try {
    const post = await TechPulsePost.findById(req.params.id).populate(
      "createdBy",
      "name role"
    );

    if (!post || (post.isPublished === false && req.user?.role !== "admin")) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    res.json({ success: true, post });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/tech-pulse
 * @desc    Publish a Tech Pulse post (optional logo upload)
 * @access  Protected (Admin)
 */
export async function createTechPulsePost(req, res, next) {
  try {
    const { title, url, description = "", category = "", platform = "", tags = [] } = req.body;

    if (!title || !url) {
      if (req.file?.path) deleteUploadedFile(req.file.filename, LOGO_FOLDER);
      return res.status(400).json({
        success: false,
        message: "Title and URL are required.",
      });
    }

    const post = await TechPulsePost.create({
      title: title.trim(),
      url: url.trim(),
      description,
      category: category || "General",
      platform,
      tags: normalizeTags(tags),
      featured: toBoolean(req.body.featured),
      isPublished: toBoolean(req.body.isPublished, true),
      logoUrl: req.file ? req.file.filename : "",
      createdBy: req.user._id,
    });

    await auditActor(req, "CREATE", post, `Published Tech Pulse post '${post.title}'`);

    res.status(201).json({ success: true, message: "Post published.", post });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/tech-pulse/:id
 * @desc    Edit a post, optionally replacing the logo
 * @access  Protected (Admin)
 */
export async function updateTechPulsePost(req, res, next) {
  try {
    const post = await TechPulsePost.findById(req.params.id);
    if (!post) {
      if (req.file?.path) deleteUploadedFile(req.file.filename, LOGO_FOLDER);
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    const { title, url, description, category, platform, tags, removeLogo } = req.body;

    if (title !== undefined) post.title = String(title).trim();
    if (url !== undefined) post.url = String(url).trim();
    if (description !== undefined) post.description = description;
    if (category !== undefined) post.category = category || "General";
    if (platform !== undefined) post.platform = platform;
    if (tags !== undefined) post.tags = normalizeTags(tags);
    if (req.body.featured !== undefined) post.featured = toBoolean(req.body.featured);
    if (req.body.isPublished !== undefined) {
      post.isPublished = toBoolean(req.body.isPublished, post.isPublished);
    }

    if (req.file) {
      if (post.logoUrl) deleteUploadedFile(post.logoUrl, LOGO_FOLDER);
      post.logoUrl = req.file.filename;
    } else if (removeLogo === "true" && post.logoUrl) {
      deleteUploadedFile(post.logoUrl, LOGO_FOLDER);
      post.logoUrl = "";
    }

    await post.save();

    await auditActor(req, "UPDATE", post, `Updated Tech Pulse post '${post.title}'`);

    res.json({ success: true, message: "Post updated.", post });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/tech-pulse/:id
 * @desc    Remove a post and its logo
 * @access  Protected (Admin)
 */
export async function deleteTechPulsePost(req, res, next) {
  try {
    const post = await TechPulsePost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    if (post.logoUrl) deleteUploadedFile(post.logoUrl, LOGO_FOLDER);
    await TechPulsePost.findByIdAndDelete(req.params.id);

    await auditActor(req, "DELETE", post, `Removed Tech Pulse post '${post.title}'`);

    res.json({ success: true, message: "Post removed." });
  } catch (error) {
    next(error);
  }
}
