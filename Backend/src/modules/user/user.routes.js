import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, checkUsernameAvailability, updateUsername, verifyOtp, resendOtp } from "./user.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const userRouter = Router();

// Public Routes
userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/refresh-token", refreshAccessToken);
userRouter.get("/check-username/:username", checkUsernameAvailability);
userRouter.post("/verify-otp", verifyOtp);
userRouter.post("/resend-otp", resendOtp);

// Protected Routes
userRouter.post("/logout", authMiddleware, logoutUser);
userRouter.patch("/update-username", authMiddleware, updateUsername);

export default userRouter;
