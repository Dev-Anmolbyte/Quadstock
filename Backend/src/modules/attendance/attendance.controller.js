import attendanceService from "./attendance.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const punchIn = asyncHandler(async (req, res) => {
    // req.user contains the logged in employee/owner info from authMiddleware
    const record = await attendanceService.punchIn(req.user._id, req.user.storeId);
    console.log(`[Attendance] Punch-in SUCCESS for Emp: ${req.user._id}`);
    
    return res.status(200).json({

        success: true,
        data: record,
        message: "Punched in successfully"
    });
});

const punchOut = asyncHandler(async (req, res) => {
    const { isBreak } = req.body;
    const record = await attendanceService.punchOut(req.user._id, req.user.storeId, isBreak);
    
    return res.status(200).json({
        success: true,
        data: record,
        message: isBreak ? "Break started" : "Shift ended"
    });
});

const getMyAttendance = asyncHandler(async (req, res) => {
    const { month } = req.query;
    if (!month) throw new ApiError(400, "Month (YYYY-MM) is required");
    
    const records = await attendanceService.getMyAttendance(req.user._id, req.user.storeId, month);
    
    return res.status(200).json({
        success: true,
        data: records
    });
});

const getEmployeeAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { month } = req.query;
    if (!month) throw new ApiError(400, "Month (YYYY-MM) is required");

    const records = await attendanceService.getEmployeeAttendance(id, req.user.storeId, month);
    
    return res.status(200).json({
        success: true,
        data: records
    });
});

const getDailyReport = asyncHandler(async (req, res) => {
    const { date } = req.query;
    const today = date || new Date().toISOString().split('T')[0];
    
    const records = await attendanceService.getDailyReport(req.user.storeId, today);
    
    return res.status(200).json({
        success: true,
        data: records
    });
});

export {
    punchIn,
    punchOut,
    getMyAttendance,
    getEmployeeAttendance,
    getDailyReport
};
