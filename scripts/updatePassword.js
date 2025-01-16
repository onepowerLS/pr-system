const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

async function updateUserPassword() {
  const email = 'mso@1pwrafrica.com';
  const newPassword = 'password123';

  try {
    // Get the user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log('Found user:', userRecord.uid);

    // Update the password
    await auth.updateUser(userRecord.uid, {
      password: newPassword,
      emailVerified: true
    });

    console.log('Successfully updated user password');
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    process.exit();
  }
}

updateUserPassword();
