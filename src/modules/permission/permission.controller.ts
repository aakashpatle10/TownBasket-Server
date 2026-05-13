import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { PermissionService } from "./permission.service.js";

const getIdParam = (req: Request): string => String(req.params.id);

const createPermission = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await PermissionService.createPermissionIntoDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: "Permission created successfully",
    data: result,
  });
});

const getAllPermissions = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await PermissionService.getAllPermissionsFromDB();

  sendResponse(res, {
    statusCode: 200,
    message: "Permissions retrieved successfully",
    data: result,
  });
});

const getSinglePermission = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await PermissionService.getSinglePermissionFromDB(getIdParam(req));

  sendResponse(res, {
    statusCode: 200,
    message: "Permission retrieved successfully",
    data: result,
  });
});

const updatePermission = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await PermissionService.updatePermissionIntoDB(getIdParam(req), req.body);

  sendResponse(res, {
    statusCode: 200,
    message: "Permission updated successfully",
    data: result,
  });
});

const deletePermission = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await PermissionService.deletePermissionFromDB(getIdParam(req));

  sendResponse(res, {
    statusCode: 200,
    message: "Permission deleted successfully",
    data: result,
  });
});

export const PermissionController = {
  createPermission,
  getAllPermissions,
  getSinglePermission,
  updatePermission,
  deletePermission,
};
