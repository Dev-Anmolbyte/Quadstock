import crypto from "crypto";

/**
 * Generates a cryptographically secure 6-digit OTP
 * and returns both the plain version (to send) and hashed version (to store).
 */
export const generateOTP = () => {
    // Generate a random 6-digit number using crypto for better randomness
    const otp = (crypto.randomInt(100000, 999999)).toString();

    const hashedOtp = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    return { otp, hashedOtp };
};
