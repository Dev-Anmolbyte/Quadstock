import { Router } from "express";
import { 
    generatePayslip, 
    getEmployeePayslips, 
    getMyPayslips 
} from "./payslip.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const payslipRouter = Router();

payslipRouter.use(authMiddleware);

payslipRouter.get("/me", getMyPayslips);

// Owner routes
payslipRouter.post("/generate", authorizeRoles("owner"), generatePayslip);
payslipRouter.get("/employee/:id", authorizeRoles("owner"), getEmployeePayslips);

export default payslipRouter;
