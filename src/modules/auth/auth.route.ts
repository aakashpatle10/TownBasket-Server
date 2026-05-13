import express from "express";
import validateRequest from "../../middlewares/validateRequest.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { AuthController } from "./auth.controller.js";
import {
  loginValidationSchema,
  refreshTokenValidationSchema,
  registerValidationSchema,
} from "./auth.validation.js";

const router = express.Router();

router.post("/register", validateRequest(registerValidationSchema), AuthController.registerUser);
router.post("/login", validateRequest(loginValidationSchema), AuthController.loginUser);
router.post("/refresh-token", validateRequest(refreshTokenValidationSchema), AuthController.refreshToken);
router.post("/logout", authMiddleware, AuthController.logoutUser);

export const AuthRoutes = router;
