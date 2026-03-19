import { Store } from "./store.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const getStoreDetails = asyncHandler(async (req, res) => {
    const store = await Store.findById(req.user.storeId);
    if (!store) throw new ApiError(404, "Store not found");

    return res.status(200).json({
        success: true,
        data: store
    });
});

const updateStore = asyncHandler(async (req, res) => {
    const store = await Store.findOneAndUpdate(
        { _id: req.user.storeId, ownerId: req.user._id }, // Only owner can update
        req.body,
        { new: true }
    );
    if (!store) throw new ApiError(404, "Store not found or unauthorized");

    return res.status(200).json({
        success: true,
        data: store,
        message: "Store details updated successfully"
    });
});

export { getStoreDetails, updateStore };
