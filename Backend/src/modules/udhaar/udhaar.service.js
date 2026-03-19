import { Udhaar } from "./udhaar.model.js";
import { ApiError } from "../../utils/ApiError.js";

class UdhaarService {
    async createRecord(data, storeId) {
        return await Udhaar.create({ ...data, storeId });
    }

    async getRecords(storeId) {
        return await Udhaar.find({ storeId }).sort({ createdAt: -1 });
    }

    async recordPayment(id, storeId, paymentData) {
        const { amount, date, mode, description } = paymentData;
        const record = await Udhaar.findOne({ _id: id, storeId });
        if (!record) throw new ApiError(404, "Udhaar record not found or unauthorized");

        record.transactions.push({
            date,
            type: 'payment',
            amount,
            mode,
            description: description || `Partial Payment (${mode})`
        });

        record.balance -= amount;
        if (record.balance <= 0) {
            record.balance = 0;
            record.status = 'paid';
        }

        return await record.save();
    }

    async deleteRecord(id, storeId) {
        const record = await Udhaar.findOneAndDelete({ _id: id, storeId });
        if (!record) throw new ApiError(404, "Udhaar record not found or unauthorized");
        return record;
    }
}

export default new UdhaarService();
