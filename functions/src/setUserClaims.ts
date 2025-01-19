import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const setUserClaims = functions.https.onCall(async (data, context) => {
  try {
    // Check if request is made by an admin user (either by claim or by checking Firestore)
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be logged in to set user claims'
      );
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
        hasAdminPermission = userData?.permissionLevel <= 2;
      }
    }

    if (!hasAdminClaim && !hasAdminPermission) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can modify user claims'
      );
    }

    const { email, permissionLevel } = data;

    if (!email || typeof permissionLevel !== 'number') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email and permission level are required'
      );
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
  } catch (error) {
    console.error('Error setting user claims:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to set user claims'
    );
  }
});
