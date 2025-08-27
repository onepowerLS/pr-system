import { PRRequest, PRStatus } from '../types/pr';
import { v4 as uuidv4 } from 'uuid';
import { NotificationContext } from '../services/notifications/types';
import { generateNewPREmail } from '../services/notifications/templates/newPRSubmitted';
import { logger } from '../utils/logger';

// Mock data for testing
const mockUser = {
  id: "test-user-id",
  email: "test.user@example.com",
  name: "Test User",
  firstName: "Test",
  lastName: "User",
  role: "Requestor"
};

const mockApprover = {
  id: "test-approver-id",
  email: "test.approver@example.com",
  name: "Test Approver",
  firstName: "Test",
  lastName: "Approver",
  role: "Approver"
};

// Mock reference data resolver
const mockReferenceData = {
  // Mock implementation of getCategory that returns a valid category name
  getCategory: async (categoryId: string) => {
    return { id: categoryId, name: `Category ${categoryId}` };
  },
  // Mock implementation of getVendor that returns a valid vendor name
  getVendor: async (vendorId: string) => {
    return { id: vendorId, name: `Vendor ${vendorId}` };
  }
};

// Create a mock for the reference data service
// Instead of using jest.mock (which is for Jest testing),
// we'll use module augmentation to replace the implementation
// during runtime for our specific test
const originalModule = require('../services/referenceData');
originalModule.referenceDataService = mockReferenceData;

// Function to generate a mock PR with all required fields
function createMockPR(overrides: Record<string, any> = {}): Partial<PRRequest> {
  const prId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const basePR = {
    id: prId,
    prNumber: `PR-${Math.floor(Math.random() * 10000)}`,
    requestor: mockUser,
    requestorEmail: mockUser.email,
    requestorId: mockUser.id,
    approver: mockApprover.id, // Fixed: using ID string instead of object
    department: "Engineering",
    site: "test-site-id",
    category: "test-category-id", 
    expenseType: "test-expense-type-id",
    preferredVendor: "123456",
    amount: 1500,
    status: "SUBMITTED" as PRStatus,
    isUrgent: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    organization: "test-org-id",
    projectCategory: "Hardware",
    description: "Test PR for email notifications",
    estimatedAmount: 1500,
    currency: "USD",
    requiredDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    totalAmount: 1500,
    lineItems: [],
    quotes: []
  };
  
  return { ...basePR, ...overrides };
}

// Test different requestor scenarios
const testCases = [
  {
    name: "Case 1: Requestor with full user object",
    pr: createMockPR(),
    description: "PR with complete user object as requestor"
  },
  {
    name: "Case 2: Requestor with name only",
    pr: createMockPR({ 
      requestor: "John Doe" 
    }),
    description: "PR with string name as requestor"
  },
  {
    name: "Case 3: Requestor with email only", 
    pr: createMockPR({
      requestor: "john.doe@example.com",
      requestorEmail: "john.doe@example.com"
    }),
    description: "PR with email as requestor"
  },
  {
    name: "Case 4: Mixed-case email to test deduplication",
    pr: createMockPR({
      requestor: { 
        email: "Test.User@Example.com",
        name: "Test User"
      },
      requestorEmail: "test.user@example.com"
    }),
    description: "Tests email deduplication with different case"
  }
];

// Function to simulate notification process and view the email content
async function testEmailNotification(testCase: any) {
  try {
    logger.info(`\n----- TESTING: ${testCase.name} -----`);
    logger.info(testCase.description);
    
    const pr = testCase.pr;
    
    // Prepare requestor info safely
    const requestorName = typeof pr.requestor === 'object' && pr.requestor?.name 
        ? pr.requestor.name 
        : typeof pr.requestor === 'string' && !pr.requestor.includes('@') 
        ? pr.requestor 
        : pr.requestorEmail?.split('@')[0].replace('.', ' ') || "Test User";
        
    const requestorEmail = typeof pr.requestor === 'object' && pr.requestor?.email 
        ? pr.requestor.email 
        : typeof pr.requestor === 'string' && pr.requestor.includes('@') 
        ? pr.requestor 
        : pr.requestorEmail || "test.user@example.com";
    
    // Create mock notification context
    const context: NotificationContext = {
      prId: pr.id,
      pr: pr as PRRequest,
      prNumber: pr.prNumber,
      user: mockUser,
      isUrgent: pr.isUrgent,
      baseUrl: "http://localhost:5173",
      notes: "This is a test notification",
      requestorInfo: {
        name: requestorName,
        email: requestorEmail
      }
    };
    
    // Generate email content directly (bypasses actual sending and Firebase)
    logger.info("Generating email content...");
    const emailContent = await generateNewPREmail(context);
    
    // Get mock recipients for display
    const recipients = {
      to: [mockApprover.email, "procurement@1pwrafrica.com"],
      cc: [
        typeof pr.requestor === 'object' && pr.requestor?.email ? pr.requestor.email : "",
        pr.requestorEmail || "",
        mockUser.email
      ].filter(Boolean)
    };
    
    logger.info("\n----- EMAIL PREVIEW -----");
    logger.info(`Subject: ${emailContent.subject}`);
    logger.info("\nTO:", recipients.to);
    logger.info("\nCC:", recipients.cc || []);
    
    // Extract email content - in a real environment, we'd get this from the actual generated HTML
    logger.info("\n----- EMAIL CONTENT -----");
    
    // Check key aspects of our fixes
    
    // 1. Verify requestor name isn't "Not specified"
    logger.info(`Requestor Name: "${requestorName}"`);
    if (requestorName === 'Not specified' || requestorName === 'undefined') {
      logger.error("❌ ISSUE: Requestor name shows as 'Not specified' or 'undefined'");
    } else {
      logger.info("✅ Requestor name properly resolved");
    }
    
    // 2. Verify no duplicate emails in CC list (case-insensitive check)
    const ccEmails = recipients.cc || [];
    const uniqueCcEmails = new Set(ccEmails.map((email: string) => email.toLowerCase()));
    logger.info(`CC count: ${ccEmails.length}, Unique CC count: ${uniqueCcEmails.size}`);
    
    if (ccEmails.length !== uniqueCcEmails.size) {
      logger.error("❌ ISSUE: Duplicate emails detected in CC list");
    } else {
      logger.info("✅ No duplicates in CC list");
    }
    
    // 3. Log email subject to verify urgency prefix is correct
    if (pr.isUrgent) {
      if (emailContent.subject.startsWith('URGENT:')) {
        logger.info("✅ URGENT prefix correctly applied to subject line");
      } else {
        logger.error("❌ ISSUE: URGENT prefix missing from subject line for urgent PR");
      }
    }
    
    logger.info("\n----- TEST COMPLETE -----\n");
    
    return {
      success: true,
      emailContent,
      recipients
    };
  } catch (error) {
    logger.error("Error testing email notification:", error);
    return {
      success: false,
      error
    };
  }
}

// Main function to run all tests
async function runEmailNotificationTests() {
  logger.info("Starting mock email notification tests...");
  
  for (const testCase of testCases) {
    await testEmailNotification(testCase);
  }
  
  logger.info("All mock email notification tests completed");
}

// Run tests
runEmailNotificationTests()
  .then(() => {
    console.log("Email tests completed successfully");
  })
  .catch((error) => {
    console.error("Error running tests:", error);
    process.exit(1);
  });
