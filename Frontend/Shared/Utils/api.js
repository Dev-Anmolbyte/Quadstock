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

    // Inject Auth Token if available
    const token = localStorage.getItem('authToken');
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

    // Construct full URL
    const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.API_BASE_URL}${endpoint}`;

    try {
        let response = await fetch(url, config);

        // Handle Token Expiry (401)
        if (response.status === 401) {
            const refreshToken = localStorage.getItem('refreshToken');

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
                    localStorage.setItem('authToken', newAccessToken);
                    if (newRefreshToken) {
                        localStorage.setItem('refreshToken', newRefreshToken);
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
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentEmployee');
    window.location.href = '/landing/landing.html'; 
};
