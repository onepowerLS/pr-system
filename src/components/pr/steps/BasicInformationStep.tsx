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
  Box,
  Typography,
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
  vendors: ReferenceDataItem[];
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
  vendors,
  approvers,
  loading,
}) => {
  const handleChange = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = event.target.value;
    setFormState(prev => {
      // Handle expense type changes
      if (field === 'expenseType') {
        if (value === 'vehicle') {
          // When switching to vehicle expense type
          return {
            ...prev,
            [field]: value,
            // Don't auto-select vehicle - user must explicitly choose
            vehicle: undefined
          };
        } else if (prev.expenseType === 'vehicle') {
          // When switching from vehicle expense type, clear vehicle
          return {
            ...prev,
            [field]: value,
            vehicle: undefined
          };
        }
      }
      return { ...prev, [field]: value };
    });
  };

  const handleApproverChange = (_event: any, value: any) => {
    setFormState(prev => ({
      ...prev,
      approvers: value.map((approver: any) => approver.id)
    }));
  };

  // Check if expense type is vehicle
  const isVehicleExpense = formState.expenseType === 'vehicle';

  // Validate that vehicle is selected if expense type is vehicle
  React.useEffect(() => {
    if (isVehicleExpense && !formState.vehicle) {
      setFormState(prev => ({
        ...prev,
        vehicle: vehicles[0]?.id || ''
      }));
    }
  }, [isVehicleExpense, vehicles]);

  return (
    <Grid container spacing={3}>
      {/* Organization */}
      <Grid item xs={12}>
        <FormControl fullWidth disabled>
          <InputLabel>Organization</InputLabel>
          <Select
            value={formState.organization}
            label="Organization"
          >
            <MenuItem value="1PWR LESOTHO">1PWR LESOTHO</MenuItem>
          </Select>
          <FormHelperText>Organization is fixed to 1PWR LESOTHO</FormHelperText>
        </FormControl>
      </Grid>

      {/* Requestor */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Requestor"
          value={formState.requestor}
          onChange={handleChange('requestor')}
          required
          disabled={loading}
        />
      </Grid>

      {/* Email */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={formState.email}
          onChange={handleChange('email')}
          required
          disabled={loading}
        />
      </Grid>

      {/* Department */}
      <Grid item xs={12} md={6}>
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
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel>Project Category</InputLabel>
          <Select
            value={formState.projectCategory}
            onChange={handleChange('projectCategory')}
            label="Project Category"
            disabled={loading}
          >
            {projectCategories.map(cat => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* Description */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          multiline
          rows={3}
          value={formState.description}
          onChange={handleChange('description')}
          required
          disabled={loading}
          helperText="Provide a clear description of what you are requesting"
        />
      </Grid>

      {/* Site */}
      <Grid item xs={12} md={6}>
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
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required error={isVehicleExpense && !formState.vehicle}>
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
          {isVehicleExpense && !formState.vehicle && (
            <FormHelperText error>
              Vehicle expenses require a vehicle to be selected
            </FormHelperText>
          )}
        </FormControl>
      </Grid>

      {/* Vehicle Selection - Required for vehicle expense type */}
      {isVehicleExpense && (
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required error={!formState.vehicle}>
            <InputLabel>Vehicle</InputLabel>
            <Select
              value={formState.vehicle || ''}
              onChange={handleChange('vehicle')}
              label="Vehicle"
              disabled={loading}
            >
              <MenuItem value="" disabled>
                <em>Select a vehicle</em>
              </MenuItem>
              {vehicles.map(vehicle => (
                <MenuItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </MenuItem>
              ))}
            </Select>
            {!formState.vehicle && (
              <FormHelperText error>
                Please select the vehicle this expense is for
              </FormHelperText>
            )}
          </FormControl>
        </Grid>
      )}

      {/* Estimated Amount */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Estimated Amount"
          type="number"
          value={formState.estimatedAmount}
          onChange={handleChange('estimatedAmount')}
          required
          disabled={loading}
          InputProps={{
            inputProps: { min: 0, step: 0.01 }
          }}
        />
      </Grid>

      {/* Currency */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel>Currency</InputLabel>
          <Select
            value={formState.currency}
            onChange={handleChange('currency')}
            label="Currency"
            disabled={loading}
          >
            <MenuItem value="LSL">LSL</MenuItem>
            <MenuItem value="USD">USD</MenuItem>
            <MenuItem value="ZAR">ZAR</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* Required Date */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Required Date"
          type="date"
          value={formState.requiredDate}
          onChange={handleChange('requiredDate')}
          required
          disabled={loading}
          InputLabelProps={{
            shrink: true,
          }}
          inputProps={{
            min: new Date().toISOString().split('T')[0]
          }}
        />
      </Grid>

      {/* Preferred Vendor */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Preferred Vendor</InputLabel>
          <Select
            value={formState.preferredVendor || ''}
            onChange={handleChange('preferredVendor')}
            label="Preferred Vendor"
            disabled={loading}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {vendors.map(vendor => (
              <MenuItem key={vendor.id} value={vendor.id}>
                {vendor.name}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            Select if you have a preferred vendor for this purchase
          </FormHelperText>
        </FormControl>
      </Grid>

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

export default BasicInformationStep;
