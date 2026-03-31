import CONFIG from "./config.js";

/**
 * Universal API Request Handler for Vanilla JS
 * Handles:
 * - Bearer Token injection automatically
 * - Auto-refresh token on 401 errors
 * - LocalStorage session sync
 */
export const apiRequest = async (endpoint, options = {}) => {
    const isFormData = options.body instanceof FormData;
    const defaultHeaders = isFormData ? {} : {
        'Content-Type': 'application/json',
    };

    // Inject Auth Token if available in sessionStorage
    const token = sessionStorage.getItem('authToken');
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    // Construct full URL with slash normalization
    const baseUrl = CONFIG.API_BASE_URL.endsWith('/') ? CONFIG.API_BASE_URL.slice(0, -1) : CONFIG.API_BASE_URL;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${path}`;

    try {
        let response = await fetch(url, config);

        // Handle Token Expiry (401)
        if (response.status === 401) {
            const refreshToken = sessionStorage.getItem('refreshToken');

            if (refreshToken) {
                // Try to refresh the token
                const refreshRes = await fetch(`${CONFIG.API_BASE_URL}/users/refresh-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                });

                if (refreshRes.ok) {
                    const result = await refreshRes.json();
                    const newAccessToken = result.data.accessToken;
                    const newRefreshToken = result.data.refreshToken;

                    // Update storage
                    sessionStorage.setItem('authToken', newAccessToken);
                    if (newRefreshToken) {
                        sessionStorage.setItem('refreshToken', newRefreshToken);
                    }

                    // Retry original request with new token
                    config.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    response = await fetch(url, config);
                } else {
                    // Refresh token failed -> Force Logout
                    forceLogout();
                }
            } else {
                // No refresh token -> Force Logout
                forceLogout();
            }
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data; 

    } catch (error) {
        console.error(`[API Error] ${endpoint}:`, error.message);
        throw error;
    }
};

const forceLogout = () => {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('currentEmployee');
    window.location.href = '/landing/landing.html'; 
};
