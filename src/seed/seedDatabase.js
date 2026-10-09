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
import { CourseAssessment } from "../models/CourseAssessment.js";
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
      CourseAssessment.deleteMany({}),
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
        password: "VcetTech@123", // Plain-text per project specifications
        name: "VCET System Administrator",
        email: "admin@vcet.ac.in",
        isActive: true,
      },
      // HOD Account (CSE Department)
      {
        role: "hod",
        staffId: "VCET-FAC-CSE-104",
        password: "faculty123", // Plain-text
        name: "Dr. K. S. Sendhilkumar",
        email: "sendhilkumar@vcet.ac.in",
        departmentId: deptMap["CSE"],
        departmentCode: "CSE",
        departmentName: "Computer Science & Engineering",
        department: "Computer Science & Engineering",
        designation: "Head of the Department (HOD)",
        isActive: true,
      },
      // Faculty Account (AI&DS Department)
      {
        role: "faculty",
        staffId: "VCET-FAC-AIDS-201",
        password: "faculty123", // Plain-text
        name: "Dr. M. Sangeetha",
        email: "sangeetha@vcet.ac.in",
        departmentId: deptMap["AI&DS"],
        departmentCode: "AI&DS",
        departmentName: "Artificial Intelligence & Data Science",
        department: "Artificial Intelligence & Data Science",
        designation: "Assistant Professor (Sr. Gr)",
        isActive: true,
      },
      // Student Account (Athithyan S)
      {
        role: "student",
        registerNumber: "732924CSR014",
        password: "student123", // Plain-text
        // Students log in with register number + date of birth (UTC midnight).
        name: "Athithyan S",
        email: "732924csr014@vcet.ac.in",
        dateOfBirth: new Date(Date.UTC(2006, 6, 20)), // 20/07/2006
        departmentId: deptMap["CSE"],
        departmentCode: "CSE",
        departmentName: "Computer Science & Engineering",
        department: "Computer Science & Engineering",
        classId: classMap["cse_3a"],
        points: { totalPoints: 0, level: 1 },
        streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null, freezeCount: 0 },
        isActive: true,
      },
      // Leaderboard Student 2
      {
        role: "student",
        registerNumber: "732924CSE042",
        password: "student123",
        name: "Kavya Dharshini P",
        email: "732924cse042@vcet.ac.in",
        dateOfBirth: new Date(Date.UTC(2007, 4, 11)),
        departmentId: deptMap["CSE"],
        departmentCode: "CSE",
        departmentName: "Computer Science & Engineering",
        department: "Computer Science & Engineering",
        classId: classMap["cse_3a"],
        points: { totalPoints: 0, level: 1 },
        streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null, freezeCount: 0 },
        isActive: true,
      },
    ]);

    const adminUser = users[0];
    const teacherCse = users.find((u) => u.staffId === "VCET-FAC-CSE-104");

    console.log("📄 Seeding Department & Platform Resources...");
    // Dummy resources removed as requested
    await Resource.insertMany([]);

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
      CourseAssessment.create({
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
      CourseAssessment.create({
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
      CourseAssessment.create({
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
      CourseAssessment.create({
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
      CourseAssessment.create({
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
      title: "Easy Questions",
      slug: "easy-level-coding-questions",
      description: "Beginner-level programming questions covering math basics, loops, strings, and arrays. Each problem includes public and hidden test cases.",
      difficulty: "Easy",
      category: "Practice",
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
          title: "Sum of Two Numbers",
          slug: "sum-of-two-numbers",
          difficulty: "Easy",
          tags: ["Math", "Basics"],
          description: "Write a program to read two integers and print their sum.",
          inputFormat: "The first line contains an integer A. The second line contains an integer B.",
          outputFormat: "Print the sum of A and B.",
          constraints: ["-10^9 <= A <= 10^9", "-10^9 <= B <= 10^9"],
          sampleInput: "5\n7",
          sampleOutput: "12",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2:\n        return\n    a = int(lines[0])\n    b = int(lines[1])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n  const a = Number(lines[0]);\n  const b = Number(lines[1]);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "5\n7",
              expectedOutput: "12",
              explanation: "5 + 7 = 12",
            },
            {
              input: "100\n200",
              expectedOutput: "300",
              explanation: "100 + 200 = 300",
            },
          ],
          hiddenTestCases: [
            {
              input: "-5\n-3",
              expectedOutput: "-8",
            },
            {
              input: "0\n0",
              expectedOutput: "0",
            },
          ],
          points: 25,
        },
        {
          title: "Even or Odd",
          slug: "even-or-odd",
          difficulty: "Easy",
          tags: ["Conditional", "Basics"],
          description: "Write a program to determine whether a given integer is even or odd.",
          inputFormat: "A single integer N.",
          outputFormat: "Print \"Even\" if N is even; otherwise, print \"Odd\".",
          constraints: ["-10^9 <= N <= 10^9"],
          sampleInput: "8",
          sampleOutput: "Even",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines:\n        return\n    n = int(lines[0])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst n = Number(fs.readFileSync('/dev/stdin', 'utf-8').trim());\n// Write your solution here",
            cpp: "#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "8",
              expectedOutput: "Even",
              explanation: "8 is divisible by 2",
            },
            {
              input: "7",
              expectedOutput: "Odd",
              explanation: "7 is not divisible by 2",
            },
          ],
          hiddenTestCases: [
            {
              input: "13",
              expectedOutput: "Odd",
            },
            {
              input: "0",
              expectedOutput: "Even",
            },
          ],
          points: 25,
        },
        {
          title: "Largest of Two Numbers",
          slug: "largest-of-two-numbers",
          difficulty: "Easy",
          tags: ["Conditional", "Basics"],
          description: "Write a program to find the largest of two given integers.",
          inputFormat: "The first line contains an integer A. The second line contains an integer B.",
          outputFormat: "Print the larger number. If both numbers are equal, print either number.",
          constraints: ["-10^9 <= A <= 10^9", "-10^9 <= B <= 10^9"],
          sampleInput: "15\n9",
          sampleOutput: "15",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2:\n        return\n    a = int(lines[0])\n    b = int(lines[1])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n  const a = Number(lines[0]);\n  const b = Number(lines[1]);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "15\n9",
              expectedOutput: "15",
              explanation: "15 is greater than 9",
            },
            {
              input: "4\n7",
              expectedOutput: "7",
              explanation: "7 is greater than 4",
            },
          ],
          hiddenTestCases: [
            {
              input: "-5\n-10",
              expectedOutput: "-5",
            },
            {
              input: "10\n10",
              expectedOutput: "10",
            },
          ],
          points: 25,
        },
        {
          title: "Factorial of a Number",
          slug: "factorial-of-a-number",
          difficulty: "Easy",
          tags: ["Math", "Loop"],
          description: "Write a program to calculate the factorial of a non-negative integer N.\n\nThe factorial of N is the product of all positive integers from 1 to N. The factorial of 0 is 1.",
          inputFormat: "A single non-negative integer N.",
          outputFormat: "Print the factorial of N.",
          constraints: ["0 <= N <= 12"],
          sampleInput: "5",
          sampleOutput: "120",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines:\n        return\n    n = int(lines[0])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst n = Number(fs.readFileSync('/dev/stdin', 'utf-8').trim());\n// Write your solution here",
            cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "5",
              expectedOutput: "120",
              explanation: "5! = 5 x 4 x 3 x 2 x 1 = 120",
            },
            {
              input: "0",
              expectedOutput: "1",
              explanation: "0! is defined as 1",
            },
          ],
          hiddenTestCases: [
            {
              input: "12",
              expectedOutput: "479001600",
            },
            {
              input: "7",
              expectedOutput: "5040",
            },
          ],
          points: 25,
        },
        {
          title: "Reverse a Number",
          slug: "reverse-a-number",
          difficulty: "Easy",
          tags: ["Math", "Loop"],
          description: "Write a program to reverse the digits of a non-negative integer.",
          inputFormat: "A single non-negative integer N.",
          outputFormat: "Print the reversed number. Leading zeros in the reversed result should be omitted.",
          constraints: ["0 <= N <= 10^9"],
          sampleInput: "1234",
          sampleOutput: "4321",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines:\n        return\n    n = int(lines[0])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst n = Number(fs.readFileSync('/dev/stdin', 'utf-8').trim());\n// Write your solution here",
            cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "1234",
              expectedOutput: "4321",
              explanation: "Digits of 1234 reversed are 4321",
            },
            {
              input: "1000",
              expectedOutput: "1",
              explanation: "1000 reversed is 0001, and leading zeros are omitted so the result is 1",
            },
          ],
          hiddenTestCases: [
            {
              input: "0",
              expectedOutput: "0",
            },
            {
              input: "987654321",
              expectedOutput: "123456789",
            },
          ],
          points: 25,
        },
        {
          title: "Check Palindrome Number",
          slug: "check-palindrome-number",
          difficulty: "Easy",
          tags: ["Math", "String"],
          description: "Write a program to check whether a given non-negative integer is a palindrome.\n\nA palindrome number reads the same forward and backward.",
          inputFormat: "A single non-negative integer N.",
          outputFormat: "Print \"Palindrome\" if the number is a palindrome; otherwise, print \"Not Palindrome\".",
          constraints: ["0 <= N <= 10^9"],
          sampleInput: "121",
          sampleOutput: "Palindrome",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines:\n        return\n    n = int(lines[0])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst n = Number(fs.readFileSync('/dev/stdin', 'utf-8').trim());\n// Write your solution here",
            cpp: "#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "121",
              expectedOutput: "Palindrome",
              explanation: "121 reads the same forward and backward",
            },
            {
              input: "123",
              expectedOutput: "Not Palindrome",
              explanation: "123 reads as 321 in reverse, which is different",
            },
          ],
          hiddenTestCases: [
            {
              input: "0",
              expectedOutput: "Palindrome",
            },
            {
              input: "1001",
              expectedOutput: "Palindrome",
            },
          ],
          points: 25,
        },
        {
          title: "Sum of Digits",
          slug: "sum-of-digits",
          difficulty: "Easy",
          tags: ["Math", "Loop"],
          description: "Write a program to calculate the sum of the digits of a non-negative integer.",
          inputFormat: "A single non-negative integer N.",
          outputFormat: "Print the sum of its digits.",
          constraints: ["0 <= N <= 10^9"],
          sampleInput: "456",
          sampleOutput: "15",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines:\n        return\n    n = int(lines[0])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst n = Number(fs.readFileSync('/dev/stdin', 'utf-8').trim());\n// Write your solution here",
            cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "456",
              expectedOutput: "15",
              explanation: "4 + 5 + 6 = 15",
            },
            {
              input: "9999",
              expectedOutput: "36",
              explanation: "9 + 9 + 9 + 9 = 36",
            },
          ],
          hiddenTestCases: [
            {
              input: "1000",
              expectedOutput: "1",
            },
            {
              input: "0",
              expectedOutput: "0",
            },
          ],
          points: 25,
        },
        {
          title: "Multiplication Table",
          slug: "multiplication-table",
          difficulty: "Easy",
          tags: ["Loop"],
          description: "Write a program to print the multiplication table of a given integer N from 1 to 10.",
          inputFormat: "A single integer N.",
          outputFormat: "Print 10 lines in the format: N x i = result",
          constraints: ["1 <= N <= 1000"],
          sampleInput: "3",
          sampleOutput: "3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines:\n        return\n    n = int(lines[0])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst n = Number(fs.readFileSync('/dev/stdin', 'utf-8').trim());\n// Write your solution here",
            cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "3",
              expectedOutput: "3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30",
              explanation: "Multiplication table of 3 from 1 to 10",
            },
            {
              input: "5",
              expectedOutput: "5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n5 x 6 = 30\n5 x 7 = 35\n5 x 8 = 40\n5 x 9 = 45\n5 x 10 = 50",
              explanation: "Multiplication table of 5 from 1 to 10",
            },
          ],
          hiddenTestCases: [
            {
              input: "1",
              expectedOutput: "1 x 1 = 1\n1 x 2 = 2\n1 x 3 = 3\n1 x 4 = 4\n1 x 5 = 5\n1 x 6 = 6\n1 x 7 = 7\n1 x 8 = 8\n1 x 9 = 9\n1 x 10 = 10",
            },
            {
              input: "10",
              expectedOutput: "10 x 1 = 10\n10 x 2 = 20\n10 x 3 = 30\n10 x 4 = 40\n10 x 5 = 50\n10 x 6 = 60\n10 x 7 = 70\n10 x 8 = 80\n10 x 9 = 90\n10 x 10 = 100",
            },
          ],
          points: 25,
        },
        {
          title: "Count Vowels",
          slug: "count-vowels",
          difficulty: "Easy",
          tags: ["String"],
          description: "Write a program to count the vowels in a given string. Count both uppercase and lowercase vowels: A, E, I, O, U.",
          inputFormat: "A single line containing a string.",
          outputFormat: "Print the total number of vowels in the string.",
          constraints: ["1 <= len(s) <= 10^5"],
          sampleInput: "Hello World",
          sampleOutput: "3",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    s = lines[0] if lines else ''\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst s = fs.readFileSync('/dev/stdin', 'utf-8').split('\\n')[0] || '';\n// Write your solution here",
            cpp: "#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "Hello World",
              expectedOutput: "3",
              explanation: "e, o, o are the three vowels",
            },
            {
              input: "Python Programming",
              expectedOutput: "4",
              explanation: "o, o, a, i are the four vowels",
            },
          ],
          hiddenTestCases: [
            {
              input: "AEIOUaeiou",
              expectedOutput: "10",
            },
            {
              input: "rhythm",
              expectedOutput: "0",
            },
          ],
          points: 25,
        },
        {
          title: "Find the Largest Element in an Array",
          slug: "find-the-largest-element-in-an-array",
          difficulty: "Easy",
          tags: ["Array"],
          description: "Write a program to find the largest integer in an array.",
          inputFormat: "The first line contains an integer N, representing the number of elements. The second line contains N space-separated integers.",
          outputFormat: "Print the largest element in the array.",
          constraints: ["1 <= N <= 1000", "-10^9 <= arr[i] <= 10^9"],
          sampleInput: "5\n10 25 7 40 15",
          sampleOutput: "40",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2:\n        return\n    n = int(lines[0])\n    arr = list(map(int, lines[1].split()))\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n  const n = Number(lines[0]);\n  const arr = lines[1].split(' ').map(Number);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "5\n10 25 7 40 15",
              expectedOutput: "40",
              explanation: "40 is the largest element in the array",
            },
            {
              input: "4\n-1 -5 -2 0",
              expectedOutput: "0",
              explanation: "0 is the largest element in the array",
            },
          ],
          hiddenTestCases: [
            {
              input: "1\n42",
              expectedOutput: "42",
            },
            {
              input: "6\n3 3 3 3 3 3",
              expectedOutput: "3",
            },
          ],
          points: 25,
        },
      ],
    });

    const codingTestIntermediate = await CodingTest.create({
      title: "Intermediate Questions",
      slug: "intermediate-level-coding-questions",
      description: "Intermediate-level programming questions covering arrays, strings, searching, stacks, and string manipulation.",
      difficulty: "Medium",
      category: "Practice",
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
      pointsReward: 75,
      bonusPoints: 35,
      isPublished: true,
      createdBy: adminUser._id,
      problems: [
        {
          title: "Two Sum",
          slug: "two-sum-index-pair",
          difficulty: "Medium",
          tags: ["Array", "Hash Table"],
          description: "Given an array of integers and a target value, find the indices of two distinct elements whose sum equals the target. You cannot use the same element twice. Assume exactly one solution exists.",
          inputFormat: "The first line contains N, the number of elements. The second line contains N space-separated integers. The third line contains the target integer.",
          outputFormat: "Print the two indices in ascending order.",
          constraints: ["2 <= N <= 10000", "-100000 <= nums[i] <= 100000"],
          sampleInput: "4\n2 7 11 15\n9",
          sampleOutput: "0 1",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 3:\n        return\n    n = int(lines[0])\n    nums = list(map(int, lines[1].split()))\n    target = int(lines[2])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 3) {\n  const n = Number(lines[0]);\n  const nums = lines[1].split(' ').map(Number);\n  const target = Number(lines[2]);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "4\n2 7 11 15\n9",
              expectedOutput: "0 1",
              explanation: "nums[0] + nums[1] = 2 + 7 = 9",
            },
            {
              input: "3\n3 2 4\n6",
              expectedOutput: "1 2",
              explanation: "nums[1] + nums[2] = 2 + 4 = 6",
            },
          ],
          hiddenTestCases: [
            {
              input: "2\n3 3\n6",
              expectedOutput: "0 1",
            },
            {
              input: "5\n1 5 8 19 32\n27",
              expectedOutput: "2 3",
            },
          ],
          points: 25,
        },
        {
          title: "Second Largest Distinct Element",
          slug: "second-largest-distinct",
          difficulty: "Medium",
          tags: ["Array"],
          description: "Given an array of integers, find the second largest distinct element. If no second largest distinct element exists, print -1.",
          inputFormat: "The first line contains N. The second line contains N space-separated integers.",
          outputFormat: "Print the second largest distinct element or -1.",
          constraints: ["1 <= N <= 10000"],
          sampleInput: "6\n12 35 1 10 34 35",
          sampleOutput: "34",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2:\n        return\n    n = int(lines[0])\n    arr = list(map(int, lines[1].split()))\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n  const n = Number(lines[0]);\n  const arr = lines[1].split(' ').map(Number);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <set>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "6\n12 35 1 10 34 35",
              expectedOutput: "34",
              explanation: "Largest is 35, second largest distinct is 34",
            },
            {
              input: "3\n1 1 1",
              expectedOutput: "-1",
              explanation: "Only one distinct element, so no second largest",
            },
          ],
          hiddenTestCases: [
            {
              input: "5\n5 5 4 4 3",
              expectedOutput: "4",
            },
            {
              input: "2\n10 10",
              expectedOutput: "-1",
            },
          ],
          points: 25,
        },
        {
          title: "Check Anagram Strings",
          slug: "check-anagram-strings",
          difficulty: "Medium",
          tags: ["String"],
          description: "Given two strings, determine whether they are anagrams. Two strings are anagrams if they contain the same characters with the same frequencies, regardless of order. Ignore spaces and letter case.",
          inputFormat: "The first line contains string S1. The second line contains string S2.",
          outputFormat: "Print \"Anagram\" if the strings are anagrams; otherwise, print \"Not Anagram\".",
          constraints: ["Each string contains at most 1000 characters."],
          sampleInput: "Listen\nSilent",
          sampleOutput: "Anagram",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    s1 = lines[0] if len(lines) > 0 else ''\n    s2 = lines[1] if len(lines) > 1 else ''\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').split('\\n');\nconst s1 = lines[0] || '';\nconst s2 = lines[1] || '';\n// Write your solution here",
            cpp: "#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "Listen\nSilent",
              expectedOutput: "Anagram",
              explanation: "Ignoring case, 'listen' and 'silent' use the same letters",
            },
            {
              input: "hello\nworld",
              expectedOutput: "Not Anagram",
              explanation: "The two words do not share the same character frequencies",
            },
          ],
          hiddenTestCases: [
            {
              input: "a b c\ncba",
              expectedOutput: "Anagram",
            },
            {
              input: "Debit Card\nBad Credit",
              expectedOutput: "Anagram",
            },
          ],
          points: 25,
        },
        {
          title: "Remove Duplicates From an Array",
          slug: "remove-duplicates-from-array",
          difficulty: "Medium",
          tags: ["Array"],
          description: "Given an array of integers, remove duplicate elements while preserving the order of their first occurrences.",
          inputFormat: "The first line contains N. The second line contains N space-separated integers.",
          outputFormat: "Print the number of unique elements on the first line. Print the unique elements in their original order on the second line.",
          constraints: ["1 <= N <= 10000"],
          sampleInput: "7\n1 2 2 3 4 3 5",
          sampleOutput: "5\n1 2 3 4 5",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2:\n        return\n    n = int(lines[0])\n    arr = list(map(int, lines[1].split()))\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n  const n = Number(lines[0]);\n  const arr = lines[1].split(' ').map(Number);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <unordered_set>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "7\n1 2 2 3 4 3 5",
              expectedOutput: "5\n1 2 3 4 5",
              explanation: "Unique elements kept in first-occurrence order",
            },
            {
              input: "4\n5 5 5 5",
              expectedOutput: "1\n5",
              explanation: "All duplicates collapse to a single 5",
            },
          ],
          hiddenTestCases: [
            {
              input: "1\n9",
              expectedOutput: "1\n9",
            },
            {
              input: "5\n2 3 2 3 4",
              expectedOutput: "3\n2 3 4",
            },
          ],
          points: 25,
        },
        {
          title: "Binary Search",
          slug: "binary-search-index",
          difficulty: "Medium",
          tags: ["Search"],
          description: "Given a sorted array of integers and a target value, find the index of the target using binary search. If the target does not exist, print -1. Use zero-based indexing.",
          inputFormat: "The first line contains N. The second line contains N space-separated integers in ascending order. The third line contains the target integer.",
          outputFormat: "Print the index of the target or -1.",
          constraints: ["1 <= N <= 100000"],
          sampleInput: "6\n2 4 6 8 10 12\n8",
          sampleOutput: "3",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 3:\n        return\n    n = int(lines[0])\n    arr = list(map(int, lines[1].split()))\n    target = int(lines[2])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 3) {\n  const n = Number(lines[0]);\n  const arr = lines[1].split(' ').map(Number);\n  const target = Number(lines[2]);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "6\n2 4 6 8 10 12\n8",
              expectedOutput: "3",
              explanation: "8 is at index 3 in the sorted array",
            },
            {
              input: "5\n1 3 5 7 9\n4",
              expectedOutput: "-1",
              explanation: "4 is not present in the array",
            },
          ],
          hiddenTestCases: [
            {
              input: "1\n5\n5",
              expectedOutput: "0",
            },
            {
              input: "8\n1 2 3 4 5 6 7 8\n7",
              expectedOutput: "6",
            },
          ],
          points: 25,
        },
        {
          title: "Maximum Subarray Sum",
          slug: "maximum-subarray-sum",
          difficulty: "Medium",
          tags: ["Array", "Kadane"],
          description: "Given an integer array, find the maximum possible sum of a non-empty contiguous subarray.",
          inputFormat: "The first line contains N. The second line contains N space-separated integers.",
          outputFormat: "Print the maximum subarray sum.",
          constraints: ["1 <= N <= 100000", "-10000 <= nums[i] <= 10000"],
          sampleInput: "9\n-2 1 -3 4 -1 2 1 -5 4",
          sampleOutput: "6",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2:\n        return\n    n = int(lines[0])\n    arr = list(map(int, lines[1].split()))\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n  const n = Number(lines[0]);\n  const arr = lines[1].split(' ').map(Number);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "9\n-2 1 -3 4 -1 2 1 -5 4",
              expectedOutput: "6",
              explanation: "The subarray [4, -1, 2, 1] has the maximum sum of 6",
            },
            {
              input: "1\n-5",
              expectedOutput: "-5",
              explanation: "A single element is a non-empty subarray",
            },
          ],
          hiddenTestCases: [
            {
              input: "5\n1 2 3 4 5",
              expectedOutput: "15",
            },
            {
              input: "4\n-2 -1 -3 -4",
              expectedOutput: "-1",
            },
          ],
          points: 25,
        },
        {
          title: "Move Zeros to the End",
          slug: "move-zeros-to-the-end",
          difficulty: "Medium",
          tags: ["Array", "Two Pointers"],
          description: "Given an array of integers, move all zeros to the end while maintaining the relative order of non-zero elements.",
          inputFormat: "The first line contains N. The second line contains N space-separated integers.",
          outputFormat: "Print the modified array as space-separated integers.",
          constraints: ["1 <= N <= 100000"],
          sampleInput: "6\n0 1 0 3 12 0",
          sampleOutput: "1 3 12 0 0 0",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2:\n        return\n    n = int(lines[0])\n    arr = list(map(int, lines[1].split()))\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n  const n = Number(lines[0]);\n  const arr = lines[1].split(' ').map(Number);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "6\n0 1 0 3 12 0",
              expectedOutput: "1 3 12 0 0 0",
              explanation: "Non-zero elements keep order, zeros moved to the end",
            },
            {
              input: "4\n0 0 0 0",
              expectedOutput: "0 0 0 0",
              explanation: "All zeros remain zeros",
            },
          ],
          hiddenTestCases: [
            {
              input: "3\n0 5 0",
              expectedOutput: "5 0 0",
            },
            {
              input: "5\n1 0 2 0 3",
              expectedOutput: "1 2 3 0 0",
            },
          ],
          points: 25,
        },
        {
          title: "Frequency of Each Element",
          slug: "frequency-of-each-element",
          difficulty: "Medium",
          tags: ["Array", "Hash Map"],
          description: "Given an array of integers, count the frequency of each distinct element. Print each distinct element and its frequency in the order of its first occurrence.",
          inputFormat: "The first line contains N. The second line contains N space-separated integers.",
          outputFormat: "Print each distinct element and its frequency on a separate line in the format: element frequency",
          constraints: ["1 <= N <= 10000"],
          sampleInput: "7\n4 2 4 3 2 4 5",
          sampleOutput: "4 3\n2 2\n3 1\n5 1",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2:\n        return\n    n = int(lines[0])\n    arr = list(map(int, lines[1].split()))\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n  const n = Number(lines[0]);\n  const arr = lines[1].split(' ').map(Number);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "7\n4 2 4 3 2 4 5",
              expectedOutput: "4 3\n2 2\n3 1\n5 1",
              explanation: "Each element printed with its count in first-occurrence order",
            },
            {
              input: "3\n7 7 7",
              expectedOutput: "7 3",
              explanation: "Only one distinct element",
            },
          ],
          hiddenTestCases: [
            {
              input: "1\n9",
              expectedOutput: "9 1",
            },
            {
              input: "6\n1 2 1 2 1 2",
              expectedOutput: "1 3\n2 3",
            },
          ],
          points: 25,
        },
        {
          title: "Valid Parentheses",
          slug: "valid-parentheses",
          difficulty: "Medium",
          tags: ["Stack", "String"],
          description: "Given a string containing only the characters '(', ')', '{', '}', '[' and ']', determine whether the brackets are valid.\n\nA string is valid if every opening bracket is closed by the same type of bracket and brackets are closed in the correct order.",
          inputFormat: "A single line containing the bracket string.",
          outputFormat: "Print \"Valid\" if the brackets are valid; otherwise, print \"Invalid\".",
          constraints: ["1 <= length of string <= 10000"],
          sampleInput: "{[()]}",
          sampleOutput: "Valid",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    s = lines[0] if lines else ''\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst s = (fs.readFileSync('/dev/stdin', 'utf-8').split('\\n')[0] || '').trim();\n// Write your solution here",
            cpp: "#include <iostream>\n#include <string>\n#include <stack>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "{[()]}",
              expectedOutput: "Valid",
              explanation: "Every bracket is closed by the matching type in order",
            },
            {
              input: "({)}",
              expectedOutput: "Invalid",
              explanation: "Brackets are not closed in the correct order",
            },
          ],
          hiddenTestCases: [
            {
              input: "()[]{}",
              expectedOutput: "Valid",
            },
            {
              input: "(",
              expectedOutput: "Invalid",
            },
          ],
          points: 25,
        },
        {
          title: "Merge Two Sorted Arrays",
          slug: "merge-two-sorted-arrays",
          difficulty: "Medium",
          tags: ["Array", "Two Pointers"],
          description: "Given two arrays sorted in non-decreasing order, merge them into a single sorted array.",
          inputFormat: "The first line contains N, the number of elements in the first array. The second line contains N space-separated integers. The third line contains M, the number of elements in the second array. The fourth line contains M space-separated integers.",
          outputFormat: "Print all elements of the merged array in non-decreasing order, separated by spaces.",
          constraints: ["1 <= N, M <= 100000"],
          sampleInput: "4\n1 3 5 7\n3\n2 4 6",
          sampleOutput: "1 2 3 4 5 6 7",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 4:\n        return\n    n = int(lines[0])\n    a = list(map(int, lines[1].split()))\n    m = int(lines[2])\n    b = list(map(int, lines[3].split()))\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 4) {\n  const n = Number(lines[0]);\n  const a = lines[1].split(' ').map(Number);\n  const m = Number(lines[2]);\n  const b = lines[3].split(' ').map(Number);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "4\n1 3 5 7\n3\n2 4 6",
              expectedOutput: "1 2 3 4 5 6 7",
              explanation: "Both input arrays are sorted, merged into one sorted array",
            },
            {
              input: "3\n1 2 3\n3\n4 5 6",
              expectedOutput: "1 2 3 4 5 6",
              explanation: "Second array elements are all larger, appended at the end",
            },
          ],
          hiddenTestCases: [
            {
              input: "1\n10\n1\n20",
              expectedOutput: "10 20",
            },
            {
              input: "5\n1 1 2 3 3\n4\n1 2 2 4",
              expectedOutput: "1 1 1 2 2 2 3 3 4",
            },
          ],
          points: 25,
        },
      ],
    });

    const codingTestHard = await CodingTest.create({
      title: "Hard Questions",
      slug: "hard-level-coding-questions",
      description: "Advanced-level programming questions covering dynamic programming, graphs, greedy algorithms, and data structures.",
      difficulty: "Hard",
      category: "Practice",
      timeLimit: 60,
      memoryLimit: 256,
      languages: ["python", "javascript", "cpp", "java", "c"],
      settings: {
        fullscreenRequired: true,
        antiCopy: true,
        antiPaste: true,
        maxViolations: 3,
        autoSubmitOnViolation: true,
      },
      pointsReward: 100,
      bonusPoints: 50,
      isPublished: true,
      createdBy: adminUser._id,
      problems: [
        {
          title: "Longest Increasing Subsequence",
          slug: "longest-increasing-subsequence",
          difficulty: "Hard",
          tags: ["Dynamic Programming", "Greedy"],
          description: "Given an array of integers, find the length of the longest strictly increasing subsequence. A subsequence is formed by deleting zero or more elements without changing the order of the remaining elements.",
          inputFormat: "The first line contains an integer N. The second line contains N space-separated integers.",
          outputFormat: "Print the length of the longest strictly increasing subsequence.",
          constraints: ["1 <= N <= 100000", "-10^9 <= nums[i] <= 10^9"],
          sampleInput: "8\n10 9 2 5 3 7 101 18",
          sampleOutput: "4",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2:\n        return\n    n = int(lines[0])\n    arr = list(map(int, lines[1].split()))\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n  const n = Number(lines[0]);\n  const arr = lines[1].split(' ').map(Number);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "8\n10 9 2 5 3 7 101 18",
              expectedOutput: "4",
              explanation: "One longest increasing subsequence is [2, 3, 7, 18]",
            },
            {
              input: "6\n0 1 0 3 2 3",
              expectedOutput: "4",
              explanation: "The longest increasing subsequence is [0, 1, 2, 3]",
            },
          ],
          hiddenTestCases: [
            {
              input: "1\n7",
              expectedOutput: "1",
            },
            {
              input: "7\n3 10 2 1 20 30 5",
              expectedOutput: "3",
            },
          ],
          points: 25,
        },
        {
          title: "Shortest Path in a Weighted Graph",
          slug: "shortest-path-in-a-weighted-graph",
          difficulty: "Hard",
          tags: ["Graph", "Dijkstra"],
          description: "Given a directed weighted graph with N vertices and M edges, find the shortest distance from a source vertex S to every other vertex using non-negative edge weights. Vertices are numbered from 0 to N-1.",
          inputFormat: "The first line contains N and M. The next M lines each contain three integers U, V, W, representing a directed edge from U to V with weight W. The final line contains the source vertex S.",
          outputFormat: "Print N space-separated shortest distances in vertex order from 0 to N-1. Print -1 for any unreachable vertex.",
          constraints: ["1 <= N <= 100000", "0 <= M <= 200000", "0 <= W <= 10^9", "0 <= S < N"],
          sampleInput: "5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3\n0",
          sampleOutput: "0 3 1 4 7",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines:\n        return\n    n, m = map(int, lines[0].split())\n    edges = [list(map(int, l.split())) for l in lines[1:1 + m]]\n    s = int(lines[1 + m])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nconst [n, m] = lines[0].split(' ').map(Number);\nconst edges = lines.slice(1, 1 + m).map(l => l.split(' ').map(Number));\nconst s = Number(lines[1 + m]);\n// Write your solution here",
            cpp: "#include <iostream>\n#include <vector>\n#include <queue>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3\n0",
              expectedOutput: "0 3 1 4 7",
              explanation: "Distances from vertex 0 via Dijkstra's algorithm",
            },
            {
              input: "3 2\n0 1 5\n1 2 5\n0",
              expectedOutput: "0 5 10",
              explanation: "Simple chain graph, distances accumulate",
            },
          ],
          hiddenTestCases: [
            {
              input: "4 3\n0 1 2\n2 3 1\n1 2 3\n1",
              expectedOutput: "-1 0 3 4",
            },
            {
              input: "2 1\n0 1 7\n0",
              expectedOutput: "0 7",
            },
          ],
          points: 25,
        },
        {
          title: "Minimum Coins to Make an Amount",
          slug: "minimum-coins-to-make-an-amount",
          difficulty: "Hard",
          tags: ["Dynamic Programming", "Greedy"],
          description: "Given N distinct positive coin denominations and a target amount A, find the minimum number of coins needed to make exactly A. You can use each denomination an unlimited number of times. If the amount cannot be formed, print -1.",
          inputFormat: "The first line contains N. The second line contains N space-separated coin denominations. The third line contains the target amount A.",
          outputFormat: "Print the minimum number of coins required, or -1 if impossible.",
          constraints: ["1 <= N <= 100", "1 <= coins[i] <= 10000", "0 <= A <= 100000"],
          sampleInput: "3\n1 3 4\n6",
          sampleOutput: "2",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 3:\n        return\n    n = int(lines[0])\n    coins = list(map(int, lines[1].split()))\n    amount = int(lines[2])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 3) {\n  const n = Number(lines[0]);\n  const coins = lines[1].split(' ').map(Number);\n  const amount = Number(lines[2]);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <climits>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "3\n1 3 4\n6",
              expectedOutput: "2",
              explanation: "6 can be formed using two coins of denomination 3",
            },
            {
              input: "2\n2 5\n1",
              expectedOutput: "-1",
              explanation: "1 cannot be formed with denominations 2 and 5",
            },
          ],
          hiddenTestCases: [
            {
              input: "2\n2\n3",
              expectedOutput: "-1",
            },
            {
              input: "1\n1\n0",
              expectedOutput: "0",
            },
          ],
          points: 25,
        },
        {
          title: "N-Queens Problem",
          slug: "n-queens-problem",
          difficulty: "Hard",
          tags: ["Backtracking"],
          description: "Place N queens on an N x N chessboard so that no two queens attack each other. No two queens may share a row, column, or diagonal. Find the total number of distinct valid arrangements.",
          inputFormat: "A single integer N.",
          outputFormat: "Print the total number of valid arrangements.",
          constraints: ["1 <= N <= 14"],
          sampleInput: "4",
          sampleOutput: "2",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines:\n        return\n    n = int(lines[0])\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst n = Number(fs.readFileSync('/dev/stdin', 'utf-8').trim());\n// Write your solution here",
            cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "4",
              expectedOutput: "2",
              explanation: "Two distinct arrangements exist on a 4x4 board",
            },
            {
              input: "1",
              expectedOutput: "1",
              explanation: "A single queen on a 1x1 board",
            },
          ],
          hiddenTestCases: [
            {
              input: "8",
              expectedOutput: "92",
            },
            {
              input: "2",
              expectedOutput: "0",
            },
          ],
          points: 25,
        },
        {
          title: "Longest Common Subsequence",
          slug: "longest-common-subsequence",
          difficulty: "Hard",
          tags: ["Dynamic Programming", "String"],
          description: "Given two strings S1 and S2, find the length of their longest common subsequence. A subsequence preserves character order but does not require characters to be adjacent.",
          inputFormat: "The first line contains string S1. The second line contains string S2.",
          outputFormat: "Print the length of the longest common subsequence.",
          constraints: ["1 <= length of S1, length of S2 <= 2000"],
          sampleInput: "ABCBDAB\nBDCAB",
          sampleOutput: "4",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().splitlines()\n    s1 = lines[0] if len(lines) > 0 else ''\n    s2 = lines[1] if len(lines) > 1 else ''\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').split('\\n');\nconst s1 = lines[0] || '';\nconst s2 = lines[1] || '';\n// Write your solution here",
            cpp: "#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "ABCBDAB\nBDCAB",
              expectedOutput: "4",
              explanation: "One longest common subsequence is BCAB",
            },
            {
              input: "abc\ndef",
              expectedOutput: "0",
              explanation: "No common characters",
            },
          ],
          hiddenTestCases: [
            {
              input: "aaaa\nbbbb",
              expectedOutput: "0",
            },
            {
              input: "AGGTAB\nGXTXAYB",
              expectedOutput: "4",
            },
          ],
          points: 25,
        },
        {
          title: "Maximum Profit With At Most K Stock Transactions",
          slug: "max-profit-with-k-transactions",
          difficulty: "Hard",
          tags: ["Dynamic Programming"],
          description: "Given the prices of a stock over N days and an integer K, find the maximum profit possible using at most K buy-and-sell transactions. You must sell before buying again. You cannot hold more than one share at a time.",
          inputFormat: "The first line contains N and K. The second line contains N space-separated stock prices.",
          outputFormat: "Print the maximum possible profit.",
          constraints: ["1 <= N <= 1000", "0 <= K <= 100", "0 <= prices[i] <= 100000"],
          sampleInput: "6 2\n3 2 6 5 0 3",
          sampleOutput: "7",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2:\n        return\n    n, k = map(int, lines[0].split())\n    prices = list(map(int, lines[1].split()))\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n  const [n, k] = lines[0].split(' ').map(Number);\n  const prices = lines[1].split(' ').map(Number);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "6 2\n3 2 6 5 0 3",
              expectedOutput: "7",
              explanation: "Buy at 2 sell at 6 (profit 4), then buy at 0 sell at 3 (profit 3), total 7",
            },
            {
              input: "3 1\n1 2 3",
              expectedOutput: "2",
              explanation: "One transaction buy at 1 sell at 3 gives profit 2",
            },
          ],
          hiddenTestCases: [
            {
              input: "1 1\n5",
              expectedOutput: "0",
            },
            {
              input: "5 2\n3 3 5 0 0",
              expectedOutput: "2",
            },
          ],
          points: 25,
        },
        {
          title: "Trapping Rain Water",
          slug: "trapping-rain-water",
          difficulty: "Hard",
          tags: ["Two Pointers", "Stack"],
          description: "Given N non-negative integers representing the heights of bars in an elevation map, calculate how much rainwater can be trapped between the bars after rainfall. Each bar has a width of 1 unit.",
          inputFormat: "The first line contains N. The second line contains N space-separated non-negative integers representing bar heights.",
          outputFormat: "Print the total units of trapped rainwater.",
          constraints: ["1 <= N <= 200000", "0 <= height[i] <= 100000"],
          sampleInput: "12\n0 1 0 2 1 0 1 3 2 1 2 1",
          sampleOutput: "6",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 2:\n        return\n    n = int(lines[0])\n    heights = list(map(int, lines[1].split()))\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 2) {\n  const n = Number(lines[0]);\n  const heights = lines[1].split(' ').map(Number);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "12\n0 1 0 2 1 0 1 3 2 1 2 1",
              expectedOutput: "6",
              explanation: "Total trapped water between the bars is 6 units",
            },
            {
              input: "2\n2 0",
              expectedOutput: "0",
              explanation: "No bar to the right to trap water",
            },
          ],
          hiddenTestCases: [
            {
              input: "3\n3 0 3",
              expectedOutput: "3",
            },
            {
              input: "5\n4 2 0 3 5",
              expectedOutput: "7",
            },
          ],
          points: 25,
        },
        {
          title: "Word Ladder Shortest Transformation",
          slug: "word-ladder-shortest-transformation",
          difficulty: "Hard",
          tags: ["BFS", "Graph"],
          description: "Given a start word, an end word, and a dictionary of words of equal length, find the length of the shortest transformation sequence from the start word to the end word. Only one character may change at a time, and every intermediate word must belong to the dictionary. The start word does not need to be in the dictionary. The end word must be in the dictionary. If no transformation exists, print 0.",
          inputFormat: "The first line contains the start word. The second line contains the end word. The third line contains N, the number of dictionary words. The next N lines each contain one dictionary word.",
          outputFormat: "Print the number of words in the shortest transformation sequence, including the start and end words, or 0 if no transformation exists.",
          constraints: ["1 <= N <= 5000", "1 <= word length <= 10", "All words contain lowercase English letters."],
          sampleInput: "hit\ncog\n6\nhot\ndot\ndog\nlot\nlog\ncog",
          sampleOutput: "5",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 3:\n        return\n    start = lines[0]\n    end = lines[1]\n    n = int(lines[2])\n    words = lines[3:3 + n]\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nconst start = lines[0];\nconst end = lines[1];\nconst n = Number(lines[2]);\nconst words = lines.slice(3, 3 + n);\n// Write your solution here",
            cpp: "#include <iostream>\n#include <string>\n#include <vector>\n#include <queue>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "hit\ncog\n6\nhot\ndot\ndog\nlot\nlog\ncog",
              expectedOutput: "5",
              explanation: "hit -> hot -> dot -> dog -> cog",
            },
            {
              input: "a\nc\n2\nb\nc",
              expectedOutput: "3",
              explanation: "a -> b -> c",
            },
          ],
          hiddenTestCases: [
            {
              input: "cat\nsag\n2\ncot\ncog",
              expectedOutput: "0",
            },
            {
              input: "dog\ncat\n2\ncog\ncat",
              expectedOutput: "3",
            },
          ],
          points: 25,
        },
        {
          title: "Median of Two Sorted Arrays",
          slug: "median-of-two-sorted-arrays",
          difficulty: "Hard",
          tags: ["Binary Search"],
          description: "Given two non-empty sorted arrays, find the median of the combined array without explicitly merging the arrays. Your algorithm must run in O(log(min(N, M))) time. If the combined number of elements is even, the median is the average of the two middle elements.",
          inputFormat: "The first line contains N. The second line contains N sorted integers. The third line contains M. The fourth line contains M sorted integers.",
          outputFormat: "Print the median as an integer if it is whole, or with one decimal place if it ends in .5.",
          constraints: ["1 <= N, M <= 100000", "-10^9 <= array elements <= 10^9"],
          sampleInput: "2\n1 3\n2\n2 4",
          sampleOutput: "2.5",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) < 4:\n        return\n    n = int(lines[0])\n    a = list(map(int, lines[1].split()))\n    m = int(lines[2])\n    b = list(map(int, lines[3].split()))\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nif (lines.length >= 4) {\n  const n = Number(lines[0]);\n  const a = lines[1].split(' ').map(Number);\n  const m = Number(lines[2]);\n  const b = lines[3].split(' ').map(Number);\n  // Write your solution here\n}",
            cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "2\n1 3\n2\n2 4",
              expectedOutput: "2.5",
              explanation: "Combined array [1, 2, 3, 4], median is (2 + 3) / 2 = 2.5",
            },
            {
              input: "1\n1\n1\n2",
              expectedOutput: "1.5",
              explanation: "Combined array [1, 2], median is (1 + 2) / 2 = 1.5",
            },
          ],
          hiddenTestCases: [
            {
              input: "1\n2\n1\n3",
              expectedOutput: "2.5",
            },
            {
              input: "3\n1 2 3\n1\n5",
              expectedOutput: "2",
            },
          ],
          points: 25,
        },
        {
          title: "Strongly Connected Components",
          slug: "strongly-connected-components",
          difficulty: "Hard",
          tags: ["Graph", "DFS"],
          description: "Given a directed graph with N vertices and M edges, determine the number of strongly connected components (SCCs). A strongly connected component is a maximal set of vertices where every vertex is reachable from every other vertex in that set. Vertices are numbered from 0 to N-1.",
          inputFormat: "The first line contains N and M. The next M lines each contain two integers U and V, representing a directed edge from U to V.",
          outputFormat: "Print the number of strongly connected components.",
          constraints: ["1 <= N <= 200000", "0 <= M <= 300000", "0 <= U, V < N"],
          sampleInput: "5 5\n0 1\n1 2\n2 0\n1 3\n3 4",
          sampleOutput: "3",
          starterCode: {
            python: "import sys\n\ndef main():\n    lines = sys.stdin.read().strip().split('\\n')\n    if not lines:\n        return\n    n, m = map(int, lines[0].split())\n    edges = [list(map(int, l.split())) for l in lines[1:1 + m]]\n    # Write your solution here\n\nif __name__ == '__main__':\n    main()",
            javascript: "const fs = require('fs');\nconst lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nconst [n, m] = lines[0].split(' ').map(Number);\nconst edges = lines.slice(1, 1 + m).map(l => l.split(' ').map(Number));\n// Write your solution here",
            cpp: "#include <iostream>\n#include <vector>\n#include <stack>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
            java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}",
            c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
          },
          publicTestCases: [
            {
              input: "5 5\n0 1\n1 2\n2 0\n1 3\n3 4",
              expectedOutput: "3",
              explanation: "SCCs are {0, 1, 2}, {3}, and {4}",
            },
            {
              input: "3 0",
              expectedOutput: "3",
              explanation: "No edges, every vertex is its own SCC",
            },
          ],
          hiddenTestCases: [
            {
              input: "4 4\n0 1\n1 2\n2 0\n2 3",
              expectedOutput: "2",
            },
            {
              input: "2 1\n0 1",
              expectedOutput: "2",
            },
          ],
          points: 25,
        },
      ],
    });

    console.log("🛡️ Seeding Test Violations Audit Data...");
    const studentUser = users.find((u) => u.registerNumber === "732924CSR014");
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
        studentName: studentUser.name || "Athithyan S",
        registerNumber: studentUser.registerNumber || "732924CSR014",
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
        studentName: studentUser.name || "Athithyan S",
        registerNumber: studentUser.registerNumber || "732924CSR014",
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
    console.log("👤 Admin:   username: admin           | password: VcetTech@123");
    console.log("👨‍🏫 Teacher: staffId:  VCET-FAC-CSE-104 | password: faculty123");
    console.log("🎓 Student: regNumber: 732924CSR014   | dateOfBirth: 2006-07-20 (dd/MM/yyyy: 20/07/2006)");
    console.log("🎓 Student: regNumber: 732924CSE042   | dateOfBirth: 2007-05-11 (dd/MM/yyyy: 11/05/2007)");
    console.log("========================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedDatabase();
