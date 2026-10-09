import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { Resource } from "../models/Resource.js";

/**
 * Seeds the curated Tech Pulse (updates) links into the Resource collection so
 * the public `/updates` page is server-driven instead of relying on the
 * frontend fallback array.
 *
 * Idempotent: upserted by (type, title); safe to re-run.
 */

const CURATED = [
  // ------------------------- UPDATES (Tech Pulse) -------------------------
  {
    name: "daily.dev",
    description:
      "Aggregated developer news that adapts to your stack - open source highlight cards, trending repos, and community posts in one feed.",
    category: "Technology News",
    type: "updates",
    platform: "Browser Extension / Mobile",
    url: "https://daily.dev",
    tags: ["Developer News", "Open Source", "Feed", "Community"],
    featured: true,
  },
  {
    name: "TechCrunch",
    description:
      "Premier venture capital, startup funding, AI breakthroughs, consumer hardware reviews, and Silicon Valley industry analysis dispatches.",
    category: "Technology News",
    type: "updates",
    platform: "Web / App",
    url: "https://techcrunch.com",
    tags: ["Startups", "Venture Capital", "AI Industry", "Tech News"],
    featured: true,
  },
  {
    name: "Hacker News (Y Combinator)",
    description:
      "High-signal tech and entrepreneurial community discussions focused on computer science, distributed systems, mathematics, and startup engineering.",
    category: "Technology News",
    type: "updates",
    platform: "Web",
    url: "https://news.ycombinator.com",
    tags: ["Y Combinator", "Engineering", "Discussions", "Computer Science"],
  },
  {
    name: "TLDR Tech",
    description:
      "Curated 5-minute daily newsletter summarizing the most important stories in big tech, scientific breakthroughs, and software engineering.",
    category: "Technology News",
    type: "updates",
    platform: "Newsletter / Web",
    url: "https://tldr.tech",
    tags: ["Newsletter", "Quick Reads", "Daily Brief", "Tech News"],
  },
  {
    name: "The Verge",
    description:
      "Modern multimedia coverage exploring where technology intersects with science, art, consumer gadgets, and digital culture.",
    category: "Technology News",
    type: "updates",
    platform: "Web / App",
    url: "https://www.theverge.com",
    tags: ["Hardware", "Gadgets", "AI", "Policy"],
  },
  {
    name: "Product Hunt",
    description:
      "Daily showcase of the newest technology tools, developer utilities, mobile applications, and AI agent innovations launched worldwide.",
    category: "Technology News",
    type: "updates",
    platform: "Web / Android / iOS",
    url: "https://www.producthunt.com",
    tags: ["New Products", "AI Tools", "Startups", "Innovation"],
  },
];

async function seedTechUpdates() {
  try {
    await connectDB();

    const admin = await User.findOne({ role: "admin" }).select("_id");
    // Platform-level content is not department-specific; house it under IT.
    const dept = await Department.findOne({ code: "IT" }).select("_id");
    if (!admin) throw new Error("No admin user found to own seeded resources.");
    if (!dept) throw new Error("IT department not found to house platform resources.");

    let inserted = 0;
    let updated = 0;

    for (const item of CURATED) {
      const result = await Resource.findOneAndUpdate(
        { type: item.type, title: item.name },
        {
          $setOnInsert: { departmentId: dept._id },
          $set: {
            title: item.name,
            description: item.description,
            category: item.category,
            platform: item.platform,
            featured: item.featured,
            type: item.type,
            externalUrl: item.url,
            tags: item.tags,
            isPublished: true,
            uploadedBy: admin._id,
            uploaderRole: "admin",
            mimeType: "text/html",
            fileType: "text/html",
          },
        },
        { upsert: true, new: true }
      );

      if (result.createdAt && result.updatedAt && result.createdAt.getTime() === result.updatedAt.getTime()) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    console.log(`\n✅ Seeded tech/updates resources -> ${inserted} inserted, ${updated} updated`);
    console.log(`   Updates: ${CURATED.filter((c) => c.type === "updates").length} items`);

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedTechUpdates();