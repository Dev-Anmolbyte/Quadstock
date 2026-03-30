import udhaarService from "./udhaar.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const addUdhaarRecord = asyncHandler(async (req, res) => {
    const record = await udhaarService.createRecord(req.body, req.user.storeId);
    return res.status(201).json({
        success: true,
        data: record,
        message: "Udhaar record added successfully"
    });
});

const getUdhaarRecords = asyncHandler(async (req, res) => {
    const data = await udhaarService.getRecords(req.user.storeId, req.query);
    return res.status(200).json({
        success: true,
        data: data.records || [],
        meta: {
            total: data.total,
            page: data.page,
            pages: data.pages
        }
    });
});

const updatePayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const record = await udhaarService.recordPayment(id, req.user.storeId, req.body);
    return res.status(200).json({
        success: true,
        data: record,
        message: "Payment recorded successfully"
    });
});

const deleteUdhaarRecord = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await udhaarService.deleteRecord(id, req.user.storeId);
    return res.status(200).json({
        success: true,
        message: "Record deleted successfully"
    });
});

export {
    addUdhaarRecord,
    getUdhaarRecords,
    updatePayment,
    deleteUdhaarRecord
};
