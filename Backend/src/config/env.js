const validateEnv = () => {
    if (process.env.NODE_ENV === 'test') return;
    
    const requiredKeys = ['PORT', 'MONGODB_URI', 'ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'EMAIL_USER', 'EMAIL_PASS'];


    requiredKeys.forEach((key) => {
        if (!process.env[key]) {
            console.error(`ERROR: [Environment] Missing required key "${key}" in .env file.`);
            process.exit(1);
        }
    });
};


export default validateEnv;
