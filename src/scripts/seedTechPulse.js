import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { TechPulsePost } from "../models/TechPulsePost.js";

/**
 * Seeds the curated Tech Pulse feed into its own collection so `/updates` is
 * server-driven instead of relying on the frontend fallback array.
 *
 * Idempotent: upserted by title; safe to re-run.
 */

const CURATED = [
  {
    title: "daily.dev",
    description:
      "Aggregated developer news that adapts to your stack - open source highlight cards, trending repos, and community posts in one feed.",
    category: "Technology News",
    platform: "Browser Extension / Mobile",
    url: "https://daily.dev",
    tags: ["Developer News", "Open Source", "Feed", "Community"],
    featured: true,
  },
  {
    title: "TechCrunch",
    description:
      "Premier venture capital, startup funding, AI breakthroughs, consumer hardware reviews, and Silicon Valley industry analysis dispatches.",
    category: "Technology News",
    platform: "Web / App",
    url: "https://techcrunch.com",
    tags: ["Startups", "Venture Capital", "AI Industry", "Tech News"],
    featured: true,
  },
  {
    title: "Hacker News (Y Combinator)",
    description:
      "High-signal tech and entrepreneurial community discussions focused on computer science, distributed systems, mathematics, and startup engineering.",
    category: "Technology News",
    platform: "Web",
    url: "https://news.ycombinator.com",
    tags: ["Y Combinator", "Engineering", "Discussions", "Computer Science"],
  },
  {
    title: "TLDR Tech",
    description:
      "Curated 5-minute daily newsletter summarizing the most important stories in big tech, scientific breakthroughs, and software engineering.",
    category: "Technology News",
    platform: "Newsletter / Web",
    url: "https://tldr.tech",
    tags: ["Newsletter", "Quick Reads", "Daily Brief", "Tech News"],
  },
  {
    title: "The Verge",
    description:
      "Modern multimedia coverage exploring where technology intersects with science, art, consumer gadgets, and digital culture.",
    category: "Technology News",
    platform: "Web / App",
    url: "https://www.theverge.com",
    tags: ["Hardware", "Gadgets", "AI", "Policy"],
  },
  {
    title: "Product Hunt",
    description:
      "Daily showcase of the newest technology tools, developer utilities, mobile applications, and AI agent innovations launched worldwide.",
    category: "Technology News",
    platform: "Web / Android / iOS",
    url: "https://www.producthunt.com",
    tags: ["New Products", "AI Tools", "Startups", "Innovation"],
  },
];

async function seedTechPulse() {
  try {
    await connectDB();

    const admin = await User.findOne({ role: "admin" }).select("_id");
    if (!admin) throw new Error("No admin user found to own seeded posts.");

    let inserted = 0;
    let updated = 0;

    for (const item of CURATED) {
      const result = await TechPulsePost.findOneAndUpdate(
        { title: item.title },
        {
          $setOnInsert: { createdBy: admin._id },
          $set: {
            title: item.title,
            description: item.description,
            category: item.category,
            platform: item.platform,
            url: item.url,
            tags: item.tags,
            featured: Boolean(item.featured),
            isPublished: true,
          },
        },
        { upsert: true, new: true }
      );

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    console.log(`\n✅ Seeded Tech Pulse posts -> ${inserted} inserted, ${updated} updated`);

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedTechPulse();
