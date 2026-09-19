import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { Class } from "../models/Class.js";
import { Subject } from "../models/Subject.js";
import { Resource } from "../models/Resource.js";
import { Announcement } from "../models/Announcement.js";
import { Course } from "../models/Course.js";
import { CourseModule } from "../models/CourseModule.js";
import { DailyTest } from "../models/DailyTest.js";
import { CodingTest } from "../models/CodingTest.js";
import { CodingSubmission } from "../models/CodingSubmission.js";
import { TestViolation } from "../models/TestViolation.js";
import { Visitor } from "../models/Visitor.js";
import { Certificate } from "../models/Certificate.js";
import { Company } from "../models/Company.js";
import { AptitudeCategory } from "../models/Aptitude.js";
import { TrainingTrack, Bootcamp, Toolkit } from "../models/Training.js";

async function seedDatabase() {
  try {
    await connectDB();
    console.log("🌱 Clearing existing data for fresh seed...");

    await mongoose.connection.collection('visitors').drop().catch(() => { });
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Class.deleteMany({}),
      Subject.deleteMany({}),
      Resource.deleteMany({}),
      Announcement.deleteMany({}),
      Course.deleteMany({}),
      CourseModule.deleteMany({}),
      DailyTest.deleteMany({}),
      CodingTest.deleteMany({}),
      CodingSubmission.deleteMany({}),
      TestViolation.deleteMany({}),
      Certificate.deleteMany({}),
      Company.deleteMany({}),
      AptitudeCategory.deleteMany({}),
      TrainingTrack.deleteMany({}),
      Bootcamp.deleteMany({}),
      Toolkit.deleteMany({}),
    ]);

    console.log("🏛️ Seeding Departments...");
    const departmentList = [
      {
        code: "CSE",
        name: "Computer Science & Engineering",
        description: "Department of Computer Science and Engineering, VCET",
        icon: "Cpu",
      },
      {
        code: "AI&DS",
        name: "Artificial Intelligence & Data Science",
        description: "Department of Artificial Intelligence and Data Science, VCET",
        icon: "Brain",
      },
      {
        code: "IT",
        name: "Information Technology",
        description: "Department of Information Technology, VCET",
        icon: "Network",
      },
      {
        code: "ECE",
        name: "Electronics & Communication Engineering",
        description: "Department of Electronics and Communication Engineering, VCET",
        icon: "Radio",
      },
      {
        code: "EEE",
        name: "Electrical & Electronics Engineering",
        description: "Department of Electrical and Electronics Engineering, VCET",
        icon: "Zap",
      },
      {
        code: "MECH",
        name: "Mechanical Engineering",
        description: "Department of Mechanical Engineering, VCET",
        icon: "Cog",
      },
      {
        code: "CIVIL",
        name: "Civil Engineering",
        description: "Department of Civil Engineering, VCET",
        icon: "Building",
      },
    ];

    const insertedDepts = await Department.insertMany(departmentList);
    const deptMap = {};
    insertedDepts.forEach((d) => {
      deptMap[d.code] = d._id;
    });

    console.log("🏫 Seeding Classes...");
    const classList = [
      { className: "III CSE - Section A", departmentId: deptMap["CSE"], year: 3, semester: 5, section: "A" },
      { className: "III CSE - Section B", departmentId: deptMap["CSE"], year: 3, semester: 5, section: "B" },
      { className: "II AI&DS - Section A", departmentId: deptMap["AI&DS"], year: 2, semester: 3, section: "A" },
      { className: "IV IT - Section A", departmentId: deptMap["IT"], year: 4, semester: 7, section: "A" },
    ];

    const insertedClasses = await Class.insertMany(classList);
    const classMap = {
      cse_3a: insertedClasses[0]._id,
      cse_3b: insertedClasses[1]._id,
      aids_2a: insertedClasses[2]._id,
      it_4a: insertedClasses[3]._id,
    };

    console.log("📚 Seeding Subjects...");
    const subjectList = [
      {
        code: "CS3452",
        name: "Theory of Computation",
        departmentId: deptMap["CSE"],
        semester: 5,
        year: 3,
        credits: 4,
        regulation: "2021",
        description: "Automata theory, context-free grammars, Turing machines, and decidability.",
      },
      {
        code: "CS3591",
        name: "Computer Networks",
        departmentId: deptMap["CSE"],
        semester: 5,
        year: 3,
        credits: 4,
        regulation: "2021",
        description: "OSI and TCP/IP models, routing protocols, transport layer flow control, socket programming.",
      },
      {
        code: "AD3351",
        name: "Design and Analysis of Algorithms",
        departmentId: deptMap["AI&DS"],
        semester: 3,
        year: 2,
        credits: 4,
        regulation: "2021",
        description: "Asymptotic notation, divide-and-conquer, greedy method, dynamic programming, NP-completeness.",
      },
    ];

    const insertedSubjects = await Subject.insertMany(subjectList);
    const subjectMap = {};
    insertedSubjects.forEach((s) => {
      subjectMap[s.code] = s._id;
    });

    console.log("👥 Seeding Users (Admin, Teachers, Students)...");
    const users = await User.insertMany([
      // Admin Account
      {
        role: "admin",
        username: "admin",
        password: "admin123", // Plain-text per project specifications
        name: "VCET System Administrator",
        email: "admin@vcet.ac.in",
        isActive: true,
      },
      // Teacher Account (CSE Department)
      {
        role: "teacher",
        staffId: "VCET-FAC-CSE-104",
        password: "faculty123", // Plain-text
        name: "Dr. K. S. Sendhilkumar",
        email: "sendhilkumar@vcet.ac.in",
        departmentId: deptMap["CSE"],
        designation: "Associate Professor & HOD i/c",
        isActive: true,
      },
      // Teacher Account (AI&DS Department)
      {
        role: "teacher",
        staffId: "VCET-FAC-AIDS-201",
        password: "faculty123", // Plain-text
        name: "Dr. M. Sangeetha",
        email: "sangeetha@vcet.ac.in",
        departmentId: deptMap["AI&DS"],
        designation: "Assistant Professor (Sr. Gr)",
        isActive: true,
      },
      // Student Account (Athithya R)
      {
        role: "student",
        registerNumber: "732924CSE001",
        password: "student123", // Plain-text
        name: "Athithya R",
        email: "732924cse001@vcet.ac.in",
        departmentId: deptMap["CSE"],
        classId: classMap["cse_3a"],
        points: { totalPoints: 1240, level: 4 },
        streak: { currentStreak: 12, longestStreak: 15, lastActiveDate: new Date().toISOString().split("T")[0] },
        isActive: true,
      },
      // Leaderboard Student 2
      {
        role: "student",
        registerNumber: "732924CSE042",
        password: "student123",
        name: "Kavya Dharshini P",
        email: "732924cse042@vcet.ac.in",
        departmentId: deptMap["CSE"],
        classId: classMap["cse_3a"],
        points: { totalPoints: 1080, level: 3 },
        streak: { currentStreak: 9, longestStreak: 12, lastActiveDate: new Date().toISOString().split("T")[0] },
        isActive: true,
      },
    ]);

    const adminUser = users[0];
    const teacherCse = users.find((u) => u.staffId === "VCET-FAC-CSE-104");

    console.log("📄 Seeding Department & Platform Resources...");
    await Resource.insertMany([
      {
        title: "Unit 1: Finite Automata & Regular Expressions Lecture Handout",
        description: "Comprehensive lecture notes on DFA, NFA, epsilon transitions, and minimization algorithms.",
        departmentId: deptMap["CSE"],
        subjectId: subjectMap["CS3452"],
        classId: classMap["cse_3a"],
        type: "notes",
        fileUrl: "https://vcet.ac.in/academic/cse/cs3452_unit1_notes.pdf",
        externalUrl: "https://vcet.ac.in/academic/cse/cs3452_unit1_notes.pdf",
        fileSize: "3.2 MB",
        fileType: "application/pdf",
        unit: 1,
        tags: ["TOC", "DFA", "Automata", "Unit 1"],
        downloadCount: 142,
        uploadedBy: teacherCse._id,
        uploaderRole: "teacher",
        isPublished: true,
      },
      {
        title: "CS3591 Computer Networks Lab Manual & Socket Programming Code",
        description: "Complete laboratory experiments manual covering Wireshark captures, TCP/UDP sockets in C/Python.",
        departmentId: deptMap["CSE"],
        subjectId: subjectMap["CS3591"],
        classId: classMap["cse_3a"],
        type: "lab_manual",
        fileUrl: "https://vcet.ac.in/academic/cse/cs3591_lab_manual.pdf",
        externalUrl: "https://vcet.ac.in/academic/cse/cs3591_lab_manual.pdf",
        fileSize: "4.8 MB",
        fileType: "application/pdf",
        unit: 2,
        tags: ["Networks", "Lab", "Socket Programming", "Wireshark"],
        downloadCount: 215,
        uploadedBy: teacherCse._id,
        uploaderRole: "teacher",
        isPublished: true,
      },
      // Aptitude resources
      {
        title: "IndiaBIX Quantitative Aptitude",
        description: "Comprehensive aptitude practice covering quantitative aptitude, logical reasoning, verbal ability, and technical interview questions.",
        departmentId: deptMap["CSE"],
        type: "aptitude",
        externalUrl: "https://www.indiabix.com",
        uploadedBy: adminUser._id,
        tags: ["Aptitude", "Quantitative", "Logical Reasoning", "Placements"],
        isPublished: true,
      },
      {
        title: "PrepInsta Placement Repository",
        description: "Dedicated placement preparation repository tailored for top tech companies (TCS, Infosys, Wipro, Cognizant, Accenture).",
        departmentId: deptMap["CSE"],
        type: "aptitude",
        externalUrl: "https://prepinsta.com",
        uploadedBy: adminUser._id,
        tags: ["Placements", "Company Specific", "Aptitude", "Coding"],
        isPublished: true,
      },
      // Tech Pulse Updates resources
      {
        title: "daily.dev",
        description: "All-in-one developer homepage delivering tailored engineering articles, open-source trends, framework releases.",
        departmentId: deptMap["CSE"],
        type: "updates",
        externalUrl: "https://daily.dev",
        uploadedBy: adminUser._id,
        tags: ["Developer News", "AI", "Open Source", "Coding"],
        isPublished: true,
      },
      {
        title: "TLDR Tech",
        description: "Bite-sized, curated daily newsletter summarizing the most critical tech headlines, AI breakthroughs, and engineering stories.",
        departmentId: deptMap["CSE"],
        type: "updates",
        externalUrl: "https://tldr.tech",
        uploadedBy: adminUser._id,
        tags: ["Curated", "AI", "Software", "Daily Brief"],
        isPublished: true,
      },
      // Tech Explorer Technology resources
      {
        title: "Google AI Studio",
        description: "Fastest way to prototype and build production applications with Google Gemini models. Experiment with multimodal prompts.",
        departmentId: deptMap["CSE"],
        type: "technology",
        externalUrl: "https://aistudio.google.com",
        uploadedBy: adminUser._id,
        tags: ["AI", "Gemini", "Multimodal", "API", "Development"],
        isPublished: true,
      },
      {
        title: "TryHackMe Ethical Hacking",
        description: "Hands-on browser-based cybersecurity and ethical hacking training platform designed with gamified virtual machines.",
        departmentId: deptMap["CSE"],
        type: "technology",
        externalUrl: "https://tryhackme.com",
        uploadedBy: adminUser._id,
        tags: ["Cybersecurity", "Ethical Hacking", "Networking", "Hands-on Labs"],
        isPublished: true,
      },
      // YouTube Channel resources
      {
        title: "Matt Wolfe — AI Roundups",
        description: "Curated weekly AI breakdowns, tool roundups, generative art showcases, and approachable deep-dives into consumer technology.",
        departmentId: deptMap["CSE"],
        type: "youtube",
        externalUrl: "https://www.youtube.com/@mreflow",
        uploadedBy: adminUser._id,
        tags: ["AI Tools", "AI News", "Generative AI", "Weekly Wrap"],
        isPublished: true,
      },
      {
        title: "Two Minute Papers",
        description: "Dr. Károly Zsolnai-Fehér covers cutting-edge computer graphics, neural physics simulators, robotics, and generative vision papers.",
        departmentId: deptMap["CSE"],
        type: "youtube",
        externalUrl: "https://www.youtube.com/channel/UCbfYPyITQ-7l4upoX8nvctg",
        uploadedBy: adminUser._id,
        tags: ["Computer Graphics", "AI Research", "Simulations", "Physics"],
        isPublished: true,
      },
    ]);

    console.log("🏢 Seeding Company Blueprints...");
    await Company.insertMany([
      {
        name: "Zoho Corporation",
        slug: "zoho",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Zoho_Corporation_logo.svg/320px-Zoho_Corporation_logo.svg.png",
        tagline: "Product Engineering & Software Development",
        packageRange: "₹6.0 LPA – ₹8.5 LPA",
        salary: "₹6.5 - ₹10.0 LPA",
        role: "Software Development Engineer (SDE)",
        eligibility: "BE/B.Tech (All Branches) • No standing arrears • CGPA > 6.5",
        description: "Zoho recruitment focuses rigorously on C/Java fundamentals, pure problem solving without standard libraries, and advanced application design.",
        rounds: [
          { round: "Round 1", title: "Basic Programming & Aptitude", duration: "90 mins", details: "25 Aptitude questions + 10 Flowchart & C-output prediction MCQs.", tips: "Focus on pointer arithmetic, loops, recursion." },
          { round: "Round 2", title: "Basic Coding & Pattern Programming", duration: "120 mins", details: "5 coding problems in C/C++/Java. Matrix rotations, string manipulations.", tips: "Do not use built-in string reverse or sort methods." },
          { round: "Round 3", title: "Advanced Problem Solving", duration: "180 mins", details: "Sudoku Solver, Railway Reservation mini-engine, or Taxi Booking simulation.", tips: "Write clean modular code with functions." },
          { round: "Round 4", title: "Technical & HR Interview", duration: "45 mins", details: "Live code walkthrough, core CS fundamentals, project review.", tips: "Be transparent about your thought process." }
        ],
        sampleQuestions: [
          "Print pattern: Spiral number matrix of N x N.",
          "Check if a string is a substring of another without using strstr().",
          "Design a mini Snake and Ladder game in pure console C/Java."
        ],
        pattern: "Heavy focus on pure C/Java logic without built-in libraries.",
        testLink: "https://www.geeksforgeeks.org/zoho-interview-questions/"
      },
      {
        name: "Tata Consultancy Services (TCS)",
        slug: "tcs",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Tata_Consultancy_Services_Logo.svg/320px-Tata_Consultancy_Services_Logo.svg.png",
        tagline: "TCS NQT • Ninja & Digital Cadre",
        packageRange: "₹3.6 LPA (Ninja) / ₹7.2 LPA (Digital) / ₹9.0 LPA (Prime)",
        salary: "₹3.6 - ₹7.5 LPA",
        role: "System Engineer / Digital Innovator",
        eligibility: "BE/B.Tech (All Branches) • 60% throughout 10th, 12th, and UG",
        description: "TCS National Qualifier Test (NQT) assesses Foundation cognitive skills and Advanced coding logic.",
        rounds: [
          { round: "Round 1", title: "TCS NQT Cognitive & Tech Assessment", duration: "120 mins", details: "Section A: Numerical, Verbal, Reasoning. Section B: Advanced Quant + 2 Hands-on Coding questions.", tips: "Practice TCS-specific question types." },
          { round: "Round 2", title: "Technical Interview (TR)", duration: "30-45 mins", details: "Questions on Data Structures, SQL queries, Software Engineering.", tips: "Prepare 2 favorite subjects thoroughly." }
        ],
        sampleQuestions: [
          "Given a series 1, 2, 1, 3, 2, 5, 3, 7... find the Nth term.",
          "Segregate 0s, 1s, and 2s in one pass (Dutch National Flag)."
        ],
        pattern: "Aptitude + 2 Hands-on Coding Questions in 45 minutes.",
        testLink: "https://prepinsta.com/tcs-nqt/"
      },
      {
        name: "Infosys",
        slug: "infosys",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Infosys_logo.svg/320px-Infosys_logo.svg.png",
        tagline: "Systems Engineer (SE) & Specialist Programmer (SP)",
        packageRange: "₹3.6 LPA (SE) / ₹6.5 LPA (DSE) / ₹9.5 LPA (SP)",
        salary: "₹3.6 - ₹9.5 LPA",
        role: "System Engineer & DSE",
        eligibility: "65% or 6.5 CGPA in graduation • No active backlogs",
        description: "Infosys recruitment tests logical reasoning, critical thinking, pseudo-code analysis, and dynamic programming.",
        rounds: [
          { round: "Round 1", title: "Online Test (HackWithInfy / InfyTQ / Campus)", duration: "100 mins", details: "Reasoning Ability, Technical Ability / Pseudo-code, Numerical Ability, Verbal.", tips: "Time allocation is crucial." }
        ],
        sampleQuestions: [
          "Find the longest palindrome subsequence using dynamic programming.",
          "Pseudo-code recursive trace with static variable increments."
        ],
        pattern: "Strict camera proctoring with timed coding test cases.",
        testLink: "https://www.indiabix.com"
      },
      {
        name: "Cognizant Technology Solutions (CTS)",
        slug: "cognizant",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Cognizant_logo_2022.svg/320px-Cognizant_logo_2022.svg.png",
        tagline: "GenC, GenC Elevate & GenC Next",
        packageRange: "₹4.0 LPA (GenC) / ₹4.5 LPA (Elevate) / ₹6.75 LPA (Next)",
        salary: "₹4.0 - ₹6.75 LPA",
        role: "Programmer Analyst Trainee",
        eligibility: "60% aggregate in 10th, 12th, and Diploma/UG",
        description: "Cognizant recruitment uses AMCAT or Superset platforms focusing on quantitative reasoning and domain skill evaluation.",
        rounds: [
          { round: "Round 1", title: "Cognitive & Technical Assessment", duration: "100 mins", details: "Automata Fix (debugging code snippets) + Data Interpretation + Verbal Ability.", tips: "Automata Fix requires finding logical bugs in 7 pre-written code snippets." }
        ],
        sampleQuestions: [
          "Fix bug in binary search implementation that causes infinite loop.",
          "SQL Query: Find employees who joined in the last 6 months with salary > ₹50,000."
        ],
        pattern: "Debugging/Pseudo-code speed tests + core DBMS and OOPS.",
        testLink: "https://www.sanfoundry.com"
      }
    ]);

    console.log("🧮 Seeding Aptitude Categories...");
    await AptitudeCategory.insertMany([
      {
        categoryId: "quant-percentages",
        title: "Percentages & Profit/Loss",
        domain: "Quantitative Aptitude",
        icon: "Percent",
        formulaCount: 8,
        questionCount: 45,
        concepts: [
          "Percentage represents parts per hundred: x% = x/100.",
          "Cost Price (CP) is the purchase price; Selling Price (SP) is the sale price.",
          "Profit = SP - CP (if SP > CP); Loss = CP - SP (if CP > SP)."
        ],
        formulas: [
          { name: "Multiplying Factor for Increase", expr: "SP = CP * (1 + P%/100)" },
          { name: "Successive Discount", expr: "Net Discount = (d1 + d2 - (d1 * d2)/100) %" }
        ],
        examples: [
          { q: "An article is sold for ₹840 at a profit of 20%. Find the Cost Price.", solution: "SP = CP * 1.20 => CP = 840 / 1.2 = ₹700." }
        ],
        practiceQuestions: [
          {
            id: "pq-1",
            q: "A shopkeeper marks an item 40% above CP and offers a discount of 25%. What is his profit percentage?",
            options: ["5%", "10%", "15%", "20%"],
            correct: 0,
            explanation: "Let CP = 100. Marked Price = 140. Discount = 25% of 140 = 35. SP = 105. Profit = 5%."
          }
        ]
      },
      {
        categoryId: "quant-time-work",
        title: "Time & Work / Pipes & Cisterns",
        domain: "Quantitative Aptitude",
        icon: "Clock",
        formulaCount: 6,
        questionCount: 40,
        concepts: [
          "If a person completes a work in N days, 1 day's work = 1/N.",
          "Total Work = Efficiency * Time."
        ],
        formulas: [
          { name: "Two Workers Together", expr: "Time = (A * B) / (A + B)" }
        ],
        examples: [
          { q: "Pipe A fills a tank in 6 hrs and Pipe B empties it in 9 hrs. How long to fill together?", solution: "Net Rate = 1/6 - 1/9 = 1/18. Time = 18 hours." }
        ],
        practiceQuestions: [
          {
            id: "pq-3",
            q: "12 men can finish a road project in 16 days. How many men are needed to finish in 8 days?",
            options: ["18", "20", "24", "32"],
            correct: 2,
            explanation: "M1 * D1 = M2 * D2 => 12 * 16 = M2 * 8 => M2 = 24 men."
          }
        ]
      }
    ]);

    console.log("🎓 Seeding Training Tracks, Bootcamps, and Toolkits...");
    await TrainingTrack.insertMany([
      {
        trackId: "prepzone-aptitude",
        title: "PrepZone Aptitude & Reasoning Mastery",
        icon: "Target",
        badge: "Most Popular",
        category: "Aptitude",
        level: "All Years",
        duration: "40 Hours",
        description: "Comprehensive quantitative aptitude, logical reasoning, and data interpretation drills tailored for Tier-1 campus recruitments.",
        topics: [
          "Speed Math & Number Systems",
          "Time, Speed, Distance & Work",
          "Profit, Loss & Percentages",
          "Syllogisms, Blood Relations & Seating Arrangements"
        ],
        resources: [
          { name: "IndiaBIX Quantitative Aptitude", url: "https://www.indiabix.com", type: "Practice Questions" },
          { name: "Smartkeeda Free Mock Tests", url: "https://www.smartkeeda.com", type: "Timed Tests" }
        ]
      },
      {
        trackId: "technical-coding",
        title: "Data Structures & Competitive Coding",
        icon: "Code2",
        badge: "Core Requirement",
        category: "Technical",
        level: "2nd - 4th Year",
        duration: "60 Hours",
        description: "Intensive algorithmic problem-solving in Python, Java, and C++ covering high-frequency technical interview coding patterns.",
        topics: [
          "Array Two-Pointer & Sliding Window Techniques",
          "Binary Search & Recursion Backtracking",
          "Linked Lists, Stacks & Monotonic Queues"
        ],
        resources: [
          { name: "NeetCode 150 Interview Roadmap", url: "https://neetcode.io/practice", type: "Structured Roadmap" },
          { name: "LeetCode Top Interview Questions", url: "https://leetcode.com/problemset/all/", type: "Coding Arena" }
        ]
      }
    ]);

    await Bootcamp.insertMany([
      {
        bootcampId: "bootcamp-zoho-2026",
        title: "Zoho Corporation Intensive Coding & Design Bootcamp",
        trainer: "VCET Placement Cell & Zoho Alumni Network",
        date: "Sep 22 - Sep 26, 2026",
        time: "04:30 PM - 06:30 PM IST",
        mode: "Hybrid (Placement Lab 3 & Google Meet)",
        eligible: "3rd & Final Year (CSE, IT, AI&DS, ECE)",
        seats: "120 Seats Remaining",
        status: "Registration Open",
        tags: ["Zoho", "Advanced Coding", "Round 2 & 3"]
      }
    ]);

    await Toolkit.insertMany([
      {
        title: "Complete Quantitative Aptitude Formula Cheat Sheet (PDF)",
        category: "Formulas & Cheatsheet",
        size: "4.2 MB",
        downloads: "2.4k+ VCET Students",
        url: "https://www.indiabix.com/aptitude/questions-and-answers/",
        desc: "150+ essential formulas for Time & Work, Speed, Permutations, Probability, and Geometry with shortcut tricks."
      }
    ]);

    console.log("📢 Seeding Announcements with Banners & Priority...");
    await Announcement.insertMany([
      {
        title: "Smart India Hackathon (SIH) 2026 — Internal College Screening & Team Registration",
        description: "Smart India Hackathon internal scrutiny starts next week. Submit your problem statement PPTs to the department hackathon SPOC.",
        content: "Smart India Hackathon internal scrutiny starts next week. Submit your problem statement PPTs to the department hackathon SPOC.",
        category: "Hackathon",
        priority: "urgent",
        imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80",
        targetAudience: "students",
        isPinned: true,
        publishDate: new Date(),
        createdBy: adminUser._id,
        authorName: adminUser.name,
        authorRole: "admin",
        isActive: true,
      },
      {
        title: "Zoho Campus Hiring Drive 2026: Technical & Advanced Coding Registration",
        description: "Registration is now open for III and IV Year B.E./B.Tech students for the upcoming Zoho recruitment drive for Software Developer roles.",
        content: "Registration is now open for III and IV Year B.E./B.Tech students for the upcoming Zoho recruitment drive for Software Developer roles.",
        category: "Placement",
        priority: "high",
        departmentId: deptMap["CSE"],
        imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80",
        targetAudience: "students",
        isPinned: true,
        publishDate: new Date(),
        createdBy: teacherCse._id,
        authorName: teacherCse.name,
        authorRole: "teacher",
        isActive: true,
      },
      {
        title: "Continuous Internal Assessment (CIA-1) Schedule Released",
        description: "The CIA-1 examination timetable for all engineering departments has been posted. Students can view hall allocations on their portal.",
        content: "The CIA-1 examination timetable for all engineering departments has been posted. Students can view hall allocations on their portal.",
        category: "Exam",
        priority: "normal",
        targetAudience: "all",
        isPinned: false,
        publishDate: new Date(),
        createdBy: adminUser._id,
        authorName: adminUser.name,
        authorRole: "admin",
        isActive: true,
      },
    ]);

    console.log("🎓 Seeding Interactive Self-Paced Courses with Cover Images...");
    const aiCourse = await Course.create({
      title: "Applied Artificial Intelligence & Machine Learning",
      slug: "applied-ai-ml",
      description: "Master modern Python programming, NumPy, Pandas, Scikit-Learn, and Neural Networks with real-world case studies.",
      courseDescription: "Master core Machine Learning and Deep Learning algorithms using Python, NumPy, Pandas, and Scikit-Learn. Build end-to-end predictive models, neural network architectures, and computer vision pipelines. Earn a verified institutional certification by tackling real-world engineering datasets and case studies.",
      category: "Artificial Intelligence",
      level: "Advanced",
      instructor: "Dr. M. Sangeetha",
      instructorName: "Dr. M. Sangeetha",
      duration: "4 Modules • 8 Hours",
      durationDays: 40,
      thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80",
      totalModules: 4,
      totalTests: 3,
      passingScore: 50,
      passingPercentage: 50,
      certificateEnabled: true,
      isPublished: true,
      createdBy: adminUser._id,
    });

    const mernCourse = await Course.create({
      title: "Full-Stack Web Development with React 19 & Node.js",
      slug: "fullstack-web-react-nodejs",
      description: "Master component-driven UI with React 19, RESTful API design with Express, and MongoDB aggregation pipelines.",
      courseDescription: "Build component-driven, responsive user interfaces with React 19, modern hooks, and TailwindCSS. Architect RESTful APIs using Express.js and design scalable MongoDB database schemas. Deploy production-ready web apps with JWT security, role-based access control, and live data synchronization.",
      category: "Web Development",
      level: "Intermediate",
      instructor: "Dr. K. S. Sendhilkumar",
      instructorName: "Dr. K. S. Sendhilkumar",
      duration: "5 Modules • 12 Hours",
      durationDays: 45,
      thumbnailUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80",
      totalModules: 5,
      totalTests: 4,
      passingScore: 50,
      passingPercentage: 50,
      certificateEnabled: true,
      isPublished: true,
      createdBy: teacherCse._id,
    });

    const pythonCourse = await Course.create({
      title: "Python Programming Masterclass",
      slug: "python-mastery-fundamentals",
      description: "Master Python fundamentals, OOP, data structures, and algorithms for engineering applications.",
      courseDescription: "Master core syntax, data structures, OOP principles, and clean code practices from scratch. Solve real-world algorithmic problems, file handling tasks, and automated engineering scripts. Test your knowledge with interactive coding assessments and earn an official VCET certificate.",
      category: "Programming",
      level: "Beginner to Intermediate",
      instructor: "Dr. K. Sathish Kumar (CSE)",
      instructorName: "Dr. K. Sathish Kumar (CSE)",
      duration: "5 Modules • 6 Hours",
      durationDays: 30,
      thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
      totalModules: 5,
      totalTests: 5,
      passingScore: 50,
      passingPercentage: 50,
      certificateEnabled: true,
      isPublished: true,
      createdBy: adminUser._id,
    });

    const devopsCourse = await Course.create({
      title: "Cloud Computing & DevOps Architecture",
      slug: "cloud-devops-architecture",
      description: "Learn containerization with Docker, orchestration with Kubernetes, and continuous integration via GitHub Actions.",
      courseDescription: "Understand cloud infrastructure, virtualization, AWS services, and distributed system design. Master Docker containerization, Kubernetes orchestration, and GitHub Actions CI/CD automation pipelines. Build resilient microservice architectures with zero-downtime deployment and automated monitoring.",
      category: "Cloud & DevOps",
      level: "Intermediate to Advanced",
      instructor: "VCET Cloud Specialization Faculty",
      instructorName: "VCET Cloud Specialization Faculty",
      duration: "3 Modules • 10 Hours",
      durationDays: 35,
      thumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
      totalModules: 3,
      totalTests: 2,
      passingScore: 50,
      passingPercentage: 50,
      certificateEnabled: true,
      isPublished: true,
      createdBy: adminUser._id,
    });

    const cyberCourse = await Course.create({
      title: "Cybersecurity & Ethical Hacking Essentials",
      slug: "cybersecurity-ethical-hacking",
      description: "Master network security fundamentals, penetration testing techniques, vulnerability assessments, and cryptography.",
      courseDescription: "Learn foundational principles of network security, vulnerability assessment, and ethical hacking. Master penetration testing methodologies, cryptographic protocols, and defensive security measures. Secure enterprise systems and audit web application vulnerabilities with industry-standard security tools.",
      category: "Cybersecurity & Networks",
      level: "Intermediate",
      instructor: "VCET Cyber Security Specialization Faculty",
      instructorName: "VCET Cyber Security Specialization Faculty",
      duration: "2 Modules • 8 Hours",
      durationDays: 30,
      thumbnailUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80",
      totalModules: 2,
      totalTests: 2,
      passingScore: 50,
      passingPercentage: 50,
      certificateEnabled: true,
      isPublished: true,
      createdBy: adminUser._id,
    });

    console.log("⚡ Preparing 10-Question Comprehensive Assessment Data for All Courses...");
    
    // 10 Questions for AI & Machine Learning Course
    const aiQuestions = [
      {
        question: "What is the primary distinction between Supervised and Unsupervised Learning?",
        options: [
          "Supervised learning uses labeled target data, whereas unsupervised learning finds hidden patterns in unlabeled data",
          "Unsupervised learning requires target labels for training",
          "Supervised learning cannot be used for classification problems",
          "Unsupervised learning only works on neural network architectures"
        ],
        correctAnswer: 0,
        correctAnswerText: "Supervised learning uses labeled target data, whereas unsupervised learning finds hidden patterns in unlabeled data",
        explanation: "Supervised learning trains algorithms on feature-label pairs, while unsupervised learning operates on unlabeled dataset features.",
        points: 1
      },
      {
        question: "Which activation function is most commonly used in the hidden layers of modern Deep Neural Networks to solve the vanishing gradient problem?",
        options: ["Sigmoid", "Tanh", "ReLU (Rectified Linear Unit)", "Linear"],
        correctAnswer: 2,
        correctAnswerText: "ReLU (Rectified Linear Unit)",
        explanation: "ReLU f(x) = max(0, x) provides a constant gradient of 1 for positive inputs, preventing vanishing gradients in deep networks.",
        points: 1
      },
      {
        question: "In Scikit-Learn, which algorithm is an ensemble method combining multiple decision trees using bagging?",
        options: ["Logistic Regression", "Random Forest Classifier", "Support Vector Machine", "K-Means Clustering"],
        correctAnswer: 1,
        correctAnswerText: "Random Forest Classifier",
        explanation: "Random Forest builds an ensemble of decorrelated decision trees on bootstrap dataset samples and averages their predictions.",
        points: 1
      },
      {
        question: "What linear algebra decomposition technique forms the foundation of Principal Component Analysis (PCA)?",
        options: ["LU Decomposition", "Singular Value Decomposition (SVD)", "Cholesky Factorization", "QR Matrix Product"],
        correctAnswer: 1,
        correctAnswerText: "Singular Value Decomposition (SVD)",
        explanation: "PCA computes principal components using Singular Value Decomposition (SVD) on the centered covariance matrix.",
        points: 1
      },
      {
        question: "Which evaluation metric is best suited for evaluating performance on highly imbalanced binary classification tasks?",
        options: ["Overall Accuracy", "F1-Score / Precision-Recall AUC", "Mean Squared Error", "R-Squared Score"],
        correctAnswer: 1,
        correctAnswerText: "F1-Score / Precision-Recall AUC",
        explanation: "Accuracy is misleading in imbalanced datasets; F1-score balances Precision and Recall for minority class detection.",
        points: 1
      },
      {
        question: "What role does the Learning Rate hyperparameter play in Gradient Descent optimization?",
        options: [
          "Determines the total number of layers in the neural network",
          "Controls the step size taken towards the minimum of the loss function",
          "Specifies the batch size of input samples",
          "Normalizes feature inputs to zero mean"
        ],
        correctAnswer: 1,
        correctAnswerText: "Controls the step size taken towards the minimum of the loss function",
        explanation: "The learning rate scales the loss gradient vector to control how far weights update per training step.",
        points: 1
      },
      {
        question: "In Convolutional Neural Networks (CNNs), what is the main purpose of a Max Pooling layer?",
        options: [
          "Increases the number of feature map channels",
          "Downsamples feature maps to reduce spatial dimensions and computation",
          "Performs non-linear matrix multiplication",
          "Normalizes activation values across feature channels"
        ],
        correctAnswer: 1,
        correctAnswerText: "Downsamples feature maps to reduce spatial dimensions and computation",
        explanation: "Max pooling extracts maximum values within spatial windows, reducing spatial dimensions and parameter count.",
        points: 1
      },
      {
        question: "Which regularization technique randomly deactivates a percentage of neurons during neural network training?",
        options: ["L2 Ridge Regularization", "Dropout", "Batch Normalization", "Gradient Clipping"],
        correctAnswer: 1,
        correctAnswerText: "Dropout",
        explanation: "Dropout randomly sets input units to 0 at each step during training time, preventing feature co-adaptation.",
        points: 1
      },
      {
        question: "Which loss function is the standard choice for multi-class classification neural networks with a Softmax output layer?",
        options: ["Mean Squared Error (MSE)", "Categorical Cross-Entropy", "Binary Cross-Entropy", "Huber Loss"],
        correctAnswer: 1,
        correctAnswerText: "Categorical Cross-Entropy",
        explanation: "Categorical Cross-Entropy measures the discrepancy between predicted Softmax probability distributions and one-hot ground truth labels.",
        points: 1
      },
      {
        question: "In the Transformer architecture, what mechanism allows the model to dynamically attend to different positions of a sequence?",
        options: ["Recurrent Gated Feedback", "Multi-Head Self-Attention", "Convolutional Kernel Stride", "Skip-Gram Embedding"],
        correctAnswer: 1,
        correctAnswerText: "Multi-Head Self-Attention",
        explanation: "Multi-Head Self-Attention calculates query-key-value dot products across multiple feature representation subspaces simultaneously.",
        points: 1
      }
    ];

    // 10 Questions for Full-Stack Web Development Course
    const mernQuestions = [
      {
        question: "In React 19, what hook allows child components within a <form> to access form submission status?",
        options: ["useFormStatus", "useFormState", "useActionState", "useOptimistic"],
        correctAnswer: 0,
        correctAnswerText: "useFormStatus",
        explanation: "useFormStatus is a React 19 hook that returns status information about the parent <form> element.",
        points: 1
      },
      {
        question: "Which Express middleware is required to parse incoming JSON request bodies into req.body?",
        options: ["express.static()", "express.json()", "express.urlencoded()", "cors()"],
        correctAnswer: 1,
        correctAnswerText: "express.json()",
        explanation: "express.json() is built-in Express middleware that parses incoming requests with JSON payloads.",
        points: 1
      },
      {
        question: "In Mongoose (MongoDB), which method populates referenced document details from another collection?",
        options: ["join()", "aggregate()", "populate()", "lookup()"],
        correctAnswer: 2,
        correctAnswerText: "populate()",
        explanation: "populate() lets you reference documents in other collections by replacing specified path IDs with full documents.",
        points: 1
      },
      {
        question: "What is the primary purpose of the Virtual DOM in React?",
        options: [
          "Directly edits the browser DOM without JS engine",
          "Minimizes expensive real DOM updates by performing fast diffing in memory",
          "Stores state in browser localStorage",
          "Compiles JSX into WebAssembly"
        ],
        correctAnswer: 1,
        correctAnswerText: "Minimizes expensive real DOM updates by performing fast diffing in memory",
        explanation: "React creates an in-memory Virtual DOM tree, diffs changes (reconciliation), and updates only affected real DOM elements.",
        points: 1
      },
      {
        question: "Which HTTP header is standard for passing JWT bearer tokens from client applications to protected API endpoints?",
        options: ["Content-Type: application/jwt", "Authorization: Bearer <token>", "X-Auth-Token: <token>", "Accept-Encoding: jwt"],
        correctAnswer: 1,
        correctAnswerText: "Authorization: Bearer <token>",
        explanation: "The Authorization header formatted as 'Bearer <token>' is the standard RFC 6750 specification for OAuth/JWT.",
        points: 1
      },
      {
        question: "Why is the key prop essential when rendering dynamic lists of elements in React?",
        options: [
          "Styles list items automatically",
          "Enables React to identify which items have changed, added, or removed efficiently",
          "Connects list items to Redux store",
          "Makes list items accessible to screen readers"
        ],
        correctAnswer: 1,
        correctAnswerText: "Enables React to identify which items have changed, added, or removed efficiently",
        explanation: "Keys give React element identity across renders, allowing optimal DOM reuse and avoiding state mismatch bugs.",
        points: 1
      },
      {
        question: "How does the Node.js Event Loop handle asynchronous non-blocking I/O operations?",
        options: [
          "Spawns a new OS thread for every single HTTP request",
          "Offloads asynchronous I/O tasks to system libuv workers and executes callbacks on the main single thread",
          "Blocks the main thread until database queries return",
          "Executes JavaScript code in parallel GPU cores"
        ],
        correctAnswer: 1,
        correctAnswerText: "Offloads asynchronous I/O tasks to system libuv workers and executes callbacks on the main single thread",
        explanation: "Node.js utilizes a single-threaded Event Loop backed by libuv thread pool for non-blocking asynchronous event execution.",
        points: 1
      },
      {
        question: "Which MongoDB update operator modifies specific document fields without replacing the entire document?",
        options: ["$replace", "$set", "$push", "$update"],
        correctAnswer: 1,
        correctAnswerText: "$set",
        explanation: "The $set operator replaces the value of a field with the specified value without altering unreferenced fields.",
        points: 1
      },
      {
        question: "Which React hook memoizes the computed result of an expensive calculation across re-renders?",
        options: ["useCallback", "useMemo", "useRef", "useEffect"],
        correctAnswer: 1,
        correctAnswerText: "useMemo",
        explanation: "useMemo caches the calculated result of a function and only recalculates it when its dependencies change.",
        points: 1
      },
      {
        question: "What security mechanism prevents browsers from making unauthorized cross-origin requests unless allowed by the server?",
        options: ["Cross-Origin Resource Sharing (CORS)", "Content Security Policy (CSP)", "Same-Site Cookies", "SSL/TLS Handshake"],
        correctAnswer: 0,
        correctAnswerText: "Cross-Origin Resource Sharing (CORS)",
        explanation: "CORS is an HTTP-header based mechanism that allows a server to indicate any origins other than its own from which a browser should permit loading resources.",
        points: 1
      }
    ];

    // 10 Questions for Python Masterclass Course
    const pythonQuestions = [
      {
        question: "What is the fundamental difference between Python Lists and Tuples?",
        options: [
          "Lists are mutable (modifiable), whereas Tuples are immutable (read-only)",
          "Tuples store key-value pairs while lists store ordered elements",
          "Lists cannot contain duplicate values",
          "Tuples cannot store integers"
        ],
        correctAnswer: 0,
        correctAnswerText: "Lists are mutable (modifiable), whereas Tuples are immutable (read-only)",
        explanation: "Lists [] can be modified after creation, while Tuples () cannot have elements added, removed, or reassigned.",
        points: 1
      },
      {
        question: "Which Python feature creates a new list by applying an expression to each item in an existing iterable?",
        options: ["List Comprehension", "Generator Yield", "Lambda Expression", "Dictionary Mapping"],
        correctAnswer: 0,
        correctAnswerText: "List Comprehension",
        explanation: "List comprehension [expr for item in iterable if condition] offers a concise syntax to create lists.",
        points: 1
      },
      {
        question: "Which built-in Python function returns an iterator of tuples containing counter indices along with element values?",
        options: ["zip()", "enumerate()", "map()", "filter()"],
        correctAnswer: 1,
        correctAnswerText: "enumerate()",
        explanation: "enumerate(iterable) adds a counter to an iterable and returns it as an enumerate object of (index, item).",
        points: 1
      },
      {
        question: "What decorator defines a method bound to the class itself rather than individual object instances?",
        options: ["@staticmethod", "@classmethod", "@property", "@abstractmethod"],
        correctAnswer: 1,
        correctAnswerText: "@classmethod",
        explanation: "@classmethod receives the class cls as its first implicit argument rather than instance self.",
        points: 1
      },
      {
        question: "How are runtime exceptions caught and handled in Python?",
        options: ["try ... except ... else ... finally", "try ... catch ... throw", "do ... handle ... error", "begin ... rescue ... ensure"],
        correctAnswer: 0,
        correctAnswerText: "try ... except ... else ... finally",
        explanation: "Python uses try for guarded code, except to handle exceptions, else if no exception occurred, and finally for cleanup.",
        points: 1
      },
      {
        question: "What is the purpose of the __init__ method in Python classes?",
        options: [
          "Destroys object instances when garbage collected",
          "Initializes the attributes of a newly created object instance",
          "Converts class instances to string representations",
          "Registers class in global namespace"
        ],
        correctAnswer: 1,
        correctAnswerText: "Initializes the attributes of a newly created object instance",
        explanation: "__init__ serves as the instance constructor initializer method called automatically when instantiating a class.",
        points: 1
      },
      {
        question: "Which standard library module provides pattern matching and manipulation operations using Regular Expressions?",
        options: ["string", "re", "regex_tools", "match"],
        correctAnswer: 1,
        correctAnswerText: "re",
        explanation: "The re module provides regular expression matching operations similar to those found in Perl.",
        points: 1
      },
      {
        question: "What do bool([]), bool(0), and bool(\"\") evaluate to in Python?",
        options: ["True", "False", "None", "TypeError"],
        correctAnswer: 1,
        correctAnswerText: "False",
        explanation: "Empty collections ([]), zero (0), empty strings (\"\"), and None evaluate to False in boolean contexts.",
        points: 1
      },
      {
        question: "Which Python keyword transforms a function into a Generator that yields values lazily?",
        options: ["return", "yield", "await", "defer"],
        correctAnswer: 1,
        correctAnswerText: "yield",
        explanation: "The yield statement suspends function execution and sends a value back to the caller while retaining state for subsequent calls.",
        points: 1
      },
      {
        question: "What is the role of Python's Global Interpreter Lock (GIL) in CPython?",
        options: [
          "Prevents memory leaks in circular references",
          "Ensures only one OS thread executes CPython bytecode at a single time",
          "Accelerates multi-core CPU mathematical operations",
          "Enforces static type checking"
        ],
        correctAnswer: 1,
        correctAnswerText: "Ensures only one OS thread executes CPython bytecode at a single time",
        explanation: "The CPython GIL is a mutual exclusion lock that prevents multiple native threads from executing Python bytecodes concurrently.",
        points: 1
      }
    ];

    // 10 Questions for Cloud & DevOps Course
    const devopsQuestions = [
      {
        question: "What is the primary advantage of containerization with Docker in DevOps workflows?",
        options: [
          "Replaces physical hardware routers",
          "Packages applications with all dependencies into lightweight, portable, consistent units",
          "Automatically writes application backend code",
          "Eliminates need for database backups"
        ],
        correctAnswer: 1,
        correctAnswerText: "Packages applications with all dependencies into lightweight, portable, consistent units",
        explanation: "Docker containers isolate software applications with their runtime environment, solving 'works on my machine' inconsistencies.",
        points: 1
      },
      {
        question: "In Kubernetes (k8s), what is the smallest deployable object that encapsulates one or more co-located containers?",
        options: ["Node", "Pod", "Cluster", "Namespace"],
        correctAnswer: 1,
        correctAnswerText: "Pod",
        explanation: "A Pod is the smallest execution unit in Kubernetes, representing a single instance of a running process in a cluster.",
        points: 1
      },
      {
        question: "Which Infrastructure-as-Code (IaC) tool uses declarative HCL files to provision multi-cloud resources?",
        options: ["Ansible", "Terraform", "Docker Compose", "Jenkins"],
        correctAnswer: 1,
        correctAnswerText: "Terraform",
        explanation: "HashiCorp Terraform uses HashiCorp Configuration Language (HCL) to declare cloud infrastructure state and provision resources.",
        points: 1
      },
      {
        question: "What CI/CD practice continuously tests code integration and automatically deploys validated builds to production?",
        options: ["Continuous Integration & Continuous Deployment", "Manual Approval Pipeline", "Waterfall Release Cycle", "Monolithic Archiving"],
        correctAnswer: 0,
        correctAnswerText: "Continuous Integration & Continuous Deployment",
        explanation: "CI/CD automates code integration testing, artifact building, and zero-downtime deployment pipelines.",
        points: 1
      },
      {
        question: "In Amazon Web Services (AWS), which core service provides resizable virtual machine compute instances?",
        options: ["Amazon S3", "Amazon EC2", "Amazon RDS", "Amazon Lambda"],
        correctAnswer: 1,
        correctAnswerText: "Amazon EC2",
        explanation: "Amazon Elastic Compute Cloud (EC2) provides scalable virtual server instances in the cloud.",
        points: 1
      },
      {
        question: "What is a primary function of Nginx when deployed as an Ingress/Reverse Proxy in production?",
        options: [
          "Compiles Java source code",
          "Distributes incoming network traffic (load balancing) and terminates SSL/TLS connections",
          "Generates database schemas",
          "Stores persistent user session objects"
        ],
        correctAnswer: 1,
        correctAnswerText: "Distributes incoming network traffic (load balancing) and terminates SSL/TLS connections",
        explanation: "Nginx acts as a high-performance reverse proxy, load balancer, and SSL/TLS terminator for backend web services.",
        points: 1
      },
      {
        question: "In Kubernetes, which resource object abstracts network access to a logical set of Pods with a stable ClusterIP or LoadBalancer?",
        options: ["Deployment", "Service", "ConfigMap", "Volume"],
        correctAnswer: 1,
        correctAnswerText: "Service",
        explanation: "A Kubernetes Service defines a logical set of Pods and a policy by which to access them over IP networks.",
        points: 1
      },
      {
        question: "Which command combines multiple git commit entries into a single clean commit before merging PRs?",
        options: ["git merge --no-ff", "git rebase -i (squash)", "git reset --hard", "git checkout -b"],
        correctAnswer: 1,
        correctAnswerText: "git rebase -i (squash)",
        explanation: "Interactive rebase 'git rebase -i' allows squashing multiple WIP commits into a single descriptive commit.",
        points: 1
      },
      {
        question: "In Microservice architectures, what pattern acts as a unified entry point handling routing, security, and rate limiting?",
        options: ["API Gateway", "Database Shard", "Message Queue", "Service Mesh Sidecar"],
        correctAnswer: 0,
        correctAnswerText: "API Gateway",
        explanation: "An API Gateway encapsulates internal microservices and provides a single entry point for client requests.",
        points: 1
      },
      {
        question: "What GitOps tool synchronizes Kubernetes cluster state declaratively from a Git repository?",
        options: ["ArgoCD", "Kubectl", "Prometheus", "Grafana"],
        correctAnswer: 0,
        correctAnswerText: "ArgoCD",
        explanation: "ArgoCD is a declarative GitOps continuous delivery tool for Kubernetes that continuously monitors running applications and matches them against Git manifests.",
        points: 1
      }
    ];

    // 10 Questions for Cybersecurity & Ethical Hacking Course
    const cyberQuestions = [
      {
        question: "Which web application vulnerability occurs when unsanitized user input is directly concatenated into SQL queries?",
        options: ["Cross-Site Scripting (XSS)", "SQL Injection (SQLi)", "Cross-Site Request Forgery (CSRF)", "Server-Side Request Forgery (SSRF)"],
        correctAnswer: 1,
        correctAnswerText: "SQL Injection (SQLi)",
        explanation: "SQL Injection occurs when malicious input alters the structure of backend database SQL statements.",
        points: 1
      },
      {
        question: "What protocol encrypts HTTP network communications over port 443 using TLS/SSL?",
        options: ["HTTP/1.1", "HTTPS", "FTP", "SSH"],
        correctAnswer: 1,
        correctAnswerText: "HTTPS",
        explanation: "HTTPS (Hypertext Transfer Protocol Secure) encrypts data in transit between browser and server using TLS encryption.",
        points: 1
      },
      {
        question: "What social engineering attack vector uses deceptive emails/websites to trick targets into disclosing credentials?",
        options: ["Phishing", "Man-in-the-Middle", "Buffer Overflow", "Zero-Day Exploit"],
        correctAnswer: 0,
        correctAnswerText: "Phishing",
        explanation: "Phishing tricks victims into revealing sensitive information like login credentials or credit card numbers.",
        points: 1
      },
      {
        question: "What security appliance monitors and filters incoming and outgoing network traffic based on predefined security rules?",
        options: ["Router", "Firewall", "DNS Server", "DHCP Server"],
        correctAnswer: 1,
        correctAnswerText: "Firewall",
        explanation: "Firewalls inspect packet headers and payloads to block unauthorized network access according to security rules.",
        points: 1
      },
      {
        question: "What attack type floods target servers with high-volume malicious traffic from distributed botnets to disrupt service?",
        options: ["Distributed Denial of Service (DDoS)", "Brute Force", "SQL Injection", "Privilege Escalation"],
        correctAnswer: 0,
        correctAnswerText: "Distributed Denial of Service (DDoS)",
        explanation: "DDoS attacks overwhelm target servers, network links, or web applications with massive traffic streams from compromised devices.",
        points: 1
      },
      {
        question: "Which cryptographic hash algorithm produces a 256-bit fixed-length output digest and is widely used for data integrity?",
        options: ["MD5", "SHA-256", "DES", "RC4"],
        correctAnswer: 1,
        correctAnswerText: "SHA-256",
        explanation: "SHA-256 (Secure Hash Algorithm 256-bit) is a cryptographic hash function producing a 32-byte hash value.",
        points: 1
      },
      {
        question: "In OWASP Top 10, what vulnerability enables attackers to inject malicious client-side scripts into web pages viewed by users?",
        options: ["Cross-Site Scripting (XSS)", "Insecure Deserialization", "Broken Access Control", "XML External Entity (XXE)"],
        correctAnswer: 0,
        correctAnswerText: "Cross-Site Scripting (XSS)",
        explanation: "XSS allows attackers to execute scripts in the victim's browser context, stealing cookies or session tokens.",
        points: 1
      },
      {
        question: "Why is a cryptographic Salt added to passwords before hashing?",
        options: [
          "Reduces password length for faster hashing",
          "Protects against precomputed Rainbow Table attacks by making identical password hashes unique",
          "Encrypts the database connection string",
          "Allows passwords to be decrypted easily by admins"
        ],
        correctAnswer: 1,
        correctAnswerText: "Protects against precomputed Rainbow Table attacks by making identical password hashes unique",
        explanation: "A unique random Salt ensures identical passwords produce distinct hash values, rendering precomputed rainbow tables useless.",
        points: 1
      },
      {
        question: "Which standard open-source network scanner is used for host discovery, open port scanning, and OS detection?",
        options: ["Nmap", "Wireshark", "Metasploit", "Burp Suite"],
        correctAnswer: 0,
        correctAnswerText: "Nmap",
        explanation: "Nmap (Network Mapper) is an open-source security tool used to discover hosts and services on a computer network.",
        points: 1
      },
      {
        question: "What security principle enforces granting users and systems only the minimum permissions necessary to perform their roles?",
        options: ["Principle of Least Privilege", "Defense in Depth", "Zero Trust Architecture", "Security through Obscurity"],
        correctAnswer: 0,
        correctAnswerText: "Principle of Least Privilege",
        explanation: "The Principle of Least Privilege (PoLP) minimizes potential damage from security breaches by limiting user access rights.",
        points: 1
      }
    ];

    console.log("📚 Seeding Course Modules with 10-Question Assessments for all 5 Unique Courses...");
    await CourseModule.insertMany([
      // AI / ML Modules
      {
        courseId: aiCourse._id,
        moduleNumber: 1,
        title: "Module 1: Foundations of Artificial Intelligence & Machine Learning",
        description: "AI/ML paradigm, problem framing, machine learning lifecycle, and development environment setup.",
        videoUrl: "https://www.youtube.com/watch?v=_t2GVaQasRY",
        content: "### AI & ML Foundations\n\nCore algorithms, learning paradigms, and data representation in modern AI.",
        estimatedMinutes: 50,
        hasMCQ: true,
        mcqs: aiQuestions,
        isPublished: true,
      },
      {
        courseId: aiCourse._id,
        moduleNumber: 2,
        title: "Module 2: NumPy",
        description: "High-performance numerical computing, N-dimensional arrays, vectorization, and matrix linear algebra with NumPy.",
        videoUrl: "https://www.youtube.com/watch?v=xECXZ3tyONo",
        content: "### Numerical Computing with NumPy\n\nVectorized calculations, broadcasting, indexing, and high-speed tensor operations.",
        estimatedMinutes: 60,
        hasMCQ: true,
        mcqs: aiQuestions,
        isPublished: true,
      },
      {
        courseId: aiCourse._id,
        moduleNumber: 3,
        title: "Module 3: Pandas",
        description: "Data manipulation, DataFrames, Series, handling missing data, filtering, groupby, and data preprocessing with Pandas.",
        videoUrl: "https://www.youtube.com/watch?v=mkYBJwX_dMs",
        content: "### Data Wrangling with Pandas\n\nStructured tabular data analysis, indexing, time-series operations, and feature engineering.",
        estimatedMinutes: 60,
        hasMCQ: true,
        mcqs: aiQuestions,
        isPublished: true,
      },
      {
        courseId: aiCourse._id,
        moduleNumber: 4,
        title: "Module 4: Machine Learning with Scikit-Learn",
        description: "Supervised and unsupervised learning, classification, regression, clustering, cross-validation, and Scikit-Learn pipelines.",
        videoUrl: "https://www.youtube.com/watch?v=B5VFg5l6rRs",
        content: "### Machine Learning Models\n\nTraining, evaluating, and tuning predictive machine learning models with Scikit-Learn.",
        estimatedMinutes: 75,
        hasMCQ: true,
        mcqs: aiQuestions,
        isPublished: true,
      },
      // MERN Web Development Modules
      {
        courseId: mernCourse._id,
        moduleNumber: 1,
        title: "Module 1: React 19",
        description: "React 19 fundamentals, JSX, modern component architecture, and next-generation UI rendering.",
        videoUrl: "https://www.youtube.com/watch?v=H6QAY_VqvUc",
        content: "### React 19 Architecture\n\nModern frontend engineering with React 19 compiler, component lifecycles, and high-performance UI patterns.",
        estimatedMinutes: 60,
        hasMCQ: true,
        mcqs: mernQuestions,
        isPublished: true,
      },
      {
        courseId: mernCourse._id,
        moduleNumber: 2,
        title: "Module 2: React Hooks",
        description: "useState, useEffect, useContext, useMemo, useCallback, and building resilient custom hooks.",
        videoUrl: "https://www.youtube.com/watch?v=bNvs64b2yew",
        content: "### Modern React Hooks\n\nState management, side-effects lifecycle, context providers, and custom hook composition.",
        estimatedMinutes: 60,
        hasMCQ: true,
        mcqs: mernQuestions,
        isPublished: true,
      },
      {
        courseId: mernCourse._id,
        moduleNumber: 3,
        title: "Module 3: REST API with Node.js",
        description: "Building production RESTful APIs with Node.js, Express framework, routing, middleware, and request validation.",
        videoUrl: "https://www.youtube.com/watch?v=HLT-QyNTwHw",
        content: "### RESTful API Architecture\n\nExpress routing, controller patterns, error middleware, and robust API endpoints.",
        estimatedMinutes: 60,
        hasMCQ: true,
        mcqs: mernQuestions,
        isPublished: true,
      },
      {
        courseId: mernCourse._id,
        moduleNumber: 4,
        title: "Module 4: MongoDB Schema Design",
        description: "NoSQL document modeling, Mongoose schemas, relationships, indexing, and architectural schema diagrams.",
        videoUrl: "https://www.youtube.com/watch?v=QAqK-R9HUhc",
        content: "### MongoDB Schema Modeling\n\nDesigning scalable data models, references vs embedding, and indexing best practices.",
        estimatedMinutes: 60,
        hasMCQ: true,
        mcqs: mernQuestions,
        isPublished: true,
      },
      {
        courseId: mernCourse._id,
        moduleNumber: 5,
        title: "Module 5: Fullstack Project Deployment",
        description: "Production build optimization, environment security, cloud deployment, and live MERN app hosting.",
        videoUrl: "https://www.youtube.com/watch?v=369EShl61lY",
        content: "### Production Deployment & Cloud Hosting\n\nBundling React frontends, deploying Node.js backends, and configuring MongoDB Atlas in production.",
        estimatedMinutes: 75,
        hasMCQ: true,
        mcqs: mernQuestions,
        isPublished: true,
      },
      // Python Masterclass Modules
      {
        courseId: pythonCourse._id,
        moduleNumber: 1,
        title: "Module 1: Introduction & Python Environment",
        description: "Variables, primitive data types, memory allocation, and Python 3 interpreter setup.",
        videoUrl: "https://www.youtube.com/watch?v=DInMru2Eq6E",
        content: "### Python Architecture & Setup\n\nPython is an interpreted, object-oriented, high-level programming language.",
        estimatedMinutes: 45,
        hasMCQ: true,
        mcqs: pythonQuestions,
        isPublished: true,
      },
      {
        courseId: pythonCourse._id,
        moduleNumber: 2,
        title: "Module 2: Variables, Operators & Expressions",
        description: "Type casting, arithmetic & bitwise operators, string slicing, and formatting.",
        videoUrl: "https://www.youtube.com/watch?v=Rtmgt2Qfqr4",
        content: "### Variables & Operations in Python\n\nUnderstand dynamic typing, operator precedence, and memory references.",
        estimatedMinutes: 60,
        hasMCQ: true,
        mcqs: pythonQuestions,
        isPublished: true,
      },
      {
        courseId: pythonCourse._id,
        moduleNumber: 3,
        title: "Module 3: Conditional Logic & Control Flow",
        description: "if-elif-else statements, nested branching, match-case pattern matching.",
        videoUrl: "https://www.youtube.com/watch?v=Xa0IXpmRD0s",
        content: "### Control Flow Structures\n\nBranching decision structures and modern structural pattern matching.",
        estimatedMinutes: 50,
        hasMCQ: true,
        mcqs: pythonQuestions,
        isPublished: true,
      },
      {
        courseId: pythonCourse._id,
        moduleNumber: 4,
        title: "Module 4: Iterations & Loops (for, while)",
        description: "For loops, range generator, while loops, break, continue, and loop-else blocks.",
        videoUrl: "https://www.youtube.com/watch?v=6iF8Xb7Z3wQ",
        content: "### Loop Mechanics\n\nIteration protocol, generator ranges, and loop optimization.",
        estimatedMinutes: 70,
        hasMCQ: true,
        mcqs: pythonQuestions,
        isPublished: true,
      },
      {
        courseId: pythonCourse._id,
        moduleNumber: 5,
        title: "Module 5: Functions",
        description: "Def statement, default parameters, *args, **kwargs, lambda functions, and call stack.",
        videoUrl: "https://www.youtube.com/watch?v=ijXMGpoMkhQ",
        content: "### Modular Functions\n\nFirst-class functions, parameters, return values, scope, and best practices.",
        estimatedMinutes: 85,
        hasMCQ: true,
        mcqs: pythonQuestions,
        isPublished: true,
      },
      // Cloud & DevOps Modules
      {
        courseId: devopsCourse._id,
        moduleNumber: 1,
        title: "Module 1: Containerization with Docker & Multi-stage Builds",
        description: "Dockerfiles, layer caching, volume mounts, Docker Compose, and networking.",
        videoUrl: "https://www.youtube.com/watch?v=ml_HACk7S7s",
        content: "### Containerization Fundamentals\n\nContainers isolate applications and dependencies across environments.",
        estimatedMinutes: 60,
        hasMCQ: true,
        mcqs: devopsQuestions,
        isPublished: true,
      },
      {
        courseId: devopsCourse._id,
        moduleNumber: 2,
        title: "Module 2: Kubernetes Orchestration",
        description: "Kubernetes architecture, Pods, Deployments, ReplicaSets, Services, and Cluster Management.",
        videoUrl: "https://www.youtube.com/watch?v=TlHvYWVUZyc",
        content: "### Kubernetes Container Orchestration\n\nScale, manage, and automate deployment of containerized clusters with Kubernetes.",
        estimatedMinutes: 75,
        hasMCQ: true,
        mcqs: devopsQuestions,
        isPublished: true,
      },
      {
        courseId: devopsCourse._id,
        moduleNumber: 3,
        title: "Module 3: CI/CD Automation",
        description: "Continuous Integration, Continuous Deployment, GitHub Actions pipelines, and automated delivery workflows.",
        videoUrl: "https://www.youtube.com/watch?v=TlHvYWVUZyc",
        content: "### CI/CD Automation & Pipelines\n\nAutomate building, testing, security scanning, and production deployment with GitHub Actions and automated workflows.",
        estimatedMinutes: 60,
        hasMCQ: true,
        mcqs: devopsQuestions,
        isPublished: true,
      },
      // Cybersecurity Modules
      {
        courseId: cyberCourse._id,
        moduleNumber: 1,
        title: "Module 1: Fundamentals of Network Security & Cryptography",
        description: "OSI security model, TLS/SSL encryption, public key infrastructure, and packet analysis.",
        videoUrl: "https://www.youtube.com/embed/inWWhr5tnEA",
        content: "### Cryptography & Network Security\n\nCore primitives for securing communications and data in transit.",
        estimatedMinutes: 60,
        hasMCQ: true,
        mcqs: cyberQuestions,
        isPublished: true,
      },
      {
        courseId: cyberCourse._id,
        moduleNumber: 2,
        title: "Module 2: Ethical Hacking & Web Vulnerability Assessment",
        description: "OWASP Top 10 vulnerabilities, SQL injection, XSS prevention, and penetration testing.",
        videoUrl: "https://www.youtube.com/watch?v=VxOoSO-BRDw",
        content: "### Web Application Security\n\nIdentifying and mitigating critical software vulnerabilities.",
        estimatedMinutes: 75,
        hasMCQ: true,
        mcqs: cyberQuestions,
        isPublished: true,
      },
    ]);

    console.log("⚡ Seeding 10-Question Comprehensive Assessment Tests for All Courses...");
    
    // Seed 5 Official Course Assessment Tests in DailyTest Collection
    const createdTests = await Promise.all([
      DailyTest.create({
        courseId: aiCourse._id,
        title: "Applied AI & ML — Official 10-Question Course Assessment",
        category: "Artificial Intelligence",
        difficulty: "Medium",
        day: 1,
        durationMinutes: 10,
        timeLimitSeconds: 600,
        maxViolations: 3,
        fullscreenRequired: true,
        antiCopy: true,
        antiPaste: true,
        autoSubmitOnViolation: true,
        passingPercentage: 60,
        pointsReward: 50,
        bonusPoints: 20,
        isPublished: true,
        questions: aiQuestions,
      }),
      DailyTest.create({
        courseId: mernCourse._id,
        title: "Full-Stack Web Dev (React 19 & Node) — Official 10-Question Course Assessment",
        category: "Web Development",
        difficulty: "Medium",
        day: 2,
        durationMinutes: 10,
        timeLimitSeconds: 600,
        maxViolations: 3,
        fullscreenRequired: true,
        antiCopy: true,
        antiPaste: true,
        autoSubmitOnViolation: true,
        passingPercentage: 60,
        pointsReward: 50,
        bonusPoints: 20,
        isPublished: true,
        questions: mernQuestions,
      }),
      DailyTest.create({
        courseId: pythonCourse._id,
        title: "Python Programming Masterclass — Official 10-Question Course Assessment",
        category: "Programming",
        difficulty: "Medium",
        day: 3,
        durationMinutes: 10,
        timeLimitSeconds: 600,
        maxViolations: 3,
        fullscreenRequired: true,
        antiCopy: true,
        antiPaste: true,
        autoSubmitOnViolation: true,
        passingPercentage: 60,
        pointsReward: 50,
        bonusPoints: 20,
        isPublished: true,
        questions: pythonQuestions,
      }),
      DailyTest.create({
        courseId: devopsCourse._id,
        title: "Cloud & DevOps Architecture — Official 10-Question Course Assessment",
        category: "Cloud & DevOps",
        difficulty: "Medium",
        day: 4,
        durationMinutes: 10,
        timeLimitSeconds: 600,
        maxViolations: 3,
        fullscreenRequired: true,
        antiCopy: true,
        antiPaste: true,
        autoSubmitOnViolation: true,
        passingPercentage: 60,
        pointsReward: 50,
        bonusPoints: 20,
        isPublished: true,
        questions: devopsQuestions,
      }),
      DailyTest.create({
        courseId: cyberCourse._id,
        title: "Cybersecurity Essentials — Official 10-Question Course Assessment",
        category: "Cybersecurity & Networks",
        difficulty: "Medium",
        day: 5,
        durationMinutes: 10,
        timeLimitSeconds: 600,
        maxViolations: 3,
        fullscreenRequired: true,
        antiCopy: true,
        antiPaste: true,
        autoSubmitOnViolation: true,
        passingPercentage: 60,
        pointsReward: 50,
        bonusPoints: 20,
        isPublished: true,
        questions: cyberQuestions,
      }),
    ]);
    const dailyTest1 = createdTests[0];

    console.log("💻 Seeding Coding Arena Problems with Public & Hidden Test Cases...");
    const codingTest1 = await CodingTest.create({
      title: "Zoho & TCS Technical Coding Assessment 2026",
      slug: "zoho-tcs-coding-assessment",
      description: "Recruitment coding round covering string manipulations, array frequency algorithms, and dynamic programming.",
      difficulty: "Medium",
      category: "Placement",
      timeLimit: 45,
      memoryLimit: 256,
      languages: ["python", "javascript", "cpp", "java", "c"],
      settings: {
        fullscreenRequired: true,
        antiCopy: true,
        antiPaste: true,
        maxViolations: 3,
        autoSubmitOnViolation: true,
      },
      pointsReward: 50,
      bonusPoints: 25,
      isPublished: true,
      createdBy: adminUser._id,
      problems: [
        {
          title: "Two Sum Target Pair",
          slug: "two-sum",
          difficulty: "Easy",
          tags: ["Array", "Hash Table", "Zoho"],
          description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
          inputFormat: "First line contains space-separated integers for nums. Second line contains integer target.",
          outputFormat: "Print space-separated indices sorted in ascending order.",
          constraints: [
            "2 <= nums.length <= 10^4",
            "-10^9 <= nums[i] <= 10^9",
            "Only one valid answer exists.",
          ],
          sampleInput: "2 7 11 15\n9",
          sampleOutput: "0 1",
          starterCode: {
            python: "import sys\n\ndef two_sum():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines or len(lines) < 2: return\n    nums = list(map(int, lines[0].split()))\n    target = int(lines[1])\n    \n    seen = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen:\n            print(f\"{seen[comp]} {i}\")\n            return\n        seen[num] = i\n\nif __name__ == '__main__':\n    two_sum()",
            javascript: "const fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (input.length >= 2) {\n  const nums = input[0].split(' ').map(Number);\n  const target = Number(input[1]);\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (map.has(comp)) {\n      console.log(`${map.get(comp)} ${i}`);\n      break;\n    }\n    map.set(nums[i], i);\n  }\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    // Solution template\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Solution template\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    // Solution template\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "2 7 11 15\n9",
              expectedOutput: "0 1",
              explanation: "nums[0] + nums[1] = 2 + 7 = 9",
            },
            {
              input: "3 2 4\n6",
              expectedOutput: "1 2",
              explanation: "nums[1] + nums[2] = 2 + 4 = 6",
            },
          ],
          // Hidden test cases kept exclusively on the server
          hiddenTestCases: [
            {
              input: "3 3\n6",
              expectedOutput: "0 1",
            },
            {
              input: "1 5 8 19 32\n27",
              expectedOutput: "2 3",
            },
          ],
          points: 25,
        },
        {
          title: "Longest Substring Without Repeating Characters",
          slug: "longest-substring-without-repeating",
          difficulty: "Medium",
          tags: ["Sliding Window", "String", "Amazon"],
          description: "Given a string `s`, find the length of the longest substring without repeating characters.",
          inputFormat: "A single line containing string `s`.",
          outputFormat: "A single integer denoting the length of the longest non-repeating substring.",
          constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols, and spaces."],
          sampleInput: "abcabcbb",
          sampleOutput: "3",
          starterCode: {
            python: "import sys\n\ndef length_of_longest_substring():\n    lines = sys.stdin.read().splitlines()\n    s = lines[0] if lines else ''\n    char_map = {}\n    left = 0\n    max_len = 0\n    for right, ch in enumerate(s):\n        if ch in char_map and char_map[ch] >= left:\n            left = char_map[ch] + 1\n        char_map[ch] = right\n        max_len = max(max_len, right - left + 1)\n    print(max_len)\n\nif __name__ == '__main__':\n    length_of_longest_substring()",
            javascript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconst map = new Map();\nlet left = 0, maxLen = 0;\nfor (let right = 0; right < input.length; right++) {\n  const ch = input[right];\n  if (map.has(ch) && map.get(ch) >= left) {\n    left = map.get(ch) + 1;\n  }\n  map.set(ch, right);\n  maxLen = Math.max(maxLen, right - left + 1);\n}\nconsole.log(maxLen);",
            cpp: "#include <iostream>\n#include <string>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\npublic class Solution { public static void main(String[] args) {} }",
            c: "#include <stdio.h>\nint main() { return 0; }",
          },
          publicTestCases: [
            {
              input: "abcabcbb",
              expectedOutput: "3",
              explanation: "The answer is 'abc', with the length of 3.",
            },
            {
              input: "bbbbb",
              expectedOutput: "1",
              explanation: "The answer is 'b', with the length of 1.",
            },
          ],
          hiddenTestCases: [
            {
              input: "pwwkew",
              expectedOutput: "3",
            },
            {
              input: "tmmzuxt",
              expectedOutput: "5",
            },
          ],
          points: 25,
        },
      ],
    });

    console.log("🛡️ Seeding Test Violations Audit Data...");
    const studentUser = users.find((u) => u.registerNumber === "732924CSE001");
    await TestViolation.insertMany([
      {
        studentId: studentUser._id,
        testType: "coding",
        testId: codingTest1._id,
        type: "TAB_SWITCH",
        timestamp: new Date(Date.now() - 1000 * 60 * 35),
        details: "Student switched tab / document visibility lost.",
      },
      {
        studentId: studentUser._id,
        testType: "coding",
        testId: codingTest1._id,
        type: "FULLSCREEN_EXIT",
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
        details: "Exited fullscreen mode during timed section.",
      },
      {
        studentId: users[4]._id,
        testType: "mcq",
        testId: dailyTest1._id,
        type: "COPY_ATTEMPT",
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        details: "Blocked copy hotkey combination (Ctrl+C).",
      },
    ]);

    console.log("📜 Seeding Sample Issued Certificates for Verification...");
    await Certificate.insertMany([
      {
        certificateNumber: "VCET-CERT-2026-PY-0091",
        verificationCode: "0X7B3F91A2",
        studentId: studentUser._id,
        courseId: pythonCourse._id,
        studentName: studentUser.name || "Kavya Dharshini S",
        registerNumber: studentUser.registerNumber || "732924CSE001",
        courseName: "Python Programming Masterclass",
        instructorName: "Dr. K. Sathish Kumar (CSE)",
        score: 95,
        grade: "Outstanding",
        status: "valid",
        issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      },
      {
        certificateNumber: "VCET-CERT-2026-GIT-0044",
        verificationCode: "0X9E14C05D",
        studentId: studentUser._id,
        courseId: mernCourse._id,
        studentName: studentUser.name || "Kavya Dharshini S",
        registerNumber: studentUser.registerNumber || "732924CSE001",
        courseName: "Full Stack Web Development (MERN)",
        instructorName: "Dr. S. K. Nandhakumar (CSE)",
        score: 88,
        grade: "Distinction",
        status: "valid",
        issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
      {
        certificateNumber: "VCET-CERT-2026-AI-0012",
        verificationCode: "0X3A88D1FE",
        studentId: users[4]._id,
        courseId: pythonCourse._id,
        studentName: users[4].name || "Gokul P",
        registerNumber: users[4].registerNumber || "732924CSE002",
        courseName: "Python Programming Masterclass",
        instructorName: "Dr. K. Sathish Kumar (CSE)",
        score: 82,
        grade: "First Class",
        status: "valid",
        issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      },
    ]);

    console.log("📈 Seeding Visitor Counter & Trends...");
    await Visitor.create({
      key: "global_counter",
      totalVisits: 1250,
      updatedAt: new Date(),
    });

    const today = new Date();
    const visitorData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      visitorData.push({
        date: dateStr,
        totalVisits: Math.floor(180 + Math.random() * 80),
        uniqueVisitors: Math.floor(90 + Math.random() * 40),
        resourceViews: Math.floor(120 + Math.random() * 60),
        courseViews: Math.floor(80 + Math.random() * 30),
        announcementViews: Math.floor(50 + Math.random() * 20),
      });
    }
    await Visitor.insertMany(visitorData);

    console.log("\n========================================================");
    console.log("✅ SEEDING COMPLETE FOR TECHVERSE DATABASE");
    console.log("========================================================");
    console.log("👤 Admin:   username: admin           | password: admin123");
    console.log("👨‍🏫 Teacher: staffId:  VCET-FAC-CSE-104 | password: faculty123");
    console.log("🎓 Student: regNumber: 732924CSE001   | password: student123");
    console.log("========================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedDatabase();
