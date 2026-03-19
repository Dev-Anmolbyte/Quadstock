import nodemailer from "nodemailer";
import { otpEmailTemplate } from "./emailTemplate.js";

/**
 * Sends an OTP verification email to the specified address.
 * @param {string} to - Recipient email address
 * @param {string} ownerName - Owner's display name
 * @param {string} storeName - Registered store name
 * @param {string} otp - The plain OTP to send
 */
export const sendOtpEmail = async (to, ownerName, storeName, otp) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS  // Use Gmail App Password, NOT your real password
        }
    });

    await transporter.sendMail({
        from: `"QuadStock" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Verify your QuadStock account",
        html: otpEmailTemplate(ownerName, storeName, otp)
    });
};
