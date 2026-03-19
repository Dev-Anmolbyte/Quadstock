import userService from "./user.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, shopName, phoneNumber, username } = req.body;

    if ([name, email, password, shopName, username].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const { user, store } = await userService.registerOwner({
        name,
        username,
        email,
        password,
        shopName,
        phoneNumber
    });


    return res.status(201).json({
        success: true,
        data: { user, store },
        message: "User and Store registered successfully"
    });
});

const loginUser = asyncHandler(async (req, res) => {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
        throw new ApiError(400, "Email or Username and password are required");
    }

    const { user, accessToken, refreshToken } = await userService.loginUser(emailOrUsername, password);

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json({
            success: true,
            data: { user, accessToken, refreshToken },
            message: "User logged in successfully"
        });
});

const logoutUser = asyncHandler(async (req, res) => {
    await userService.logoutUser(req.user._id);

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json({
            success: true,
            message: "User logged out successfully"
        });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized: No refresh token found");
    }

    const { accessToken, newRefreshToken } = await userService.refreshAccessToken(incomingRefreshToken);

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json({
            success: true,
            data: { accessToken, refreshToken: newRefreshToken },
            message: "Access token refreshed successfully"
        });
});

const checkUsernameAvailability = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        throw new ApiError(400, "Username is required");
    }

    const isAvailable = await userService.isUsernameAvailable(username);
    
    let recommendation = null;
    if (!isAvailable) {
        recommendation = await userService.generateUsernameRecommendation(username);
    }

    return res.status(200).json({
        success: true,
        data: { 
            isAvailable,
            recommendation 
        },
        message: isAvailable ? "Username is available" : "Username is already taken"
    });
});

const updateUsername = asyncHandler(async (req, res) => {
    const { newUsername } = req.body;

    if (!newUsername) {
        throw new ApiError(400, "New username is required");
    }

    const user = await userService.changeUsername(req.user._id, newUsername);

    return res.status(200).json({
        success: true,
        data: { user },
        message: "Username updated successfully"
    });
});

const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }

    await userService.verifyOtp(email, otp);

    return res.status(200).json({
        success: true,
        message: "Account verified successfully. You can now log in."
    });
});

const resendOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    await userService.resendOtp(email);

    return res.status(200).json({
        success: true,
        message: "A new OTP has been sent to your email."
    });
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    checkUsernameAvailability,
    updateUsername,
    verifyOtp,
    resendOtp
};
