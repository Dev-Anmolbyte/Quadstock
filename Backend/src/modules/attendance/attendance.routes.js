import { Router } from "express";
import { 
    punchIn, 
    punchOut, 
    getMyAttendance, 
    getEmployeeAttendance, 
    getDailyReport 
} from "./attendance.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const attendanceRouter = Router();

attendanceRouter.use(authMiddleware);

attendanceRouter.post("/punch-in", punchIn);
attendanceRouter.patch("/punch-out", punchOut);
attendanceRouter.get("/me", getMyAttendance);

// Owner only routes
attendanceRouter.get("/report", authorizeRoles("owner"), getDailyReport);
attendanceRouter.get("/:id", authorizeRoles("owner"), getEmployeeAttendance);

export default attendanceRouter;
