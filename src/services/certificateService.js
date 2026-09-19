import { Certificate } from "../models/Certificate.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { User } from "../models/User.js";
import { generateCertificateNumber, generateVerificationCode } from "../utils/generateId.js";
import { awardPoints } from "./pointsService.js";
import { logAuditEvent } from "./auditService.js";

export async function generateCourseCertificate(studentIdOrParams, courseIdParam, scoreParam) {
  let studentId, courseId, customScore;
  if (typeof studentIdOrParams === "object" && studentIdOrParams !== null) {
    studentId = studentIdOrParams.studentId || studentIdOrParams.userId;
    courseId = studentIdOrParams.courseId;
    customScore = studentIdOrParams.score;
  } else {
    studentId = studentIdOrParams;
    courseId = courseIdParam;
    customScore = scoreParam;
  }

  // 1. Resolve Course by _id or slug
  let course = null;
  if (courseId) {
    if (String(courseId).match(/^[0-9a-fA-F]{24}$/)) {
      course = await Course.findById(courseId);
    }
    if (!course) {
      course = await Course.findOne({ slug: courseId });
    }
  }

  const student = await User.findById(studentId);

  if (!course || !student) {
    throw new Error("Course or Student record not found in MongoDB.");
  }

  const resolvedCourseId = course._id;

  // 2. Check existing certificate in MongoDB
  const existing = await Certificate.findOne({ studentId, courseId: resolvedCourseId });
  if (existing) {
    return {
      certificate: existing,
      alreadyIssued: true,
    };
  }

  // 3. Mark or create enrollment as completed in MongoDB
  let enrollment = await Enrollment.findOne({ studentId, courseId: resolvedCourseId });
  if (enrollment) {
    enrollment.status = "completed";
    enrollment.progressPercentage = 100;
    enrollment.completedAt = enrollment.completedAt || new Date();
    await enrollment.save();
  } else {
    await Enrollment.create({
      studentId,
      courseId: resolvedCourseId,
      status: "completed",
      progressPercentage: 100,
      completedAt: new Date(),
    });
  }

  // 4. Generate serial number & verification hash
  const totalCerts = await Certificate.countDocuments();
  const certNumber = generateCertificateNumber(course.slug || "CRS", totalCerts + 1);
  const verCode = generateVerificationCode();

  const score = Number(customScore) > 0 ? Math.round(Number(customScore)) : 92;
  const grade = score >= 90 ? "Outstanding" : score >= 75 ? "Distinction" : "First Class";

  const cert = await Certificate.create({
    certificateNumber: certNumber,
    studentId,
    courseId: resolvedCourseId,
    studentName: student.name,
    registerNumber: student.registerNumber || "VCET-STU",
    courseName: course.title,
    instructorName: course.instructorName || course.instructor || "VCET Faculty Lead",
    score,
    grade,
    verificationCode: verCode,
    status: "valid",
    issuedAt: new Date(),
  });

  // Award course completion points (+500)
  await awardPoints({
    studentId,
    courseId,
    type: "course_completion",
    points: 500,
    description: `Completed Course: ${course.title}`,
    referenceId: certNumber,
  });

  await logAuditEvent({
    userId: studentId,
    userIdentifier: student.registerNumber,
    userName: student.name,
    role: "student",
    action: "CERTIFICATE_GENERATED",
    resourceType: "Certificate",
    resourceId: certNumber,
    details: `Minted verifiable certificate for ${course.title}`,
  });

  return {
    certificate: cert,
    alreadyIssued: false,
  };
}

export const issueCertificate = generateCourseCertificate;

export default {
  generateCourseCertificate,
  issueCertificate,
};
