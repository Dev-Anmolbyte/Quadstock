import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const employeeSchema = new Schema(
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
            enum: ['staff', 'manager', 'inventory_manager'],
            default: 'staff'
        },
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: true,
            index: true
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        phoneNumber: { type: String, trim: true },
        aadhaar: { type: String, required: true, trim: true },
        address: { type: String, trim: true },
        emergencyContact: { type: String, trim: true },
        salary: { type: Number, default: 0 },
        designation: { type: String, default: 'Staff' },
        status: {
            type: String,
            enum: ['active', 'offline', 'break', 'leave', 'absent'],
            default: 'offline'
        },
        joinedDate: { type: Date, default: Date.now },
        photo: { type: String },
        refreshToken: { type: String },
        isVerified: { type: Boolean, default: true }
    },
    {
        timestamps: true,
        collection: 'employees' // Explicitly set collection name
    }
);

employeeSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

employeeSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

employeeSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id.toString(),
            email: this.email,
            username: this.username,
            name: this.name,
            role: this.role,
            storeId: (this.storeId?._id || this.storeId || "").toString()
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

employeeSchema.methods.generateRefreshToken = function () {
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

export const Employee = mongoose.model("Employee", employeeSchema);
