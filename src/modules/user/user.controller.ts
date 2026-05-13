import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { UserService } from "./user.service.js";

const getIdParam = (req: Request): string => String(req.params.id);

const createUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await UserService.createUserIntoDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: "User created successfully",
    data: result,
  });
});

const getAllUsers = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await UserService.getAllUsersFromDB();

  sendResponse(res, {
    statusCode: 200,
    message: "Users retrieved successfully",
    data: result,
  });
});

const getSingleUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await UserService.getSingleUserFromDB(getIdParam(req));

  sendResponse(res, {
    statusCode: 200,
    message: "User retrieved successfully",
    data: result,
  });
});

const getMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError(401, "Unauthorized access");
  }

  const result = await UserService.getSingleUserFromDB(req.user.userId);

  sendResponse(res, {
    statusCode: 200,
    message: "Profile retrieved successfully",
    data: result,
  });
});

const updateUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await UserService.updateUserIntoDB(getIdParam(req), req.body);

  sendResponse(res, {
    statusCode: 200,
    message: "User updated successfully",
    data: result,
  });
});

const assignRole = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await UserService.assignRoleIntoDB(getIdParam(req), req.body.role);

  sendResponse(res, {
    statusCode: 200,
    message: "User role assigned successfully",
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await UserService.deleteUserFromDB(getIdParam(req));

  sendResponse(res, {
    statusCode: 200,
    message: "User deleted successfully",
    data: result,
  });
});

export const UserController = {
  createUser,
  getAllUsers,
  getSingleUser,
  getMe,
  updateUser,
  assignRole,
  deleteUser,
};
