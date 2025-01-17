# 1PWR Procurement System Specifications

## Reference Data Management

### ID Generation
- All reference data items should use their code as their ID
- The code should be converted to lowercase and any non-alphanumeric characters replaced with underscores
- This applies to all reference data types: departments, sites, expense types, project categories, vehicles, vendors, currencies, units of measure, and organizations
- Example: A vehicle with code "RLL415J" would have ID "rll415j"

### Organization Association
- Most reference data items (except currencies, UOM, organizations, and permissions) are associated with a specific organization
- Organization data is stored as an object containing:
  - id: string (e.g., "1pwr_lesotho")
  - name: string (e.g., "1PWR LESOTHO")

### Active Status
- All reference data items have an active status (boolean)
- Inactive items are still stored but not shown in dropdown menus for selection
