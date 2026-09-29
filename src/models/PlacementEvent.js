import mongoose from "mongoose";

/**
 * Placement drives, workshops and career events for the /placement page.
 *
 * Field names are dictated by the frontend card mapper in
 * frontend/src/pages/PlacementEventsPage.jsx (placementEventToCard), which reads
 * `title`, `subtitle`, `badge`, `category`, `date`, `time`, `venue`,
 * `organiser`, `description`, `tags`, `poster`/`imageUrl`/`image`, `linkUrl`,
 * `linkText` and `postedAt`. Renaming any of them silently blanks the card.
 */
const placementEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Placement event title is required"],
      trim: true,
    },
    slug: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    subtitle: {
      type: String,
      default: "Placement Cell Notification",
      trim: true,
    },
    badge: {
      type: String,
      default: "Campus Drive",
      trim: true,
    },
    category: {
      type: String,
      default: "it-software",
      trim: true,
      index: true,
    },
    // Stored as UTC midnight so JSON serialises to YYYY-MM-DDT00:00:00.000Z.
    // The page slices the first 10 chars, so the calendar day never drifts.
    date: {
      type: Date,
      required: [true, "Event date is required"],
      index: true,
    },
    time: {
      type: String,
      default: "",
      trim: true,
    },
    venue: {
      type: String,
      default: "VCET Campus",
      trim: true,
    },
    organiser: {
      type: String,
      default: "Career Development Cell",
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },
    department: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    // `image` holds the bare filename, `imageUrl` the public path. The page
    // prefers `poster`, so it is kept in sync with `imageUrl` on save.
    image: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    poster: {
      type: String,
      default: "",
    },
    linkUrl: {
      type: String,
      default: "",
      trim: true,
    },
    linkText: {
      type: String,
      default: "View Details",
      trim: true,
    },
    // Drives the upload-order sort on the page; distinct from createdAt so a
    // republished event can float back to the top of the hero carousel.
    postedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Lets the placement cell pin a drive above the others on the page.
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Keep poster/imageUrl/description consistent no matter which field the caller wrote.
placementEventSchema.pre("save", function (next) {
  if (!this.poster && this.imageUrl) this.poster = this.imageUrl;
  if (!this.imageUrl && this.poster) this.imageUrl = this.poster;
  if (!this.imageUrl && this.image) {
    this.imageUrl = this.image.startsWith("http") ? this.image : `/uploads/placement-events/${this.image}`;
    this.poster = this.imageUrl;
  }
  next();
});

placementEventSchema.index({ isActive: 1, isPinned: -1, postedAt: -1 });

export const PlacementEvent = mongoose.model("PlacementEvent", placementEventSchema);
