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
  SelectChangeEvent,
  CircularProgress,
} from '@mui/material';
import { FormState } from '../NewPRForm';
import { ReferenceDataItem } from '../../../types/referenceData';
import { organizations } from '../../../services/localReferenceData';

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
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<any>
  ) => {
    const value = event.target.value;
    setFormState(prev => {
      // Handle expense type changes
      if (field === 'expenseType') {
        const isVehicleExpense = expenseTypes.find(type => type.id === value)?.name === '4 - Vehicle';
        const wasVehicleExpense = expenseTypes.find(type => type.id === prev.expenseType)?.name === '4 - Vehicle';
        
        if (isVehicleExpense) {
          // When switching to vehicle expense type
          return {
            ...prev,
            [field]: value,
            // Don't auto-select vehicle - user must explicitly choose
            vehicle: undefined
          };
        } else if (wasVehicleExpense) {
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

  // Show vehicle field only for vehicle expense type
  const showVehicleField = expenseTypes.find(type => type.id === formState.expenseType)?.name === '4 - Vehicle';

  // Validate that vehicle is selected if expense type is vehicle
  React.useEffect(() => {
    if (showVehicleField && !formState.vehicle && vehicles.length > 0) {
      setFormState(prev => ({
        ...prev,
        vehicle: undefined
      }));
    }
  }, [showVehicleField, vehicles]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress data-testid="loading-indicator" />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Organization */}
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel htmlFor="organization-select" id="organization-label">Organization</InputLabel>
          <Select
            labelId="organization-label"
            id="organization-select"
            value={formState.organization}
            label="Organization"
            onChange={handleChange('organization')}
            required
            error={!formState.organization}
            inputProps={{
              'aria-labelledby': 'organization-label',
              'aria-label': 'Organization'
            }}
          >
            {organizations.map((org) => (
              <MenuItem key={org.id} value={org.name}>
                {org.name}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText error={!formState.organization}>
            {!formState.organization ? 'Organization is required' : ''}
          </FormHelperText>
        </FormControl>
      </Grid>

      {/* Requestor */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          id="requestor-input"
          label="Requestor"
          value={formState.requestor}
          onChange={handleChange('requestor')}
          required
          error={formState.requestor === ''}
          helperText={formState.requestor === '' ? 'Requestor is required' : ''}
          disabled={loading}
        />
      </Grid>

      {/* Email */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          id="email-input"
          label="Email"
          type="email"
          value={formState.email}
          onChange={handleChange('email')}
          required
          error={formState.email === ''}
          helperText={formState.email === '' ? 'Email is required' : ''}
          disabled={loading}
        />
      </Grid>

      {/* Department */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel id="department-label">Department</InputLabel>
          <Select
            labelId="department-label"
            id="department-select"
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
          <InputLabel id="project-category-label">Project Category</InputLabel>
          <Select
            labelId="project-category-label"
            id="project-category-select"
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
          id="description-input"
          label="Description"
          multiline
          rows={3}
          value={formState.description}
          onChange={handleChange('description')}
          required
          disabled={loading}
          helperText="Provide a clear description of what you are requesting"
          inputProps={{
            'aria-label': 'Description'
          }}
        />
      </Grid>

      {/* Site */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel id="site-label">Site</InputLabel>
          <Select
            labelId="site-label"
            id="site-select"
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
        <FormControl fullWidth required>
          <InputLabel id="expense-type-label">Expense Type</InputLabel>
          <Select
            labelId="expense-type-label"
            id="expense-type-select"
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

      {/* Vehicle Selection - Only shown for vehicle-related expenses */}
      {showVehicleField && (
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel id="vehicle-label">Vehicle</InputLabel>
            <Select
              labelId="vehicle-label"
              id="vehicle-select"
              value={formState.vehicle}
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
          </FormControl>
        </Grid>
      )}

      {/* Preferred Vendor */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel id="vendor-label">Preferred Vendor</InputLabel>
          <Select
            labelId="vendor-label"
            id="vendor-select"
            value={formState.preferredVendor}
            onChange={handleChange('preferredVendor')}
            label="Preferred Vendor"
            disabled={loading}
          >
            {vendors
              .filter(vendor => vendor.active)
              .map(vendor => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </MenuItem>
              ))}
          </Select>
          <FormHelperText>Optional - Select if you have a preferred vendor</FormHelperText>
        </FormControl>
      </Grid>

      {/* Estimated Amount */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          id="estimated-amount-input"
          label="Estimated Amount"
          type="number"
          value={formState.estimatedAmount}
          onChange={handleChange('estimatedAmount')}
          required
          error={formState.estimatedAmount <= 0}
          helperText={formState.estimatedAmount <= 0 ? 'Amount must be greater than 0' : ''}
          disabled={loading}
          inputProps={{
            min: 0,
            step: 0.01,
            'aria-label': 'Estimated Amount'
          }}
        />
      </Grid>

      {/* Currency */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel id="currency-label">Currency</InputLabel>
          <Select
            labelId="currency-label"
            id="currency-select"
            value={formState.currency}
            onChange={handleChange('currency')}
            label="Currency"
            disabled={loading}
          >
            <MenuItem value="LSL">LSL - Lesotho Loti</MenuItem>
            <MenuItem value="USD">USD - US Dollar</MenuItem>
            <MenuItem value="ZAR">ZAR - South African Rand</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* Urgency Level */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel id="urgency-label">Urgency Level</InputLabel>
          <Select
            labelId="urgency-label"
            id="urgency-select"
            value={formState.isUrgent}
            onChange={handleChange('isUrgent')}
            label="Urgency Level"
            disabled={loading}
          >
            <MenuItem value={false}>Normal</MenuItem>
            <MenuItem value={true}>Urgent</MenuItem>
          </Select>
          <FormHelperText>Select 'Urgent' only if this request requires immediate attention</FormHelperText>
        </FormControl>
      </Grid>

      {/* Approvers */}
      <Grid item xs={12}>
        <Autocomplete
          multiple
          id="approvers-select"
          options={approvers}
          getOptionLabel={(option) => option.name}
          value={approvers.filter(a => formState.approvers.includes(a.id))}
          onChange={handleApproverChange}
          disabled={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Approvers"
              required
              helperText="Select at least one approver"
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                key={option.id}
                label={option.name}
                {...getTagProps({ index })}
              />
            ))
          }
        />
      </Grid>
    </Grid>
  );
};

export default BasicInformationStep;
