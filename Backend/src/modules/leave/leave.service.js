import { Leave } from "./leave.model.js";
import { ApiError } from "../../utils/ApiError.js";

class LeaveService {
    async requestLeave(leaveData, employeeId, storeId) {
        const { reason, startDate, endDate } = leaveData;
        if (!reason || !startDate || !endDate) {
            throw new ApiError(400, "Reason, Start Date, and End Date are required");
        }

        return await Leave.create({
            employeeId,
            storeId,
            reason,
            startDate,
            endDate
        });
    }

    async getMyLeaves(employeeId, storeId) {
        return await Leave.find({ employeeId, storeId }).sort({ createdAt: -1 });
    }

    async getAllLeaves(storeId, status) {
        const filter = { storeId };
        if (status) filter.status = status;
        
        return await Leave.find(filter)
            .populate('employeeId', 'name photo designation')
            .sort({ createdAt: -1 });
    }

    async updateLeaveStatus(leaveId, status, adminNote, storeId, reviewedBy) {
        const leave = await Leave.findOne({ _id: leaveId, storeId });
        if (!leave) throw new ApiError(404, "Leave request not found");

        leave.status = status;
        leave.adminNote = adminNote;
        leave.reviewedBy = reviewedBy;
        
        await leave.save();
        return leave;
    }
}

export default new LeaveService();
