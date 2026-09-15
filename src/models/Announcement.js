import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "General",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent", "Normal", "Important", "Urgent"],
      default: "normal",
      index: true,
    },
    image: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    targetAudience: {
      type: String,
      enum: ["all", "students", "teachers", "department"],
      default: "all",
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    publishDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    authorName: {
      type: String,
      default: "",
    },
    authorRole: {
      type: String,
      default: "admin",
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

// Fallback getters ensuring description/content and image/imageUrl always return values
announcementSchema.pre("save", function (next) {
  if (!this.description && this.content) {
    this.description = this.content;
  } else if (!this.content && this.description) {
    this.content = this.description;
  }
  if (!this.imageUrl && this.image) {
    this.imageUrl = this.image.startsWith("http") ? this.image : `/uploads/announcements/${this.image}`;
  }
  next();
});

export const Announcement = mongoose.model("Announcement", announcementSchema);
