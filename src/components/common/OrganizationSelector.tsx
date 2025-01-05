import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { organizations } from '../../services/localReferenceData';

interface OrganizationSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const OrganizationSelector = ({ value, onChange }: OrganizationSelectorProps) => {
  return (
    <FormControl fullWidth>
      <InputLabel id="organization-label">Organization</InputLabel>
      <Select
        labelId="organization-label"
        id="organization-select"
        value={value}
        label="Organization"
        onChange={(e) => onChange(e.target.value)}
      >
        {organizations.map((org) => (
          <MenuItem key={org.id} value={org.id}>
            {org.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
