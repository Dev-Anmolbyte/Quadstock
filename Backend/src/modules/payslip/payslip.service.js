import { Payslip } from "./payslip.model.js";
import { ApiError } from "../../utils/ApiError.js";

class PayslipService {
    async generatePayslip(data, storeId, generatedBy) {
        const { employeeId, month, basicSalary, allowances, deductions } = data;
        
        if (!employeeId || !month || basicSalary === undefined) {
            throw new ApiError(400, "Employee ID, Month, and Basic Salary are required");
        }

        const netPayable = (parseFloat(basicSalary) + parseFloat(allowances || 0)) - parseFloat(deductions || 0);

        // Check if payslip already exists for this month/employee
        const existing = await Payslip.findOne({ employeeId, storeId, month });
        if (existing) {
            throw new ApiError(409, "Payslip already generated for this month");
        }

        return await Payslip.create({
            employeeId,
            storeId,
            month,
            basicSalary,
            allowances,
            deductions,
            netPayable,
            generatedBy
        });
    }

    async getEmployeePayslips(employeeId, storeId) {
        return await Payslip.find({ employeeId, storeId }).sort({ month: -1 });
    }

    async getMyPayslips(employeeId, storeId) {
        return await Payslip.find({ employeeId, storeId }).sort({ month: -1 });
    }
}

export default new PayslipService();
