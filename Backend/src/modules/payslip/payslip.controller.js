import payslipService from "./payslip.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const generatePayslip = asyncHandler(async (req, res) => {
    const payslip = await payslipService.generatePayslip(req.body, req.user.storeId, req.user._id);
    return res.status(201).json({
        success: true,
        data: payslip,
        message: "Payslip generated successfully"
    });
});

const getEmployeePayslips = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payslips = await payslipService.getEmployeePayslips(id, req.user.storeId);
    return res.status(200).json({
        success: true,
        data: payslips
    });
});

const getMyPayslips = asyncHandler(async (req, res) => {
    const payslips = await payslipService.getMyPayslips(req.user._id, req.user.storeId);
    return res.status(200).json({
        success: true,
        data: payslips
    });
});

export {
    generatePayslip,
    getEmployeePayslips,
    getMyPayslips
};
