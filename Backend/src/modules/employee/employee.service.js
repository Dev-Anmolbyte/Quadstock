import { User } from "../user/user.model.js";
import { Employee } from "./employee.model.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";
import { ApiError } from "../../utils/ApiError.js";
import { withStore } from "../../utils/storeHelper.js";

class EmployeeService {
    async addEmployee(employeeData, storeId, ownerId, file) {
        const { name, email, password, role, phoneNumber, aadhaar, address, emergencyContact, salary } = employeeData;

        // Check if employee already exists by email in BOTH collections
        const existingInUser = await User.findOne({ email: email.toLowerCase() });
        const existingInEmployee = await Employee.findOne({ email: email.toLowerCase() });
        
        if (existingInUser || existingInEmployee) {
            throw new ApiError(409, "User/Employee with this email already exists");
        }

        let photoUrl = null;
        if (file) {
            const upload = await uploadOnCloudinary(file.path);
            if (upload) photoUrl = upload.url;
        }

        // Generate a TRULY UNIQUE username
        // Pattern: fistname_random4
        const baseUsername = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, "");
        let username = "";
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            username = `${baseUsername}_${randomSuffix}`;
            
            // Check in both collections for username uniqueness
            const check1 = await User.findOne({ username });
            const check2 = await Employee.findOne({ username });
            if (!check1 && !check2) isUnique = true;
            attempts++;
        }

        const newEmployee = await Employee.create({
            name,
            username,
            email: email.toLowerCase(),
            password: password || '123456', // Default password
            role: role || 'staff',
            storeId,
            ownerId, // Linked to owner
            phoneNumber,
            aadhaar,
            address,
            emergencyContact,
            salary,
            photo: photoUrl,
            status: 'offline', 
            isVerified: true 
        });

        return await Employee.findById(newEmployee._id).select("-password -refreshToken");
    }

    async getEmployees(storeId, query = {}) {
        const { page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;
        const filter = withStore({ role: { $ne: 'owner' } }, { storeId });
        
        const total = await Employee.countDocuments(filter);
        const employees = await Employee.find(filter)
            .select("-password -refreshToken")
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        return {
            employees,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }

    async updateEmployee(id, updateData, storeId, file) {
        const employee = await Employee.findOne({ _id: id, storeId });
        if (!employee) {
            throw new Error("Employee not found or unauthorized");
        }

        if (file) {
            const upload = await uploadOnCloudinary(file.path);
            if (upload) updateData.photo = upload.url;
        }

        const allowedUpdates = [
            "name", "phoneNumber", "aadhaar", "address", 
            "emergencyContact", "salary", "status", "photo"
        ];
        
        Object.keys(updateData).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                employee[key] = updateData[key];
            }
        });

        await employee.save();
        return await Employee.findById(id).select("-password -refreshToken");
    }

    async updateEmployeeStatus(id, status, storeId) {
        const employee = await Employee.findOneAndUpdate(
            { _id: id, storeId },
            { $set: { status } },
            { returnDocument: 'after' }
        ).select("-password -refreshToken");

        if (!employee) {
            throw new ApiError(404, "Employee not found or unauthorized");
        }

        return employee;
    }

    async deleteEmployee(id, storeId) {
        const employee = await Employee.findOneAndDelete(withStore({ _id: id }, { storeId }));
        if (!employee) throw new ApiError(404, "Employee not found or unauthorized");
        return employee;
    }
}

export default new EmployeeService();
