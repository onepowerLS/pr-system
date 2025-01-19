import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export interface CreateUserData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    department: string;
    organization: string;
    permissionLevel: number;
}

export const createUser = functions.https.onCall(async (data: CreateUserData, context) => {
    try {
        // Check if caller has admin permissions
        if (!context.auth || context.auth.token.permissionLevel < 5) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only administrators can create new users'
            );
        }

        // Validate required fields
        if (!data.email || !data.password || !data.firstName || !data.lastName || !data.organization || !data.department) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing required fields'
            );
        }

        // Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: data.email,
            password: data.password,
            displayName: `${data.firstName} ${data.lastName}`
        });

        // Set custom claims
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            permissionLevel: data.permissionLevel
        });

        // Create user document in Firestore
        const userDoc = {
            id: userRecord.uid,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            department: data.department,
            organization: data.organization,
            isActive: true,
            permissionLevel: data.permissionLevel,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await admin.firestore().doc(`users/${userRecord.uid}`).set(userDoc);

        return {
            success: true,
            user: userDoc
        };
    } catch (error) {
        console.error('Error creating user:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to create user',
            error
        );
    }
});
