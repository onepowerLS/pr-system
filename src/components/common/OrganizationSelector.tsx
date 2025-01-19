import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material';
import { referenceDataService } from '../../services/referenceData';
import { ReferenceData } from '@/types/referenceData';
import { RootState } from '@/store';

interface OrganizationSelectorProps {
  value: string | { id: string; name: string };
  onChange: (value: { id: string; name: string }) => void;
}

// Map display names to codes
const organizationDisplayMap: Record<string, string> = {
  '1PWR LESOTHO': '1PWR_LSO',
  '1PWR ZAMBIA': '1PWR_ZAM',
  '1PWR BENIN': '1PWR_BEN',
  'PUECO LESOTHO': 'PUECO_LSO',
  'PUECO BENIN': 'PUECO_BEN',
  'NEO1': 'NEO1',
  'SMP': 'SMP'
};

// Map codes to display names
const organizationCodeMap: Record<string, string> = Object.entries(organizationDisplayMap)
  .reduce((acc, [display, code]) => ({ ...acc, [code]: display }), {});

export const OrganizationSelector = ({ value, onChange }: OrganizationSelectorProps) => {
  const [organizations, setOrganizations] = useState<ReferenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const allOrgs = await referenceDataService.getItemsByType('organizations');
        
        // Filter organizations based on user role
        let filteredOrgs;
        if (!user) {
          filteredOrgs = [];
        } else if (
          user.role === 'ADMIN' || 
          user.role === 'FINANCE_ADMIN' || 
          user.role === 'PROCUREMENT'
        ) {
          // Admin, Finance Admin, and Procurement see all orgs
          filteredOrgs = allOrgs;
        } else {
          // Approvers and Requestors see their primary org and additional orgs
          const userOrgs = new Set([
            user.organization?.id,
            ...(user.additionalOrganizations || [])
          ].filter(Boolean));
          
          filteredOrgs = allOrgs.filter(org => userOrgs.has(org.id));
        }
        
        setOrganizations(filteredOrgs);
      } catch (error) {
        console.error('Error loading organizations:', error);
      } finally {
        setLoading(false);
      }
    };
    loadOrganizations();
  }, [user]);

  // Convert organization object or string to display value
  const displayValue = typeof value === 'object' ? value.name : organizationCodeMap[value] || '';

  if (loading) {
    return <CircularProgress size={24} />;
  }

  return (
    <FormControl fullWidth>
      <InputLabel id="organization-label">Organization</InputLabel>
      <Select
        labelId="organization-label"
        id="organization-select"
        value={displayValue}
        label="Organization"
        onChange={(e) => {
          // Find the selected organization object
          const selectedOrg = organizations.find(org => org.name === e.target.value);
          if (selectedOrg) {
            onChange({ id: selectedOrg.id, name: selectedOrg.name });
          }
        }}
      >
        {organizations.map((org) => (
          <MenuItem key={org.id} value={org.name}>
            {org.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
