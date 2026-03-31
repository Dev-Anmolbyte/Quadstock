/**
 * QuadStock API Configuration
 */
const CONFIG = {
    // Dynamically detect API base URL for deployment (Vercel)
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                  ? "http://localhost:3000/api" 
                  : "/api",
};

export default CONFIG;
