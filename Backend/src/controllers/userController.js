import { User } from "../models/userModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

const registerUser = async (req, res) => {
    try {
        const { ownerName, shopName, ownerEmail, phoneNumber, password, role } = req.body;

        // Validation - check if any field is empty
        if ([ownerName, shopName, ownerEmail, phoneNumber, password].some((field) => field?.trim() === "")) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Check if user already exists
        const existedUser = await User.findOne({
            $or: [{ ownerEmail }, { shopName }, { phoneNumber }]
        });

        if (existedUser) {
            return res.status(409).json({ success: false, message: "User with this email, shop name, or phone number already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user object
        const user = await User.create({
            ownerName,
            shopName,
            ownerEmail,
            phoneNumber,
            password: hashedPassword,
            role: role || 'owner',
            ownerId: `OWNER-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
        });

        const createdUser = await User.findById(user._id).select("-password -__v");

        if (!createdUser) {
            return res.status(500).json({ success: false, message: "Something went wrong while registering the user" });
        }

        return res.status(201).json({
            success: true,
            data: createdUser,
            message: "User registered successfully"
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

export {
    registerUser,
}