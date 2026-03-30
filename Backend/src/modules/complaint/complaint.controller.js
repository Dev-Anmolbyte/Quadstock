import complaintService from "./complaint.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const addComplaint = asyncHandler(async (req, res) => {
    const complaint = await complaintService.createComplaint(req.body, req.user.storeId);
    return res.status(201).json({
        success: true,
        data: complaint,
        message: "Complaint/Query raised successfully"
    });
});

const getComplaints = asyncHandler(async (req, res) => {
    const data = await complaintService.getComplaints(req.user.storeId, req.query);
    return res.status(200).json({
        success: true,
        data: data.complaints,
        meta: {
            total: data.total,
            page: data.page,
            pages: data.pages
        }
    });
});

const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, closedBy } = req.body;
    const updated = await complaintService.updateStatus(id, req.user.storeId, status, closedBy);
    return res.status(200).json({
        success: true,
        data: updated,
        message: "Status updated successfully"
    });
});

const addReply = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { author, text } = req.body;
    const updated = await complaintService.addReply(id, req.user.storeId, author, text);
    return res.status(200).json({
        success: true,
        data: updated,
        message: "Reply added successfully"
    });
});

const deleteComplaint = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await complaintService.deleteComplaint(id, req.user.storeId);
    return res.status(200).json({
        success: true,
        message: "Complaint deleted successfully"
    });
});

export {
    addComplaint,
    getComplaints,
    updateStatus,
    addReply,
    deleteComplaint
};
