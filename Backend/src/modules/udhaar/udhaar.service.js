import { Udhaar } from "./udhaar.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { withStore } from "../../utils/storeHelper.js";

class UdhaarService {
    async createRecord(data, storeId) {
        const { totalAmount } = data;
        // Enforce balance = totalAmount on creation
        const finalData = {
            ...data,
            storeId,
            balance: totalAmount,
            status: 'pending'
        };
        return await Udhaar.create(finalData);
    }

    async getRecords(storeId, query = {}) {
        const { page = 1, limit = 10, search } = query;
        const skip = (page - 1) * limit;

        const filter = withStore({}, { storeId });
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        const total = await Udhaar.countDocuments(filter);
        const records = await Udhaar.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        return {
            records,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }

    async addTransaction(id, storeId, transactionData) {
        const { amount, date, mode, description, type } = transactionData;
        const record = await Udhaar.findOne(withStore({ _id: id }, { storeId }));

        if (!record) {
            throw new ApiError(404, "Udhaar record not found or unauthorized");
        }

        if (type === 'payment') {
            if (amount > record.balance) {
                throw new ApiError(400, `Payment amount (₹${amount}) exceeds remaining balance (₹${record.balance})`);
            }
            record.balance -= amount;
        } else if (type === 'taken') {
            record.totalAmount += amount;
            record.balance += amount;
        } else {
            throw new ApiError(400, "Invalid transaction type");
        }

        record.transactions.push({
            date: date || new Date().toISOString().split('T')[0],
            type: type || 'payment',
            amount,
            mode: mode || 'Cash',
            description: description || (type === 'payment' ? `Payment Received (${mode || 'Cash'})` : 'Additional Credit Taken')
        });

        if (record.balance <= 0) {
            record.balance = 0;
            record.status = 'paid';
        } else if (record.balance > 0) {
            record.status = 'pending';
        }

        return await record.save();
    }

    async deleteRecord(id, storeId) {
        const record = await Udhaar.findOneAndDelete(withStore({ _id: id }, { storeId }));
        if (!record) throw new ApiError(404, "Udhaar record not found or unauthorized");
        return record;
    }
}

export default new UdhaarService();
