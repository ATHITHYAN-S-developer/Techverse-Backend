export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid identifier format for field: ${err.path}`,
      code: "INVALID_OBJECT_ID",
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists: '${err.keyValue[field]}'`,
      code: "DUPLICATE_KEY_ERROR",
      field,
    });
  }

  // Mongoose ValidationError
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({
      success: false,
      message: messages.join(", "),
      code: "VALIDATION_ERROR",
      errors: err.errors,
    });
  }

  // Custom status code or default 500
  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    code: err.code || "INTERNAL_SERVER_ERROR",
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}
