import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AuthService } from "./auth.service.js";

const registerUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await AuthService.registerUser(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: "Registration successful",
    data: result,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await AuthService.loginUser(req.body);

  sendResponse(res, {
    statusCode: 200,
    message: "Login successful",
    data: result,
  });
});
const logoutUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    sendResponse(res, {
      statusCode: 400,
      message: "User ID is required for logout",
    });
    return;
  }

  await AuthService.logoutUser(userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Logout successful",
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await AuthService.refreshToken(req.body);

  sendResponse(res, {
    statusCode: 200,
    message: "Access token generated successfully",
    data: result,
  });
});

export const AuthController = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
};
