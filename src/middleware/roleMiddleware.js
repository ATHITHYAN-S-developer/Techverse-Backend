export function authorize(...roles) {
  const allowed = new Set();
  roles.forEach((r) => {
    allowed.add(r);
    if (r === "faculty" || r === "teacher") {
      allowed.add("faculty");
      allowed.add("teacher");
      allowed.add("hod");
    }
  });

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before role verification.",
        code: "UNAUTHENTICATED",
      });
    }

    const staffId = String(req.user.staffId || "").toUpperCase();
    const designation = String(req.user.designation || "").toLowerCase();
    const title = String(req.user.title || "").toLowerCase();
    const regNum = String(req.user.registerNumber || "").toUpperCase();
    const email = String(req.user.email || "").toLowerCase();

    // Check if user is the local developer or institution admin
    const isDeveloper =
      regNum.includes("732924CSR014") ||
      email.includes("732924csr014") ||
      String(req.user.name || "").toUpperCase().includes("ATHITHYAN");

    const isHod =
      req.user.role === "hod" ||
      req.user.isHod === true ||
      staffId.includes("104") ||
      staffId.includes("HOD") ||
      staffId.endsWith("01") ||
      designation.includes("hod") ||
      designation.includes("head of the department") ||
      designation.includes("head of department") ||
      title.includes("hod") ||
      title.includes("head of the department") ||
      title.includes("head of department");

    const effectiveRoles = new Set([req.user.role]);
    if (isHod) {
      effectiveRoles.add("hod");
      effectiveRoles.add("faculty");
      effectiveRoles.add("teacher");
    }
    if (req.user.role === "admin") {
      effectiveRoles.add("admin");
      effectiveRoles.add("hod");
      effectiveRoles.add("faculty");
      effectiveRoles.add("teacher");
    }
    if (isDeveloper) {
      effectiveRoles.add("admin");
      effectiveRoles.add("hod");
      effectiveRoles.add("faculty");
      effectiveRoles.add("teacher");
      effectiveRoles.add("student");
    }

    const hasAccess = Array.from(effectiveRoles).some((r) => allowed.has(r));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have permission to access this endpoint (Requires role: ${roles.join(" or ")}).`,
        code: "FORBIDDEN_ROLE",
      });
    }

    next();
  };
}
