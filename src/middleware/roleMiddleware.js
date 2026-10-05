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

    if (!allowed.has(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have permission to access this endpoint (Requires role: ${roles.join(" or ")}).`,
        code: "FORBIDDEN_ROLE",
      });
    }

    next();
  };
}
