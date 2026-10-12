import { TechPulsePost } from "../models/TechPulsePost.js";
import { deleteUploadedFile } from "../utils/fileUpload.js";
import { logAuditEvent } from "../services/auditService.js";
import {
  TECH_PULSE_KINDS,
  validateTechPulsePayload,
} from "../utils/techPulseValidate.js";

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

function toBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return value === "true" || value === true;
}

/**
 * Mongoose may hand back `steps` as a mongoose array of subdocuments; flatten
 * to plain objects so the validator only ever sees plain data.
 */
function plainSteps(steps) {
  if (!Array.isArray(steps) && typeof steps?.toObject === "function") steps = steps.toObject();
  if (!Array.isArray(steps)) return [];
  return steps.map((step) =>
    step && typeof step.toObject === "function" ? step.toObject() : { ...step }
  );
}

/**
 * Multipart bodies deliver every field as a string, so roadmap steps arrive as
 * a JSON string and have to be parsed before validation.
 */
function coerceSteps(steps) {
  if (Array.isArray(steps)) return steps;
  if (typeof steps !== "string" || !steps.trim()) return [];
  try {
    const parsed = JSON.parse(steps);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Existing doc + incoming patch → one payload the shared validator can check. */
function buildPayload(post, body = {}) {
  const base = post
    ? {
        kind: post.kind,
        title: post.title,
        url: post.url,
        description: post.description,
        category: post.category,
        platform: post.platform,
        videoUrl: post.videoUrl,
        channelName: post.channelName,
        duration: post.duration,
        sourceName: post.sourceName,
        appName: post.appName,
        playStoreUrl: post.playStoreUrl,
        appStoreUrl: post.appStoreUrl,
        webUrl: post.webUrl,
        level: post.level,
        durationText: post.durationText,
        steps: plainSteps(post.steps),
        tags: post.tags,
      }
    : {};
  const merged = { ...base, ...body };
  // Only touch steps when the caller actually sent them, so a partial update
  // that omits the field does not wipe an existing roadmap.
  if ("steps" in (body || {})) merged.steps = coerceSteps(body.steps);
  return merged;
}

/** First inline error becomes the 400 message; the full map rides along. */
function firstError(errors) {
  return Object.values(errors)[0] || "Please fix the highlighted fields.";
}

function cleanUrlFields(clean, logoUrl) {
  return {
    kind: clean.kind,
    title: clean.title,
    url: clean.url,
    description: clean.description,
    category: clean.category,
    platform: clean.platform,
    tags: clean.tags,
    logoUrl,
    videoId: clean.videoId,
    videoUrl: clean.videoUrl,
    channelName: clean.channelName,
    duration: clean.duration,
    sourceName: clean.sourceName,
    appName: clean.appName,
    playStoreUrl: clean.playStoreUrl,
    appStoreUrl: clean.appStoreUrl,
    webUrl: clean.webUrl,
    level: clean.level,
    durationText: clean.durationText,
    steps: clean.steps,
  };
}

function parseKindFilter(value) {
  if (!value) return null;
  const kind = String(value).trim().toLowerCase();
  return TECH_PULSE_KINDS.includes(kind) ? kind : null;
}

/**
 * Filtering by "website" must also match rows written before the kind
 * discriminator existed (they have no `kind` field at all). `{ kind: null }`
 * matches both an explicit null and a missing field in MongoDB.
 */
function kindFilterClause(kind) {
  return kind === "website" ? { $in: ["website", null] } : kind;
}

/**
 * @route   GET /api/tech-pulse
 * @desc    Published Tech Pulse posts, newest first. Optional ?kind= filter.
 * @access  Public
 */
export async function getTechPulsePosts(req, res, next) {
  try {
    const filter = { isPublished: true };
    const kind = parseKindFilter(req.query.kind);
    if (req.query.kind && !kind) {
      return res.status(400).json({ success: false, message: "Unknown Tech Pulse kind." });
    }
    if (kind) filter.kind = kindFilterClause(kind);

    const posts = await TechPulsePost.find(filter)
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
 * @route   GET /api/tech-pulse/counts
 * @desc    Published post totals per kind (filter chips on /updates).
 *          Never hardcode these on the client — always read them from here.
 * @access  Public
 */
export async function getTechPulseKindCounts(req, res, next) {
  try {
    const counts = { all: 0, youtube: 0, website: 0, app: 0, roadmap: 0 };

    const rows = await TechPulsePost.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: "$kind", count: { $sum: 1 } } },
    ]);

    for (const row of rows) {
      const kind = row._id || "website";
      if (counts[kind] === undefined) continue;
      counts[kind] = row.count;
      counts.all += row.count;
    }

    res.json({ success: true, counts });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/tech-pulse/admin
 * @desc    Every post including drafts, for the admin manager. Optional ?kind=.
 * @access  Protected (Admin)
 */
export async function getTechPulseAdminPosts(req, res, next) {
  try {
    const filter = {};
    const kind = parseKindFilter(req.query.kind);
    if (req.query.kind && !kind) {
      return res.status(400).json({ success: false, message: "Unknown Tech Pulse kind." });
    }
    if (kind) filter.kind = kindFilterClause(kind);

    const posts = await TechPulsePost.find(filter)
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
 * @desc    Publish a Tech Pulse post (optional logo upload). kind: youtube|website|app|roadmap
 * @access  Protected (Admin)
 */
export async function createTechPulsePost(req, res, next) {
  try {
    const { errors, clean } = validateTechPulsePayload(buildPayload(null, req.body));

    if (Object.keys(errors).length > 0) {
      if (req.file?.path) deleteUploadedFile(req.file.filename, LOGO_FOLDER);
      return res.status(400).json({
        success: false,
        message: firstError(errors),
        errors,
      });
    }

    const post = await TechPulsePost.create({
      ...cleanUrlFields(clean, req.file ? req.file.filename : ""),
      featured: toBoolean(req.body.featured),
      isPublished: toBoolean(req.body.isPublished, true),
      createdBy: req.user._id,
    });

    await auditActor(req, "CREATE", post, `Published ${clean.kind} Tech Pulse post '${post.title}'`);

    res.status(201).json({ success: true, message: "Post published.", post });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/tech-pulse/:id
 * @desc    Edit a post, optionally replacing the logo. Re-validates the merged
 *          payload so a kind switch (or a cleared field) cannot leave junk.
 * @access  Protected (Admin)
 */
export async function updateTechPulsePost(req, res, next) {
  try {
    const post = await TechPulsePost.findById(req.params.id);
    if (!post) {
      if (req.file?.path) deleteUploadedFile(req.file.filename, LOGO_FOLDER);
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    const { errors, clean } = validateTechPulsePayload(buildPayload(post, req.body));
    if (Object.keys(errors).length > 0) {
      if (req.file?.path) deleteUploadedFile(req.file.filename, LOGO_FOLDER);
      return res.status(400).json({
        success: false,
        message: firstError(errors),
        errors,
      });
    }

    let logoUrl = post.logoUrl;
    if (req.file) {
      if (post.logoUrl) deleteUploadedFile(post.logoUrl, LOGO_FOLDER);
      logoUrl = req.file.filename;
    } else if (req.body.removeLogo === "true" && post.logoUrl) {
      deleteUploadedFile(post.logoUrl, LOGO_FOLDER);
      logoUrl = "";
    }

    const fields = cleanUrlFields(clean, logoUrl);
    for (const [key, value] of Object.entries(fields)) post.set(key, value);

    if (req.body.featured !== undefined) post.featured = toBoolean(req.body.featured);
    if (req.body.isPublished !== undefined) {
      post.isPublished = toBoolean(req.body.isPublished, post.isPublished);
    }

    await post.save();

    await auditActor(req, "UPDATE", post, `Updated ${clean.kind} Tech Pulse post '${post.title}'`);

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
