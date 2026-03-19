import { User } from "./user.model.js";
import { Store } from "../store/store.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { generateOTP } from "../../utils/generateOtp.js";
import { sendOtpEmail } from "../../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";


class UserService {
    async registerOwner(userData) {
        const { name, email, password, shopName, phoneNumber, username } = userData;

        if (!username) {
            throw new ApiError(400, "Username is required");
        }

        // Username: lowercase letters, numbers, @, _ and . — cannot end with a special character
        const usernameRegex = /^[a-z0-9@_.]*[a-z0-9]$/;
        if (!usernameRegex.test(username)) {
            throw new ApiError(400, "Username must use only lowercase letters, numbers, @, _ or . — and cannot end with a special character");
        }

        const existedUserByUsername = await User.findOne({ username });
        if (existedUserByUsername) {
            const recommendation = await this.generateUsernameRecommendation(username);
            throw new ApiError(409, `Username already exists. Try: ${recommendation}`);
        }

        const existedUser = await User.findOne({ email });

        if (existedUser) {
            throw new ApiError(409, "User with this email already exists");
        }

        const existedStore = await Store.findOne({ name: shopName });
        if (existedStore) {
            throw new ApiError(409, "Shop name already taken");
        }

        // 1. Create User first (without storeId)
        const user = await User.create({
            name,
            username,
            email,
            password,
            role: 'owner',
            phoneNumber
        });


        // 2. Create Store linked to User with a unique ID
        const storeUniqueId = `QS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const store = await Store.create({
            name: shopName,
            storeUniqueId,
            ownerId: user._id,
            phoneNumber
        });


        // 3. Link Store back to User
        user.storeId = store._id;

        // 4. Generate OTP & send verification email
        const { otp, hashedOtp } = generateOTP();
        user.otp = hashedOtp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        user.isVerified = false;

        await user.save();

        // Send email (fire-and-forget — don't fail registration if email has a hiccup)
        try {
            await sendOtpEmail(user.email, user.name, store.name, otp);
        } catch (emailErr) {
            console.error("[OTP Email] Failed to send:", emailErr.message);
        }

        return { user, store };
    }

    async loginUser(emailOrUsername, password) {
        const user = await User.findOne({ 
            $or: [
                { email: emailOrUsername.toLowerCase() },
                { username: emailOrUsername.toLowerCase() }
            ]
        }).populate("storeId");
        if (!user) {
            throw new ApiError(404, "User does not exist");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid user credentials");
        }

        // Block login for unverified accounts
        if (!user.isVerified) {
            throw new ApiError(403, "Please verify your email before logging in. Check your inbox for the OTP.");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        return { user: loggedInUser, accessToken, refreshToken };
    }

    async logoutUser(userId) {
        await User.findByIdAndUpdate(
            userId,
            {
                $unset: {
                    refreshToken: 1 // remove refresh token from db
                }
            },
            {
                new: true
            }
        );
    }

    async refreshAccessToken(incomingRefreshToken) {
        try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            );

            const user = await User.findById(decodedToken?._id);

            if (!user) {
                throw new ApiError(401, "Invalid refresh token");
            }

            if (incomingRefreshToken !== user?.refreshToken) {
                throw new ApiError(401, "Refresh token is expired or used");
            }

            const options = {
                httpOnly: true,
                secure: true
            };

            const accessToken = user.generateAccessToken();
            const newRefreshToken = user.generateRefreshToken();

            user.refreshToken = newRefreshToken;
            await user.save({ validateBeforeSave: false });

            return { accessToken, newRefreshToken };
        } catch (error) {
            throw new ApiError(401, error?.message || "Invalid refresh token");
        }
    }

    async changeUsername(userId, newUsername) {
        const user = await User.findById(userId);
        if (!user) throw new ApiError(404, "User not found");

        const now = new Date();
        if (user.lastUsernameChange) {
            const daysSinceLastChange = Math.floor((now - user.lastUsernameChange) / (1000 * 60 * 60 * 24));
            if (daysSinceLastChange < 60) {
                const waitDays = 60 - daysSinceLastChange;
                throw new ApiError(400, `Username can only be changed once every 60 days. Please wait ${waitDays} more days.`);
            }
        }

        // Username: lowercase letters, numbers, @, _ and . — cannot end with a special character
        const usernameRegex = /^[a-z0-9@_.]*[a-z0-9]$/;
        if (!usernameRegex.test(newUsername)) {
            throw new ApiError(400, "Username must use only lowercase letters, numbers, @, _ or . — and cannot end with a special character");
        }

        const existedUser = await User.findOne({ username: newUsername });
        if (existedUser) {
            throw new ApiError(409, "Username already taken");
        }

        user.username = newUsername;
        user.lastUsernameChange = now;
        await user.save();

        return user;
    }

    async isUsernameAvailable(username) {
        const normalizedUsername = username.toLowerCase();
        const user = await User.findOne({ username: normalizedUsername });
        return !user;
    }

    async generateUsernameRecommendation(base) {
        // Strip only truly invalid characters, keep allowed: a-z, 0-9, @, _, .
        let suggestion = base.toLowerCase().replace(/[^a-z0-9@_.]/g, "");
        // Ensure suggestion doesn't end with a special character
        suggestion = suggestion.replace(/[@_.]$/, "");
        if (!suggestion) suggestion = "user";
        
        let finalSuggestion = suggestion;
        const alphabet = "abcdefghijklmnopqrstuvwxyz";
        let attempt = 0;

        while (await User.findOne({ username: finalSuggestion })) {
            const randomChar = alphabet[Math.floor(Math.random() * alphabet.length)];
            finalSuggestion = `${suggestion}${randomChar}`;
            if (attempt > 10) {
                 finalSuggestion = `${suggestion}${alphabet[attempt % 26]}${alphabet[(attempt + 1) % 26]}`;
            }
            attempt++;
            if (attempt > 100) break;
        }
        return finalSuggestion;
    }

    // ─── OTP: Verify ────────────────────────────────────────────────────────
    async verifyOtp(email, otp) {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) throw new ApiError(404, "User not found");

        if (user.isVerified) {
            throw new ApiError(400, "Account is already verified");
        }

        // Limit brute-force attempts
        if (user.otpAttempts >= 5) {
            throw new ApiError(429, "Too many failed attempts. Please request a new OTP.");
        }

        if (!user.otp || !user.otpExpiry) {
            throw new ApiError(400, "No OTP found. Please request a new one.");
        }

        if (user.otpExpiry < new Date()) {
            throw new ApiError(400, "OTP has expired. Please request a new one.");
        }

        // Hash the incoming OTP and compare
        const hashedIncoming = crypto.createHash("sha256").update(otp).digest("hex");
        if (user.otp !== hashedIncoming) {
            user.otpAttempts += 1;
            await user.save({ validateBeforeSave: false });
            const remaining = 5 - user.otpAttempts;
            throw new ApiError(400, `Invalid OTP. ${remaining} attempt(s) remaining.`);
        }

        // OTP is correct — activate account
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        user.otpAttempts = 0;
        await user.save({ validateBeforeSave: false });

        return user;
    }

    // ─── OTP: Resend ────────────────────────────────────────────────────────
    async resendOtp(email) {
        const user = await User.findOne({ email: email.toLowerCase() }).populate("storeId");
        if (!user) throw new ApiError(404, "User not found");

        if (user.isVerified) {
            throw new ApiError(400, "Account is already verified");
        }

        const { otp, hashedOtp } = generateOTP();
        user.otp = hashedOtp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        user.otpAttempts = 0; // Reset attempts on resend
        await user.save({ validateBeforeSave: false });

        const storeName = user.storeId?.name || "Your Store";
        try {
            await sendOtpEmail(user.email, user.name, storeName, otp);
        } catch (emailErr) {
            console.error("[Resend OTP Email] Failed:", emailErr.message);
            throw new ApiError(500, "Failed to send OTP email. Please try again.");
        }
    }
}

export default new UserService();
