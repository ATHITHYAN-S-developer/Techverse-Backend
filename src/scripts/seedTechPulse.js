import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { TechPulsePost } from "../models/TechPulsePost.js";
import { parseYouTubeId, canonicalYouTubeUrl } from "../utils/techPulseValidate.js";

/**
 * Seeds comprehensive curated Tech Pulse posts across all 4 kinds:
 * - website: Curated Tech & Developer News Sites
 * - youtube: Hand-picked Technical Breakdown Videos
 * - app: Mobile & Cross-platform Tech Apps
 * - roadmap: Interactive Multi-step Learning Roadmaps
 *
 * Idempotent: upserted by title; safe to re-run.
 */

const CURATED = [
  // ==========================================
  // 1. WEBSITES (kind: "website")
  // ==========================================
  {
    kind: "website",
    title: "daily.dev",
    description:
      "Aggregated developer news feed that adapts to your stack - open-source highlight cards, trending repos, and community discussions in one feed.",
    category: "Technology News",
    platform: "Browser Extension / Web",
    url: "https://daily.dev",
    sourceName: "daily.dev",
    tags: ["Developer News", "Open Source", "Feed", "Community"],
    featured: true,
  },
  {
    kind: "website",
    title: "TechCrunch",
    description:
      "Premier venture capital, startup funding, AI breakthroughs, consumer hardware reviews, and Silicon Valley industry analysis dispatches.",
    category: "Technology News",
    platform: "Web",
    url: "https://techcrunch.com",
    sourceName: "TechCrunch",
    tags: ["Startups", "Venture Capital", "AI Industry", "Tech News"],
    featured: true,
  },
  {
    kind: "website",
    title: "Hacker News (Y Combinator)",
    description:
      "High-signal tech and entrepreneurial community discussions focused on computer science, distributed systems, mathematics, and startup engineering.",
    category: "Technology News",
    platform: "Web",
    url: "https://news.ycombinator.com",
    sourceName: "Y Combinator",
    tags: ["Y Combinator", "Engineering", "Discussions", "Computer Science"],
    featured: false,
  },
  {
    kind: "website",
    title: "TLDR Tech",
    description:
      "Curated 5-minute daily newsletter summarizing the most important stories in big tech, scientific breakthroughs, and software engineering.",
    category: "Technology News",
    platform: "Newsletter / Web",
    url: "https://tldr.tech",
    sourceName: "TLDR",
    tags: ["Newsletter", "Quick Reads", "Daily Brief", "Tech News"],
    featured: false,
  },
  {
    kind: "website",
    title: "The Verge",
    description:
      "Modern multimedia coverage exploring where technology intersects with science, art, consumer gadgets, and digital culture.",
    category: "Technology News",
    platform: "Web",
    url: "https://www.theverge.com",
    sourceName: "Vox Media",
    tags: ["Hardware", "Gadgets", "AI", "Policy"],
    featured: false,
  },
  {
    kind: "website",
    title: "Product Hunt",
    description:
      "Daily showcase of the newest technology tools, developer utilities, mobile applications, and AI agent innovations launched worldwide.",
    category: "Technology News",
    platform: "Web",
    url: "https://www.producthunt.com",
    sourceName: "Product Hunt",
    tags: ["New Products", "AI Tools", "Startups", "Innovation"],
    featured: false,
  },

  // ==========================================
  // 2. YOUTUBE VIDEOS (kind: "youtube")
  // ==========================================
  {
    kind: "youtube",
    title: "The 2026 Web Development Roadmap",
    description:
      "Comprehensive breakdown of modern web engineering: frameworks, server runtimes, edge computing, TypeScript, and modern deployment architectures.",
    category: "Programming",
    platform: "YouTube",
    channelName: "Fireship",
    duration: "11:42",
    videoUrl: "https://www.youtube.com/watch?v=0pThnRneDjw",
    tags: ["Web Dev", "Roadmap", "JavaScript", "Frontend", "Backend"],
    featured: true,
  },
  {
    kind: "youtube",
    title: "How Large Language Models Work (Transformer Architecture)",
    description:
      "Visual mathematical explanation of transformers, self-attention mechanisms, tokenization, and deep neural network forward passes.",
    category: "AI",
    platform: "YouTube",
    channelName: "3Blue1Brown",
    duration: "27:14",
    videoUrl: "https://www.youtube.com/watch?v=wjZofJX0v4U",
    tags: ["Neural Networks", "LLMs", "Math", "Deep Learning", "AI"],
    featured: true,
  },
  {
    kind: "youtube",
    title: "Docker Containerization in 100 Seconds",
    description:
      "High-speed architectural breakdown of containers, images, Dockerfiles, volumes, and microservice orchestration.",
    category: "Cloud",
    platform: "YouTube",
    channelName: "Fireship",
    duration: "2:20",
    videoUrl: "https://www.youtube.com/watch?v=Gjnup-PuquQ",
    tags: ["Docker", "DevOps", "Containers", "Cloud"],
    featured: false,
  },
  {
    kind: "youtube",
    title: "System Design Interview: How to Design a Resilient Architecture",
    description:
      "Core principles of distributed systems: load balancers, caching layers, database sharding, and CAP theorem trade-offs.",
    category: "Career",
    platform: "YouTube",
    channelName: "Gaurav Sen",
    duration: "18:35",
    videoUrl: "https://www.youtube.com/watch?v=xpDnVSmNFX0",
    tags: ["System Design", "Architecture", "Scalability", "Interviews"],
    featured: false,
  },
  {
    kind: "youtube",
    title: "Python for Beginners: Full Programming Course",
    description:
      "From variables and data structures to object-oriented programming, file handling, and real-world project automation.",
    category: "Programming",
    platform: "YouTube",
    channelName: "Programming with Mosh",
    duration: "1:00:20",
    videoUrl: "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
    tags: ["Python", "Beginners", "Coding", "Automation"],
    featured: false,
  },

  // ==========================================
  // 3. APPS (kind: "app")
  // ==========================================
  {
    kind: "app",
    title: "daily.dev Mobile",
    appName: "daily.dev",
    description:
      "Clean mobile reading experience for software engineers. Bookmark trending articles, join discussions, and track learning streaks.",
    category: "Technology News",
    platform: "Cross-platform",
    url: "https://daily.dev",
    playStoreUrl: "https://play.google.com/store/apps/details?id=dev.daily",
    webUrl: "https://daily.dev",
    tags: ["Developer Feed", "Mobile", "Community", "Bookmarks"],
    featured: true,
  },
  {
    kind: "app",
    title: "Pocket Aptitude",
    appName: "Pocket Aptitude",
    description:
      "Quick-practice mobile tool featuring quantitative aptitude modules, mathematical formula sheets, and offline practice sets for campus drives.",
    category: "Aptitude",
    platform: "Android",
    url: "https://play.google.com/store/apps/details?id=com.pocket.aptitude",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.pocket.aptitude",
    tags: ["Aptitude", "Formulas", "Placements", "Offline"],
    featured: false,
  },
  {
    kind: "app",
    title: "Sololearn: Learn to Code",
    appName: "Sololearn",
    description:
      "Bite-sized interactive coding lessons in Python, JavaScript, C++, and SQL with a built-in mobile code compiler and peer challenges.",
    category: "Programming",
    platform: "Cross-platform",
    url: "https://www.sololearn.com",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.sololearn",
    webUrl: "https://www.sololearn.com",
    tags: ["Mobile Compiler", "Interactive", "Python", "SQL"],
    featured: true,
  },
  {
    kind: "app",
    title: "GitHub Mobile",
    appName: "GitHub",
    description:
      "Manage issues, review pull requests, triage notifications, and browse code repositories right from your mobile device.",
    category: "Programming",
    platform: "Cross-platform",
    url: "https://github.com/mobile",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.github.android",
    webUrl: "https://github.com/mobile",
    tags: ["Git", "Code Review", "Productivity", "Open Source"],
    featured: false,
  },

  // ==========================================
  // 4. ROADMAPS (kind: "roadmap")
  // ==========================================
  {
    kind: "roadmap",
    title: "Full Stack Web Developer Roadmap",
    description:
      "End-to-end curriculum guiding you from web fundamentals to scalable full-stack applications with React, Node.js, and cloud deployment.",
    category: "Programming",
    platform: "Web",
    level: "Beginner",
    durationText: "6 Months",
    tags: ["Full Stack", "React", "Node.js", "MongoDB", "DevOps"],
    featured: true,
    steps: [
      {
        title: "1. Internet & Web Foundations",
        description: "How DNS, HTTP/HTTPS, DOM trees, and browser rendering engines work under the hood.",
        url: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web",
        resourceType: "Documentation",
      },
      {
        title: "2. Modern JavaScript & TypeScript",
        description: "ES6+, async/await, closures, prototypes, DOM manipulation, and strong typing with TypeScript.",
        url: "https://javascript.info",
        resourceType: "Course",
      },
      {
        title: "3. Component Architecture (React & Next.js)",
        description: "State management, React hooks, component lifecycles, and Server Side Rendering (SSR).",
        url: "https://react.dev",
        resourceType: "Documentation",
      },
      {
        title: "4. Backend APIs & Databases",
        description: "RESTful architecture, Express.js middleware, MongoDB Mongoose schema design, and JWT security.",
        url: "https://nodejs.org/en/docs",
        resourceType: "Documentation",
      },
      {
        title: "5. Production Deployment & Cloud",
        description: "Reverse proxies with Caddy/Nginx, PM2 process management, Docker containers, and CI/CD automation.",
        url: "https://roadmap.sh/full-stack",
        resourceType: "Article",
      },
    ],
  },
  {
    kind: "roadmap",
    title: "AI & Machine Learning Engineer Roadmap",
    description:
      "Structured learning path covering mathematics, classical ML algorithms, neural networks, and modern Generative AI / LLM workflows.",
    category: "AI",
    platform: "Web",
    level: "Intermediate",
    durationText: "8 Months",
    tags: ["Machine Learning", "Python", "PyTorch", "LLMs", "Deep Learning"],
    featured: true,
    steps: [
      {
        title: "1. Python for Data Science & Math Foundations",
        description: "NumPy, Pandas, Matplotlib, linear algebra, multivariable calculus, and probability.",
        url: "https://numpy.org/doc/stable/",
        resourceType: "Documentation",
      },
      {
        title: "2. Classical Machine Learning",
        description: "Regression, decision trees, random forests, SVMs, clustering, and Scikit-learn pipelines.",
        url: "https://scikit-learn.org/stable/",
        resourceType: "Documentation",
      },
      {
        title: "3. Deep Learning & Computer Vision / NLP",
        description: "PyTorch tensor operations, backpropagation, CNNs, RNNs, and loss functions.",
        url: "https://pytorch.org/tutorials/",
        resourceType: "Course",
      },
      {
        title: "4. Generative AI, Transformers & LLMs",
        description: "Hugging Face transformers, attention mechanisms, fine-tuning, embeddings, and LangChain agents.",
        url: "https://huggingface.co/learn",
        resourceType: "Course",
      },
    ],
  },
  {
    kind: "roadmap",
    title: "Data Structures & Algorithms (DSA) for Placements",
    description:
      "Master high-frequency campus placement coding patterns: sliding window, two pointers, binary search, trees, and dynamic programming.",
    category: "Career",
    platform: "Web",
    level: "Beginner",
    durationText: "4 Months",
    tags: ["DSA", "LeetCode", "Placements", "Algorithms", "Interviews"],
    featured: false,
    steps: [
      {
        title: "1. Time & Space Complexity Analysis",
        description: "Big-O notation, memory hierarchies, asymptotic behavior, and recursion call stack overhead.",
        url: "https://www.geeksforgeeks.org/analysis-of-algorithms-set-1-asymptotic-analysis/",
        resourceType: "Article",
      },
      {
        title: "2. Arrays, Strings & Hashing",
        description: "Two-pointer techniques, sliding windows, prefix sums, and hash maps for O(1) lookups.",
        url: "https://leetcode.com/explore/",
        resourceType: "Practice",
      },
      {
        title: "3. Trees, Heaps & Graph Traversal",
        description: "Binary search trees, BFS, DFS, Dijkstra's shortest path, and priority queue implementations.",
        url: "https://visualgo.net/en",
        resourceType: "Other",
      },
      {
        title: "4. Dynamic Programming Patterns",
        description: "Memoization, tabulation, knapsack variants, longest common subsequence, and matrix paths.",
        url: "https://neetcode.io/roadmap",
        resourceType: "Practice",
      },
    ],
  },
  {
    kind: "roadmap",
    title: "Cloud & DevOps Architecture Roadmap",
    description:
      "Complete journey from Linux system administration to infrastructure-as-code, Kubernetes clustering, and zero-downtime releases.",
    category: "Cloud",
    platform: "Web",
    level: "Advanced",
    durationText: "6 Months",
    tags: ["DevOps", "Docker", "Kubernetes", "Linux", "CI/CD", "AWS"],
    featured: false,
    steps: [
      {
        title: "1. Linux Internals & Bash Automation",
        description: "Process management, cron scheduling, systemd services, SSH key exchange, and network sockets.",
        url: "https://linuxjourney.com/",
        resourceType: "Documentation",
      },
      {
        title: "2. Docker & Containerization",
        description: "Multi-stage Dockerfiles, image layers, network bridges, and docker-compose configurations.",
        url: "https://docs.docker.com/get-started/",
        resourceType: "Documentation",
      },
      {
        title: "3. CI/CD & GitHub Actions Automation",
        description: "Automated linting, unit test suites, artifact builds, and automated server deploy webhooks.",
        url: "https://docs.github.com/en/actions",
        resourceType: "Documentation",
      },
      {
        title: "4. Kubernetes Cluster Orchestration",
        description: "Pods, Deployments, Services, Ingress controllers, Helm charts, and auto-scaling configurations.",
        url: "https://kubernetes.io/docs/tutorials/",
        resourceType: "Documentation",
      },
    ],
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
      const payload = {
        kind: item.kind,
        title: item.title,
        description: item.description,
        category: item.category,
        platform: item.platform,
        tags: item.tags,
        featured: Boolean(item.featured),
        isPublished: true,
      };

      if (item.kind === "website") {
        payload.url = item.url;
        payload.sourceName = item.sourceName || item.title;
      } else if (item.kind === "youtube") {
        const vidId = parseYouTubeId(item.videoUrl);
        payload.videoId = vidId;
        payload.videoUrl = item.videoUrl;
        payload.url = canonicalYouTubeUrl(vidId) || item.videoUrl;
        payload.channelName = item.channelName;
        payload.duration = item.duration;
      } else if (item.kind === "app") {
        payload.appName = item.appName;
        payload.url = item.url;
        payload.playStoreUrl = item.playStoreUrl || "";
        payload.webUrl = item.webUrl || "";
      } else if (item.kind === "roadmap") {
        payload.level = item.level;
        payload.durationText = item.durationText;
        payload.steps = item.steps;
        payload.url = "";
      }

      const result = await TechPulsePost.findOneAndUpdate(
        { title: item.title },
        {
          $setOnInsert: { createdBy: admin._id },
          $set: payload,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    console.log(`\n🎉 Seeded Tech Pulse posts across all 4 categories -> ${inserted} inserted, ${updated} updated`);

    // Check counts per kind
    const counts = await TechPulsePost.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: "$kind", count: { $sum: 1 } } },
    ]);
    console.log("\n📊 Current published counts by kind:", counts);

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedTechPulse();
