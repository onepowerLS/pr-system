import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export interface UpdateUserData {
    userId: string;
    firstName?: string;
    lastName?: string;
    department?: string;
    organization?: string;
    permissionLevel?: number;
    isActive?: boolean;
    additionalOrganizations?: string[];
}

export const updateUser = functions.https.onCall(async (data: UpdateUserData, context) => {
    try {
        // Check if the caller has admin privileges
        if (!context.auth?.token?.admin) {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can update users');
        }

        // Get user reference
        const userRef = admin.firestore().collection('users').doc(data.userId);
        
        // Update user data in Firestore
        const updateData: any = {
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
    } catch (error) {
        console.error('Error updating user:', error);
        throw new functions.https.HttpsError('internal', 'Error updating user');
    }
});

export const getUserClaims = functions.https.onCall(async (data: { userId: string }, context) => {
  // Verify that the caller is an admin
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can get user claims'
    );
  }

  try {
    const user = await admin.auth().getUser(data.userId);
    return {
      success: true,
      claims: user.customClaims || {}
    };
  } catch (error) {
    console.error('Error getting user claims:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error getting user claims'
    );
  }
});
