import { Visitor } from "../models/Visitor.js";

const GLOBAL_VISITOR_KEY = "global_counter";

/** YYYY-MM-DD for a Date in the server's local calendar day. */
function toLocalDay(input) {
  const date = input instanceof Date ? input : new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const __internal = { toLocalDay };

/**
 * @route   POST /api/visitors/increment
 * @desc    Increment the visitor counter for today and the all-time counter
 * @access  Public
 */
export async function incrementVisitor(req, res, next) {
  try {
    const now = new Date();
    const today = toLocalDay(now);

    // All-time counter.
    const global = await Visitor.findOneAndUpdate(
      { key: GLOBAL_VISITOR_KEY },
      {
        $inc: { totalVisits: 1 },
        $set: { updatedAt: now },
        $setOnInsert: { key: GLOBAL_VISITOR_KEY },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Daily bucket, so "Today's Visitors" and the traffic trend have a source.
    const daily = await Visitor.findOneAndUpdate(
      { date: today },
      {
        $inc: { totalVisits: 1 },
        $set: { updatedAt: now },
        $setOnInsert: { date: today },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      data: {
        totalVisits: global.totalVisits,
        today: daily.totalVisits,
        date: today,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/visitors/:type
 * @desc    Increment one of the per-type daily counters (resource/course/announcement)
 * @access  Public
 */
const TYPE_FIELDS = {
  resource: "resourceViews",
  course: "courseViews",
  announcement: "announcementViews",
};

export async function incrementVisitorType(req, res, next) {
  try {
    const field = TYPE_FIELDS[String(req.params.type || "").toLowerCase()];
    if (!field) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${Object.keys(TYPE_FIELDS).join(", ")}`,
      });
    }

    const now = new Date();
    const today = toLocalDay(now);

    const daily = await Visitor.findOneAndUpdate(
      { date: today },
      {
        $inc: { [field]: 1 },
        $set: { updatedAt: now },
        $setOnInsert: { date: today },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      data: { date: today, [field]: daily[field] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/visitors/count
 * @desc    Read the global and today's counters without incrementing
 * @access  Public
 */
export async function getVisitorCount(req, res, next) {
  try {
    const today = toLocalDay(new Date());
    const [global, daily] = await Promise.all([
      Visitor.findOne({ key: GLOBAL_VISITOR_KEY }).select("totalVisits"),
      Visitor.findOne({ date: today }).select("totalVisits"),
    ]);

    return res.json({
      success: true,
      data: {
        totalVisits: global?.totalVisits || 0,
        today: daily?.totalVisits || 0,
        date: today,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Backward compatibility helpers for other modules if needed
 */
export async function trackVisit(req, res, next) {
  return incrementVisitor(req, res, next);
}

export async function getVisitorStats(req, res, next) {
  return getVisitorCount(req, res, next);
}
