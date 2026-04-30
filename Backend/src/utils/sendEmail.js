import nodemailer from "nodemailer";
import { otpEmailTemplate } from "./emailTemplate.js";

/**
 * Sends an OTP verification email to the specified address.
 * @param {string} to - Recipient email address
 * @param {string} ownerName - Owner's display name
 * @param {string} storeName - Registered store name
 * @param {string} otp - The plain OTP to send
 */
/**
 * Sends an OTP verification email to the specified address.
 * @param {string} to - Recipient email address
 * @param {string} ownerName - Owner's display name
 * @param {string} storeName - Registered store name
 * @param {string} otp - The plain OTP to send
 * @param {string} type - 'activation' or 'password_reset'
 */
export const sendOtpEmail = async (to, ownerName, storeName, otp, type = 'activation') => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS  // Use Gmail App Password, NOT your real password
        }
    });

    const subject = type === 'password_reset' ? 'Reset Your QuadStock Password' : 'Verify your QuadStock account';

    await transporter.sendMail({
        from: `"QuadStock" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: otpEmailTemplate(ownerName, storeName, otp, type)
    });
};
