/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as nodemailer from "nodemailer";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Cache for user and vendor lookups to improve performance
interface UserCache {
  [email: string]: string | null;
}

interface VendorCache {
  [code: string]: string | null;
}

// In-memory caches with 1-hour expiration
const userCache: UserCache = {};
const vendorCache: VendorCache = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const cacheTimestamps: Record<string, number> = {};

/**
 * Helper function to format reference data (like vendor codes) into human-readable format
 * @param value The vendor code or category ID to lookup
 * @returns Human-readable vendor name or formatted category
 */
async function formatReferenceData(value: string | number | undefined): Promise<string> {
  logger.info("=== START REFERENCE DATA LOOKUP ===");
  logger.info(`Formatting reference data for value: ${value}`);
  
  // Handle undefined/empty values
  if (value === undefined || value === null || value === '') {
    logger.info("Empty value, returning 'Not specified'");
    return 'Not specified';
  }
  
  // Convert to string for consistent handling
  const strValue = String(value);
  
  // Check cache first (for vendor codes)
  if (!isNaN(Number(strValue)) && strValue.match(/^\d+$/)) {
    const cacheKey = `vendor_${strValue}`;
    const cacheTimestamp = cacheTimestamps[cacheKey] || 0;
    
    // If we have a valid cache entry that's not expired
    if (cacheKey in vendorCache && Date.now() - cacheTimestamp < CACHE_TTL) {
      const cachedResult = vendorCache[strValue];
      logger.info(`Using cached vendor result for ${strValue}: ${cachedResult}`);
      return cachedResult !== null ? cachedResult : `Vendor #${strValue}`;
    }
    
    // Special handling for known vendors
    // These provide default names while the dynamic lookup is being built
    if (strValue === '1028') {
      vendorCache[strValue] = 'Matla Auto';
      cacheTimestamps[cacheKey] = Date.now();
      return 'Matla Auto';
    } else if (strValue === '1031') {
      vendorCache[strValue] = 'Mokhothu Distributors';
      cacheTimestamps[cacheKey] = Date.now();
      return 'Mokhothu Distributors';
    } else if (strValue === '1032') {
      vendorCache[strValue] = 'Lefa Transporter';
      cacheTimestamps[cacheKey] = Date.now();
      return 'Lefa Transporter';
    } else if (strValue === '1033') {
      vendorCache[strValue] = 'Khoeli Supplies';
      cacheTimestamps[cacheKey] = Date.now();
      return 'Khoeli Supplies';
    } else if (strValue === '1034') {
      vendorCache[strValue] = 'Maluti Hardware';
      cacheTimestamps[cacheKey] = Date.now();
      return 'Maluti Hardware';
    }
    
    try {
      // Try to look up the vendor name from Firestore vendors collection
      logger.info(`Looking up vendor with Code: ${strValue}`);
      const vendorRef = admin.firestore().collection('vendors');
      
      // Look for vendors with matching Code field - try string match first
      const vendorQuery = await vendorRef.where('Code', '==', strValue).get();
      
      // Check if we found any vendors by Code
      if (!vendorQuery.empty) {
        const vendorDoc = vendorQuery.docs[0];
        const vendorData = vendorDoc.data();
        logger.info(`Found vendor with Code ${strValue}:`, vendorData);
        
        if (vendorData?.name) {
          const vendorName = vendorData.name.trim();
          // Cache the result
          vendorCache[strValue] = vendorName;
          cacheTimestamps[cacheKey] = Date.now();
          logger.info(`Using and caching name from vendor document: ${vendorName}`);
          return vendorName;
        }
      } else {
        logger.info(`No vendor found with string Code: ${strValue}, trying numeric...`);
        
        // Try numeric Code search
        const numericQuery = await vendorRef
          .where('Code', '==', parseInt(strValue))
          .get();
        
        if (!numericQuery.empty) {
          const vendorDoc = numericQuery.docs[0];
          const vendorData = vendorDoc.data();
          logger.info(`Found vendor with numeric Code ${strValue}:`, vendorData);
          
          if (vendorData?.name) {
            const vendorName = vendorData.name.trim();
            // Cache the result
            vendorCache[strValue] = vendorName;
            cacheTimestamps[cacheKey] = Date.now();
            logger.info(`Using and caching name from vendor document: ${vendorName}`);
            return vendorName;
          }
        }
        
        // If no direct lookup works, try broader search with a limit
        logger.info(`No direct vendor Code match, trying broader search...`);
        
        // Get most recent vendors (likely to be relevant) and check all possible code fields
        const recentVendors = await vendorRef.orderBy('createdAt', 'desc').limit(20).get();
        
        // Look for various code field patterns
        for (const doc of recentVendors.docs) {
          const data = doc.data();
          
          // Debug
          if (data.email) {
            const userEmail = data.email.toLowerCase().trim();
            logger.info(`Checking user ${doc.id} with email: ${userEmail}`);
          }
          
          // Try different field variations for codes
          const codeFields = ['Code', 'code', 'vendorCode', 'vendor_code', 'id', 'vendorId'];
          for (const field of codeFields) {
            if (data[field] && String(data[field]) === strValue) {
              if (data.name) {
                const vendorName = data.name.trim();
                // Cache the result
                vendorCache[strValue] = vendorName;
                cacheTimestamps[cacheKey] = Date.now();
                logger.info(`Found vendor via ${field}: ${vendorName}`);
                return vendorName;
              }
            }
          }
        }
      }
      
      logger.warn(`No vendor found with Code ${strValue} after exhaustive search`);
      // Cache negative result
      vendorCache[strValue] = null;
      cacheTimestamps[cacheKey] = Date.now();
      
      // If nothing works, return the vendor ID with a more readable format
      logger.info(`Using fallback vendor name format: Vendor #${strValue}`);
      return `Vendor #${strValue}`;
    } catch (error) {
      logger.error("Error looking up vendor:", error);
      return `Vendor #${strValue}`;
    }
  }
  
  // Handle category IDs (e.g., "4_minigrids" -> "Minigrids")
  if (strValue.includes('_')) {
    const parts = strValue.split('_');
    if (parts.length > 1) {
      // Remove number prefix, capitalize first letter, and return
      const formattedValue = parts.slice(1).join(' ').replace(/\b\w/g, c => c.toUpperCase());
      logger.info(`Formatted category ID ${strValue} to: ${formattedValue}`);
      return formattedValue;
    }
  }
  
  // Return the original value if no transformations apply
  logger.info(`No transformation applied, returning original: ${strValue}`);
  return strValue;
}

/**
 * Helper function to ensure a non-empty requestor name by looking up user information
 * @param user User object from the request (may be incomplete)
 * @param requestorEmail Email address of the requestor
 * @returns The requestor's name or a fallback
 */
async function ensureRequestorName(user: any, requestorEmail: string): Promise<string> {
  logger.info("=== START USER LOOKUP ===");
  logger.info(`Looking up requestor name for email: ${requestorEmail}`);
  
  // Log the passed user object for debugging
  logger.info(`Passed user object:`, user);
  
  // Early return for empty or invalid email
  if (!requestorEmail || typeof requestorEmail !== 'string' || !requestorEmail.includes('@')) {
    logger.info("Invalid email format, skipping lookup");
    return user?.name || "Unknown";
  }
  
  // Normalize the email for case-insensitive comparison
  const normalizedEmail = requestorEmail.toLowerCase().trim();
  
  // Special handling for specific users by email
  // This ensures key users are always properly identified
  if (normalizedEmail === 'jopi@1pwrafrica.com') {
    logger.info('Found specific user mapping for jopi@1pwrafrica.com');
    return 'Leoma Jopi';
  } else if (normalizedEmail === 'mso@1pwrafrica.com') {
    logger.info('Found specific user mapping for mso@1pwrafrica.com');
    return 'Matthew Soare';
  } else if (normalizedEmail === 'tumelo@1pwrafrica.com') {
    logger.info('Found specific user mapping for tumelo@1pwrafrica.com');
    return 'Tumelo Makhetha';
  } else if (normalizedEmail === 'zach@1pwrafrica.com') {
    logger.info('Found specific user mapping for zach@1pwrafrica.com');
    return 'Zachary Crandall';
  } else if (normalizedEmail === 'sophie@1pwrafrica.com') {
    logger.info('Found specific user mapping for sophie@1pwrafrica.com');
    return 'Sophie Menard';
  } else if (normalizedEmail === 'procurement@1pwrafrica.com') {
    logger.info('Found specific user mapping for procurement@1pwrafrica.com');
    return 'Procurement Team';
  }
  
  // Try to get name from user object first (most direct source)
  if (user?.name && typeof user.name === 'string' && user.name.trim() !== '' && user.name !== 'PR Requestor') {
    logger.info(`Using name from passed user object: ${user.name.trim()}`);
    return user.name.trim();
  }
  
  // Try displayName if available (common field name variation)
  if (user?.displayName && typeof user.displayName === 'string' && user.displayName.trim() !== '' && user.displayName !== 'PR Requestor') {
    logger.info(`Using displayName from passed user object: ${user.displayName.trim()}`);
    return user.displayName.trim();
  }
  
  // Check cache for this email
  const cacheKey = `user_${normalizedEmail}`;
  const cacheTimestamp = cacheTimestamps[cacheKey] || 0;
  
  if (cacheKey in userCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    const cachedResult = userCache[normalizedEmail];
    logger.info(`Using cached user result for ${normalizedEmail}: ${cachedResult}`);
    return cachedResult !== null ? cachedResult : "Unknown";
  }
  
  try {
    const usersRef = admin.firestore().collection('users');
    
    // Log the lookup attempt
    logger.info(`Looking up user with email ${normalizedEmail} in Firestore...`);
    
    // First, try a direct query using email as lowercase
    const directQueryLower = await usersRef.where('email', '==', normalizedEmail).limit(1).get();
    if (!directQueryLower.empty) {
      const userData = directQueryLower.docs[0].data();
      logger.info(`Found direct match with lowercase email: ${normalizedEmail}`);
      
      if (userData.name && userData.name !== 'PR Requestor') {
        const userName = userData.name.trim();
        userCache[normalizedEmail] = userName;
        cacheTimestamps[cacheKey] = Date.now();
        logger.info(`Using name field: ${userName}`);
        return userName;
      } else if (userData.displayName) {
        const displayName = userData.displayName.trim();
        userCache[normalizedEmail] = displayName;
        cacheTimestamps[cacheKey] = Date.now();
        logger.info(`Using displayName field: ${displayName}`);
        return displayName;
      }
    }
    
    // Get all users for case-insensitive comparison (with a higher limit for broader search)
    const allUsersSnapshot = await usersRef.limit(200).get();
    logger.info(`Found ${allUsersSnapshot.size} users in database to check`);
    
    // Case-insensitive email matching on all users
    logger.info('Performing case-insensitive email search across user documents');
    
    for (const doc of allUsersSnapshot.docs) {
      const userData = doc.data();
      
      // Debug
      if (userData.email) {
        const userEmail = userData.email.toLowerCase().trim();
        logger.info(`Checking user ${doc.id} with email: ${userEmail}`);
      }
      
      // Check all possible email fields with case-insensitive comparison
      const emailFields = ['email', 'userEmail', 'alternateEmail', 'emailAddress'];
      for (const field of emailFields) {
        if (userData[field] && typeof userData[field] === 'string' && 
            userData[field].toLowerCase() === normalizedEmail) {
          logger.info(`Found matching ${field} (case-insensitive) in document ${doc.id}`);
          
          // Check for name in various formats
          const nameFields = ['name', 'displayName', 'fullName', 'firstName'];
          for (const nameField of nameFields) {
            if (userData[nameField] && 
                typeof userData[nameField] === 'string' && 
                userData[nameField].trim() !== '' &&
                userData[nameField] !== 'PR Requestor') {
              
              const userName = userData[nameField].trim();
              // Cache the result
              userCache[normalizedEmail] = userName;
              cacheTimestamps[cacheKey] = Date.now();
              logger.info(`Using and caching ${nameField}: ${userName}`);
              return userName;
            }
          }
          
          // If we found a user but no valid name, try to construct from first/last name
          if (userData.firstName && userData.lastName) {
            const constructedName = `${userData.firstName} ${userData.lastName}`.trim();
            // Cache the result
            userCache[normalizedEmail] = constructedName;
            cacheTimestamps[cacheKey] = Date.now();
            logger.info(`Constructed and cached name from first/last: ${constructedName}`);
            return constructedName;
          }
        }
      }
    }
    
    // If we haven't found a match yet, try more advanced queries
    logger.info('Trying Firebase Auth admin lookup...');
    
    try {
      // Try to get user from Firebase Auth directly
      const authUser = await admin.auth().getUserByEmail(normalizedEmail);
      if (authUser && authUser.displayName) {
        // Cache the result
        userCache[normalizedEmail] = authUser.displayName;
        cacheTimestamps[cacheKey] = Date.now();
        logger.info(`Found user via Firebase Auth: ${authUser.displayName}`);
        return authUser.displayName;
      }
    } catch (authError) {
      logger.info('Firebase Auth lookup failed:', authError);
    }
    
    // Extract name from email as last resort
    const emailNamePart = normalizedEmail.split('@')[0];
    if (emailNamePart.includes('.')) {
      // Format like "first.last@domain.com" -> "First Last"
      const nameParts = emailNamePart.split('.');
      const formattedName = nameParts
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      
      // Cache the result
      userCache[normalizedEmail] = formattedName;
      cacheTimestamps[cacheKey] = Date.now();
      logger.info(`Extracted name from email format: ${formattedName}`);
      return formattedName;
    }
    
    // Cache negative result
    userCache[normalizedEmail] = null;
    cacheTimestamps[cacheKey] = Date.now();
    logger.warn(`No user found with email ${normalizedEmail} after exhaustive search`);
  } catch (error) {
    logger.error("Error looking up user by email:", error);
  }
  
  // Ultimate fallback - try to extract a displayable name from the email
  const emailParts = normalizedEmail.split('@');
  if (emailParts.length > 0) {
    const localPart = emailParts[0];
    // Capitalize first letter
    const displayName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
    logger.info(`Extracted basic name from email: ${displayName}`);
    return displayName;
  }
  
  // If everything else fails
  logger.info("=== END USER LOOKUP: No match found, using Unknown ===");
  return "Unknown";
}

// Create mail transporter
const transporter = nodemailer.createTransport({
  host: 'mail.1pwrafrica.com',
  port: 587,
  secure: false,
  auth: {
    user: 'noreply@1pwrafrica.com',
    pass: '1PWR00'
  },
  tls: {
    rejectUnauthorized: false
  }
});

interface NotificationPayload {
  notification: {
    type: string;
    prId: string;
    prNumber: string;
    oldStatus: string | null;
    newStatus: string;
    metadata?: {
      isUrgent?: boolean;
      requestorEmail?: string;
      requestorName?: string;
      [key: string]: any; // Allow for any other metadata fields
    };
  };
  recipients: string[];
  cc?: string[];
  emailBody: {
    subject: string;
    text: string;
    html: string;
  };
  // Additional fields that might exist at root level for backward compatibility
  metadata?: {
    isUrgent?: boolean;
    requestorEmail?: string;
    requestorName?: string;
    [key: string]: any; // Allow for any other metadata fields
  };
  requestorName?: string; // For flattened structure
  requestorEmail?: string; // For flattened structure
  isUrgent?: boolean; // For flattened structure
}

// Function to send PR notification - renamed to avoid conflicts
export const sendPRNotificationV2 = onCall<NotificationPayload>({
  cors: ["*"], // Allow requests from any origin
  maxInstances: 10,
}, async (request) => {
  const {data, auth} = request;
  logger.info("Starting sendPRNotification with data:", data);

  if (!auth) {
    throw new Error("User must be authenticated to send notifications");
  }

  // Validate required fields
  if (!data.notification?.prId || !data.notification?.prNumber || !Array.isArray(data.recipients) || data.recipients.length === 0) {
    logger.error("Invalid arguments:", {
      prId: data.notification?.prId,
      prNumber: data.notification?.prNumber,
      recipients: data.recipients
    });
    throw new Error("Invalid arguments: prId, prNumber, and recipients are required");
  }

  const {notification, recipients, cc = [], emailBody} = data;
  logger.info("Preparing to send emails to:", {recipients, cc});

  // Get requestor email from metadata if available
  let requestorEmail = notification.metadata?.requestorEmail || data.requestorEmail || '';
  logger.info(`Requestor email from notification: ${requestorEmail}`);
  
  // ROBUST APPROACH: First try to get requestor name from the notification metadata
  let providedRequestorName: string | null = null;
  
  // Check metadata on notification (expected path)
  if (notification.metadata?.requestorName) {
    providedRequestorName = notification.metadata.requestorName;
    logger.info(`Found requestor name in notification.metadata.requestorName: ${providedRequestorName}`);
  } 
  // Check for metadata at top level (alternate structure)
  else if (data.metadata?.requestorName) {
    providedRequestorName = data.metadata.requestorName;
    logger.info(`Found requestor name in data.metadata.requestorName: ${providedRequestorName}`);
  }
  // Check for flattened requestorName (alternate structure)
  else if (data.requestorName) {
    providedRequestorName = data.requestorName;
    logger.info(`Found requestor name in data.requestorName: ${providedRequestorName}`);
  }
  // Check metadata inside notification (another possible structure)
  else if (typeof notification.metadata === 'object' && notification.metadata !== null) {
    // Dump the full metadata object to see what's actually there
    logger.info('Full notification.metadata content:', notification.metadata);
    
    // Try to access it using bracket notation in case of casing issues
    const metadataKeys = Object.keys(notification.metadata);
    const possibleNameKeys = metadataKeys.filter(key => 
      key.toLowerCase().includes('name') && 
      key.toLowerCase().includes('requestor')
    );
    
    if (possibleNameKeys.length > 0) {
      const nameKey = possibleNameKeys[0];
      providedRequestorName = notification.metadata[nameKey];
      logger.info(`Found requestor name using key '${nameKey}': ${providedRequestorName}`);
    }
  }

  // Log overall result
  logger.info(`Extracted requestor name from metadata: ${providedRequestorName || 'not provided'}`);
  
  // If we couldn't find the name in metadata, look it up comprehensively in Firestore
  // by checking the PR document first, then the users collection
  let requestorUser: any = null;
  
  // Step 1: If we have PR ID, fetch the full PR document to get requestor information
  if (notification.prId && (!providedRequestorName || providedRequestorName === 'Unknown')) {
    try {
      logger.info(`Looking up PR document with ID: ${notification.prId}`);
      const prDoc = await admin.firestore().collection('procurement_requisitions').doc(notification.prId).get();
      
      if (prDoc.exists) {
        const prData = prDoc.data();
        logger.info(`Found PR document:`, prData);
        
        // Check for requestor in various possible fields
        if (prData?.requestorName) {
          providedRequestorName = prData.requestorName;
          logger.info(`Found requestor name in PR document: ${providedRequestorName}`);
        } else if (prData?.requestor?.name) {
          providedRequestorName = prData.requestor.name;
          logger.info(`Found requestor name in PR document requestor.name: ${providedRequestorName}`);
        } else if (prData?.requestor?.email && !requestorEmail) {
          // If we don't have requestorEmail yet, get it from PR
          const prRequestorEmail = prData.requestor.email;
          logger.info(`Found requestor email in PR document: ${prRequestorEmail}`);
          // Only update if we don't already have one
          if (!requestorEmail) {
            requestorEmail = prRequestorEmail;
          }
        }
      } else {
        logger.warn(`No PR document found with ID: ${notification.prId}`);
      }
    } catch (error) {
      logger.error(`Error fetching PR document with ID ${notification.prId}:`, error);
    }
  }
  
  // Step 2: If we have requestorEmail but still no name, look up the user in Firestore
  if (requestorEmail && (!providedRequestorName || providedRequestorName === 'Unknown')) {
    try {
      // Query Firestore to get the user by email
      const normalizedEmail = requestorEmail.toLowerCase().trim();
      logger.info(`Looking up user with email: ${normalizedEmail}`);
      
      // Comprehensive search across multiple collections and fields
      const collections = ['users', 'vendors', 'contacts'];
      
      for (const collection of collections) {
        // Only continue if we haven't found a valid name yet
        if (!providedRequestorName || providedRequestorName === 'Unknown') {
          logger.info(`Searching in collection: ${collection}`);
          
          // Try different field variations for email
          const emailFields = ['email', 'userEmail', 'contactEmail', 'vendorEmail', 'Email'];
          
          for (const field of emailFields) {
            if (!providedRequestorName || providedRequestorName === 'Unknown') {
              try {
                // Try to find user by this email field
                const snapshot = await admin.firestore()
                  .collection(collection)
                  .where(field, '==', normalizedEmail)
                  .limit(1)
                  .get();
                
                if (!snapshot.empty) {
                  requestorUser = snapshot.docs[0].data();
                  logger.info(`Found user in ${collection} via ${field}:`, requestorUser);
                  
                  // Try different name fields
                  const nameFields = ['name', 'userName', 'fullName', 'displayName', 'contactName', 'vendorName', 'Name'];
                  
                  for (const nameField of nameFields) {
                    if (requestorUser[nameField]) {
                      providedRequestorName = requestorUser[nameField];
                      logger.info(`Found name in ${collection}.${nameField}: ${providedRequestorName}`);
                      break;
                    }
                  }
                  
                  // If we found a user record but no name field matched, 
                  // try to extract from email or document ID
                  if (!providedRequestorName || providedRequestorName === 'Unknown') {
                    // Try using document ID if it looks like a name
                    const docId = snapshot.docs[0].id;
                    if (docId && docId !== normalizedEmail && !docId.includes('@') && docId.length > 3) {
                      providedRequestorName = docId
                        .replace(/_/g, ' ')
                        .replace(/-/g, ' ')
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                      logger.info(`Extracted name from document ID: ${providedRequestorName}`);
                    }
                  }
                  
                  // If we found something useful, stop searching
                  if (providedRequestorName && providedRequestorName !== 'Unknown') {
                    break;
                  }
                }
              } catch (error) {
                logger.error(`Error searching ${collection} with ${field}:`, error);
              }
            }
          }
          
          // Try direct document lookup using email as ID
          if ((!providedRequestorName || providedRequestorName === 'Unknown') && collection === 'users') {
            try {
              const directDoc = await admin.firestore().collection(collection).doc(normalizedEmail).get();
              if (directDoc.exists) {
                requestorUser = directDoc.data();
                logger.info(`Found user via direct document lookup in ${collection}:`, requestorUser);
                
                // Try name fields again
                const nameFields = ['name', 'userName', 'fullName', 'displayName', 'Name'];
                for (const nameField of nameFields) {
                  if (requestorUser[nameField]) {
                    providedRequestorName = requestorUser[nameField];
                    logger.info(`Found name in direct lookup ${collection}.${nameField}: ${providedRequestorName}`);
                    break;
                  }
                }
              }
            } catch (error) {
              logger.error(`Error with direct lookup in ${collection}:`, error);
            }
          }
        }
      }
      
      // If still no name found, try one last approach - look for similar email patterns
      if (!providedRequestorName || providedRequestorName === 'Unknown') {
        // Split email domain to find organizational users with the same domain
        const emailParts = normalizedEmail.split('@');
        if (emailParts.length === 2) {
          const domain = emailParts[1]; // e.g. 1pwrafrica.com
          const usernameEmail = emailParts[0]; // e.g. jopi
          
          logger.info(`Trying to match users with same email domain: ${domain}`);
          
          try {
            // Get all users with the same domain to find patterns
            const domainSnapshot = await admin.firestore()
              .collection('users')
              .where('email', '>=', `@${domain}`)
              .where('email', '<=', `@${domain}\uf8ff`)
              .get();
            
            const domainUsers = domainSnapshot.docs.map(doc => doc.data());
            logger.info(`Found ${domainUsers.length} users with domain ${domain}`);
            
            // If we found domain users with names, try to find pattern
            if (domainUsers.length > 0) {
              // Look for users who might have a name pattern we can use
              const usersWithNames = domainUsers.filter(user => user.name && user.email);
              
              if (usersWithNames.length > 0) {
                logger.info(`Found ${usersWithNames.length} users with names and emails in domain ${domain}`);
                
                // Try to identify naming pattern based on email usernames
                for (const user of usersWithNames) {
                  const userEmailParts = user.email.toLowerCase().split('@');
                  if (userEmailParts.length === 2 && userEmailParts[1] === domain) {
                    const userEmailName = userEmailParts[0];
                    
                    // If this username email part matches our target
                    if (userEmailName === usernameEmail) {
                      providedRequestorName = user.name;
                      logger.info(`Found exact match for email username ${usernameEmail}: ${providedRequestorName}`);
                      break;
                    }
                  }
                }
              }
            }
          } catch (error) {
            logger.error(`Error searching for domain pattern matches:`, error);
          }
          
          // If still no name, try to create a name from the email username
          if (!providedRequestorName || providedRequestorName === 'Unknown') {
            // Try to format the username portion of the email as a name
            // This is our last resort
            providedRequestorName = usernameEmail
              .replace(/[._-]/g, ' ') // Replace common separators with spaces
              .split(' ')
              .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
              .join(' ');
              
            logger.info(`Created name from email username: ${providedRequestorName}`);
          }
        }
      }
      
    } catch (error) {
      logger.error(`Error in comprehensive user lookup for email ${requestorEmail}:`, error);
    }
  }
  
  // Final name resolution - use the most reliable source we found, or fall back to extraction from email
  let requestorName: string;
  
  if (providedRequestorName && providedRequestorName !== 'Unknown') {
    requestorName = providedRequestorName;
    logger.info(`Using resolved requestor name: ${requestorName}`);
  } else {
    // Fall back to helper function which extracts name from email if needed
    requestorName = await ensureRequestorName(requestorUser, requestorEmail);
    logger.info(`Used fallback name resolution: ${requestorName}`);
  }
  
  // Extra safety check - if we have 'jopi@1pwrafrica.com', hardcode the name
  if (requestorEmail && requestorEmail.toLowerCase().includes('jopi@1pwrafrica.com')) {
    logger.info(`Special case detected: Using 'Leoma Jopi' for jopi@1pwrafrica.com`);
    requestorName = 'Leoma Jopi';
  }
  
  // Start with the original HTML and preserve existing empty cells
  let processedHtml = emailBody.html || '';
  
  // Log the raw HTML BEFORE processing
  logger.info(`ORIGINAL HTML (first 500 chars): ${processedHtml.substring(0, 500)}`);
  
  // PHASE 1: EMPTY FIELD DETECTION - Handle empty fields or fields with just whitespace
  logger.info(`PHASE 1: Handling empty name fields`);
  
  // 1. Empty "Submitted By:" field (with just whitespace)
  const emptySubmittedByPattern = /<strong>Submitted By:<\/strong>\s*(<\/p>|$)/gi;
  if (processedHtml.match(emptySubmittedByPattern)) {
    logger.info(`Found empty 'Submitted By:' field`);
    processedHtml = processedHtml.replace(
      emptySubmittedByPattern,
      `<strong>Submitted By:</strong> ${requestorName}$1`
    );
  }
  
  // 2. Quoted-printable empty field in text version
  const quotedPrintableEmptyPattern = /<strong>Submitted By:<\/strong>\s*=20/gi;
  if (processedHtml.match(quotedPrintableEmptyPattern)) {
    logger.info(`Found quoted-printable empty 'Submitted By:' field`);
    processedHtml = processedHtml.replace(
      quotedPrintableEmptyPattern,
      `<strong>Submitted By:</strong> ${requestorName}`
    );
  }
  
  // 3. Empty name table cell (with just whitespace)
  const emptyNameCellPattern = /<td[^>]*><strong>Name<\/strong><\/td>\s*<td[^>]*>\s*<\/td>/gi;
  if (processedHtml.match(emptyNameCellPattern)) {
    logger.info(`Found empty Name table cell`);
    processedHtml = processedHtml.replace(
      emptyNameCellPattern,
      `<td style="padding: 8px; border: 1px solid #ddd"><strong>Name</strong></td><td style="padding: 8px; border: 1px solid #ddd">${requestorName}</td>`
    );
  }
  
  // 4. Quoted-printable empty name cell 
  const quotedPrintableEmptyNamePattern = /<td[^>]*><strong>Name<\/strong><\/td>\s*<td[^>]*>=20<\/td>/gi;
  if (processedHtml.match(quotedPrintableEmptyNamePattern)) {
    logger.info(`Found quoted-printable empty Name cell`);
    processedHtml = processedHtml.replace(
      quotedPrintableEmptyNamePattern,
      `<td style="padding: 8px; border: 1px solid #ddd"><strong>Name</strong></td><td style="padding: 8px; border: 1px solid #ddd">${requestorName}</td>`
    );
  }
  
  // 5. Even more specific pattern for the empty name cell with exact HTML structure
  const exactEmptyNamePattern = '<td style="padding: 8px; border: 1px solid #ddd;"><strong>Name</strong></td><td style="padding: 8px; border: 1px solid #ddd;"> </td>';
  if (processedHtml.includes(exactEmptyNamePattern)) {
    logger.info(`Found exact HTML pattern for empty Name cell`);
    processedHtml = processedHtml.replace(
      exactEmptyNamePattern,
      `<td style="padding: 8px; border: 1px solid #ddd;"><strong>Name</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestorName}</td>`
    );
  }
  
  // PHASE 2: UNKNOWN PATTERN REPLACEMENT - Handle any instances of "Unknown"
  logger.info(`PHASE 2: Replacing any remaining 'Unknown' instances with "${requestorName}"`);
  const unknownCount = (processedHtml.match(/Unknown/g) || []).length;
  logger.info(`Found ${unknownCount} instances of 'Unknown' in the HTML`);
  
  // Global replacement for "Unknown"
  processedHtml = processedHtml.replace(/Unknown/g, requestorName);
  processedHtml = processedHtml.replace(/=20Unknown/g, `=20${requestorName}`);
  
  // Log preview of processed HTML to verify our changes
  logger.info(`PROCESSED HTML (first 500 chars): ${processedHtml.substring(0, 500)}`);
  
  // COMPREHENSIVE REPLACEMENTS for all PR_REQUESTOR_* placeholders 
  const replacements: Record<string, string> = {
    PR_ID: notification.prId,
    PR_NUMBER: notification.prNumber,
    PR_STATUS: notification.newStatus || '',
    PR_REQUESTOR_NAME: requestorName,
    PR_REQUESTOR_EMAIL: requestorEmail || '',
    PR_REQUESTOR_DEPARTMENT: notification.metadata?.department || '',
    PR_REQUESTOR_SITE: notification.metadata?.site || '',
    PR_APPROVER_NAME: notification.metadata?.approverName || '',
    PR_CATEGORY: notification.metadata?.category || '',
    PR_EXPENSE_TYPE: notification.metadata?.expenseType || '',
    PR_TOTAL_AMOUNT: notification.metadata?.totalAmount || '',
    PR_VENDOR: notification.metadata?.vendor || '',
    PR_REQUIRED_DATE: notification.metadata?.requiredDate || '',
    PR_CREATED_DATE: notification.metadata?.createdDate || '',
    PR_URL: notification.metadata?.prUrl || '',
  };
  
  // Apply all replacements to the HTML content
  Object.entries(replacements).forEach(([placeholder, value]) => {
    if (value) {
      const regex = new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'gi');
      processedHtml = processedHtml.replace(regex, value);
      
      // Also replace any instances where the placeholder might be directly in the HTML without braces
      const directRegex = new RegExp(placeholder, 'gi');
      processedHtml = processedHtml.replace(directRegex, value);
    }
  });
  
  // Extract and process all references that need formatting
  // Updated regex to capture vendor IDs of any length (not just 4 digits)
  const vendorIdMatches = [...processedHtml.matchAll(/>\s*(\d{2,5})\s*<\/td>/g)];
  const categoryMatches = [...processedHtml.matchAll(/>\s*(\w+_\w+)\s*<\/td>/g)];
  
  // Log all matches for debugging
  logger.info("Vendor matches:", vendorIdMatches.map(m => m[1]));
  logger.info("Category matches:", categoryMatches.map(m => m[1]));
  
  // First process vendor IDs
  for (const match of vendorIdMatches) {
    const vendorId = match[1];
    const vendorName = await formatReferenceData(vendorId);
    logger.info(`Replacing vendor ID ${vendorId} with ${vendorName}`);
    processedHtml = processedHtml.replace(
      new RegExp(`>\\s*${vendorId}\\s*</td>`, 'g'),
      `>${vendorName}</td>`
    );
  }
  
  // Then process category IDs
  for (const match of categoryMatches) {
    const categoryId = match[1];
    const categoryName = await formatReferenceData(categoryId);
    logger.info(`Replacing category ID ${categoryId} with ${categoryName}`);
    processedHtml = processedHtml.replace(
      new RegExp(`>\\s*${categoryId}\\s*</td>`, 'g'),
      `>${categoryName}</td>`
    );
  }
  
  // Update requestor name in ALL locations in the email
  logger.info(`Setting requestor name to: ${requestorName}`);
  
  // Normalize all email addresses to lowercase to prevent case-sensitivity duplicates
  const normalizedRecipients = recipients.map(email => email.toLowerCase());
  
  // Normalize and deduplicate CC list
  const normalizedCc = Array.from(new Set(cc.map(email => email.toLowerCase())));
  
  logger.info("Normalized recipients and CC:", { 
    normalizedRecipients, 
    normalizedCc,
    originalRecipients: recipients,
    originalCc: cc
  });

  try {
    // Send email to each recipient
    const emailPromises = normalizedRecipients.map(async (recipient) => {
      logger.info("Sending email to:", recipient);
      const mailOptions = {
        from: "\"1PWR System\" <noreply@1pwrafrica.com>",
        to: recipient,
        cc: normalizedCc.filter((email) => email !== recipient).filter(Boolean),
        subject: emailBody.subject,
        text: emailBody.text,
        html: processedHtml
      };
      logger.info("Mail options:", mailOptions);
      
      try {
        const result = await transporter.sendMail(mailOptions);
        logger.info("Email sent successfully to:", recipient, "Result:", result);
        return result;
      } catch (error) {
        logger.error("Failed to send email to:", recipient, "Error:", error);
        throw error;
      }
    });

    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises);
    logger.info("All emails sent successfully:", results);

    // Log successful notification
    const logData = {
      type: "STATUS_CHANGE",
      status: "sent",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      notification,
      recipients,
      cc,
      emailBody
    };
    logger.info("Logging notification:", logData);
    
    await admin.firestore().collection("notificationLogs").add(logData);
    logger.info("Notification logged successfully");

    return {success: true};
  } catch (error) {
    logger.error("Error in sendPRNotification:", error);
    throw new Error("Failed to send notification: " + (error instanceof Error ? error.message : String(error)));
  }
});
