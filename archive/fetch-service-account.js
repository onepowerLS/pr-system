// Get the Firebase service account
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize with application default credentials
admin.initializeApp({
  projectId: 'pr-system-4ea55'
});

async function getServiceAccount() {
  try {
    console.log('Retrieving service account...');
    const serviceAccount = await admin.firestore().collection('_serviceAccount').doc('admin').get();
    
    if (serviceAccount.exists) {
      const data = serviceAccount.data();
      console.log('Service account retrieved successfully');
      fs.writeFileSync('service-account.json', JSON.stringify(data, null, 2));
      console.log('Service account written to service-account.json');
    } else {
      console.log('No service account found');
    }
  } catch (error) {
    console.error('Error retrieving service account:', error);
  }
}

getServiceAccount();
