import employeeService from "./employee.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const addEmployee = asyncHandler(async (req, res) => {
    const { name, email, password, role, phoneNumber, aadhaar, address, emergencyContact, salary } = req.body;

    if (!name || !email) {
        throw new ApiError(400, "Name and Email are required");
    }

    const employee = await employeeService.addEmployee(
        { name, email, password, role, phoneNumber, aadhaar, address, emergencyContact, salary },
        req.user.storeId,
        req.file
    );

    return res.status(201).json({
        success: true,
        data: employee,
        message: "Employee added successfully"
    });
});

const getEmployees = asyncHandler(async (req, res) => {
    const data = await employeeService.getEmployees(req.user.storeId, req.query);
    return res.status(200).json({
        success: true,
        data: data.employees,
        meta: {
            total: data.total,
            page: data.page,
            pages: data.pages
        }
    });
});

const updateEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const employee = await employeeService.updateEmployee(id, req.body, req.user.storeId, req.file);
    return res.status(200).json({
        success: true,
        data: employee,
        message: "Employee updated successfully"
    });
});

const deleteEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await employeeService.deleteEmployee(id, req.user.storeId);
    return res.status(200).json({
        success: true,
        message: "Employee removed successfully"
    });
});

export {
    addEmployee,
    getEmployees,
    updateEmployee,
    deleteEmployee
};
