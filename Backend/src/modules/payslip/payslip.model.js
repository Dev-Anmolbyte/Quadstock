import mongoose, { Schema } from "mongoose";

const payslipSchema = new Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true
        },
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true
        },
        month: {
            type: String, // "YYYY-MM"
            required: true,
            index: true
        },
        basicSalary: {
            type: Number,
            required: true
        },
        allowances: {
            type: Number,
            default: 0
        },
        deductions: {
            type: Number,
            default: 0
        },
        netPayable: {
            type: Number,
            required: true
        },
        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['paid', 'pending'],
            default: 'paid'
        }
    },
    {
        timestamps: true
    }
);

export const Payslip = mongoose.model("Payslip", payslipSchema);
