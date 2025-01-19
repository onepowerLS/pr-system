import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Cloud Function to synchronize email addresses between Firebase Auth and Firestore
 * This function will:
 * 1. Get all users from Firestore
 * 2. For each user, get their Firebase Auth record
 * 3. If the emails don't match, update Firebase Auth to match Firestore
 */
export const syncUserEmails = functions.https.onCall(async (data, context) => {
  // Check if the caller is an admin
  if (!context.auth?.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can sync user emails'
    );
  }

  try {
    // Get all users from Firestore
    const usersSnapshot = await admin.firestore().collection('users').get();
    const results = {
      total: usersSnapshot.size,
      updated: 0,
      errors: [] as string[]
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
      } catch (error) {
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
  } catch (error) {
    console.error('Error in syncUserEmails:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error synchronizing user emails',
      error instanceof Error ? error.message : undefined
    );
  }
});
