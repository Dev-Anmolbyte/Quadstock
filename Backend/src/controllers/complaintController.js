import { Complaint } from "../models/complaintModel.js";

const addComplaint = async (req, res) => {
    try {
        const { ownerId, type, subject, description, staffName, role, images } = req.body;
        const newComplaint = await Complaint.create({ ownerId, type, subject, description, staffName, role, images });
        res.status(201).json({ success: true, data: newComplaint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getComplaintsByOwner = async (req, res) => {
    try {
        const { ownerId } = req.query;
        const list = await Complaint.find({ ownerId });
        res.status(200).json({ success: true, data: list });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, closedBy } = req.body;
        const updated = await Complaint.findByIdAndUpdate(id, { status, closedBy, updatedAt: Date.now() }, { new: true });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const addReply = async (req, res) => {
    try {
        const { id } = req.params;
        const { author, text } = req.body;
        const updated = await Complaint.findByIdAndUpdate(
            id,
            { $push: { replies: { author, text, timestamp: Date.now() } }, updatedAt: Date.now() },
            { new: true }
        );
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        await Complaint.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export { addComplaint, getComplaintsByOwner, updateStatus, addReply, deleteComplaint };
