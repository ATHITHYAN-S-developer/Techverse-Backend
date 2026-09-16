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
      duration: "12 Modules • 8 Hours",
      durationDays: 40,
      thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80",
      totalModules: 3,
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
      duration: "10 Modules • 12 Hours",
      durationDays: 45,
      thumbnailUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80",
      totalModules: 4,
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
      duration: "8 Modules • 10 Hours",
      durationDays: 35,
      thumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
      totalModules: 2,
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
      duration: "6 Modules • 8 Hours",
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

    console.log("📚 Seeding Course Modules for all 5 Unique Courses...");
    await CourseModule.insertMany([
      // AI / ML Modules
      {
        courseId: aiCourse._id,
        moduleNumber: 1,
        title: "Module 1: Python Data Structures & Algorithmic Foundations",
        description: "List comprehensions, dictionary mappings, generators, and time complexity.",
        videoUrl: "https://www.youtube.com/embed/rfscVS0vtbw",
        content: "Python provides clean, readable syntax and versatile built-in data structures.",
        estimatedMinutes: 45,
        isPublished: true,
      },
      {
        courseId: aiCourse._id,
        moduleNumber: 2,
        title: "Module 2: Numerical Computing with NumPy & Pandas",
        description: "Vectorized operations, data cleaning, filtering, and aggregation pipelines.",
        videoUrl: "https://www.youtube.com/embed/vmEHCJofslg",
        content: "NumPy arrays allow high-performance mathematical and statistical computations.",
        estimatedMinutes: 60,
        isPublished: true,
      },
      {
        courseId: aiCourse._id,
        moduleNumber: 3,
        title: "Module 3: Machine Learning with Scikit-Learn",
        description: "Supervised and unsupervised learning, model evaluation, cross-validation.",
        videoUrl: "https://www.youtube.com/embed/0B5eIE_1vpU",
        content: "Scikit-learn provides robust tools for predictive modeling.",
        estimatedMinutes: 50,
        isPublished: true,
      },
      // MERN Web Development Modules
      {
        courseId: mernCourse._id,
        moduleNumber: 1,
        title: "Module 1: React 19 Fundamentals & Modern Hooks",
        description: "Deep dive into useState, useEffect, useMemo, custom hooks, and React 19 concurrency.",
        videoUrl: "https://www.youtube.com/embed/SqcY0GlETPk",
        content: "React is a declarative, efficient, and flexible JavaScript library for building user interfaces.",
        estimatedMinutes: 45,
        isPublished: true,
      },
      {
        courseId: mernCourse._id,
        moduleNumber: 2,
        title: "Module 2: Building REST APIs with Express & Node",
        description: "Middleware architecture, JWT authentication, route protection, and request validation.",
        videoUrl: "https://www.youtube.com/embed/Oe421EPjeBE",
        content: "Express provides a robust set of features for web and mobile applications.",
        estimatedMinutes: 60,
        isPublished: true,
      },
      {
        courseId: mernCourse._id,
        moduleNumber: 3,
        title: "Module 3: MongoDB Aggregations & Schema Design",
        description: "Mongoose models, indexing strategies, referential integrity, and pipeline queries.",
        videoUrl: "https://www.youtube.com/embed/ofme2o29ngU",
        content: "MongoDB document databases provide high scalability and flexibility.",
        estimatedMinutes: 50,
        isPublished: true,
      },
      {
        courseId: mernCourse._id,
        moduleNumber: 4,
        title: "Module 4: Full Stack Project Deployment",
        description: "Production bundling, CORS, environment security, and cloud deployment.",
        videoUrl: "https://www.youtube.com/embed/1r-M31x9U_I",
        content: "### Production Deployment & CI/CD\n\nDeploying MERN stack with zero downtime.",
        estimatedMinutes: 90,
        isPublished: true,
      },
      // Python Masterclass Modules
      {
        courseId: pythonCourse._id,
        moduleNumber: 1,
        title: "Module 1: Introduction & Python Environment",
        description: "Variables, primitive data types, memory allocation, and Python 3 interpreter setup.",
        videoUrl: "https://www.youtube.com/embed/_uQrJ0TkZlc",
        content: "### Python Architecture & Setup\n\nPython is an interpreted, object-oriented, high-level programming language.",
        estimatedMinutes: 45,
        isPublished: true,
      },
      {
        courseId: pythonCourse._id,
        moduleNumber: 2,
        title: "Module 2: Variables, Operators & Expressions",
        description: "Type casting, arithmetic & bitwise operators, string slicing, and formatting.",
        videoUrl: "https://www.youtube.com/embed/kqtD5dpn9C8",
        content: "### Variables & Operations in Python\n\nUnderstand dynamic typing, operator precedence, and memory references.",
        estimatedMinutes: 60,
        isPublished: true,
      },
      {
        courseId: pythonCourse._id,
        moduleNumber: 3,
        title: "Module 3: Conditional Logic & Control Flow",
        description: "if-elif-else statements, nested branching, match-case pattern matching.",
        videoUrl: "https://www.youtube.com/embed/AWek49wXGzI",
        content: "### Control Flow Structures\n\nBranching decision structures and modern structural pattern matching.",
        estimatedMinutes: 50,
        isPublished: true,
      },
      {
        courseId: pythonCourse._id,
        moduleNumber: 4,
        title: "Module 4: Iterations & Loops (for, while)",
        description: "For loops, range generator, while loops, break, continue, and loop-else blocks.",
        videoUrl: "https://www.youtube.com/embed/94UHCEmprCY",
        content: "### Loop Mechanics\n\nIteration protocol, generator ranges, and loop optimization.",
        estimatedMinutes: 70,
        isPublished: true,
      },
      {
        courseId: pythonCourse._id,
        moduleNumber: 5,
        title: "Module 5: Functions, Scope & Recursion",
        description: "Def statement, default parameters, *args, **kwargs, lambda functions, and call stack.",
        videoUrl: "https://www.youtube.com/embed/u-OmVr_fT4s",
        content: "### Modular Functions & Recursion\n\nFirst-class functions, closures, decorators, and recursion limits.",
        estimatedMinutes: 85,
        isPublished: true,
      },
      // Cloud & DevOps Modules
      {
        courseId: devopsCourse._id,
        moduleNumber: 1,
        title: "Module 1: Containerization with Docker & Multi-stage Builds",
        description: "Dockerfiles, layer caching, volume mounts, Docker Compose, and networking.",
        videoUrl: "https://www.youtube.com/embed/fqMOX6JJhGo",
        content: "### Containerization Fundamentals\n\nContainers isolate applications and dependencies across environments.",
        estimatedMinutes: 60,
        isPublished: true,
      },
      {
        courseId: devopsCourse._id,
        moduleNumber: 2,
        title: "Module 2: Kubernetes Orchestration & CI/CD Automation",
        description: "Deployments, Services, Ingress controllers, and GitHub Actions pipelines.",
        videoUrl: "https://www.youtube.com/embed/X48VuDVv0do",
        content: "### Cloud Orchestration & CI/CD\n\nAutomate building, testing, and deploying containerized applications.",
        estimatedMinutes: 90,
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
        isPublished: true,
      },
      {
        courseId: cyberCourse._id,
        moduleNumber: 2,
        title: "Module 2: Ethical Hacking & Web Vulnerability Assessment",
        description: "OWASP Top 10 vulnerabilities, SQL injection, XSS prevention, and penetration testing.",
        videoUrl: "https://www.youtube.com/embed/3Kq1MIfTWCE",
        content: "### Web Application Security\n\nIdentifying and mitigating critical software vulnerabilities.",
        estimatedMinutes: 75,
        isPublished: true,
      },
    ]);

    console.log("⚡ Seeding Daily Practice Tests...");
    const dailyTest1 = await DailyTest.create({
      title: "Daily Tech Challenge: Modern JavaScript & React Concepts",
      category: "Programming",
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
      pointsReward: 10,
      bonusPoints: 5,
      isPublished: true,
      questions: [
        {
          question: "Which of the following is true about JavaScript Closures?",
          options: [
            "A closure gives you access to an outer function's scope from an inner function",
            "A closure is an instance of a class",
            "Closures are executed exclusively on the server",
            "A closure cannot access variables defined in parent scope",
          ],
          correctAnswer: 0,
          explanation: "In JavaScript, a closure is the combination of a function bundled together with references to its surrounding lexical state.",
          points: 1,
        },
        {
          question: "Which hook is used in React to manage side effects such as data fetching?",
          options: ["useReducer", "useEffect", "useMemo", "useRef"],
          correctAnswer: 1,
          explanation: "useEffect serves the purpose of executing side-effects after render in React function components.",
          points: 1,
        },
        {
          question: "What is the time complexity of searching an element in a balanced Binary Search Tree (BST)?",
          options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
          correctAnswer: 1,
          explanation: "A balanced BST eliminates half the tree at each node comparison step, giving logarithmic time complexity O(log n).",
          points: 1,
        },
      ],
    });

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
