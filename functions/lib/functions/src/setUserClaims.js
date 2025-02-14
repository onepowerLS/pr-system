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
exports.setUserClaims = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.setUserClaims = functions.https.onCall(async (data, context) => {
    try {
        // Check if request is made by an admin user (either by claim or by checking Firestore)
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to set user claims');
        }
        // First check if user has admin claim
        const hasAdminClaim = context.auth.token.admin === true;
        // If no admin claim, check Firestore for admin permission level
        let hasAdminPermission = false;
        if (!hasAdminClaim) {
            const userDoc = await admin.firestore()
                .collection('users')
                .doc(context.auth.uid)
                .get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                hasAdminPermission = (userData === null || userData === void 0 ? void 0 : userData.permissionLevel) <= 2;
            }
        }
        if (!hasAdminClaim && !hasAdminPermission) {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can modify user claims');
        }
        const { email, permissionLevel } = data;
        if (!email || typeof permissionLevel !== 'number') {
            throw new functions.https.HttpsError('invalid-argument', 'Email and permission level are required');
        }
        // Get user by email
        const user = await admin.auth().getUserByEmail(email);
        // Set custom claims based on permission level
        const claims = {
            admin: permissionLevel <= 2, // Admin is level 1 or 2
            procurement: permissionLevel <= 4, // Procurement is level 3 or 4
            requester: permissionLevel <= 5 // Requester is level 5
        };
        // Update user claims
        await admin.auth().setCustomUserClaims(user.uid, claims);
        // Get the updated user to verify claims were set
        const updatedUser = await admin.auth().getUser(user.uid);
        return {
            success: true,
            userId: user.uid,
            email: user.email,
            claims: updatedUser.customClaims,
            message: 'User claims updated successfully. The user must sign out and sign back in for the changes to take effect.'
        };
    }
    catch (error) {
        console.error('Error setting user claims:', error);
        throw new functions.https.HttpsError('internal', 'Failed to set user claims');
    }
});
//# sourceMappingURL=setUserClaims.js.map