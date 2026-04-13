import { Attendance } from "./attendance.model.js";
import { ApiError } from "../../utils/ApiError.js";
import mongoose from "mongoose";

class AttendanceService {
    async punchIn(employeeId, storeId) {
        const today = new Date().toISOString().split('T')[0];
        let record = await Attendance.findOne({ employeeId, storeId, date: today });

        if (!record) {
            record = await Attendance.create({
                employeeId,
                storeId,
                date: today,
                sessions: [{ in: new Date(), isBreak: false }]
            });
        } else {
            const lastSession = record.sessions[record.sessions.length - 1];
            if (lastSession && !lastSession.out) {
                throw new ApiError(400, "Already punched in or on break. Close existing session first.");
            }
            record.sessions.push({ in: new Date(), isBreak: false });
            await record.save();
        }

        return record;
    }

    async punchOut(employeeId, storeId, isBreak = false) {
        const today = new Date().toISOString().split('T')[0];
        const record = await Attendance.findOne({ employeeId, storeId, date: today });

        if (!record || record.sessions.length === 0) {
            throw new ApiError(400, "No active shift found for today.");
        }

        const lastSession = record.sessions[record.sessions.length - 1];
        if (lastSession.out) {
            throw new ApiError(400, "Session already closed.");
        }

        lastSession.out = new Date();
        lastSession.isBreak = isBreak;

        await record.save();
        return record;
    }

    async getMyAttendance(employeeId, storeId, month) {
        // month format: "YYYY-MM"
        const filter = {
            employeeId,
            storeId,
            date: { $regex: `^${month}` }
        };
        return await Attendance.find(filter).sort({ date: 1 });
    }

    async getEmployeeAttendance(employeeId, storeId, month) {
        const filter = {
            employeeId,
            storeId,
            date: { $regex: `^${month}` }
        };
        return await Attendance.find(filter).sort({ date: 1 });
    }

    async getDailyReport(storeId, date) {
        return await Attendance.find({ storeId, date }).populate('employeeId', 'name photo designation');
    }
}

export default new AttendanceService();
