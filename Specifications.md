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
- Level 1: Global Approvers
  - Can approve PRs across all organizations
  - Not restricted by organization boundaries
- Level 2: Organization Approvers
  - Can only approve PRs within their assigned organization
  - Organization assignment is normalized using the same rules as reference data
  - Example: An approver assigned to "1PWR LESOTHO" can approve PRs for organization ID "1pwr_lesotho"
- Level 3: Department Approvers (Future)
  - Will be able to approve PRs within their department
  - Department must match exactly
- Level 4: Finance Team
  - Can approve financial aspects of PRs
  - Access to financial reports and summaries
- Level 5: Regular Users
  - Can create and submit PRs
  - Can view their own PR history

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
  - Permission level (Level 1 or 2)
  - Organization match (for Level 2 approvers)
- Global approvers (Level 1) are available across all organizations
- Organization approvers (Level 2) are only available for their assigned organization
- Organization matching uses normalized IDs to ensure consistent comparison
  - Example: "1PWR LESOTHO" and "1pwr_lesotho" are treated as the same organization

### Approver Display
- Approvers are shown in dropdowns with their full name
- The approver list is filtered to show only relevant approvers based on:
  - The PR's organization
  - The approver's permission level
  - The approver's active status
- Inactive approvers are automatically excluded from selection

### Historical Records
- Approved PRs maintain their approver information even if:
  - The approver is later deactivated
  - The approver's organization assignment changes
  - The approver's permission level changes
- This ensures audit trail integrity while preventing new selections of invalid approvers
