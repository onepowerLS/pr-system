import { useEffect, useState } from 'react';
import { Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material';
import { referenceDataService } from '../../services/referenceData';
import { ReferenceData } from '@/types/referenceData';

interface OrganizationSelectorProps {
  value: string;
  onChange: (value: string) => void;
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

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const orgs = await referenceDataService.getItemsByType('organizations');
        setOrganizations(orgs);
      } catch (error) {
        console.error('Error loading organizations:', error);
      } finally {
        setLoading(false);
      }
    };
    loadOrganizations();
  }, []);

  // Convert code to display name for the select value
  const displayValue = organizationCodeMap[value] || '';

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
          // Convert display name back to code when changing
          const code = organizationDisplayMap[e.target.value as string];
          onChange(code);
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
