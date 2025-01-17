const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function initializePasswords() {
  const DEFAULT_PASSWORD = '1PWR00';
  
  try {
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users in Firestore`);

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const email = userData.email;

      try {
        // Get Firebase Auth user
        const userRecord = await auth.getUserByEmail(email);
        console.log(`Updating password for user: ${email}`);

        // Update password
        await auth.updateUser(userRecord.uid, {
          password: DEFAULT_PASSWORD,
          emailVerified: true
        });

        console.log(`Successfully updated password for ${email}`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          console.log(`Creating new user for ${email}`);
          try {
            await auth.createUser({
              email: email,
              password: DEFAULT_PASSWORD,
              emailVerified: true
            });
            console.log(`Successfully created user for ${email}`);
          } catch (createError) {
            console.error(`Error creating user ${email}:`, createError);
          }
        } else {
          console.error(`Error processing user ${email}:`, error);
        }
      }
    }

    console.log('Password initialization completed');
  } catch (error) {
    console.error('Error initializing passwords:', error);
  } finally {
    process.exit();
  }
}

initializePasswords();
