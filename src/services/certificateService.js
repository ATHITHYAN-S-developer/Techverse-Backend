import { Certificate } from "../models/Certificate.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { User } from "../models/User.js";
import { generateCertificateNumber, generateVerificationCode } from "../utils/generateId.js";
import { awardPoints } from "./pointsService.js";
import { logAuditEvent } from "./auditService.js";

export async function generateCourseCertificate(studentIdOrParams, courseIdParam) {
  let studentId, courseId;
  if (typeof studentIdOrParams === "object" && studentIdOrParams !== null) {
    studentId = studentIdOrParams.studentId || studentIdOrParams.userId;
    courseId = studentIdOrParams.courseId;
  } else {
    studentId = studentIdOrParams;
    courseId = courseIdParam;
  }

  // 1. Check existing certificate
  const existing = await Certificate.findOne({ studentId, courseId });
  if (existing) {
    return {
      certificate: existing,
      alreadyIssued: true,
    };
  }

  // 2. Validate course and student
  const [course, student, enrollment] = await Promise.all([
    Course.findById(courseId),
    User.findById(studentId),
    Enrollment.findOne({ studentId, courseId }),
  ]);

  if (!course || !student) {
    throw new Error("Course or Student record not found.");
  }

  // 3. Generate serial
  const totalCerts = await Certificate.countDocuments();
  const certNumber = generateCertificateNumber(course.slug || "CRS", totalCerts + 1);
  const verCode = generateVerificationCode();

  const score = 88;
  const grade = score >= 90 ? "Outstanding" : score >= 75 ? "Distinction" : "First Class";

  const cert = await Certificate.create({
    certificateNumber: certNumber,
    studentId,
    courseId,
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
