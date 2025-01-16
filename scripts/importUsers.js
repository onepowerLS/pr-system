const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function deleteAllUsers() {
  // Delete Firestore users
  const snapshot = await db.collection('users').get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log('Deleted all Firestore users');

  try {
    // Delete Firebase Auth users
    const listUsersResult = await auth.listUsers();
    for (const user of listUsersResult.users) {
      await auth.deleteUser(user.uid);
      console.log(`Deleted auth user: ${user.email}`);
    }
    console.log('Deleted all Firebase Auth users');
  } catch (error) {
    console.error('Error deleting auth users:', error);
  }
}

async function createAuthUser(email, password, displayName) {
  try {
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: displayName
    });
    console.log(`Created auth user: ${email} (${userRecord.uid})`);
    return userRecord;
  } catch (error) {
    console.error(`Error creating auth user ${email}:`, error);
    throw error;
  }
}

async function importUsers() {
  try {
    // First delete all existing users
    await deleteAllUsers();

    const csvPath = path.join(__dirname, '..', 'Personnel.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    });

    const batch = db.batch();
    const specialUsers = {
      'mso@1pwrafrica.com': {
        name: 'Matt Orosz',
        email: 'mso@1pwrafrica.com',
        department: 'CEO',
        organization: {
          name: '1PWR LESOTHO',
          id: '1PWR'
        },
        permissionLevel: 1,
        role: 'ADMIN',
        isActive: true,
        password: 'password123'
      }
    };

    // Create users in Firebase Auth and Firestore
    for (const record of records) {
      const email = record['Email']?.toLowerCase().trim() || 
        `${record['First Name '].toLowerCase().trim()}.${record['Last Name'].toLowerCase().trim()}@1pwrafrica.com`;
      
      // Skip if this is a special user
      if (specialUsers[email]) {
        const specialUser = specialUsers[email];
        
        // Create in Firebase Auth
        const authUser = await createAuthUser(
          specialUser.email,
          specialUser.password,
          specialUser.name
        );

        // Create in Firestore using email as document ID
        const { password, ...firestoreData } = specialUser;
        batch.set(db.collection('users').doc(email), {
          ...firestoreData,
          uid: authUser.uid
        });
        console.log(`Added special Firestore user: ${email}`);
        continue;
      }

      // Create regular user
      const password = 'password123';
      const displayName = `${record['First Name '].trim()} ${record['Last Name'].trim()}`;
      
      // Create in Firebase Auth
      const authUser = await createAuthUser(email, password, displayName);

      // Create in Firestore using email as document ID
      const userData = {
        firstName: record['First Name '].trim(),
        lastName: record['Last Name'].trim(),
        email: email,
        department: record['Department'].trim(),
        organization: record['Organization'].trim(),
        additionalOrganizations: [
          record['Additional Org 1'],
          record['Additional Org 2'],
          record['Additional Org 3'],
          record['Additional Org 4']
        ].filter(org => org && org.trim()),
        permissionLevel: parseInt(record['Permission Level']) || 4,
        isActive: true,
        role: parseInt(record['Permission Level']) === 1 ? 'ADMIN' : 'USER',
        uid: authUser.uid,
        name: displayName
      };

      batch.set(db.collection('users').doc(email), userData);
      console.log(`Added Firestore user: ${displayName} (${email})`);
    }

    await batch.commit();
    console.log('Import completed successfully');
  } catch (error) {
    console.error('Error importing users:', error);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
  } finally {
    process.exit();
  }
}

importUsers();
