import { Query } from "./query.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { withStore } from "../../utils/storeHelper.js";

class QueryService {
    async createQuery(data, storeId) {
        return await Query.create({ ...data, storeId });
    }

    async getQueries(storeId, queryFilter = {}) {
        const { page = 1, limit = 10, status } = queryFilter;
        const skip = (page - 1) * limit;

        const filter = withStore({}, { storeId });
        if (status) filter.status = status;

        const total = await Query.countDocuments(filter);
        const queries = await Query.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        return {
            queries,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }

    async updateStatus(id, storeId, status, closedBy) {
        const query = await Query.findOneAndUpdate(
            { _id: id, storeId },
            { status, closedBy },
            { returnDocument: 'after' }
        );
        if (!query) throw new ApiError(404, "Query not found or unauthorized");
        return query;
    }

    async addReply(id, storeId, author, text) {
        const query = await Query.findOneAndUpdate(
            withStore({ _id: id }, { storeId }),
            {
                $push: {
                    replies: { author, text, timestamp: new Date() }
                },
                status: 'open' 
            },
            { returnDocument: 'after' }
        );
        if (!query) throw new ApiError(404, "Query not found or unauthorized");
        return query;
    }

    async deleteQuery(id, storeId) {
        const query = await Query.findOneAndDelete({ _id: id, storeId });
        if (!query) throw new ApiError(404, "Query not found or unauthorized");
        return query;
    }
}

export default new QueryService();
