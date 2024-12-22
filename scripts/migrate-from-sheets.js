import { google } from 'googleapis';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'firebase-service-account.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Google Sheets setup
const sheets = google.sheets('v4');
const SPREADSHEET_ID = '12QgLxtavdCa9FkfTeMDogXA0COYBCxmUZKHDXybOzaU';
const INITIAL_PASSWORD = '1PWR00';

async function getSheetData(auth) {
  try {
    // Get Requestor List
    const requestorResponse = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: 'Requestor List!A:F',
    });
    const requestors = requestorResponse.data.values;
    console.log('Requestor List Headers:', requestors[0]);
    console.log(`Found ${requestors.length - 1} requestors`);

    // Get Master Log
    const masterLogResponse = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: 'Master Log!A:Z',
    });
    const prs = masterLogResponse.data.values;
    console.log('Master Log Headers:', prs[0]);
    console.log(`Found ${prs.length - 1} PRs`);

    return { requestors, prs };
  } catch (err) {
    console.error('Error reading spreadsheet:', err);
    throw err;
  }
}

async function createOrUpdateFirebaseUser(user) {
  try {
    // Skip inactive users
    if (user.active.toUpperCase() !== 'Y') {
      console.log(`Skipping inactive user: ${user.email}`);
      return null;
    }

    try {
      // Try to get existing user first
      const existingUser = await auth.getUserByEmail(user.email);
      console.log(`User ${user.email} exists, resetting password...`);
      
      // Update password for existing user
      await auth.updateUser(existingUser.uid, {
        password: INITIAL_PASSWORD
      });
      
      // Update Firestore data
      await db.collection('users').doc(existingUser.uid).set({
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`Reset password for ${user.email} to: ${INITIAL_PASSWORD}`);
      return existingUser;
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }

      // Create new user if they don't exist
      const userRecord = await auth.createUser({
        email: user.email,
        password: INITIAL_PASSWORD,
        displayName: user.name,
        disabled: false,
      });

      // Store additional user data in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Created new user ${user.email} with initial password: ${INITIAL_PASSWORD}`);
      return userRecord;
    }
  } catch (error) {
    console.error(`Error handling user ${user.email}:`, error);
    throw error;
  }
}

async function migratePRs(prs, userMap) {
  const headers = prs[0]; // First row contains headers
  
  for (let i = 1; i < prs.length; i++) {
    const row = prs[i];
    const pr = {};
    
    // Map columns to PR object
    headers.forEach((header, index) => {
      if (row[index] !== undefined && row[index] !== '') {
        pr[header.toLowerCase().replace(/[^a-z0-9]+/g, '_')] = row[index];
      }
    });

    // Log the first PR to see its structure
    if (i === 1) {
      console.log('\nSample PR structure:', pr);
    }

    try {
      const prData = {
        id: pr.pr_number,
        timestamp: admin.firestore.Timestamp.fromDate(new Date(pr.timestamp)),
        requestor: {
          id: userMap[pr.email] || null,
          name: pr.requestor_name,
          email: pr.email,
          department: pr.requestor_department,
        },
        description: pr.request_short_description,
        projectCategory: pr.project_category,
        organization: pr.acquiring_organization,
        currency: pr.currency,
        paymentFormat: pr.payment_format,
        sites: pr.site_location_s ? pr.site_location_s.split(',').map(s => s.trim()) : [],
        expenseTypes: pr.expense_type_s ? pr.expense_type_s.split(',').map(e => e.trim()) : [],
        context: pr.request_context || '',
        vehicle: pr.vehicle || '',
        budgetApproved: pr.budget_approval_status?.toLowerCase() === 'yes',
        deadline: pr.deadline_date ? admin.firestore.Timestamp.fromDate(new Date(pr.deadline_date)) : null,
        vendor: pr.vendor || '',
        urgency: pr.urgency_status?.toLowerCase() || 'normal',
        approver: pr.approver || '',
        notes: pr.requestor_notes || '',
        status: pr.pr_status?.toUpperCase() || 'DRAFT',
        amount: parseFloat(pr.pr_amount) || 0,
        quotesRequired: pr._3_quotes_required === 'Y',
        controlsOverride: pr.controls_override_y_n === 'Y',
        overrideJustification: pr.override_justification_text || '',
        overrideDate: pr.override_date_date_time ? admin.firestore.Timestamp.fromDate(new Date(pr.override_date_date_time)) : null,
        createdAt: admin.firestore.Timestamp.fromDate(new Date(pr.timestamp)),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date(pr.timestamp)),
      };

      await db.collection('prs').doc(prData.id).set(prData);
      console.log(`Migrated PR ${prData.id}`);
    } catch (error) {
      console.error(`Error migrating PR ${pr.pr_number}:`, error);
    }
  }
}

async function migrate() {
  try {
    // Auth with Google using the credentials file
    const auth = await google.auth.getClient({
      keyFile: path.join(__dirname, '..', 'google-sheets-credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    // Get data from sheets
    const { requestors, prs } = await getSheetData(auth);
    
    // Log the structure before proceeding
    console.log('\nSheet Structure Analysis:');
    console.log('------------------------');
    if (requestors && requestors[0]) {
      console.log('Requestor List Columns:', requestors[0]);
      console.log('Sample Requestor:', requestors[1]);
    }
    if (prs && prs[0]) {
      console.log('Master Log Columns:', prs[0]);
      console.log('Sample PR:', prs[1]);
    }

    // Ask for confirmation before proceeding
    console.log('\nPlease verify the structure above and press Ctrl+C to abort if incorrect');
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second pause

    // Continue with migration...
    console.log('\nProceeding with migration...');
    
    // Create Firebase users and maintain a map of email to uid
    const userMap = {};
    const headers = requestors[0]; // First row contains headers
    
    for (let i = 1; i < requestors.length; i++) {
      const row = requestors[i];
      const user = {
        email: row[headers.indexOf('Email')],
        name: row[headers.indexOf('Name')],
        department: row[headers.indexOf('Department')],
        role: row[headers.indexOf('Role')],
        active: row[headers.indexOf('Active (Y/N)')],
      };

      try {
        const userRecord = await createOrUpdateFirebaseUser(user);
        if (userRecord) {
          userMap[user.email] = userRecord.uid;
        }
      } catch (error) {
        console.error(`Failed to create/update user ${user.email}:`, error);
      }
    }

    // Migrate PRs
    await migratePRs(prs, userMap);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Function to verify a specific user
async function verifyUser(email) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    console.log('User exists:', userRecord.toJSON());
    
    // Get Firestore data
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    console.log('User Firestore data:', userDoc.data());
    
    return userRecord;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// Verify specific user
verifyUser('mso@1pwrafrica.com')
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });

migrate().then(() => process.exit(0));
