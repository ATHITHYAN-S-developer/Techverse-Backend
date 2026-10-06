import { CourseModule } from "../models/CourseModule.js";
import { Course } from "../models/Course.js";
import { CourseVideo } from "../models/CourseVideo.js";
import { CodingProblem } from "../models/CodingProblem.js";
import { MCQQuestion } from "../models/MCQQuestion.js";

/**
 * Extract YouTube Video ID from various YouTube URL formats
 */
function extractYouTubeVideoId(url) {
  if (!url) return "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : "";
}

/**
 * @route   GET /api/modules
 * @desc    Get all modules (optionally filtered by courseId)
 * @access  Public
 */
export async function getModules(req, res, next) {
  try {
    const { courseId } = req.query;
    const filter = {};
    if (courseId) {
      filter.courseId = courseId;
    }
    const modules = await CourseModule.find(filter)
      .populate("courseId", "title slug category instructor")
      .sort({ moduleNumber: 1, order: 1, createdAt: 1 });

    // If user is not admin/teacher/faculty/hod, protect MCQ correct answers
    const isPrivileged = req.user && ["admin", "teacher", "faculty", "hod"].includes(req.user.role);
    const sanitizedModules = modules.map((mod) => {
      const obj = mod.toObject();
      if (!isPrivileged && obj.mcqs) {
        obj.mcqs = obj.mcqs.map((q) => {
          const { correctAnswer, explanation, ...rest } = q;
          return rest;
        });
      }
      return obj;
    });

    res.json({ success: true, modules: sanitizedModules });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/modules/:id
 * @desc    Get module details
 * @access  Public
 */
export async function getModuleById(req, res, next) {
  try {
    const module = await CourseModule.findById(req.params.id).populate("courseId", "title slug category");
    if (!module) {
      return res.status(404).json({ success: false, message: "Module not found." });
    }

    const isPrivileged = req.user && ["admin", "teacher", "faculty", "hod"].includes(req.user.role);
    const obj = module.toObject();
    if (!isPrivileged && obj.mcqs) {
      obj.mcqs = obj.mcqs.map((q) => {
        const { correctAnswer, explanation, ...rest } = q;
        return rest;
      });
    }

    res.json({ success: true, module: obj });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/modules
 * @desc    Create course module with mandatory Video & optional Coding / MCQ
 * @access  Protected (Admin / Teacher)
 */
export async function createModule(req, res, next) {
  try {
    const {
      courseId,
      moduleNumber,
      title,
      description = "",
      hasVideo = false,
      isVideoMandatory = false,
      hasCoding = false,
      hasMCQ = false,
      videos = [],
      codingProblems = [],
      mcqs = [],
      videoUrl = "",
      content = "",
      estimatedMinutes = 45,
    } = req.body;

    // 1. Title validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "❌ Module title is required.",
      });
    }

    // 2. Normalize and validate Videos if enabled
    let processedVideos = [];
    if (hasVideo) {
      if (Array.isArray(videos) && videos.length > 0) {
        processedVideos = [...videos];
      } else if (videoUrl && videoUrl.trim()) {
        processedVideos.push({
          title: `${title} - Core Lecture`,
          youtubeUrl: videoUrl.trim(),
          youtubeVideoId: extractYouTubeVideoId(videoUrl.trim()),
          duration: "30 mins",
          order: 1,
        });
      }

      if (processedVideos.length === 0) {
        return res.status(400).json({
          success: false,
          message: `❌ Video is enabled for "${title}", but no videos were added. Please add at least one video or disable Video.`,
        });
      }

      processedVideos = processedVideos.map((v, idx) => ({
        ...v,
        order: v.order || idx + 1,
        youtubeVideoId: v.youtubeVideoId || extractYouTubeVideoId(v.youtubeUrl || ""),
      }));
    }

    // 4. Coding validation if enabled
    let processedCoding = [];
    if (hasCoding) {
      if (!Array.isArray(codingProblems) || codingProblems.length === 0) {
        return res.status(400).json({
          success: false,
          message: `❌ Coding is enabled for "${title}", but no coding problems were added. Please add at least one coding problem or disable Coding.`,
        });
      }
      processedCoding = codingProblems.map((cp) => ({
        ...cp,
        title: cp.title?.trim() || "Coding Challenge",
        description: cp.description?.trim() || "Solve the problem according to the specifications.",
      }));
    }

    // 5. MCQ validation if enabled
    let processedMCQs = [];
    if (hasMCQ) {
      if (!Array.isArray(mcqs) || mcqs.length === 0) {
        return res.status(400).json({
          success: false,
          message: `❌ MCQ is enabled for "${title}", but no MCQ questions were added. Please add at least one MCQ question or disable MCQ.`,
        });
      }
      processedMCQs = mcqs.map((q) => ({
        ...q,
        question: q.question?.trim() || "Multiple Choice Question",
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["Option A", "Option B"],
        correctAnswer: typeof q.correctAnswer === "number" ? q.correctAnswer : 0,
      }));
    }

    // Determine module number if not provided
    let modNum = moduleNumber;
    if (!modNum) {
      const existingCount = await CourseModule.countDocuments({ courseId });
      modNum = existingCount + 1;
    }

    const primaryVideoUrl = processedVideos[0]?.youtubeUrl || videoUrl || "";

    const module = await CourseModule.create({
      courseId,
      moduleNumber: modNum,
      title: title.trim(),
      description: description.trim(),
      hasVideo: Boolean(hasVideo),
      isVideoMandatory: Boolean(hasVideo && isVideoMandatory),
      hasCoding: Boolean(hasCoding),
      hasMCQ: Boolean(hasMCQ),
      order: modNum,
      videos: processedVideos,
      codingProblems: processedCoding,
      mcqs: processedMCQs,
      videoUrl: primaryVideoUrl,
      content,
      estimatedMinutes: Number(estimatedMinutes) || 45,
    });

    // Also persist standalone collection records for direct queries if needed
    try {
      if (processedVideos.length > 0) {
        await CourseVideo.insertMany(
          processedVideos.map((v) => ({ ...v, moduleId: module._id }))
        );
      }
      if (processedCoding.length > 0) {
        await CodingProblem.insertMany(
          processedCoding.map((cp) => ({ ...cp, moduleId: module._id }))
        );
      }
      if (processedMCQs.length > 0) {
        await MCQQuestion.insertMany(
          processedMCQs.map((q) => ({ ...q, moduleId: module._id }))
        );
      }
    } catch (subErr) {
      console.debug("Note: Subdocument sync:", subErr.message);
    }

    // Update course totalModules
    const count = await CourseModule.countDocuments({ courseId });
    await Course.findByIdAndUpdate(courseId, { totalModules: count });

    res.status(201).json({
      success: true,
      message: `Module "${module.title}" created successfully.`,
      module,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/modules/:id
 * @desc    Update course module with full validation
 * @access  Protected (Admin / Teacher)
 */
export async function updateModule(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await CourseModule.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Module not found." });
    }

    const {
      title,
      description,
      hasVideo,
      isVideoMandatory,
      hasCoding,
      hasMCQ,
      videos,
      codingProblems,
      mcqs,
      videoUrl,
      content,
      estimatedMinutes,
      isPublished,
    } = req.body;

    const finalTitle = title !== undefined ? title.trim() : existing.title;
    if (!finalTitle) {
      return res.status(400).json({ success: false, message: "❌ Module title is required." });
    }

    const finalHasVideo = hasVideo !== undefined ? Boolean(hasVideo) : existing.hasVideo;
    const finalHasCoding = hasCoding !== undefined ? Boolean(hasCoding) : existing.hasCoding;
    const finalHasMCQ = hasMCQ !== undefined ? Boolean(hasMCQ) : existing.hasMCQ;

    // 2. Normalize and validate videos if enabled
    let finalVideos = [];
    if (finalHasVideo) {
      finalVideos = videos !== undefined ? videos : (existing.videos || []);
      if (finalVideos.length === 0 && videoUrl && videoUrl.trim()) {
        finalVideos = [
          {
            title: `${finalTitle} - Video`,
            youtubeUrl: videoUrl.trim(),
            youtubeVideoId: extractYouTubeVideoId(videoUrl.trim()),
            duration: "30 mins",
            order: 1,
          },
        ];
      }

      if (!Array.isArray(finalVideos) || finalVideos.length === 0) {
        return res.status(400).json({
          success: false,
          message: `❌ Video is enabled for "${finalTitle}", but no videos were added. Please add at least one video or disable Video.`,
        });
      }

      finalVideos = finalVideos.map((v, idx) => ({
        ...v,
        order: v.order || idx + 1,
        youtubeVideoId: v.youtubeVideoId || extractYouTubeVideoId(v.youtubeUrl || ""),
      }));
    }

    // 3. Coding validation
    let finalCoding = finalHasCoding ? (codingProblems !== undefined ? codingProblems : (existing.codingProblems || [])) : [];
    if (finalHasCoding && (!Array.isArray(finalCoding) || finalCoding.length === 0)) {
      return res.status(400).json({
        success: false,
        message: `❌ Coding is enabled for "${finalTitle}", but no coding problems exist. Please add at least one problem or disable Coding.`,
      });
    }

    // 4. MCQ validation
    let finalMCQs = finalHasMCQ ? (mcqs !== undefined ? mcqs : (existing.mcqs || [])) : [];
    if (finalHasMCQ && (!Array.isArray(finalMCQs) || finalMCQs.length === 0)) {
      return res.status(400).json({
        success: false,
        message: `❌ MCQ is enabled for "${finalTitle}", but no MCQ questions exist. Please add at least one MCQ or disable MCQ.`,
      });
    }

    existing.title = finalTitle;
    if (description !== undefined) existing.description = description.trim();
    existing.hasVideo = finalHasVideo;
    if (isVideoMandatory !== undefined) {
      existing.isVideoMandatory = Boolean(finalHasVideo && isVideoMandatory);
    } else if (!finalHasVideo) {
      existing.isVideoMandatory = false;
    }
    existing.hasCoding = finalHasCoding;
    existing.hasMCQ = finalHasMCQ;
    existing.videos = finalVideos;
    existing.codingProblems = finalCoding;
    existing.mcqs = finalMCQs;
    existing.videoUrl = finalHasVideo ? (finalVideos[0]?.youtubeUrl || videoUrl || existing.videoUrl) : "";
    if (content !== undefined) existing.content = content;
    if (estimatedMinutes !== undefined) existing.estimatedMinutes = Number(estimatedMinutes);
    if (isPublished !== undefined) existing.isPublished = Boolean(isPublished);

    await existing.save();

    res.json({
      success: true,
      message: `Module "${existing.title}" updated successfully.`,
      module: existing,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/modules/:id
 * @desc    Delete module
 * @access  Protected (Admin / Teacher)
 */
export async function deleteModule(req, res, next) {
  try {
    const module = await CourseModule.findByIdAndDelete(req.params.id);
    if (!module) {
      return res.status(404).json({ success: false, message: "Module not found." });
    }

    // Clean up subdocuments
    await CourseVideo.deleteMany({ moduleId: module._id });
    await CodingProblem.deleteMany({ moduleId: module._id });
    await MCQQuestion.deleteMany({ moduleId: module._id });

    const count = await CourseModule.countDocuments({ courseId: module.courseId });
    await Course.findByIdAndUpdate(module.courseId, { totalModules: count });

    res.json({ success: true, message: "Module removed successfully." });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/modules/:id/submit-quiz
 * @desc    Submit answers for a module's MCQ quiz and calculate score
 * @access  Protected (Student)
 */
export async function submitModuleQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const { answers } = req.body; // { questionIndex: selectedOptionIndex }

    const module = await CourseModule.findById(id);
    if (!module) {
      return res.status(404).json({ success: false, message: "Module not found." });
    }

    if (!module.hasMCQ || !module.mcqs || module.mcqs.length === 0) {
      return res.status(400).json({ success: false, message: "This module does not contain an MCQ quiz." });
    }

    let correctCount = 0;
    const results = module.mcqs.map((q, idx) => {
      const selected = answers ? answers[idx] : null;
      const isCorrect = selected !== null && selected !== undefined && Number(selected) === q.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionIndex: idx,
        question: q.question,
        selectedOption: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || "",
      };
    });

    const totalQuestions = module.mcqs.length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercentage >= 60;

    res.json({
      success: true,
      totalQuestions,
      correctCount,
      scorePercentage,
      passed,
      results,
    });
  } catch (error) {
    next(error);
  }
}
