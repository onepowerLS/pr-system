import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const ORGANIZATIONS = ['1PWR LESOTHO', 'SMP', 'PUECO'];

interface OrganizationSelectorProps {
  value: string;
  onChange: (org: string) => void;
}

export const OrganizationSelector = ({ value, onChange }: OrganizationSelectorProps) => {
  return (
    <FormControl fullWidth>
      <InputLabel>Organization</InputLabel>
      <Select
        value={value}
        label="Organization"
        onChange={(e) => onChange(e.target.value)}
      >
        {ORGANIZATIONS.map((org) => (
          <MenuItem key={org} value={org}>
            {org}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
