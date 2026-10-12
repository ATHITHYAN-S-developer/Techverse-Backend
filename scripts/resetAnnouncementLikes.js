import { connectDB } from "../src/config/db.js";
import { Announcement } from "../src/models/Announcement.js";

async function resetAnnouncementLikes() {
  try {
    await connectDB();
    const result = await Announcement.updateMany(
      {},
      { $set: { likes: [], likesCount: 0 } }
    );
    console.log(`✅ Reset likes for ${result.modifiedCount} announcement(s).`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to reset announcement likes:", error);
    process.exit(1);
  }
}

resetAnnouncementLikes();
