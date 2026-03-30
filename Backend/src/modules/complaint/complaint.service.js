import { Complaint } from "./complaint.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { withStore } from "../../utils/storeHelper.js";

class ComplaintService {
    async createComplaint(data, storeId) {
        return await Complaint.create({ ...data, storeId });
    }

    async getComplaints(storeId, query = {}) {
        const { page = 1, limit = 10, type, status } = query;
        const skip = (page - 1) * limit;

        const filter = withStore({}, { storeId });
        if (type) filter.type = type;
        if (status) filter.status = status;

        const total = await Complaint.countDocuments(filter);
        const complaints = await Complaint.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        return {
            complaints,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }

    async updateStatus(id, storeId, status, closedBy) {
        const complaint = await Complaint.findOneAndUpdate(
            { _id: id, storeId },
            { status, closedBy },
            { returnDocument: 'after' }
        );
        if (!complaint) throw new ApiError(404, "Complaint not found or unauthorized");
        return complaint;
    }

    async addReply(id, storeId, author, text) {
        const complaint = await Complaint.findOneAndUpdate(
            withStore({ _id: id }, { storeId }),
            {
                $push: {
                    replies: { author, text, timestamp: new Date() }
                },
                status: 'open' // ensure it remains open if replied
            },
            { returnDocument: 'after' }
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
