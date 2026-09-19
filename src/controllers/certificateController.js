import { Certificate } from "../models/Certificate.js";
import { generateCourseCertificate } from "../services/certificateService.js";

/**
 * @route   GET /api/certificates/my
 * @desc    Get certificates for authenticated student
 * @access  Protected (Student)
 */
export async function getMyCertificates(req, res, next) {
  try {
    const certificates = await Certificate.find({ studentId: req.user._id })
      .populate("courseId", "title category thumbnailUrl")
      .sort({ issuedAt: -1 });

    res.json({
      success: true,
      certificates,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/certificates/verify/:code
 * @desc    Public certificate verification endpoint
 * @access  Public
 */
export async function verifyCertificate(req, res, next) {
  try {
    const code = req.params.code.trim().toUpperCase();

    const cert = await Certificate.findOne({
      $or: [{ verificationCode: code }, { certificateNumber: code }],
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: "No certificate found matching the provided verification code or number.",
      });
    }

    res.json({
      success: true,
      valid: cert.status === "valid",
      certificate: {
        certificateNumber: cert.certificateNumber,
        verificationCode: cert.verificationCode,
        studentName: cert.studentName,
        courseName: cert.courseName,
        instructorName: cert.instructorName,
        score: cert.score,
        grade: cert.grade,
        issuedAt: cert.issuedAt,
        status: cert.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   POST /api/certificates/claim
 * @desc    Claim / generate certificate for completed course
 * @access  Protected (Student)
 */
export async function claimCertificate(req, res, next) {
  try {
    const { courseId, score } = req.body;
    const studentId = req.user._id;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId is required." });
    }

    const result = await generateCourseCertificate({ studentId, courseId, score });

    res.json({
      success: true,
      message: result.alreadyIssued
        ? "Certificate was previously issued."
        : "Certificate generated successfully!",
      certificate: result.certificate,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/certificates
 * @desc    Get all certificates with filters (Admin / Public)
 * @access  Public / Protected
 */
export async function getAllCertificates(req, res, next) {
  try {
    const { search, status } = req.query;
    const query = {};
    if (status && status !== "ALL") {
      query.status = status.toLowerCase();
    }
    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: "i" } },
        { registerNumber: { $regex: search, $options: "i" } },
        { certificateNumber: { $regex: search, $options: "i" } },
        { verificationCode: { $regex: search, $options: "i" } },
        { courseName: { $regex: search, $options: "i" } },
      ];
    }

    const certificates = await Certificate.find(query)
      .populate("courseId", "title category thumbnailUrl")
      .populate("studentId", "name registerNumber departmentId")
      .sort({ issuedAt: -1 });

    res.json({
      success: true,
      certificates: certificates.map((c) => ({
        id: c._id,
        _id: c._id,
        certificateNumber: c.certificateNumber,
        studentName: c.studentName,
        regNo: c.registerNumber,
        registerNumber: c.registerNumber,
        courseTitle: c.courseName,
        courseName: c.courseName,
        score: c.score,
        grade: c.grade,
        issuedDate: c.issuedAt ? new Date(c.issuedAt).toISOString().split("T")[0] : "",
        issuedAt: c.issuedAt,
        status: c.status === "valid" ? "Active" : "Revoked",
        verificationCode: c.verificationCode,
        instructor: c.instructorName,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /api/certificates/:id/status
 * @desc    Toggle certificate validity status
 * @access  Protected (Admin only)
 */
export async function toggleCertificateStatus(req, res, next) {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) {
      return res.status(404).json({ success: false, message: "Certificate not found." });
    }
    cert.status = cert.status === "valid" ? "revoked" : "valid";
    await cert.save();

    res.json({
      success: true,
      message: `Certificate status updated to ${cert.status}.`,
      certificate: cert,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/certificates/:id
 * @desc    Get certificate by ID
 * @access  Public / Protected
 */
export async function getCertificateById(req, res, next) {
  try {
    const certificate = await Certificate.findById(req.params.id).populate("courseId");
    if (!certificate) {
      return res.status(404).json({ success: false, message: "Certificate not found." });
    }
    res.json({ success: true, certificate });
  } catch (error) {
    next(error);
  }
}
