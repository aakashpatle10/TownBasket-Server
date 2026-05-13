import type { Response } from "express";

type ResponsePayload<T> = {
  statusCode: number;
  success?: boolean;
  message: string;
  data?: T;
};

export const sendResponse = <T>(res: Response, payload: ResponsePayload<T>): void => {
  res.status(payload.statusCode).json({
    success: payload.success ?? true,
    message: payload.message,
    data: payload.data,
  });
};
