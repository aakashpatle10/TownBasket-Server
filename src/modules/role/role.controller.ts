import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { RoleService } from "./role.service.js";

const getIdParam = (req: Request): string => String(req.params.id);

const createRole = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await RoleService.createRoleIntoDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: "Role created successfully",
    data: result,
  });
});

const getAllRoles = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await RoleService.getAllRolesFromDB();

  sendResponse(res, {
    statusCode: 200,
    message: "Roles retrieved successfully",
    data: result,
  });
});

const getSingleRole = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await RoleService.getSingleRoleFromDB(getIdParam(req));

  sendResponse(res, {
    statusCode: 200,
    message: "Role retrieved successfully",
    data: result,
  });
});

const updateRole = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await RoleService.updateRoleIntoDB(getIdParam(req), req.body);

  sendResponse(res, {
    statusCode: 200,
    message: "Role updated successfully",
    data: result,
  });
});

const deleteRole = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await RoleService.deleteRoleFromDB(getIdParam(req));

  sendResponse(res, {
    statusCode: 200,
    message: "Role deleted successfully",
    data: result,
  });
});

export const RoleController = {
  createRole,
  getAllRoles,
  getSingleRole,
  updateRole,
  deleteRole,
};
