import { Page } from "./page.model.js";
import { ApiError } from "../../utils/ApiError.js";

class PageService {
    async getPageBySlug(slug) {
        const page = await Page.findOne({ slug });
        if (!page) {
            throw new ApiError(404, `Page with slug '${slug}' not found`);
        }
        return page;
    }

    async upsertPage(slug, data) {
        // Create or update page with basic data
        const page = await Page.findOneAndUpdate(
            { slug: slug.toLowerCase() },
            { 
                ...data,
                slug: slug.toLowerCase()
            },
            { returnDocument: 'after', upsert: true }
        );
        return page;
    }

    async getAllPages() {
        return await Page.find({}, 'slug title');
    }
}

export default new PageService();
