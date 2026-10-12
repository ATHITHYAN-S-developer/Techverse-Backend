/**
 * Shared validation + normalisation for Tech Pulse posts.
 *
 * Pure module: no mongoose, no HTTP, no filesystem — so both the controller
 * and the seeder/migration scripts can import it safely.
 *
 * Every kind has its own required fields; `validateTechPulsePayload` returns
 * `{ errors, clean }` where `errors` is a flat `{ fieldName: message }` map the
 * admin form renders inline, and `clean` is the trimmed/normalised payload.
 */

export const TECH_PULSE_KINDS = ["youtube", "website", "app", "roadmap"];

/** `platform` stays a free string for legacy rows (e.g. "Web / App"). */
export const APP_PLATFORMS = ["Android", "iOS", "Cross-platform"];

export const ROADMAP_LEVELS = ["Beginner", "Intermediate", "Advanced"];
export const ROADMAP_MAX_STEPS = 30;
export const RESOURCE_TYPES = [
  "Article",
  "Video",
  "Course",
  "Documentation",
  "Repo",
  "Practice",
  "Other",
];

export const KIND_LABELS = {
  youtube: "YouTube",
  website: "Website",
  app: "App",
  roadmap: "Roadmap",
};

export const LIMITS = {
  title: 160,
  description: 1200,
  category: 60,
  platform: 60,
  channelName: 120,
  duration: 24,
  sourceName: 120,
  appName: 120,
  url: 600,
  durationText: 60,
  stepTitle: 160,
  stepDescription: 600,
  tagLength: 40,
  tagCount: 12,
};

const YT_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const BARE_HOST = /^[\w-]+(?:\.[\w-]+)+(?:[/?#].*)?$/i;
const YT_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
]);

/**
 * Accepts http(s) URLs only — relative paths, `javascript:`, `data:` and every
 * other scheme are rejected. Bare hosts such as `daily.dev` are upgraded to
 * `https://`. Returns the original (possibly prefixed) string, or "" when unsafe.
 */
export function toHttpUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  let candidate;
  if (/^https?:\/\//i.test(raw)) candidate = raw;
  else if (BARE_HOST.test(raw)) candidate = `https://${raw}`;
  else return "";

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return "";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
  return candidate;
}

export function isSafeHttpUrl(value) {
  return toHttpUrl(value) !== "";
}

/**
 * Pulls an 11-char video id out of the common YouTube link shapes:
 * youtu.be/<id>, watch?v=<id>, /shorts/<id>, /embed/<id>, /live/<id>.
 * Returns "" when the URL is not a parseable YouTube video link.
 */
export function parseYouTubeId(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  let candidate;
  if (/^https?:\/\//i.test(raw)) candidate = raw;
  else if (BARE_HOST.test(raw)) candidate = `https://${raw}`;
  else return "";

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!YT_HOSTS.has(host)) return "";

  let id = "";
  if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] || "";
  } else {
    id = url.searchParams.get("v") || "";
    if (!id) {
      const segments = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live", "v"].includes(segments[0])) id = segments[1] || "";
    }
  }

  return YT_VIDEO_ID.test(id) ? id : "";
}

export function canonicalYouTubeUrl(videoId) {
  const id = String(videoId ?? "").trim();
  if (!YT_VIDEO_ID.test(id)) return "";
  return `https://www.youtube.com/watch?v=${id}`;
}

export function normalizeTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags ?? "").split(",");
  return list
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, LIMITS.tagCount)
    .map((tag) => tag.slice(0, LIMITS.tagLength));
}

function tooLong(value, max, label, errors, key) {
  const text = String(value ?? "");
  if (text.length > max) {
    errors[key] = `${label} must be ${max} characters or fewer.`;
    return true;
  }
  return false;
}

function normalizeSteps(rawSteps, errors) {
  const steps = Array.isArray(rawSteps)
    ? rawSteps
    : String(rawSteps ?? "")
        .split(/\n{2,}/)
        .filter((block) => block.trim());

  if (steps.length === 0) {
    errors.steps = "Add at least one step.";
    return [];
  }
  if (steps.length > ROADMAP_MAX_STEPS) {
    errors.steps = `A roadmap can have at most ${ROADMAP_MAX_STEPS} steps.`;
    return [];
  }

  return steps.map((step, index) => {
    const source = step && typeof step === "object" ? step : { title: step };
    const title = String(source.title ?? "").trim();
    const url = toHttpUrl(source.url);
    const description = String(source.description ?? "").trim();
    let resourceType = String(source.resourceType ?? "Article").trim() || "Article";

    if (!title) errors[`steps.${index}.title`] = `Step ${index + 1} needs a title.`;
    if (!url) errors[`steps.${index}.url`] = `Step ${index + 1} needs a valid link (https://...).`;
    if (!RESOURCE_TYPES.includes(resourceType)) {
      errors[`steps.${index}.resourceType`] = `Step ${index + 1} has an unknown resource type.`;
      resourceType = "Article";
    }
    if (title.length > LIMITS.stepTitle) {
      errors[`steps.${index}.title`] = `Step ${index + 1} title must be ${LIMITS.stepTitle} characters or fewer.`;
    }
    if (description.length > LIMITS.stepDescription) {
      errors[`steps.${index}.description`] = `Step ${index + 1} description must be ${LIMITS.stepDescription} characters or fewer.`;
    }
    if (url.length > LIMITS.url) {
      errors[`steps.${index}.url`] = `Step ${index + 1} link must be ${LIMITS.url} characters or fewer.`;
    }

    return { title, url, description, resourceType };
  });
}

/**
 * Validate a Tech Pulse payload.
 *
 * @param {object} raw  raw form/API input (for updates: existing doc + patch)
 * @returns {{ errors: Record<string,string>, clean: object }}
 */
export function validateTechPulsePayload(raw = {}) {
  const input = raw && typeof raw === "object" ? raw : {};
  const errors = {};

  let kind = String(input.kind ?? "").trim().toLowerCase();
  if (!kind) kind = "website";
  if (!TECH_PULSE_KINDS.includes(kind)) {
    errors.kind = "Choose a valid content type.";
    kind = "website";
  }

  const title = String(input.title ?? "").trim();
  if (!title) errors.title = "Title is required.";
  else tooLong(title, LIMITS.title, "Title", errors, "title");

  const description = String(input.description ?? "").trim();
  tooLong(description, LIMITS.description, "Description", errors, "description");

  let category = String(input.category ?? "").trim() || "General";
  tooLong(category, LIMITS.category, "Category", errors, "category");

  const platform = String(input.platform ?? "").trim();
  tooLong(platform, LIMITS.platform, "Platform", errors, "platform");

  const clean = {
    kind,
    title,
    description,
    category,
    platform,
    tags: normalizeTags(input.tags),
    logoUrl: "",
    url: "",
    videoId: "",
    videoUrl: "",
    channelName: String(input.channelName ?? "").trim(),
    duration: String(input.duration ?? "").trim(),
    sourceName: String(input.sourceName ?? "").trim(),
    appName: String(input.appName ?? "").trim(),
    playStoreUrl: "",
    appStoreUrl: "",
    webUrl: "",
    level: ROADMAP_LEVELS.includes(input.level) ? input.level : "Beginner",
    durationText: String(input.durationText ?? "").trim(),
    steps: [],
  };

  tooLong(clean.channelName, LIMITS.channelName, "Channel name", errors, "channelName");
  tooLong(clean.duration, LIMITS.duration, "Duration", errors, "duration");
  tooLong(clean.sourceName, LIMITS.sourceName, "Source name", errors, "sourceName");
  tooLong(clean.appName, LIMITS.appName, "App name", errors, "appName");
  tooLong(clean.durationText, LIMITS.durationText, "Duration", errors, "durationText");

  if (kind === "youtube") {
    // The client never supplies videoId — it is always derived server-side.
    const rawLink = String(input.videoUrl ?? input.url ?? "").trim();
    if (!rawLink) {
      errors.videoUrl = "Paste a YouTube video link.";
    } else {
      const videoId = parseYouTubeId(rawLink);
      if (!videoId) {
        errors.videoUrl = "That is not a recognisable YouTube video link.";
      } else {
        const canonical = canonicalYouTubeUrl(videoId);
        clean.videoId = videoId;
        clean.videoUrl = canonical;
        clean.url = canonical;
      }
    }
  }

  if (kind === "website") {
    const url = toHttpUrl(input.url);
    if (!url) errors.url = "Enter a valid website link (https://...).";
    else if (url.length > LIMITS.url) errors.url = `Link must be ${LIMITS.url} characters or fewer.`;
    clean.url = url;
    if (!clean.sourceName && !clean.description && !clean.title) {
      errors.description = "Add a description so readers know what this link is.";
    }
  }

  if (kind === "app") {
    const playStoreUrl = toHttpUrl(input.playStoreUrl);
    const appStoreUrl = toHttpUrl(input.appStoreUrl);
    const webUrl = toHttpUrl(input.webUrl);

    if (String(input.playStoreUrl ?? "").trim() && !playStoreUrl) {
      errors.playStoreUrl = "Enter a valid Play Store link (https://...).";
    }
    if (String(input.appStoreUrl ?? "").trim() && !appStoreUrl) {
      errors.appStoreUrl = "Enter a valid App Store link (https://...).";
    }
    if (String(input.webUrl ?? "").trim() && !webUrl) {
      errors.webUrl = "Enter a valid website link (https://...).";
    }
    if (!playStoreUrl && !appStoreUrl && !webUrl) {
      errors.webUrl = "Add at least one link: Play Store, App Store, or website.";
    }

    const match = APP_PLATFORMS.find((value) => value.toLowerCase() === platform.toLowerCase());
    if (!platform) errors.platform = "Choose the platform for this app.";
    else if (!match) errors.platform = `Platform must be one of: ${APP_PLATFORMS.join(", ")}.`;
    else clean.platform = match;

    clean.playStoreUrl = playStoreUrl;
    clean.appStoreUrl = appStoreUrl;
    clean.webUrl = webUrl;
    // Primary link falls back to whichever store/web link exists.
    clean.url = toHttpUrl(input.url) || playStoreUrl || appStoreUrl || webUrl || "";
  }

  if (kind === "roadmap") {
    clean.steps = normalizeSteps(input.steps, errors);
    clean.url = toHttpUrl(input.url) || "";
  }

  return { errors, clean };
}
