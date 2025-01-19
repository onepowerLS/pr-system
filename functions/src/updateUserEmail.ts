import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export interface UpdateUserEmailData {
    userId: string;
    newEmail: string;
}

export const updateUserEmail = functions.https.onCall(async (data: UpdateUserEmailData, context) => {
    try {
        // Check if caller has admin permissions
        if (!context.auth || context.auth.token.permissionLevel < 5) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only administrators can update user emails'
            );
        }

        // Validate required fields
        if (!data.userId || !data.newEmail) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing required fields'
            );
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
    } catch (error) {
        console.error('Error updating user email:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to update user email',
            error
        );
    }
});
