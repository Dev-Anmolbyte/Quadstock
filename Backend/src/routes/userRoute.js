import express from 'express';
import { registerUser, loginUser, updateProfile, updatePassword } from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.patch("/update/:id", updateProfile);
userRouter.patch("/password/:id", updatePassword);

export default userRouter;
