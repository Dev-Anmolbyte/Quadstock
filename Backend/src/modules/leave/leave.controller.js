import leaveService from "./leave.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const requestLeave = asyncHandler(async (req, res) => {
    const leave = await leaveService.requestLeave(req.body, req.user._id, req.user.storeId);
    return res.status(201).json({
        success: true,
        data: leave,
        message: "Leave request submitted"
    });
});

const getMyLeaves = asyncHandler(async (req, res) => {
    const leaves = await leaveService.getMyLeaves(req.user._id, req.user.storeId);
    return res.status(200).json({
        success: true,
        data: leaves
    });
});

const getAllLeaves = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const leaves = await leaveService.getAllLeaves(req.user.storeId, status);
    return res.status(200).json({
        success: true,
        data: leaves
    });
});

const updateLeaveStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, adminNote } = req.body;
    
    const leave = await leaveService.updateLeaveStatus(id, status, adminNote, req.user.storeId, req.user._id);
    
    return res.status(200).json({
        success: true,
        data: leave,
        message: `Leave request ${status}`
    });
});

export {
    requestLeave,
    getMyLeaves,
    getAllLeaves,
    updateLeaveStatus
};
