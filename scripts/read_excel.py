import pandas as pd
import json

# Read the Excel file
excel_file = '/Users/mattmso/Projects/pr-system/1PWR pr-system.xlsx'
xls = pd.ExcelFile(excel_file)

def clean_name(name):
    if pd.isna(name):
        return ""
    return str(name).strip().lower().replace(' ', '_').replace('/', '_').replace('&', 'and')

def format_ts_array(name, items):
    output = [f"export const {name} = ["]
    for item in items:
        output.append(f"  {item},")
    output.append("];")
    return "\n".join(output)

# Process each sheet
sheets_to_process = {
    'Department List': ('departments', lambda df: [
        f'{{ id: "{clean_name(row["Department Name"])}", name: "{row["Department Name"]}", isActive: {str(row["Active Status (Y/N)"] == "Y").lower()} }}'
        for _, row in df.iterrows() if pd.notna(row["Department Name"])
    ]),
    'Project Categories': ('projectCategories', lambda df: [
        f'{{ id: "{clean_name(row["Category"])}", name: "{row["Category"]}", isActive: {str(row["Active (Y/N)"] == "Y").lower()} }}'
        for _, row in df.iterrows() if pd.notna(row["Category"])
    ]),
    'Site List': ('sites', lambda df: [
        f'{{ id: "{clean_name(row["Site Name"])}", name: "{row["Site Name"]}", code: "{row["Code"]}", isActive: {str(row["Active (Y/N)"] == "Y").lower()}, organization: "1PWR LESOTHO" }}'
        for _, row in df.iterrows() if pd.notna(row["Site Name"])
    ]),
    'Expense Type': ('expenseTypes', lambda df: [
        f'{{ id: "{clean_name(row["Expense Type"])}", name: "{row["Expense Type"]}", code: "{str(row["Code "]) if pd.notna(row["Code "]) else ""}", isActive: {str(row["Active (Y/N)"] == "Y").lower()} }}'
        for _, row in df.iterrows() if pd.notna(row["Expense Type"])
    ]),
    'Vehicle List': ('vehicles', lambda df: [
        f'{{ id: "{clean_name(row["Vehicle Name"])}", name: "{str(row["Vehicle Name"])}", registration: "{str(row["Registration Status"]) if pd.notna(row["Registration Status"]) else ""}", isActive: {str(row["Active (Y/N)"] == "Y").lower()}, organization: "1PWR LESOTHO" }}'
        for _, row in df.iterrows() if pd.notna(row["Vehicle Name"])
    ]),
    'Vendor List': ('vendors', lambda df: [
        f'{{ id: "{clean_name(row["Vendor Name"])}", name: "{row["Vendor Name"]}", isActive: {str(row["Approved Status (Y/N)"] == "Y").lower()}, organization: "1PWR LESOTHO" }}'
        for _, row in df.iterrows() if pd.notna(row["Vendor Name"])
    ]),
    'Org List': ('organizations', lambda df: [
        f'{{ id: "{clean_name(row["Organization"])}", name: "{row["Organization"]}", isActive: {str(row["Active (Y/N)"] == "Y").lower()} }}'
        for _, row in df.iterrows() if pd.notna(row["Organization"])
    ])
}

# Add standard currencies
currencies = [
    '{ id: "lsl", name: "Lesotho Loti", code: "LSL", isActive: true }',
    '{ id: "zar", name: "South African Rand", code: "ZAR", isActive: true }',
    '{ id: "usd", name: "US Dollar", code: "USD", isActive: true }',
    '{ id: "eur", name: "Euro", code: "EUR", isActive: true }',
    '{ id: "gbp", name: "British Pound", code: "GBP", isActive: true }'
]

print("// Local reference data from Excel file")
for sheet_name, (var_name, processor) in sheets_to_process.items():
    if sheet_name in xls.sheet_names:
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        items = processor(df)
        print("\n" + format_ts_array(var_name, items))
    else:
        print(f"// Warning: Sheet '{sheet_name}' not found")

print("\n" + format_ts_array('currencies', currencies))
