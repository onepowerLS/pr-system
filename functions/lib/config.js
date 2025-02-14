"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOriginAllowed = exports.corsWhitelist = void 0;
// CORS whitelist configuration
exports.corsWhitelist = [
    'http://localhost:5173', // Local development
    'http://localhost:3000', // Alternative local development
    'https://pr-system-4ea55.web.app', // Production
    'https://pr-system-4ea55.firebaseapp.com' // Alternative production
];
// Helper function to check if origin is in whitelist
const isOriginAllowed = (origin) => {
    if (!origin)
        return false;
    return exports.corsWhitelist.some(allowedOrigin => origin.startsWith(allowedOrigin));
};
exports.isOriginAllowed = isOriginAllowed;
//# sourceMappingURL=config.js.map