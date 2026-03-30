import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, checkUsernameAvailability, updateUsername, verifyOtp, resendOtp, forgotPassword, resetPassword, updateProfile, changePassword } from "./user.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const userRouter = Router();

// Public Routes
userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/refresh-token", refreshAccessToken);
userRouter.get("/check-username/:username", checkUsernameAvailability);
userRouter.post("/verify-otp", verifyOtp);
userRouter.post("/resend-otp", resendOtp);
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);

// Protected Routes
userRouter.post("/logout", authMiddleware, logoutUser);
userRouter.patch("/update-username", authMiddleware, updateUsername);
userRouter.patch("/update-profile", authMiddleware, updateProfile);
userRouter.patch("/change-password", authMiddleware, changePassword);

export default userRouter;
