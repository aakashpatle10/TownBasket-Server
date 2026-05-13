import express from "express";
import { PERMISSIONS, SYSTEM_ROLES } from "../../constants/permissions.js";
import { authMiddleware, requireRoles } from "../../middlewares/auth.middleware.js";
import { requirePermissions } from "../../middlewares/permission.middleware.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { UserController } from "./user.controller.js";
import {
  assignRoleValidationSchema,
  createUserValidationSchema,
  updateUserValidationSchema,
} from "./user.validation.js";

const router = express.Router();

router.get("/me", authMiddleware, UserController.getMe);

router.get(
  "/seller/profile",
  authMiddleware,
  requireRoles(SYSTEM_ROLES.SELLER),
  requirePermissions(PERMISSIONS.SELLER_ACCESS),
  UserController.getMe
);

router.get(
  "/buyer/profile",
  authMiddleware,
  requireRoles(SYSTEM_ROLES.BUYER),
  requirePermissions(PERMISSIONS.BUYER_ACCESS),
  UserController.getMe
);

router.get(
  "/delivery/profile",
  authMiddleware,
  requireRoles(SYSTEM_ROLES.DELIVERY),
  requirePermissions(PERMISSIONS.DELIVERY_ACCESS),
  UserController.getMe
);

router.post(
  "/create-user",
  authMiddleware,
  requirePermissions(PERMISSIONS.USER_CREATE),
  validateRequest(createUserValidationSchema),
  UserController.createUser
);

router.post(
  "/",
  authMiddleware,
  requirePermissions(PERMISSIONS.USER_CREATE),
  validateRequest(createUserValidationSchema),
  UserController.createUser
);

router.get("/", authMiddleware, requirePermissions(PERMISSIONS.USER_READ), UserController.getAllUsers);
router.get("/:id", authMiddleware, requirePermissions(PERMISSIONS.USER_READ), UserController.getSingleUser);
router.patch(
  "/:id",
  authMiddleware,
  requirePermissions(PERMISSIONS.USER_UPDATE),
  validateRequest(updateUserValidationSchema),
  UserController.updateUser
);
router.patch(
  "/:id/role",
  authMiddleware,
  requireRoles(SYSTEM_ROLES.ADMIN),
  validateRequest(assignRoleValidationSchema),
  UserController.assignRole
);
router.delete("/:id", authMiddleware, requirePermissions(PERMISSIONS.USER_DELETE), UserController.deleteUser);

export const UserRoutes = router;
