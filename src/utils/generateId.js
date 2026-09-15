import crypto from "crypto";

export function generateCustomId(prefix = "id") {
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  return `${prefix}_${Date.now()}_${randomSuffix}`;
}

export function generateVerificationCode() {
  return "0x" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function generateCertificateNumber(coursePrefix = "GEN", sequence = 1) {
  const year = new Date().getFullYear();
  const seqStr = String(sequence).padStart(4, "0");
  return `VCET-CERT-${year}-${coursePrefix.toUpperCase().substring(0, 3)}-${seqStr}`;
}

export default {
  generateCustomId,
  generateVerificationCode,
  generateCertificateNumber,
};
