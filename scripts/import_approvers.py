import pandas as pd
import json
from typing import List, Dict
import uuid
import re

def get_approval_rules(file_path: str) -> dict:
    """Read approval rules from Configuration sheet"""
    try:
        df = pd.read_excel(file_path, sheet_name='Configuration')
        print("\nConfiguration sheet columns:", df.columns.tolist())
        
        # Print the first few rows to see the structure
        print("\nConfiguration data:")
        print(df.head())
        
        return {}
    except Exception as e:
        print(f"Error reading configuration: {str(e)}")
        return {}

def parse_approval_limit(limit_str: str) -> float:
    """
    Parse approval limit string to number in LSL
    Examples:
    - "1000" -> 1000
    - "1,000" -> 1000
    - "1k" -> 1000
    - "1M" -> 1000000
    - "under 1000" -> 1000
    """
    if pd.isna(limit_str):
        return float('inf')  # No limit specified means unlimited
        
    # Convert to string and clean up
    limit_str = str(limit_str).lower().strip()
    
    # Remove "under" or similar words
    limit_str = re.sub(r'^under\s+', '', limit_str)
    
    # Remove commas
    limit_str = limit_str.replace(',', '')
    
    # Handle K/M multipliers
    if 'k' in limit_str:
        return float(limit_str.replace('k', '')) * 1000
    elif 'm' in limit_str:
        return float(limit_str.replace('m', '')) * 1000000
    
    # Try to extract the first number
    match = re.search(r'\d+', limit_str)
    if match:
        return float(match.group())
        
    return float('inf')  # Default to unlimited if we can't parse

def read_approvers_from_excel(file_path: str) -> List[Dict]:
    """
    Read approvers from the Excel file and format them for Firebase.
    Returns a list of approver dictionaries with required fields.
    """
    try:
        # First read the configuration
        rules = get_approval_rules(file_path)
        
        # Read the Approver List sheet
        df = pd.read_excel(file_path, sheet_name='Approver List')
        print("\nColumns found in Approver List:", df.columns.tolist())
        
        # Convert DataFrame to list of dictionaries
        approver_list = []
        for _, row in df.iterrows():
            if pd.notna(row['Email']):  # Only include rows with email
                name = row['Name'] if pd.notna(row['Name']) else row['Email'].split('@')[0].replace('.', ' ').title()
                
                # Parse approval limit
                approval_limit = parse_approval_limit(row.get('Approval Limit'))
                
                approver = {
                    'id': str(uuid.uuid4()),
                    'name': name.strip(),
                    'email': row['Email'].strip().lower(),
                    'role': 'APPROVER',
                    'department': row['Department'].strip() if pd.notna(row.get('Department')) else None,
                    'isActive': True if pd.notna(row.get('Active Status (Y/N)')) and str(row['Active Status (Y/N)']).lower() == 'y' else True,
                    'approvalLimit': approval_limit
                }
                approver_list.append(approver)
        
        # Save to JSON file for importing into Firebase
        with open('approvers.json', 'w') as f:
            json.dump({'approvers': approver_list}, f, indent=2)
            
        print(f"\nSuccessfully processed {len(approver_list)} approvers")
        return approver_list
        
    except Exception as e:
        print(f"Error reading Excel file: {str(e)}")
        return []

if __name__ == "__main__":
    file_path = "../1PWR pr-system.xlsx"
    approvers = read_approvers_from_excel(file_path)
    print("\nApprovers processed:")
    for approver in approvers:
        limit_str = "unlimited" if approver['approvalLimit'] == float('inf') else f"LSL {approver['approvalLimit']:,.2f}"
        print(f"- {approver['name']} ({approver['email']}) - Limit: {limit_str}")
