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
import { OrganizationSelector } from '../../common/OrganizationSelector';

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
    permissionLevel: string;  // "Level 1" or "Level 2"
    organizationId?: string;
  }>;
  currencies: ReferenceDataItem[];
  loading: boolean;
  isSubmitted: boolean;
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
  currencies,
  loading,
  isSubmitted,
}) => {
  const handleChange = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<any>
  ) => {
    const value = event.target.value;
    setFormState(prev => {
      // Handle expense type changes
      if (field === 'expenseType') {
        const selectedType = expenseTypes.find(type => type.id === value);
        const previousType = expenseTypes.find(type => type.id === prev.expenseType);
        const isVehicleExpense = selectedType?.code === '4';
        const wasVehicleExpense = previousType?.code === '4';
        
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
  const showVehicleField = expenseTypes.find(type => type.id === formState.expenseType)?.code === '4';

  // Filter vehicles by organization
  const filteredVehicles = vehicles.filter(vehicle => 
    vehicle.active && vehicle.organizationId === formState.organization?.id
  );

  // Validate that vehicle is selected if expense type is vehicle
  React.useEffect(() => {
    if (showVehicleField && !formState.vehicle && filteredVehicles.length > 0) {
      setFormState(prev => ({
        ...prev,
        vehicle: undefined
      }));
    }
  }, [showVehicleField, filteredVehicles]);

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
        <OrganizationSelector
          value={formState.organization}
          onChange={(org) => {
            setFormState(prev => ({
              ...prev,
              organization: org
            }));
          }}
        />
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
            value={formState.department || ''}
            onChange={handleChange('department')}
            label="Department"
            disabled={loading}
          >
            <MenuItem value="">
              <em>Select a department</em>
            </MenuItem>
            {departments.map(dept => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Please select your department</FormHelperText>
        </FormControl>
      </Grid>

      {/* Project Category */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel id="project-category-label">Project Category</InputLabel>
          <Select
            labelId="project-category-label"
            id="project-category-select"
            value={formState.projectCategory || ''}
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
            value={formState.site || ''}
            onChange={handleChange('site')}
            label="Site"
            disabled={loading}
          >
            {sites.map(site => (
              <MenuItem key={site.id} value={site.id}>
                {site.code} - {site.name}
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
            value={formState.expenseType || ''}
            onChange={handleChange('expenseType')}
            label="Expense Type"
            disabled={loading}
          >
            {expenseTypes.map(type => (
              <MenuItem key={type.id} value={type.id}>
                {type.code} - {type.name}
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
              value={formState.vehicle || ''}
              onChange={handleChange('vehicle')}
              label="Vehicle"
              disabled={loading}
            >
              {filteredVehicles.map(vehicle => (
                <MenuItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.code} - {vehicle.name}
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
            value={formState.preferredVendor || ''}
            onChange={handleChange('preferredVendor')}
            label="Preferred Vendor"
            disabled={loading}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {vendors
              .filter(vendor => vendor.active)
              .map(vendor => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </MenuItem>
              ))}
            <MenuItem value="other">Other - I will write in</MenuItem>
          </Select>
          <FormHelperText>Optional - Select if you have a preferred vendor</FormHelperText>
        </FormControl>
      </Grid>

      {/* Custom Vendor Name - Only shown when "Other" is selected */}
      {formState.preferredVendor === 'other' && (
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            id="custom-vendor-input"
            label="Custom Vendor Name"
            value={formState.customVendorName || ''}
            onChange={handleChange('customVendorName')}
            required
            error={!formState.customVendorName}
            helperText={!formState.customVendorName ? 'Please enter the vendor name' : ''}
            disabled={loading}
          />
        </Grid>
      )}

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
            value={formState.currency || ''}
            onChange={handleChange('currency')}
            label="Currency"
            disabled={loading}
          >
            {currencies
              .filter(currency => currency.active)
              .map(currency => (
                <MenuItem key={currency.id} value={currency.code}>
                  {currency.code} - {currency.name}
                </MenuItem>
            ))}
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
            value={formState.isUrgent || false}
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

      {/* Required Date */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          type="date"
          label="Required Date *"
          value={formState.requiredDate ? (typeof formState.requiredDate === 'string' ? formState.requiredDate : formState.requiredDate.toISOString().split('T')[0]) : ''}
          onChange={(e) => {
            setFormState(prev => ({
              ...prev,
              requiredDate: e.target.value || null,
            }));
          }}
          required
          error={!formState.requiredDate && isSubmitted}
          helperText={!formState.requiredDate && isSubmitted ? "Required date is required" : ""}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>

      {/* Approvers */}
      <Grid item xs={12}>
        <Autocomplete
          multiple
          id="approvers-select"
          options={approvers}
          getOptionLabel={(option) => `${option.name} (${option.permissionLevel === 1 ? 'Global' : 'Organization'} Approver)`}
          value={approvers.filter(a => (formState.approvers || []).includes(a.id))}
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
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => {
              const { key, ...otherProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  label={`${option.name} (${option.permissionLevel === 1 ? 'Global' : 'Organization'})`}
                  {...otherProps}
                />
              );
            })
          }
        />
      </Grid>
    </Grid>
  );
};

export default BasicInformationStep;
