import { User } from "../user/user.model.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";
import { ApiError } from "../../utils/ApiError.js";

class EmployeeService {
    async addEmployee(employeeData, storeId, file) {
        const { name, email, password, role, phoneNumber, aadhaar, address, emergencyContact, salary } = employeeData;

        // Check if employee already exists by email
        const existingEmployee = await User.findOne({ email });
        if (existingEmployee) {
            throw new ApiError(409, "User with this email already exists");
        }
        if (!password) {
            throw new Error("Password is required for staff accounts");
        }

        let photoUrl = null;
        if (file) {
            const upload = await uploadOnCloudinary(file.path);
            if (upload) photoUrl = upload.url;
        }

        // Generate a simple username if not provided (lowercase name + random digits)
        const baseUsername = name.toLowerCase().replace(/\s+/g, "");
        const username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;

        const newEmployee = await User.create({
            name,
            username,
            email,
            password,
            role: role || 'staff',
            storeId,
            phoneNumber,
            aadhaar,
            address,
            emergencyContact,
            salary,
            photo: photoUrl,
            status: 'offline', // Default status when added by owner
            isVerified: true // Employees added by owners are pre-verified? Or maybe they should verify?
            // User requested "employee only login when it was added in the database".
            // If we mark them as verified, they can login immediately.
        });

        const employee = await User.findById(newEmployee._id).select("-password -refreshToken");
        return employee;
    }

    async getEmployees(storeId) {
        return await User.find({ storeId, role: { $ne: 'owner' } }).select("-password -refreshToken");
    }

    async updateEmployee(id, updateData, storeId, file) {
        const employee = await User.findOne({ _id: id, storeId });
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
        return await User.findById(employeeId).select("-password -refreshToken");
    }

    async deleteEmployee(employeeId, storeId) {
        const employee = await User.findOneAndDelete({ _id: employeeId, storeId });
        if (!employee) throw new ApiError(404, "Employee not found or doesn't belong to this store");
        return employee;
    }
}

export default new EmployeeService();
