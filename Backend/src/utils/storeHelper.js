import { ApiError } from "./ApiError.js";

export const withStore = (query = {}, user) => {
    const storeId = user?.storeId;
    
    if (!storeId) {
        throw new ApiError(403, "Store identification missing. Access denied.");
    }
    
    return { ...query, storeId };
};

export const enforceStore = (data = {}, user) => {
    const storeId = user?.storeId;
    if (!storeId) {
        throw new ApiError(403, "Store identification missing. Operation denied.");
    }
    return { ...data, storeId };
};
