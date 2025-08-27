import { doc, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { NotificationContext, EmailContent } from "@/services/notifications/types";
import { generateNewPREmail } from "@/services/notifications/templates";
import { submitPRNotification } from "@/services/notifications/handlers/submitPRNotification";
import { logger } from "@/utils/logger";
import { PRRequest, PRStatus, UserReference } from "@/types/pr";

// Mock data for testing
const mockUser: UserReference = {
  id: "test-user-id",
  email: "test.user@example.com",
  name: "Test User",
  firstName: "Test",
  lastName: "User",
  role: "Requestor"
};

const mockApprover: UserReference = {
  id: "test-approver-id",
  email: "test.approver@example.com",
  name: "Test Approver",
  firstName: "Test",
  lastName: "Approver",
  role: "Approver"
};

const mockDepartment = "Engineering";
const mockSite = "test-site-id"; // Will be resolved from reference data
const mockCategory = "test-category-id"; // Will be resolved from reference data
const mockExpenseType = "test-expense-type-id"; // Will be resolved from reference data
const mockVendor = "123456"; // Numeric ID to test vendor resolution

// Function to generate a mock PR with all required fields
function createMockPR(overrides = {}): Partial<PRRequest> {
  const prId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const basePR = {
    id: prId,
    prNumber: `PR-${Math.floor(Math.random() * 10000)}`,
    requestorEmail: mockUser.email,
    requestorId: mockUser.id,
    department: mockDepartment,
    site: mockSite,
    category: mockCategory, 
    expenseType: mockExpenseType,
    preferredVendor: mockVendor,
    status: PRStatus.SUBMITTED,
    isUrgent: true,
    totalAmount: 1000,
    currency: "USD",
    notes: "Test PR for notification testing",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  
  // Add requestor separately to avoid TypeScript errors
  const prWithRequestor = {
    ...basePR,
    requestor: mockUser,
    ...overrides
  };
  
  return prWithRequestor;
}

// Test function for email name formatting
export async function testEmailNameFormatting(testEmail = "jopi.leoma@example.com"): Promise<{success: boolean, message: string, data?: any}> {
  try {
    // Create a mock PR with a test email that has no user record
    const testPR = createMockPR({
      requestorEmail: testEmail,
      requestor: {
        id: "test-user-id",
        email: testEmail,
        name: "",  // Leave empty to test our name formatting logic
      } as UserReference,
      department: "asset_management",
      site: "ha_makebe"
    });
    
    // Create notification context
    const context: NotificationContext = {
      pr: testPR as any,
      prId: testPR.id as string,
      prNumber: testPR.prNumber as string,
      requestorInfo: {
        name: "",  // Leave empty to test our name formatting logic
        email: testEmail
      },
      metadata: {
        isUrgent: true
      }
    };
    
    // Generate email content
    const emailContent = await generateNewPREmail(context);
    
    // Log the email content to check if our name formatting is working
    logger.info("Generated email for test:", {
      testEmail,
      subject: emailContent.subject,
      html: emailContent.html.substring(0, 500) + "..." // Log first 500 chars to avoid huge logs
    });
    
    // Generate the expected formatted name from the email
    const expectedName = testEmail
      .split('@')[0]                 // Get the part before @
      .replace(/\./g, ' ')           // Replace dots with spaces
      .replace(/^(.)|\s+(.)/g,       // Capitalize first letter and letters after spaces
        (match: string) => match.toUpperCase());
    
    const nameInEmail = emailContent.html.includes(expectedName);
    const unknownInEmail = emailContent.html.includes("Unknown");
    
    const result = {
      email: testEmail,
      expectedFormattedName: expectedName,
      containsFormattedName: nameInEmail,
      containsUnknown: unknownInEmail,
      success: nameInEmail && !unknownInEmail
    };
    
    logger.info("Email content check:", result);
    
    return {
      success: result.success,
      message: result.success 
        ? `Success! Email contains the correctly formatted name '${expectedName}' and no 'Unknown' placeholders.`
        : `Test failed. Email either doesn't contain '${expectedName}' or still contains 'Unknown'.`,
      data: result
    };
  } catch (error) {
    logger.error("Error testing email name formatting:", {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Export the test functions
export const testEmailNotifications = {
  createMockPR,
  testEmailNameFormatting
};
