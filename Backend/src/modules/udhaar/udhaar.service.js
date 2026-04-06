import { Udhaar } from "./udhaar.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { withStore } from "../../utils/storeHelper.js";
import statsService from "../stats/stats.service.js";

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
        const record = await Udhaar.create(finalData);
        
        // Initial udhaar amount tracks towards issued stats
        if (totalAmount > 0) {
            await statsService.updateMonthlyStats(storeId, 'taken', totalAmount, data.date);
        }
        
        return record;
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

        const saved = await record.save();

        // [Performance Fix] Sync individual transaction to pre-calculated Monthly Stats
        await statsService.updateMonthlyStats(storeId, type, amount, date);

        return saved;
    }

    async updateRecord(id, storeId, updateData) {
        const record = await Udhaar.findOne(withStore({ _id: id }, { storeId }));
        if (!record) throw new ApiError(404, "Udhaar record not found or unauthorized");

        // Basic fields
        if (updateData.name) record.name = updateData.name;
        if (updateData.contact !== undefined) record.contact = updateData.contact;
        
        // Handle Amount adjustment (difference)
        if (updateData.totalAmount !== undefined && updateData.totalAmount !== record.totalAmount) {
            const diff = updateData.totalAmount - record.totalAmount;
            record.totalAmount = updateData.totalAmount;
            record.balance += diff;
            
            // Correct the monthly stats if amount changed
            await statsService.updateMonthlyStats(storeId, 'taken', diff, record.date);
        }

        if (updateData.date) record.date = updateData.date;
        if (updateData.dueDate) record.dueDate = updateData.dueDate;

        // Special handling for initial transaction if it was newly created
        if (record.transactions && record.transactions.length > 0) {
            // Usually the first transaction is the 'taken' one when record was created
            if (updateData.date) record.transactions[0].date = updateData.date;
            if (updateData.description) record.transactions[0].description = updateData.description;
            if (updateData.totalAmount !== undefined) record.transactions[0].amount = updateData.totalAmount;
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
