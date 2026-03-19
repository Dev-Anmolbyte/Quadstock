import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: [true, 'Password is required'] },
        role: {
            type: String,
            enum: ['owner', 'staff'],
            default: 'staff'
        },
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: function() { return this.role === 'staff'; } // Store is required for staff, owners will link to it
        },
        phoneNumber: { type: String, trim: true },
        refreshToken: { type: String },
        lastUsernameChange: { type: Date },
        // OTP Verification
        otp: { type: String },           // Stores SHA-256 hashed OTP
        otpExpiry: { type: Date },
        isVerified: { type: Boolean, default: false },
        otpAttempts: { type: Number, default: 0 }
    },
    {
        timestamps: true
    }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            name: this.name,
            role: this.role,
            storeId: this.storeId
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};

export const User = mongoose.model("User", userSchema);
