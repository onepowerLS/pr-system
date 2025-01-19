import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface FirebaseAuthError {
  code: string;
  message: string;
}

function isFirebaseAuthError(error: unknown): error is FirebaseAuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as any).code === 'string' &&
    typeof (error as any).message === 'string'
  );
}

// This is a one-time setup function that should be disabled after initial admin setup
export const setupInitialAdmin = functions.https.onRequest(async (req, res) => {
  try {
    const apiKey = req.query.key;
    // Add your API key here - you should disable this function after using it
    const validApiKey = 'setup-initial-admin-key';

    if (apiKey !== validApiKey) {
      res.status(403).json({ error: 'Invalid API key' });
      return;
    }

    const email = req.query.email as string;
    const uid = req.query.uid as string;

    if (!email && !uid) {
      res.status(400).json({ error: 'Either email or uid parameter is required' });
      return;
    }

    let user: admin.auth.UserRecord;
    
    try {
      // Try to get user by email first
      if (email) {
        console.log('Attempting to get user by email:', email);
        user = await admin.auth().getUserByEmail(email);
      } else {
        console.log('Attempting to get user by uid:', uid);
        user = await admin.auth().getUser(uid);
      }
      console.log('Found user:', user.toJSON());
    } catch (error: unknown) {
      if (isFirebaseAuthError(error) && error.code === 'auth/user-not-found') {
        res.status(404).json({ 
          error: 'User not found', 
          details: error.message,
          email,
          uid 
        });
      } else {
        throw error;
      }
      return;
    }
    
    // Set admin claims
    const claims = {
      admin: true,
      procurement: true,
      requester: true
    };

    console.log('Setting claims for user:', user.uid, claims);

    // Update user claims
    await admin.auth().setCustomUserClaims(user.uid, claims);

    // Get the updated user to verify claims were set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('Updated user claims:', updatedUser.customClaims);

    // Update or create user document in Firestore
    await admin.firestore().collection('users').doc(user.uid).set({
      email: user.email,
      firstName: user.displayName?.split(' ')[0] || '',
      lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
      permissionLevel: 1,
      department: 'CEO',
      organization: 'Codeium',
      additionalOrganizations: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ 
      success: true,
      userId: user.uid,
      email: user.email,
      claims: updatedUser.customClaims,
      message: 'Admin user setup complete. Please sign out and sign back in for the changes to take effect.'
    });
  } catch (error: unknown) {
    console.error('Error setting up admin:', error);
    res.status(500).json({ 
      error: 'Failed to setup admin user',
      details: isFirebaseAuthError(error) ? error.message : 'Unknown error',
      code: isFirebaseAuthError(error) ? error.code : 'unknown'
    });
  }
});
