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
