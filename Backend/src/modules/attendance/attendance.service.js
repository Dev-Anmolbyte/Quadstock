import { Attendance } from "./attendance.model.js";
import { Employee } from "../employee/employee.model.js";
import { ApiError } from "../../utils/ApiError.js";
import mongoose from "mongoose";

class AttendanceService {
    async punchIn(employeeId, storeId) {
        const today = new Date().toISOString().split('T')[0];
        console.log(`[Attendance] Punch-in attempt for Emp: ${employeeId}, Store: ${storeId}, Date: ${today}`);
        
        if (!storeId) {
            console.error("[Attendance] Missing storeId in req.user");
            throw new ApiError(400, "Store context missing. Please re-login.");
        }

        let record = await Attendance.findOne({ employeeId, storeId, date: today });
        
        // --- NEW: Strict Daily Shift Limit ---
        if (record) {
            const hasCompletedShift = record.sessions.some(s => s.out && !s.isBreak);
            if (hasCompletedShift) {
                console.warn(`[Attendance] Blocked punch-in for Emp: ${employeeId}. Shift already finished today.`);
                throw new ApiError(403, "You have already completed your shift for today. You can start a new shift after 12:00 AM.");
            }
        }

        if (!record) {
            console.log("[Attendance] No record for today. Creating new...");
            try {
                record = await Attendance.create({
                    employeeId,
                    storeId,
                    date: today,
                    sessions: [{ in: new Date(), isBreak: false }]
                });
            } catch (err) {
                console.error("[Attendance] Create failed:", err.message);
                throw new ApiError(500, "Database error while starting shift");
            }
        } else {
            console.log("[Attendance] Record exists. Adding session...");
            const lastSession = record.sessions[record.sessions.length - 1];
            if (lastSession && !lastSession.out) {
                console.warn("[Attendance] User already has an active session.");
                throw new ApiError(400, "Already punched in or on break. Close existing session first.");
            }
            record.sessions.push({ in: new Date(), isBreak: false });
            try {
                await record.save();
            } catch (err) {
                console.error("[Attendance] Save failed:", err.message);
                throw new ApiError(500, "Database error while updating shift");
            }
        }



        // --- NEW: Auto-close open shifts from previous days ---
        await this.autoEndOldShifts(employeeId, storeId);

        return record;
    }

    /**
     * Finds any open shifts for this employee in the past and closes them at 23:59:59
     */
    async autoEndOldShifts(employeeId, storeId) {
        const today = new Date().toISOString().split('T')[0];
        
        // Find all attendance records for this employee/store that are NOT today and have an open session
        const openRecords = await Attendance.find({
            employeeId,
            storeId,
            date: { $ne: today },
            "sessions.out": { $exists: false }
        });

        if (openRecords.length > 0) {
            console.log(`[Attendance] Auto-closing ${openRecords.length} old shifts for Emp: ${employeeId}`);
            for (let record of openRecords) {
                let changed = false;
                record.sessions.forEach(session => {
                    if (!session.out) {
                        // Set out time to 23:59:59 of that record's date
                        const endOfDay = new Date(record.date + "T23:59:59Z");
                        session.out = endOfDay;
                        changed = true;
                    }
                });
                if (changed) {
                    await record.save();
                    // Also update the employee status to offline
                    await Employee.findByIdAndUpdate(employeeId, { $set: { status: 'offline' } });
                }
            }
        }
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

    /**
     * Finds any open shifts in the past for a whole store and closes them
     */
    async autoEndAllOldShifts(storeId) {
        const today = new Date().toISOString().split('T')[0];
        const openRecords = await Attendance.find({
            storeId,
            date: { $ne: today },
            "sessions.out": { $exists: false }
        });

        if (openRecords.length > 0) {
            console.log(`[Attendance] Auto-closing ${openRecords.length} old shifts for Store: ${storeId}`);
            for (let record of openRecords) {
                let changed = false;
                record.sessions.forEach(session => {
                    if (!session.out) {
                        const endOfDay = new Date(record.date + "T23:59:59Z");
                        session.out = endOfDay;
                        changed = true;
                    }
                });
                if (changed) {
                    await record.save();
                    // Also update the employee status to offline
                    await Employee.findByIdAndUpdate(record.employeeId, { $set: { status: 'offline' } });
                }
            }
        }
    }

    async getMyAttendance(employeeId, storeId, month) {
        await this.autoEndOldShifts(employeeId, storeId);
        // month format: "YYYY-MM"
        const filter = {
            employeeId,
            storeId,
            date: { $regex: `^${month}` }
        };
        return await Attendance.find(filter).sort({ date: 1 });
    }

    async getEmployeeAttendance(employeeId, storeId, month) {
        await this.autoEndOldShifts(employeeId, storeId);
        const filter = {
            employeeId,
            storeId,
            date: { $regex: `^${month}` }
        };
        return await Attendance.find(filter).sort({ date: 1 });
    }

    async getDailyReport(storeId, date) {
        await this.autoEndAllOldShifts(storeId);
        return await Attendance.find({ storeId, date }).populate('employeeId', 'name photo designation');
    }

}

export default new AttendanceService();
