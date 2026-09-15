export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before role verification.",
        code: "UNAUTHENTICATED",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have permission to access this endpoint (Requires role: ${roles.join(" or ")}).`,
        code: "FORBIDDEN_ROLE",
      });
    }

    next();
  };
}
