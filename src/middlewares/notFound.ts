import type { RequestHandler } from "express";

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: "API not found",
    path: req.originalUrl,
  });
};
