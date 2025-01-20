import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Select, MenuItem, FormControl, InputLabel, CircularProgress, FormHelperText } from '@mui/material';
import { referenceDataService } from '../../services/referenceData';
import { ReferenceData } from '@/types/referenceData';
import { RootState } from '@/store';

interface OrganizationSelectorProps {
  value: { id: string; name: string } | null | string;
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
  const [error, setError] = useState<string | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        setError(null);
        console.log('Loading organizations for user:', {
          user,
          currentValue: value
        });
        
        const allOrgs = await referenceDataService.getOrganizations();
        console.log('All organizations loaded:', allOrgs.map(org => ({
          id: org.id,
          name: org.name,
          code: org.code,
          type: org.type
        })));

        if (allOrgs.length === 0) {
          console.error('No organizations found in the database');
          setError('No organizations available');
          setOrganizations([]);
          return;
        }
        
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
          const userOrgNames = [
            user.organization,
            ...(user.additionalOrganizations || [])
          ].filter(Boolean).map(org => org.toString().toLowerCase());
          
          console.log('User organization names:', userOrgNames);
          
          // Match by organization name
          filteredOrgs = allOrgs.filter(org => {
            const orgName = org.name.toString().toLowerCase();
            const matches = userOrgNames.some(userOrgName => 
              orgName === userOrgName ||
              // Also try with underscores replaced by spaces
              orgName === userOrgName.replace(/_/g, ' ')
            );

            console.log('Checking organization:', {
              org: { id: org.id, name: org.name },
              matches
            });

            return matches;
          });

          if (filteredOrgs.length === 0) {
            console.error('User has no matching organizations');
            setError('No organizations available for your account');
          }
        }
        
        console.log('Filtered organizations:', filteredOrgs.map(org => ({
          id: org.id,
          name: org.name,
          code: org.code
        })));
        setOrganizations(filteredOrgs);

        // Set default organization if no value is selected and user has an organization
        if (!value && user?.organization && filteredOrgs.length > 0) {
          // Try to find org by name
          const userOrgName = user.organization.toString().toLowerCase();
          const userOrg = filteredOrgs.find(org => {
            const orgName = org.name.toString().toLowerCase();
            return (
              orgName === userOrgName ||
              // Also try with underscores replaced by spaces
              orgName === userOrgName.replace(/_/g, ' ')
            );
          });
          
          if (userOrg) {
            console.log('Setting default organization:', userOrg);
            onChange({ id: userOrg.id, name: userOrg.name });
          }
        }
      } catch (error) {
        console.error('Error loading organizations:', error);
        setError('Failed to load organizations');
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };
    loadOrganizations();
  }, [user, value, onChange]);

  // Convert organization object or string to display value
  const displayValue = useMemo(() => {
    if (!value) return '';
    if (typeof value === 'object') return value.name;
    
    // If value is a string, try to find matching organization
    const org = organizations.find(o => o.id === value || o.name === value);
    return org ? org.name : value;
  }, [value, organizations]);

  if (loading) {
    return <CircularProgress size={24} />;
  }

  return (
    <FormControl fullWidth error={!!error}>
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
            console.log('Organization selected:', selectedOrg);
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
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};
