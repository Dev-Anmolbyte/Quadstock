import { Router } from "express";
import { addEmployee, getEmployees, updateEmployee, deleteEmployee, updateEmployeeStatus } from "./employee.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";
import { upload } from "../../middleware/multer.middleware.js";

const employeeRouter = Router();

// Employees are managed by Owners
employeeRouter.use(authMiddleware);

employeeRouter.route("/")
    .post(authorizeRoles("owner"), upload.single("photo"), addEmployee)
    .get(getEmployees);

employeeRouter.patch("/status", updateEmployeeStatus);

employeeRouter.route("/:id")
    .patch(authorizeRoles("owner"), upload.single("photo"), updateEmployee)
    .delete(authorizeRoles("owner"), deleteEmployee);

export default employeeRouter;
