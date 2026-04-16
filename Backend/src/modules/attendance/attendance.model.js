import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema(
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
        date: {
            type: String, // "YYYY-MM-DD"
            required: true,
            index: true
        },
        sessions: [
            {
                in: { type: Date, required: true },
                out: { type: Date },
                isBreak: { type: Boolean, default: false }
            }
        ],
        totalMinutes: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'leave', 'holiday'],
            default: 'present'
        }
    },
    {
        timestamps: true
    }
);

// Pre-save hook to calculate total minutes
attendanceSchema.pre("save", function () {
    let total = 0;
    if (this.sessions && Array.isArray(this.sessions)) {
        this.sessions.forEach(session => {
            if (session.in && session.out && !session.isBreak) {
                const diffInMs = new Date(session.out) - new Date(session.in);
                total += Math.floor(diffInMs / (1000 * 60));
            }
        });
    }
    this.totalMinutes = total;
});


export const Attendance = mongoose.model("Attendance", attendanceSchema);
