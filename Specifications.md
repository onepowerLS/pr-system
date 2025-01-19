# 1PWR Procurement System Specifications

## Reference Data Management

### Collection Structure
- All reference data is stored in collections with prefix "referenceData_"
- Example: departments are stored in "referenceData_departments"

### ID Generation
- Reference data items of type currencies, UOM, and organizations use their code as their ID
  - For these types, the code is converted to lowercase and any non-alphanumeric characters are replaced with underscores
  - Example: A currency with code "USD" would have ID "usd"
- Other reference data types use auto-generated IDs for better performance and uniqueness

### Organization Association
- Most reference data items are associated with a specific organization, except:
  - Vendors (globally available across organizations)
  - Currencies (standard across system)
  - UOM (standard units of measure)
  - Organizations (represent the organizations themselves)
  - Permissions (system-wide settings)
- When present, organization data is stored as an object containing:
  - id: string (e.g., "1pwr_lesotho")
  - name: string (e.g., "1PWR LESOTHO")

### Active Status
- All reference data items have an active status (boolean)
- Only active items are returned by the reference data service
- Inactive items are still stored but not available for selection
- This allows "soft deletion" of items that may be referenced by historical records
