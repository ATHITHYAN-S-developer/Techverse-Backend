import { User } from "../models/User.js";
import { Point } from "../models/Point.js";
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
    if (role) query.role = role;
    if (departmentId) query.departmentId = departmentId;

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
        .sort({ "points.totalPoints": -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      users: users.map((u) => ({
        ...u.toSafeObject(),
        points: u.points?.totalPoints || 0,
        streak: u.streak?.currentStreak || 0,
        department: u.departmentId?.code || u.departmentId?.name || "CSE",
        className: u.classId?.className || "",
        year: u.classId?.year ? `${u.classId.year === 1 ? 'I' : u.classId.year === 2 ? 'II' : u.classId.year === 3 ? 'III' : 'IV'} Year` : "III Year",
        section: u.classId?.section || "A",
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
 * @route   GET /api/users/leaderboard
 * @desc    Get paginated or top 50 student leaderboard
 * @access  Public or Protected
 */
export async function getLeaderboard(req, res, next) {
  try {
    const { departmentId, type = "points" } = req.query;
    const { page, limit, skip } = getPagination(req.query, 20);

    const query = { role: "student", isActive: true };
    if (departmentId) {
      query.departmentId = departmentId;
    }

    const sortField = type === "streak" ? { "streak.currentStreak": -1, "points.totalPoints": -1 } : { "points.totalPoints": -1, "streak.currentStreak": -1 };

    const [users, total] = await Promise.all([
      User.find(query)
        .select("name registerNumber departmentId classId points streak profileImage")
        .populate("departmentId", "code name")
        .sort(sortField)
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    const leaderboard = users.map((u, idx) => ({
      rank: skip + idx + 1,
      _id: u._id,
      name: u.name,
      registerNumber: u.registerNumber,
      department: u.departmentId?.code || u.departmentId?.name || "VCET",
      points: u.points?.totalPoints || 0,
      level: u.points?.level || 1,
      streak: u.streak?.currentStreak || 0,
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
 * @route   GET /api/users/points-history
 * @desc    Get authenticated student's points log
 * @access  Protected (Student)
 */
export async function getPointsHistory(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query, 20);
    const userId = req.user._id;

    const [history, total] = await Promise.all([
      Point.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Point.countDocuments({ userId }),
    ]);

    res.json({
      success: true,
      history,
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
    const user = await User.findById(req.user._id).select("streak points");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({
      success: true,
      streak: user.streak || { currentStreak: 0, longestStreak: 0, freezeCount: 0 },
      points: user.points || { totalPoints: 0, level: 1 },
    });
  } catch (error) {
    next(error);
  }
}
