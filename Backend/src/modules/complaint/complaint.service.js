import { Complaint } from "./complaint.model.js";
import { ApiError } from "../../utils/ApiError.js";

class ComplaintService {
    async createComplaint(data, storeId) {
        return await Complaint.create({ ...data, storeId });
    }

    async getComplaints(storeId) {
        return await Complaint.find({ storeId }).sort({ createdAt: -1 });
    }

    async updateStatus(id, storeId, status, closedBy) {
        const complaint = await Complaint.findOneAndUpdate(
            { _id: id, storeId },
            { status, closedBy },
            { new: true }
        );
        if (!complaint) throw new ApiError(404, "Complaint not found or unauthorized");
        return complaint;
    }

    async addReply(id, storeId, author, text) {
        const complaint = await Complaint.findOneAndUpdate(
            { _id: id, storeId },
            {
                $push: {
                    replies: { author, text, timestamp: new Date() }
                }
            },
            { new: true }
        );
        if (!complaint) throw new ApiError(404, "Complaint not found or unauthorized");
        return complaint;
    }

    async deleteComplaint(id, storeId) {
        const complaint = await Complaint.findOneAndDelete({ _id: id, storeId });
        if (!complaint) throw new ApiError(404, "Complaint not found or unauthorized");
        return complaint;
    }
}

export default new ComplaintService();
