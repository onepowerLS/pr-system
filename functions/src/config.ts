// CORS whitelist configuration
export const corsWhitelist = [
    'http://localhost:5173',  // Local development
    'http://localhost:3000',  // Alternative local development
    'https://pr-system-4ea55.web.app',  // Production
    'https://pr-system-4ea55.firebaseapp.com'  // Alternative production
];

// Helper function to check if origin is in whitelist
export const isOriginAllowed = (origin: string | undefined): boolean => {
    if (!origin) return false;
    return corsWhitelist.some(allowedOrigin => origin.startsWith(allowedOrigin));
};
