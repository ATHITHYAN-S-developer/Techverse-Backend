import { Visitor } from "../models/Visitor.js";

const GLOBAL_VISITOR_KEY = "global_counter";

/**
 * @route   POST /api/visitors/increment
 * @desc    Atomically increment the global visitor counter by 1
 * @access  Public
 */
export async function incrementVisitor(req, res, next) {
  try {
    const visitor = await Visitor.findOneAndUpdate(
      { key: GLOBAL_VISITOR_KEY },
      {
        $inc: { totalVisits: 1 },
        $set: { updatedAt: new Date() },
        $setOnInsert: { key: GLOBAL_VISITOR_KEY },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json({
      success: true,
      data: {
        totalVisits: visitor.totalVisits,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/visitors/count
 * @desc    Get the current global visitor count without incrementing
 * @access  Public
 */
export async function getVisitorCount(req, res, next) {
  try {
    const visitor = await Visitor.findOne({ key: GLOBAL_VISITOR_KEY });

    return res.json({
      success: true,
      data: {
        totalVisits: visitor ? visitor.totalVisits : 0,
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
