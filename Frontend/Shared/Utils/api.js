import CONFIG from './config.js';

const apiRequest = async (endpoint, options = {}) => {
    const token = localStorage.getItem('authToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);
        const result = await response.json();

        if (response.status === 401) {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = '../Authentication/login.html';
            return;
        }

        if (!response.ok) {
            throw new Error(result.message || 'Something went wrong');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export default apiRequest;
