import jwt from "jsonwebtoken";
import { User } from "../modules/user/user.model.js";
import { Employee } from "../modules/employee/employee.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const authMiddleware = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Check both User (Owner) and Employee collections
        let user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        
        if (!user) {
            user = await Employee.findById(decodedToken?._id).select("-password -refreshToken");
        }

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});

export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new ApiError(403, "Forbidden: Access denied for this role");
        }
        next();
    };
};
