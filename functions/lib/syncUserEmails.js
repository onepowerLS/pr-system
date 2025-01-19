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
exports.syncUserEmails = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Cloud Function to synchronize email addresses between Firebase Auth and Firestore
 * This function will:
 * 1. Get all users from Firestore
 * 2. For each user, get their Firebase Auth record
 * 3. If the emails don't match, update Firebase Auth to match Firestore
 */
exports.syncUserEmails = functions.https.onCall(async (data, context) => {
    var _a;
    // Check if the caller is an admin
    if (!((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.admin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can sync user emails');
    }
    try {
        // Get all users from Firestore
        const usersSnapshot = await admin.firestore().collection('users').get();
        const results = {
            total: usersSnapshot.size,
            updated: 0,
            errors: []
        };
        // Process each user
        for (const userDoc of usersSnapshot.docs) {
            const firestoreUser = userDoc.data();
            try {
                // Get the user from Firebase Auth
                const authUser = await admin.auth().getUser(userDoc.id);
                // If emails don't match, update Firebase Auth
                if (authUser.email !== firestoreUser.email) {
                    await admin.auth().updateUser(userDoc.id, {
                        email: firestoreUser.email
                    });
                    results.updated++;
                    console.log(`Updated email for user ${userDoc.id} from ${authUser.email} to ${firestoreUser.email}`);
                }
            }
            catch (error) {
                const errorMessage = `Error processing user ${userDoc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                results.errors.push(errorMessage);
                console.error(errorMessage);
            }
        }
        return {
            success: true,
            message: `Processed ${results.total} users, updated ${results.updated} email addresses`,
            results
        };
    }
    catch (error) {
        console.error('Error in syncUserEmails:', error);
        throw new functions.https.HttpsError('internal', 'Error synchronizing user emails', error instanceof Error ? error.message : undefined);
    }
});
//# sourceMappingURL=syncUserEmails.js.map