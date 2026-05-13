import express from "express";
import { PERMISSIONS } from "../../constants/permissions.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requirePermissions } from "../../middlewares/permission.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { RoleController } from "./role.controller.js";
import { createRoleValidationSchema, updateRoleValidationSchema } from "./role.validation.js";

const router = express.Router();

router.post(
  "/create-role",
  authMiddleware,
  requirePermissions(PERMISSIONS.ROLE_CREATE),
  validateRequest(createRoleValidationSchema),
  RoleController.createRole
);

router.post(
  "/",
  authMiddleware,
  requirePermissions(PERMISSIONS.ROLE_CREATE),
  validateRequest(createRoleValidationSchema),
  RoleController.createRole
);

router.get("/", authMiddleware, requirePermissions(PERMISSIONS.ROLE_READ), RoleController.getAllRoles);
router.get("/:id", authMiddleware, requirePermissions(PERMISSIONS.ROLE_READ), RoleController.getSingleRole);
router.patch(
  "/:id",
  authMiddleware,
  requirePermissions(PERMISSIONS.ROLE_UPDATE),
  validateRequest(updateRoleValidationSchema),
  RoleController.updateRole
);
router.delete("/:id", authMiddleware, requirePermissions(PERMISSIONS.ROLE_DELETE), RoleController.deleteRole);

export const RoleRoutes = router;
