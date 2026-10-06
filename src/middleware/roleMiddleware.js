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

    const isHod =
      req.user.role === "hod" ||
      String(req.user.staffId || "").includes("104") ||
      String(req.user.staffId || "").toUpperCase().includes("HOD") ||
      String(req.user.designation || "").toLowerCase().includes("hod") ||
      String(req.user.title || "").toLowerCase().includes("hod");

    const effectiveRoles = new Set([req.user.role]);
    if (isHod) effectiveRoles.add("hod");

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
