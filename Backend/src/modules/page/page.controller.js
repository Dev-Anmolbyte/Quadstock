import pageService from "./page.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const getPage = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const page = await pageService.getPageBySlug(slug);
    return res.status(200).json({
        success: true,
        data: page
    });
});

const getPageList = asyncHandler(async (req, res) => {
    const list = await pageService.getAllPages();
    return res.status(200).json({
        success: true,
        data: list
    });
});

const upsertPage = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const page = await pageService.upsertPage(slug, req.body);
    return res.status(200).json({
        success: true,
        data: page,
        message: `Page '${slug}' updated successfully`
    });
});

export {
    getPage,
    getPageList,
    upsertPage
};
