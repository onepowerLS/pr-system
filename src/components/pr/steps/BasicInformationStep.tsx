/**
 * @fileoverview Basic Information Step Component
 * @version 1.0.0
 * 
 * Description:
 * First step in the PR creation process. Collects basic information
 * about the purchase request including organization, department,
 * project category, and initial approvers.
 */

import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
  Chip,
} from '@mui/material';
import { FormState } from '../NewPRForm';
import { ReferenceDataItem } from '../../../types/referenceData';

interface BasicInformationStepProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  departments: ReferenceDataItem[];
  projectCategories: ReferenceDataItem[];
  sites: ReferenceDataItem[];
  expenseTypes: ReferenceDataItem[];
  vehicles: ReferenceDataItem[];
  approvers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    approvalLimit?: number;
  }>;
  loading: boolean;
}

export const BasicInformationStep: React.FC<BasicInformationStepProps> = ({
  formState,
  setFormState,
  departments,
  projectCategories,
  sites,
  expenseTypes,
  vehicles,
  approvers,
  loading
}) => {
  // Handle field changes
  const handleChange = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    setFormState(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  // Handle approver changes
  const handleApproverChange = (_event: any, value: any) => {
    setFormState(prev => ({
      ...prev,
      approvers: value.map((approver: any) => approver.id)
    }));
  };

  return (
    <Grid container spacing={3}>
      {/* Organization */}
      <Grid item xs={12}>
        <TextField
          required
          fullWidth
          label="Organization"
          value={formState.organization}
          onChange={handleChange('organization')}
          disabled
        />
      </Grid>

      {/* Requestor */}
      <Grid item xs={12} sm={6}>
        <TextField
          required
          fullWidth
          label="Requestor"
          value={formState.requestor}
          onChange={handleChange('requestor')}
          disabled
        />
      </Grid>

      {/* Email */}
      <Grid item xs={12} sm={6}>
        <TextField
          required
          fullWidth
          label="Email"
          value={formState.email}
          onChange={handleChange('email')}
          disabled
        />
      </Grid>

      {/* Department */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Department</InputLabel>
          <Select
            value={formState.department}
            onChange={handleChange('department')}
            label="Department"
            disabled={loading}
          >
            {departments.map(dept => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Project Category */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Project Category</InputLabel>
          <Select
            value={formState.projectCategory}
            onChange={handleChange('projectCategory')}
            label="Project Category"
            disabled={loading}
          >
            {projectCategories.map(category => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Description */}
      <Grid item xs={12}>
        <TextField
          required
          fullWidth
          multiline
          rows={4}
          label="Description"
          value={formState.description}
          onChange={handleChange('description')}
          disabled={loading}
          helperText="Provide a detailed description of what you are requesting"
        />
      </Grid>

      {/* Site */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Site</InputLabel>
          <Select
            value={formState.site}
            onChange={handleChange('site')}
            label="Site"
            disabled={loading}
          >
            {sites.map(site => (
              <MenuItem key={site.id} value={site.id}>
                {site.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Expense Type */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Expense Type</InputLabel>
          <Select
            value={formState.expenseType}
            onChange={handleChange('expenseType')}
            label="Expense Type"
            disabled={loading}
          >
            {expenseTypes.map(type => (
              <MenuItem key={type.id} value={type.id}>
                {type.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Vehicle (Optional) */}
      {formState.expenseType === 'VEHICLE_EXPENSE' && (
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Vehicle</InputLabel>
            <Select
              value={formState.vehicle || ''}
              onChange={handleChange('vehicle')}
              label="Vehicle"
              disabled={loading}
            >
              {vehicles.map(vehicle => (
                <MenuItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Select a vehicle if this is a vehicle-related expense</FormHelperText>
          </FormControl>
        </Grid>
      )}

      {/* Approvers */}
      <Grid item xs={12}>
        <Autocomplete
          multiple
          options={approvers}
          getOptionLabel={(option) => {
            if (option.department === 'Admin') {
              return `${option.name} (${option.department}, limit: ${option.approvalLimit})`;
            }
            return `${option.name} (${option.department})`;
          }}
          value={approvers.filter(a => formState.approvers.includes(a.id))}
          onChange={handleApproverChange}
          disabled={loading}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option.department === 'Admin' ? 
                  `${option.name} (${option.department}, limit: ${option.approvalLimit})` :
                  `${option.name} (${option.department})`
                }
                {...getTagProps({ index })}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Approvers"
              placeholder="Select approvers"
              required
            />
          )}
        />
        <FormHelperText>
          Select the people who need to approve this request
        </FormHelperText>
      </Grid>
    </Grid>
  );
};
