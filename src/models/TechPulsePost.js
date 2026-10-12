import mongoose from "mongoose";
import {
  TECH_PULSE_KINDS,
  APP_PLATFORMS,
  ROADMAP_MAX_STEPS,
  ROADMAP_LEVELS,
  RESOURCE_TYPES,
} from "../utils/techPulseValidate.js";

// Constants live in techPulseValidate.js (pure module) so the seeder and
// migration scripts can use them without registering the mongoose model.
export { TECH_PULSE_KINDS, APP_PLATFORMS, ROADMAP_MAX_STEPS, ROADMAP_LEVELS, RESOURCE_TYPES };

/**
 * Roadmap steps are ordered by array index — the order members are saved in
 * is the order they render in, so reordering means rewriting the array.
 */

const techPulseStepSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Step title is required"],
      trim: true,
      maxlength: 160,
    },
    url: {
      type: String,
      required: [true, "Step URL is required"],
      trim: true,
      maxlength: 600,
    },
    description: {
      type: String,
      default: "",
      maxlength: 600,
    },
    resourceType: {
      type: String,
      enum: RESOURCE_TYPES,
      default: "Article",
    },
  },
  { _id: false }
);

const techPulsePostSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: TECH_PULSE_KINDS,
      default: "website",
      index: true,
    },
    title: {
      type: String,
      required: [true, "Post title is required"],
      trim: true,
      maxlength: 160,
    },
    /**
     * Primary outbound link. Required for `website` and `app`; for `youtube`
     * it is the canonical watch URL derived server-side from the raw link the
     * admin pasted; for `roadmap` it is optional/unused.
     */
    url: {
      type: String,
      trim: true,
      maxlength: 600,
    },
    description: {
      type: String,
      default: "",
      maxlength: 1200,
    },
    category: {
      type: String,
      default: "General",
      index: true,
    },
    /** Free string so legacy values stay valid. For kind:"app" the
     *  controller narrows it to Android | iOS | Cross-platform. */
    platform: {
      type: String,
      default: "",
      maxlength: 60,
    },
    logoUrl: {
      type: String,
      default: "",
      maxlength: 600,
    },
    tags: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ---- kind: youtube (individual videos only; /youtube channels untouched) ----
    videoId: {
      type: String,
      default: "",
      maxlength: 32,
    },
    videoUrl: {
      type: String,
      default: "",
      maxlength: 600,
    },
    channelName: {
      type: String,
      default: "",
      maxlength: 120,
    },
    duration: {
      type: String,
      default: "",
      maxlength: 24,
    },

    // ---- kind: website ----
    sourceName: {
      type: String,
      default: "",
      maxlength: 120,
    },

    // ---- kind: app ----
    appName: {
      type: String,
      default: "",
      maxlength: 120,
    },
    playStoreUrl: {
      type: String,
      default: "",
      maxlength: 600,
    },
    appStoreUrl: {
      type: String,
      default: "",
      maxlength: 600,
    },
    webUrl: {
      type: String,
      default: "",
      maxlength: 600,
    },

    // ---- kind: roadmap (learning roadmaps: steps + links, not a single link) ----
    level: {
      type: String,
      enum: ROADMAP_LEVELS,
      default: "Beginner",
    },
    durationText: {
      type: String,
      default: "",
      maxlength: 60,
    },
    steps: {
      type: [techPulseStepSchema],
      default: [],
      validate: {
        validator: (steps) => !steps || steps.length <= ROADMAP_MAX_STEPS,
        message: `A roadmap can have at most ${ROADMAP_MAX_STEPS} steps`,
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/** A roadmap is never "linked out of" the way the other kinds are. */
techPulsePostSchema.virtual("isRoadmap").get(function () {
  return this.kind === "roadmap";
});

export const TechPulsePost = mongoose.model("TechPulsePost", techPulsePostSchema);
