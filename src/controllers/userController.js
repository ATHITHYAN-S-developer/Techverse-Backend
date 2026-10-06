import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Certificate } from "../models/Certificate.js";
import { Resource } from "../models/Resource.js";
import { Course } from "../models/Course.js";
import { Department } from "../models/Department.js";
import { getPagination } from "../utils/pagination.js";

/**
 * @route   GET /api/users
 * @desc    Get users list filtered by role and department
 * @access  Public / Protected
 */
export async function getUsers(req, res, next) {
  try {
    const { role = "student", departmentId, search } = req.query;
    const { page, limit, skip } = getPagination(req.query, 100);

    const query = { isActive: true };
    if (role) {
      if (role === "faculty" || role === "teacher") {
        query.role = { $in: ["faculty", "teacher", "hod"] };
      } else {
        query.role = role;
      }
    }
    if (departmentId) {
      if (mongoose.Types.ObjectId.isValid(departmentId)) {
        query.departmentId = departmentId;
      } else {
        query.$or = [
          { departmentCode: departmentId },
          { courseCode: departmentId },
        ];
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { registerNumber: { $regex: search, $options: "i" } },
        { staffId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .populate("departmentId", "code name")
        .populate("classId", "className year semester section")
        .sort({ registerNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      users: users.map((u) => ({
        ...u.toSafeObject(),
        streak: u.streak?.currentStreak || 0,
        department: u.departmentId?.code || u.departmentCode || u.courseCode || "CSE",
        departmentName: u.departmentId?.name || u.departmentName || u.courseName || "",
        className: u.classId?.className || "",
        year: u.classId?.year
          ? `${u.classId.year === 1 ? 'I' : u.classId.year === 2 ? 'II' : u.classId.year === 3 ? 'III' : 'IV'} Year`
          : u.year
          ? `${u.year === 1 ? 'I' : u.year === 2 ? 'II' : u.year === 3 ? 'III' : 'IV'} Year`
          : "II Year",
        section: u.classId?.section || u.section || "A",
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/users/department-stats
 * @desc    Get department-level stats: student count, faculty count, resource count, course count, faculty list, recent resources
 * @access  Protected (HOD / Faculty / Admin)
 */
export async function getDepartmentStats(req, res, next) {
  try {
    let departmentId = req.query?.departmentId || req.user?.departmentId;

    if (!departmentId && req.user?._id) {
      const currentUser = await User.findById(req.user._id).select("departmentId departmentCode");
      departmentId = currentUser?.departmentId;
    }

    if (!departmentId) {
      return res.status(400).json({ success: false, message: "departmentId is required" });
    }

    let deptDoc = null;
    if (mongoose.Types.ObjectId.isValid(departmentId)) {
      deptDoc = await Department.findById(departmentId).select("name code");
    }

    const deptFilter = mongoose.Types.ObjectId.isValid(departmentId)
      ? { departmentId: new mongoose.Types.ObjectId(departmentId) }
      : { $or: [{ departmentCode: departmentId }, { courseCode: departmentId }] };

    const facultyQuery = {
      isActive: true,
      role: { $in: ["faculty", "teacher", "hod"] },
      ...deptFilter,
    };

    const facultyMembers = await User.find(facultyQuery)
      .select("_id name staffId designation email role profileImage")
      .sort({ name: 1 });
    const facultyIds = facultyMembers.map((f) => f._id);

    const courseQuery = {
      isPublished: true,
      $or: [
        ...(mongoose.Types.ObjectId.isValid(departmentId)
          ? [{ departmentId: new mongoose.Types.ObjectId(departmentId) }]
          : []),
        { createdBy: { $in: facultyIds } },
        { assignedFacultyId: { $in: facultyIds } },
      ],
    };

    const resourceQuery = {
      isPublished: true,
      $or: [
        ...(mongoose.Types.ObjectId.isValid(departmentId)
          ? [{ departmentId: new mongoose.Types.ObjectId(departmentId) }]
          : []),
        { uploadedBy: { $in: facultyIds } },
      ],
    };

    const [
      studentCount,
      resourceCount,
      courseCount,
      recentResources,
      coursesList,
    ] = await Promise.all([
      User.countDocuments({ isActive: true, role: "student", ...deptFilter }),
      Resource.countDocuments(resourceQuery),
      Course.countDocuments(courseQuery),
      Resource.find(resourceQuery)
        .populate("uploadedBy", "name email staffId")
        .sort({ createdAt: -1 })
        .limit(6),
      Course.find(courseQuery)
        .populate("assignedFacultyId", "name email staffId")
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    res.json({
      success: true,
      studentCount,
      facultyCount: facultyMembers.length,
      resourceCount,
      courseCount,
      department: {
        _id: departmentId,
        name: deptDoc?.name || "",
        code: deptDoc?.code || "",
      },
      stats: {
        totalStudents: studentCount,
        totalFaculty: facultyMembers.length,
        totalResources: resourceCount,
        totalCourses: courseCount,
      },
      facultyList: facultyMembers,
      recentResources,
      courses: coursesList,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/users/faculty-stats
 * @desc    Get stats specific to a single faculty member: resource count, assigned course count, department student count
 * @access  Protected (Faculty / Teacher / HOD)
 */
export async function getFacultyStats(req, res, next) {
  try {
    const facultyId = req.query?.facultyId || req.user?._id;
    let departmentId = req.query?.departmentId || req.user?.departmentId;

    if (!facultyId) {
      return res.status(400).json({ success: false, message: "facultyId is required" });
    }

    if (!departmentId && req.user?._id) {
      const currentUser = await User.findById(req.user._id).select("departmentId departmentCode");
      departmentId = currentUser?.departmentId;
    }

    const fObjId = mongoose.Types.ObjectId.isValid(facultyId)
      ? new mongoose.Types.ObjectId(facultyId)
      : null;

    const deptFilter = departmentId && mongoose.Types.ObjectId.isValid(departmentId)
      ? { departmentId: new mongoose.Types.ObjectId(departmentId) }
      : {};

    const [
      resourceCount,
      courseCount,
      studentCount,
      myRecentResources,
      myCourses,
    ] = await Promise.all([
      fObjId ? Resource.countDocuments({ isPublished: true, uploadedBy: fObjId }) : 0,
      fObjId
        ? Course.countDocuments({
            isPublished: true,
            $or: [{ assignedFacultyId: fObjId }, { createdBy: fObjId }],
          })
        : 0,
      Object.keys(deptFilter).length > 0
        ? User.countDocuments({ isActive: true, role: "student", ...deptFilter })
        : 0,
      fObjId
        ? Resource.find({ isPublished: true, uploadedBy: fObjId }).sort({ createdAt: -1 }).limit(6)
        : [],
      fObjId
        ? Course.find({
            isPublished: true,
            $or: [{ assignedFacultyId: fObjId }, { createdBy: fObjId }],
          }).sort({ createdAt: -1 })
        : [],
    ]);

    res.json({
      success: true,
      resourceCount,
      courseCount,
      studentCount,
      stats: {
        totalDepartmentStudents: studentCount,
        myTotalResources: resourceCount,
        myTotalCourses: courseCount,
      },
      myRecentResources,
      myCourses,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/users/leaderboard
 * @desc    Get paginated or top 50 student leaderboard
 * @access  Public or Protected
 */
export async function getLeaderboard(req, res, next) {
  try {
    const { departmentId } = req.query;
    const { page, limit, skip } = getPagination(req.query, 20);

    const query = { role: "student", isActive: true };
    if (departmentId) {
      query.departmentId = departmentId;
    }

    const sortField = { "streak.currentStreak": -1, "streak.longestStreak": -1, createdAt: 1 };

    const [users, total] = await Promise.all([
      User.find(query)
        .select("name registerNumber departmentId classId streak profileImage")
        .populate("departmentId", "code name")
        .sort(sortField)
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    // Certificate counts are not on the User document, so fetch them in one
    // aggregate rather than issuing a query per ranked user.
    const certCounts = await Certificate.aggregate([
      { $match: { studentId: { $in: users.map((u) => u._id) } } },
      { $group: { _id: "$studentId", count: { $sum: 1 } } },
    ]);
    const certCountBy = new Map(certCounts.map((c) => [String(c._id), c.count]));

    const leaderboard = users.map((u, idx) => ({
      rank: skip + idx + 1,
      _id: u._id,
      name: u.name,
      registerNumber: u.registerNumber,
      department: u.departmentId?.code || u.departmentId?.name || "VCET",
      streak: u.streak?.currentStreak || 0,
      longestStreak: u.streak?.longestStreak || 0,
      certificatesEarned: certCountBy.get(String(u._id)) || 0,
      profileImage: u.profileImage,
    }));

    res.json({
      success: true,
      leaderboard,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/users/streak
 * @desc    Get authenticated student's streak details
 * @access  Protected (Student)
 */
export async function getStreakInfo(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select("streak");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({
      success: true,
      streak: user.streak || { currentStreak: 0, longestStreak: 0, freezeCount: 0 },
    });
  } catch (error) {
    next(error);
  }
}


