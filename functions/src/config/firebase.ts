import * as admin from 'firebase-admin';

// Initialize Firebase Admin
const app = admin.initializeApp();

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export const FieldValue = admin.firestore.FieldValue;

export default app;
