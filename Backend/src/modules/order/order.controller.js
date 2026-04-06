import OrderService from "./order.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const createOrder = asyncHandler(async (req, res) => {
    const { items, total, paymentMethod } = req.body;
    const storeId = req.user.storeId; // Or however store identification is handled

    if (!items || items.length === 0) {
        throw new ApiError(400, "Cart is empty");
    }

    const order = await OrderService.createOrder({ items, total, paymentMethod }, storeId, req.user._id);

    return res.status(201).json({
        success: true,
        data: order,
        message: "Order processed successfully"
    });
});

const getOrders = asyncHandler(async (req, res) => {
    const storeId = req.user.storeId;
    const orders = await OrderService.getOrders(storeId, req.query);

    return res.status(200).json({
        success: true,
        data: orders,
        message: "Orders fetched successfully"
    });
});

export {
    createOrder,
    getOrders
};
