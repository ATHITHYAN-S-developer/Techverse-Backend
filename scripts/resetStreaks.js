import { connectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { Enrollment } from "../src/models/Enrollment.js";

async function resetAllStreaks() {
  try {
    await connectDB();
    const result = await User.updateMany(
      {},
      {
        $set: {
          streak: {
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: null,
            freezeCount: 0,
          },
        },
      }
    );
    const enrollmentResult = await Enrollment.updateMany(
      {},
      {
        $set: {
          currentStreak: 0,
          longestStreak: 0,
        },
      }
    );
    console.log(
      `✅ Successfully reset streaks for ${result.modifiedCount} user(s) ` +
        `and ${enrollmentResult.modifiedCount} enrollment(s).`
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to reset streaks:", error);
    process.exit(1);
  }
}

resetAllStreaks();
