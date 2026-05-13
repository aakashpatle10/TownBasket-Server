import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import config from "../config/environment.js";
import type { IErrorSource } from "../interfaces/error.js";

type OperationalError = Error & {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, unknown>;
};

export const globalErrorHandler: ErrorRequestHandler = (error: OperationalError, _req, res, _next) => {
  let statusCode = error.statusCode ?? 500;
  let message = error.message || "Something went wrong";
  let errorSources: IErrorSource[] = [
    {
      path: "",
      message,
    },
  ];

  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation error";
    errorSources = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Mongoose validation error";
    errorSources = Object.values(error.errors).map((err) => ({
      path: err.path,
      message: err.message,
    }));
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Invalid id";
    errorSources = [
      {
        path: error.path,
        message: `${error.value} is not a valid id`,
      },
    ];
  } else if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate key error";
    errorSources = Object.entries(error.keyValue ?? {}).map(([path, value]) => ({
      path,
      message: `${String(value)} already exists`,
    }));
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack: config.nodeEnv === "development" ? error.stack : undefined,
  });
};
