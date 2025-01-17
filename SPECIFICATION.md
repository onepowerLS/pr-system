# Purchase Requisition System Specification

> Last Updated: 2025-01-05

## 1. Authentication Flow
### Login Screen
- Required Fields:
  - Email Address (text input with email validation)
  - Password (password input)
- Actions:
  - SIGN IN button (primary action)
- Validation:
  - Email format must be valid
  - Both fields must be non-empty

## 2. Dashboard
### Header
- Organization selector (dropdown, fixed to 1PWR LESOTHO)
- NEW PR button (top right)
- User profile icon (top right)

### Key Metrics Display
- Total PRs (numeric)
- Urgent PRs (numeric)
- Avg Days Open (decimal)
- Overdue PRs (numeric)
- Quotes Required (numeric)
- Adjudication Required (numeric)
- Customs Required (numeric)
- Completion Rate (percentage)

### Purchase Requests Table
- Status Filters:
  - SUBMITTED (default)
  - IN_QUEUE
  - PENDING_APPROVAL
  - APPROVED
 - ORDERED
 - PARTIALLY_RECEIVED
  - COMPLETED
  - REVISION_REQUIRED
  - CANCELED
  - REJECTED

- Columns:
  - PR Number (auto-generated)
  - Description
  - Submitted By
  - Created Date
  - Days Open
  - Resubmitted Date
  - Actions (delete/edit)

## 3. Purchase Request Creation
### Step 1: Basic Information
- Required Fields (*):
  - Organization (dropdown, fixed to 1PWR LESOTHO)
  - Requestor (text input, pre-populated with user's name)
  - Email (text input, pre-populated with user's email)
  - Department (dropdown)
  - Project Category (dropdown)
  - Description (text area)
  - Site (dropdown)
  - Expense Type (dropdown)
  - Estimated Amount (number input, must be > 0)
  - Currency (dropdown: LSL, USD, ZAR)
  - Urgency Level (dropdown: Normal, Urgent)
  - Approvers (multi-select dropdown)

- Optional Fields:
  - Preferred Vendor (dropdown)

- Field Dependencies:
  - When Expense Type is "4 -Vehicle", an additional required Vehicle field (dropdown) appears

### Step 2: Line Items
- Table with columns:
  - Description* (text input)
  - Quantity* (number input)
  - UOM* (Unit of Measure, dropdown)
  - Notes (text input)
  - Attachments (file upload)
  - Actions (save, delete)

- Features:
  - ADD LINE ITEM button
  - File attachment support
  - Multiple line items allowed
  - At least one line item required

### Step 3: Review
- Read-only display sections:
  - Requestor Information
    - Name
    - Email
    - Department
    - Organization

  - Project Details
    - Project Category
    - Site
    - Description

  - Financial Details
    - Estimated Amount with Currency
    - Expense Type

  - Approval Details
    - Required Date
    - Approvers with roles

  - Line Items Table
    - Description
    - Quantity
    - Unit of Measure
    - Notes
    - Attachments

## 4. Notification System
- Email notifications sent for:
  - PR submission to approvers
  - PR approval/rejection to requestor
  - PR revision requests to requestor
  - PR status changes to relevant parties
  - Approaching deadlines
  - Overdue items

- In-app notifications for:
  - New PRs requiring approval
  - Status changes
  - Required actions (quotes, revisions)
  - System messages

## 5. Navigation
- Sidebar Menu:
  - Dashboard
  - New PR
  - My PRs

## 6. Data Validation Rules
- Email must be valid format
- Estimated Amount must be > 0
- At least one approver required
- At least one line item required
- All required fields must be filled before proceeding to next step
- File attachments must be valid file types
- Currency must match organization's allowed currencies
- Approvers cannot approve their own PRs

## 7. Status Flow
```
SUBMITTED -> -> [IN QUEUE/REJECTED/REVISION_REQUIRED]
IN QUEUE -> [PENDING_APPROVAL/REJECTED/REVISION_REQUIRED]
PENDING_APPROVAL -> [APPROVED/REJECTED/REVISION_REQUIRED]
APPROVED -> [ORDERED]
ORDERED -> [PARTIALLY_RECEIVED, COMPLETED]
PARTIALLY_RECEIVED -> [COMPLETED]
REVISION_REQUIRED -> SUBMITTED (cycle continues)
Any Status -> CANCELED
```

## 8. System Administration
### User Management
- Administrators can:
  - View all users in a table format
  - Add new users with:
    - Email
    - Name
    - Department
    - Permission Level
  - Edit existing users:
    - Update user details
    - Change permission levels
    - Reset passwords
  - Delete users

### Permission Levels
- Permission levels control access to system features:
  - ADMIN: Full system access, including user management
  - PROCUREMENT: Access to procurement-specific features
  - USER: Basic access for PR submission and tracking

### Password Management
- Default password for new users: "1PWR00"
- Password changes:
  - Admins can reset user passwords
  - Password updates are handled securely via Firebase Cloud Functions
  - Users are required to change password on first login

### Reference Data Management
- Administrators can manage dropdown menu contents for:
  - Departments
  - Project Categories
  - Sites
  - Expense Types
  - Units of Measure
  - Preferred Vendors
  - Vehicles

### Security Rules
- Only ADMIN users can:
  - Access user management features
  - Reset passwords
  - Modify reference data
- All administrative actions are logged for audit purposes
- Password updates require admin authentication
- Sensitive operations use server-side Cloud Functions

This specification serves as the baseline functionality reference for the PR system. Any code changes should be validated against these requirements to ensure core functionality remains intact.
