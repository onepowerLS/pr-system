"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupInitialAdmin = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
function isFirebaseAuthError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'message' in error &&
        typeof error.code === 'string' &&
        typeof error.message === 'string');
}
// This is a one-time setup function that should be disabled after initial admin setup
exports.setupInitialAdmin = functions.https.onRequest(async (req, res) => {
    var _a, _b;
    try {
        const apiKey = req.query.key;
        // Add your API key here - you should disable this function after using it
        const validApiKey = 'setup-initial-admin-key';
        if (apiKey !== validApiKey) {
            res.status(403).json({ error: 'Invalid API key' });
            return;
        }
        const email = req.query.email;
        const uid = req.query.uid;
        if (!email && !uid) {
            res.status(400).json({ error: 'Either email or uid parameter is required' });
            return;
        }
        let user;
        try {
            // Try to get user by email first
            if (email) {
                console.log('Attempting to get user by email:', email);
                user = await admin.auth().getUserByEmail(email);
            }
            else {
                console.log('Attempting to get user by uid:', uid);
                user = await admin.auth().getUser(uid);
            }
            console.log('Found user:', user.toJSON());
        }
        catch (error) {
            if (isFirebaseAuthError(error) && error.code === 'auth/user-not-found') {
                res.status(404).json({
                    error: 'User not found',
                    details: error.message,
                    email,
                    uid
                });
            }
            else {
                throw error;
            }
            return;
        }
        // Set admin claims
        const claims = {
            admin: true,
            procurement: true,
            requester: true
        };
        console.log('Setting claims for user:', user.uid, claims);
        // Update user claims
        await admin.auth().setCustomUserClaims(user.uid, claims);
        // Get the updated user to verify claims were set
        const updatedUser = await admin.auth().getUser(user.uid);
        console.log('Updated user claims:', updatedUser.customClaims);
        // Update or create user document in Firestore
        await admin.firestore().collection('users').doc(user.uid).set({
            email: user.email,
            firstName: ((_a = user.displayName) === null || _a === void 0 ? void 0 : _a.split(' ')[0]) || '',
            lastName: ((_b = user.displayName) === null || _b === void 0 ? void 0 : _b.split(' ').slice(1).join(' ')) || '',
            permissionLevel: 1,
            department: 'CEO',
            organization: 'Codeium',
            additionalOrganizations: [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        res.json({
            success: true,
            userId: user.uid,
            email: user.email,
            claims: updatedUser.customClaims,
            message: 'Admin user setup complete. Please sign out and sign back in for the changes to take effect.'
        });
    }
    catch (error) {
        console.error('Error setting up admin:', error);
        res.status(500).json({
            error: 'Failed to setup admin user',
            details: isFirebaseAuthError(error) ? error.message : 'Unknown error',
            code: isFirebaseAuthError(error) ? error.code : 'unknown'
        });
    }
});
//# sourceMappingURL=setupInitialAdmin.js.map