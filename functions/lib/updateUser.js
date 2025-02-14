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
exports.getUserClaims = exports.updateUser = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
exports.updateUser = functions.https.onCall(async (data, context) => {
    var _a, _b;
    try {
        // Check if the caller has admin privileges
        if (!((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.admin)) {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can update users');
        }
        // Get user reference
        const userRef = admin.firestore().collection('users').doc(data.userId);
        // Update user data in Firestore
        const updateData = {
            firstName: data.firstName,
            lastName: data.lastName,
            department: data.department,
            organization: data.organization,
            additionalOrganizations: data.additionalOrganizations,
            isActive: data.isActive
        };
        // If permission level is being updated, set custom claims
        if (data.permissionLevel !== undefined) {
            await admin.auth().setCustomUserClaims(data.userId, {
                permissionLevel: data.permissionLevel,
                admin: data.permissionLevel === 1
            });
            updateData.permissionLevel = data.permissionLevel;
        }
        // Update Firestore
        await userRef.update(updateData);
        return {
            success: true,
            message: 'User updated successfully'
        };
    }
    catch (error) {
        console.error('Error updating user:', error);
        throw new functions.https.HttpsError('internal', 'Error updating user');
    }
});
exports.getUserClaims = functions.https.onCall(async (data, context) => {
    var _a, _b;
    // Verify that the caller is an admin
    if (!((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.admin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can get user claims');
    }
    try {
        const user = await admin.auth().getUser(data.userId);
        return {
            success: true,
            claims: user.customClaims || {}
        };
    }
    catch (error) {
        console.error('Error getting user claims:', error);
        throw new functions.https.HttpsError('internal', 'Error getting user claims');
    }
});
//# sourceMappingURL=updateUser.js.map