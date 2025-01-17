import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const updateUserPassword = functions.https.onCall(async (data, context) => {
  // Check if request is made by an admin user
  if (!context.auth?.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can update user passwords'
    );
  }

  const { email, newPassword } = data;

  if (!email || !newPassword) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email and new password are required'
    );
  }

  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    
    // Update password
    await admin.auth().updateUser(user.uid, {
      password: newPassword,
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user password:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to update user password'
    );
  }
});
