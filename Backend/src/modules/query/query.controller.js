import queryService from "./query.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const addQuery = asyncHandler(async (req, res) => {
    const query = await queryService.createQuery(req.body, req.user.storeId);
    return res.status(201).json({
        success: true,
        data: query,
        message: "Query raised successfully"
    });
});

const getQueries = asyncHandler(async (req, res) => {
    const data = await queryService.getQueries(req.user.storeId, req.query);
    return res.status(200).json({
        success: true,
        data: data.queries,
        meta: {
            total: data.total,
            page: data.page,
            pages: data.pages
        }
    });
});

const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, closedBy } = req.body;
    const updated = await queryService.updateStatus(id, req.user.storeId, status, closedBy);
    return res.status(200).json({
        success: true,
        data: updated,
        message: "Status updated successfully"
    });
});

const addReply = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { author, text } = req.body;
    const updated = await queryService.addReply(id, req.user.storeId, author, text);
    return res.status(200).json({
        success: true,
        data: updated,
        message: "Reply added successfully"
    });
});

const deleteQuery = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await queryService.deleteQuery(id, req.user.storeId);
    return res.status(200).json({
        success: true,
        message: "Query deleted successfully"
    });
});

export {
    addQuery,
    getQueries,
    updateStatus,
    addReply,
    deleteQuery
};
