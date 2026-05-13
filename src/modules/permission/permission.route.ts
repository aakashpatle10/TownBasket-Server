import express from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermissions } from "../../middlewares/permission.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { PermissionController } from "./permission.controller.js";
import {
  createPermissionValidationSchema,
  updatePermissionValidationSchema,
} from "./permission.validation.js";

const router = express.Router();

router.post(
  "/create-permission",
  authMiddleware,
  requirePermissions(PERMISSIONS.PERMISSION_CREATE),
  validateRequest(createPermissionValidationSchema),
  PermissionController.createPermission
);

router.post(
  "/",
  authMiddleware,
  requirePermissions(PERMISSIONS.PERMISSION_CREATE),
  validateRequest(createPermissionValidationSchema),
  PermissionController.createPermission
);

router.get("/", authMiddleware, requirePermissions(PERMISSIONS.PERMISSION_READ), PermissionController.getAllPermissions);
router.get("/:id", authMiddleware, requirePermissions(PERMISSIONS.PERMISSION_READ), PermissionController.getSinglePermission);
router.patch(
  "/:id",
  authMiddleware,
  requirePermissions(PERMISSIONS.PERMISSION_UPDATE),
  validateRequest(updatePermissionValidationSchema),
  PermissionController.updatePermission
);
router.delete(
  "/:id",
  authMiddleware,
  requirePermissions(PERMISSIONS.PERMISSION_DELETE),
  PermissionController.deletePermission
);

export const PermissionRoutes = router;
