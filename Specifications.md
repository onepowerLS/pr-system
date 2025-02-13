# 1PWR Procurement System Specifications

## Reference Data Management

### Collection Structure
- All reference data is stored in collections with prefix "referenceData_"
- Example: departments are stored in "referenceData_departments"

### ID Generation and Standardization
- Reference data items of type currencies, UOM, and organizations use their code as their ID
  - For these types, the code is converted to lowercase and any non-alphanumeric characters are replaced with underscores
  - Example: A currency with code "USD" would have ID "usd"
- Organization IDs follow the same standardization rules:
  - Converted to lowercase
  - Spaces and special characters replaced with underscores
  - Example: "1PWR LESOTHO" becomes "1pwr_lesotho"
- Other reference data types use auto-generated IDs for better performance and uniqueness

### Organization References
- Most reference data items are associated with a specific organization, except:
  - Vendors (globally available across organizations)
  - Currencies (standard across system)
  - UOM (standard units of measure)
  - Organizations (represent the organizations themselves)
  - Permissions (system-wide settings)
- Organization association is implemented through a single `organizationId` field
  - The `organizationId` must reference a valid ID in the organizations collection
  - Organization details (name, currency, etc.) should be fetched from the organizations collection
  - Example: A vehicle with `organizationId: "1pwr_lesotho"` references the organization document with ID "1pwr_lesotho"

### Collection References
- Collections should maintain clean references to related documents
- Best practices for references:
  - Use standardized IDs for consistency
  - Store only the reference ID, not the entire referenced document
  - Fetch related document details when needed
  - Example: Vehicles store only organizationId, fetching organization details from the organizations collection when needed

### Data Normalization
- Avoid storing redundant data across collections
- Each piece of information should have a single source of truth
  - Organization details stored only in the organizations collection
  - Reference data items should only store IDs of related documents
- Updates to referenced data (e.g., organization name) only need to be made in one place

### Active Status
- All reference data items have an active status (boolean)
- Only active items are returned by the reference data service
- Inactive items are still stored but not available for selection
- This allows "soft deletion" of items that may be referenced by historical records

### Vendor Management
- Vendors are globally available across all organizations
- Vendors can be marked as "approved" which affects quote requirements
- Vendor approval status is managed by procurement officers
- Vendor details include:
  - Contact information
  - Approval status
  - Product/service categories
  - Historical performance

## PR Processing Rules

### Quote Requirements and Thresholds
1. Rule 1 (Lower Threshold):
   - Below threshold:
     - Requires 1 quote
     - Can be approved by Level 6 or Level 2 approvers
     - If using approved vendor, quote attachment optional
     - If using non-approved vendor, quote must have attachment
   - Above threshold:
     - Requires 3 quotes with attachments
     - Only Level 2 approvers can approve
     - Exception: If using approved vendor, only 1 quote with attachment required

2. Rule 2 (Higher Threshold):
   - Below threshold: Rule 1 applies
   - Above threshold:
     - Always requires 3 quotes with attachments
     - Only Level 2 approvers can approve
     - No exceptions for approved vendors

### Quote Validation
- Quote amount used for threshold comparison is the lowest valid quote amount
- Each quote must include:
  - Valid amount
  - Currency
  - Vendor details
  - Attachment (except for approved vendors below Rule 1 threshold)
- Invalid quotes are not counted towards quote requirements

### Currency Handling
- Each organization's rules specify the base currency
- All quote amounts are converted to the rule's currency for comparison
- Currency conversion uses current exchange rates
- Threshold comparisons are made after currency conversion

### Attachment Requirements
- Quote attachments must be present for:
  - All quotes above Rule 2 threshold
  - All quotes above Rule 1 threshold (except approved vendors)
  - All quotes below Rule 1 threshold from non-approved vendors
- Attachments must be valid files with:
  - Readable format
  - Clear quote details
  - Vendor information

### Approver Levels
- Level 2 Approvers:
  - Can approve PRs of any value
  - Required for PRs above Rule 1 threshold
  - Required for all PRs above Rule 2 threshold
  
- Level 6 Approvers:
  - Can only approve PRs below Rule 1 threshold
  - Cannot approve PRs above Rule 1 threshold
  - Must follow standard quote requirements

## User Management

### User Status and Activation
- Users have an `isActive` field (boolean) to control their system access
- Only active users can:
  - Log into the system
  - Be selected as approvers
  - Perform actions within their permission level
- User activation status can be toggled by administrators in the User Management interface
- When a user is deactivated:
  - They cannot log in
  - They are removed from approver selection dropdowns
  - Their existing approvals remain valid for historical records

### Permission Levels
- Level 1: Administrator (ADMIN)
  - Full system access
  - Can manage all aspects of the system
  - Access to all organizations and features
  - Can edit Admin Dashboard

- Level 2: Senior Approver
  - Can approve PRs of any value
  - Required for high-value approvals
  - Organization assignment determines approval scope
- Level 3: Procurement Officer (PROC)
  - Can manage the procurement process
  - Can view Admin Dashboard
  - Can edit select Admin Dashboard items
  - Responsible for vendor management and PR processing

- Level 4: Finance Admin (FIN_AD)
  - Can process procurement requests
  - Can view (but not edit) Admin Dashboard
  - Access to financial aspects of PRs
  - Can review and process financial details

- Level 5: Requester (REQ)
  - Can create and submit PRs
  - Can view their own PR history
  - Basic access level for regular users
  - No administrative access

- Level 6: Junior Approver
  - Can approve PRs below Rule 1 threshold
  - Organization assignment determines approval scope
  - Cannot approve high-value PRs

### Organization Assignment
- Users can be assigned to one primary organization
- Additional organization access can be granted through the `additionalOrganizations` field
- Organization IDs are normalized for consistency:
  - Converted to lowercase
  - Special characters replaced with underscores
  - Example: "1PWR LESOTHO" becomes "1pwr_lesotho"
- Organization matching uses normalized IDs for comparison

## Approver System

### Approver Selection
- Approvers are filtered based on:
  - Active status (`isActive` must be true)
  - Permission level (APPROVER role)
  - Organization match (must be associated with the PR's organization)
- Organization matching includes:
  - Primary organization assignment
  - Additional organization assignments
- Organization matching uses normalized IDs to ensure consistent comparison
  - Example: "1PWR LESOTHO" and "1pwr_lesotho" are treated as the same organization

### Approver Display
- Approvers are shown in dropdowns with their full name
- The approver list is filtered to show only relevant approvers based on:
  - The PR's organization
  - The approver's organization assignments (primary and additional)
  - The approver's active status
- Inactive approvers are automatically excluded from selection

### Historical Records
- Approved PRs maintain their approver information even if:
  - The approver is later deactivated
  - The approver's organization assignments change
  - The approver's permission level changes
- This ensures audit trail integrity while preventing new selections of invalid approvers

### Organization Assignment
- Users can be assigned to one primary organization
- Additional organization access can be granted through the `additionalOrganizations` field
- Organization IDs are normalized for consistency:
  - Converted to lowercase
  - Special characters replaced with underscores
  - Example: "1PWR LESOTHO" becomes "1pwr_lesotho"
- Organization matching uses normalized IDs for comparison
