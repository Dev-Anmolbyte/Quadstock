import { Udhaar } from "../models/udhaarModel.js";

const addUdhaarRecord = async (req, res) => {
    try {
        const udhaarData = req.body;

        if (!udhaarData.ownerId || !udhaarData.name || !udhaarData.date || !udhaarData.totalAmount) {
            return res.status(400).json({ success: false, message: "Required fields are missing" });
        }

        const udhaar = await Udhaar.create(udhaarData);

        if (!udhaar) {
            return res.status(500).json({ success: false, message: "Failed to create record" });
        }

        return res.status(201).json({
            success: true,
            data: udhaar,
            message: "Udhaar record added successfully"
        });

    } catch (error) {
        console.error("Add Udhaar Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getUdhaarRecords = async (req, res) => {
    try {
        const { ownerId } = req.query;

        if (!ownerId) {
            return res.status(400).json({ success: false, message: "Owner ID is required" });
        }

        const records = await Udhaar.find({ ownerId }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: records || []
        });

    } catch (error) {
        console.error("Get Udhaar Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, date, mode, description } = req.body;

        const record = await Udhaar.findById(id);

        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        // Add Transaction
        record.transactions.push({
            date,
            type: 'payment',
            amount,
            mode,
            description: description || `Partial Payment (${mode})`
        });

        // Update Balance
        record.balance -= amount;

        // Auto Status Update
        if (record.balance <= 0) {
            record.status = 'paid';
        }

        await record.save();

        return res.status(200).json({
            success: true,
            data: record,
            message: "Payment recorded successfully"
        });

    } catch (error) {
        console.error("Update Payment Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteUdhaarRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const record = await Udhaar.findByIdAndDelete(id);

        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Record deleted successfully"
        });

    } catch (error) {
        console.error("Delete Udhaar Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export {
    addUdhaarRecord,
    getUdhaarRecords,
    updatePayment,
    deleteUdhaarRecord
}
