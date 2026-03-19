import statsService from "./stats.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const getPublicStats = asyncHandler(async (req, res) => {
    const data = await statsService.getPublicStats();
    return res.status(200).json({
        success: true,
        data
    });
});

const getOwnerStats = asyncHandler(async (req, res) => {
    // Both owner and staff can view stats of their store
    const storeId = req.user.storeId;
    const data = await statsService.getOwnerStats(storeId);
    return res.status(200).json({
        success: true,
        data
    });
});

export {
    getPublicStats,
    getOwnerStats
};
