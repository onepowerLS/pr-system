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
exports.updateUserEmail = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
exports.updateUserEmail = functions.https.onCall(async (data, context) => {
    try {
        // Check if caller has admin permissions
        if (!context.auth || context.auth.token.permissionLevel < 5) {
            throw new functions.https.HttpsError('permission-denied', 'Only administrators can update user emails');
        }
        // Validate required fields
        if (!data.userId || !data.newEmail) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
        }
        // Update email in Firebase Auth
        await admin.auth().updateUser(data.userId, {
            email: data.newEmail
        });
        // Update email in Firestore
        await admin.firestore().doc(`users/${data.userId}`).update({
            email: data.newEmail,
            updatedAt: new Date().toISOString()
        });
        return {
            success: true
        };
    }
    catch (error) {
        console.error('Error updating user email:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update user email', error);
    }
});
//# sourceMappingURL=updateUserEmail.js.map