/**
 * @fileoverview Purchase Request Form Component
 * @version 1.2.0
 * 
 * Change History:
 * 1.0.0 - Initial implementation with basic form fields
 * 1.1.0 - Added multi-step form and validation
 * 1.2.0 - Added reference data integration and approver logic
 * 
 * Description:
 * This component provides a multi-step form for creating new purchase requests.
 * It handles the complete PR creation workflow including basic information,
 * line items, quotes, and approval routing based on organizational rules.
 * 
 * Architecture Notes:
 * - Uses Material-UI for form components and layout
 * - Integrates with Firestore for data persistence
 * - Implements complex business logic for approver routing
 * - Manages multiple form states and validation rules
 * 
 * Business Rules:
 * - PRs over $1,000 require admin approval
 * - PRs over $5,000 require multiple quotes
 * - PRs over $50,000 require finance approval
 * - Preferred vendors may bypass quote requirements
 * - Department heads must be in approval chain
 * 
 * Related Modules:
 * - src/services/referenceData.ts: Provides reference data
 * - src/services/approver.ts: Handles approver logic
 * - src/store/slices/prSlice.ts: Manages PR state
 * 
 * Form State Structure:
 * {
 *   basicInfo: { organization, requestor, etc. },
 *   lineItems: [{ description, quantity, etc. }],
 *   quotes: [{ vendor, amount, etc. }],
 *   approvers: [{ id, role, etc. }]
 * }
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { referenceDataService } from '../../services/referenceData';
import { approverService } from '../../services/approver';
import { ReferenceDataItem } from '../../types/referenceData';
import { RootState } from '../../store/types';

// Form steps definition
const steps = ['Basic Information', 'Line Items', 'Review'];

// Type definitions for form data structures
interface ReferenceDataItem {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
}

interface LineItem {
  description: string;
  quantity: number;
  uom: string;
  notes: string;
}

interface Quote {
  id: string;
  vendorName: string;
  amount: number;
  currency: string;
  notes: string;
}

// Main form state interface
interface FormState {
  organization: string;
  requestor: string;
  email: string;
  department: string;
  projectCategory: string;
  description: string;
  site: string;
  expenseType: string;
  vehicle?: string;
  estimatedAmount: number;
  currency: string;
  requiredDate: string;
  approvers: string[];
  preferredVendor?: string;
  lineItems: LineItem[];
  quotes: Quote[];
}

// Initial form state with default values
const initialState: FormState = {
  organization: '1PWR LESOTHO', // Default organization
  requestor: '',
  email: '',
  department: '',
  projectCategory: '',
  description: '',
  site: '',
  expenseType: '',
  vehicle: '',
  estimatedAmount: 0,
  currency: 'LSL',
  requiredDate: new Date().toISOString().split('T')[0],
  approvers: [],
  preferredVendor: '',
  lineItems: [],
  quotes: []
};

// Business rule thresholds
const PR_AMOUNT_THRESHOLDS = {
  ADMIN_APPROVAL: 1000,    // Requires admin approval above this amount
  QUOTES_REQUIRED: 5000,   // Requires multiple quotes above this amount
  FINANCE_APPROVAL: 50000  // Requires finance approval above this amount
};

/**
 * NewPRForm Component
 * 
 * A multi-step form component for creating new purchase requests.
 * Handles form state, validation, and submission to Firestore.
 * 
 * @component
 * @example
 * return (
 *   <NewPRForm />
 * )
 */
export const NewPRForm = () => {
  console.log('NewPRForm: Component mounting');
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const user = useSelector((state: RootState) => {
    console.log('NewPRForm: Getting user from state:', state.auth);
    return state.auth.user;
  });

  // Initialize state
  console.log('NewPRForm: Initializing with user:', user);
  if (!user) {
    console.error('NewPRForm: No user found in state');
    throw new Error('No user found');
  }

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference data states
  const [departments, setDepartments] = useState<ReferenceDataItem[]>([]);
  const [projectCategories, setProjectCategories] = useState<ReferenceDataItem[]>([]);
  const [sites, setSites] = useState<ReferenceDataItem[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ReferenceDataItem[]>([]);
  const [vehicles, setVehicles] = useState<ReferenceDataItem[]>([]);
  const [vendors, setVendors] = useState<ReferenceDataItem[]>([]);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [availableApprovers, setAvailableApprovers] = useState<any[]>([]);

  // Form state
  const [formState, setFormState] = useState<FormState>(() => {
    console.log('NewPRForm: Initializing form state with user:', user);
    return {
      ...initialState,
      organization: user?.organization || initialState.organization, // Use default if not set
      requestor: user?.name || '',
      email: user?.email || '',
      department: user?.department || ''
    };
  });

  // Quote requirements state
  const [requiresQuotes, setRequiresQuotes] = useState(false);
  const [requiresFinanceApproval, setRequiresFinanceApproval] = useState(false);
  const [isApprovedVendor, setIsApprovedVendor] = useState(false);

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      const organization = formState.organization; // Use form state organization
      if (!organization) {
        setError('No organization found');
        setLoading(false);
        return;
      }
      
      try {
        const [
          deptData,
          projectData,
          siteData,
          expenseData,
          vehicleData,
          vendorData,
          approverData
        ] = await Promise.all([
          referenceDataService.getDepartments(organization),
          referenceDataService.getProjectCategories(organization),
          referenceDataService.getSites(organization),
          referenceDataService.getExpenseTypes(organization),
          referenceDataService.getVehicles(organization),
          referenceDataService.getVendors(organization),
          approverService.getApprovers(organization)
        ]);

        setDepartments(deptData);
        setProjectCategories(projectData);
        setSites(siteData);
        setExpenseTypes(expenseData);
        setVehicles(vehicleData);
        setVendors(vendorData);
        setAvailableApprovers(approverData);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load form data');
        enqueueSnackbar('Error loading form data. Please try again.', { 
          variant: 'error',
          autoHideDuration: 5000
        });
      } finally {
        setLoading(false);
      }
    };

    loadReferenceData();
  }, [formState.organization, enqueueSnackbar]);

  // Update user info when it changes
  useEffect(() => {
    if (user) {
      setFormState(prev => ({
        ...prev,
        requestor: user.name || '',
        email: user.email || '',
        organization: user.organization || initialState.organization
      }));
    }
  }, [user]);

  // Update requirements based on amount and vendor
  useEffect(() => {
    console.log('NewPRForm: Updating requirements based on amount and vendor');
    try {
      const amount = formState.estimatedAmount;
      const hasPreferredVendor = Boolean(formState.preferredVendor);
      
      // If amount is over threshold and no preferred vendor, require quotes
      const needsQuotes = amount >= PR_AMOUNT_THRESHOLDS.QUOTES_REQUIRED && !hasPreferredVendor;
      const needsFinanceApproval = amount >= PR_AMOUNT_THRESHOLDS.FINANCE_APPROVAL;
      
      console.log('NewPRForm: Setting requirements:', {
        amount,
        hasPreferredVendor,
        needsQuotes,
        needsFinanceApproval
      });

      setRequiresQuotes(needsQuotes);
      setRequiresFinanceApproval(needsFinanceApproval);
      setIsApprovedVendor(hasPreferredVendor);
    } catch (error) {
      console.error('NewPRForm: Error updating requirements:', error);
    }
  }, [formState.estimatedAmount, formState.preferredVendor]);

  // Handle next step
  const handleNext = () => {
    console.log('Current step:', activeStep);
    console.log('Current form state:', formState);
    
    if (activeStep === 0) {
      console.log('Validating basic info...');
      const isValid = validateBasicInfo();
      console.log('Basic info validation result:', isValid);
      if (!isValid) {
        console.log('Basic info validation failed');
        return;
      }
      console.log('Basic info validation passed, moving to next step');
    } else if (activeStep === 1) {
      console.log('Validating line items...');
      const isValid = validateLineItems();
      console.log('Line items validation result:', isValid);
      if (!isValid) {
        console.log('Line items validation failed');
        return;
      }
      console.log('Line items validation passed, moving to next step');
    }

    setActiveStep(prevStep => {
      const nextStep = prevStep + 1;
      console.log('Moving from step', prevStep, 'to', nextStep);
      return nextStep;
    });
  };

  // Validation functions
  const validateBasicInfo = () => {
    try {
      console.log('Starting basic info validation...');
      console.log('Form state:', formState);
      
      const requiredFields = [
        'organization',
        'requestor',
        'email',
        'department',
        'projectCategory',
        'description',
        'site',
        'expenseType',
        'estimatedAmount',
        'requiredDate'
      ];

      // Check for empty required fields
      const missingFields = requiredFields.filter(field => {
        const value = formState[field as keyof FormState];
        const isEmpty = value === undefined || value === null || value === '' || 
                     (typeof value === 'number' && value <= 0);
        if (isEmpty) {
          console.log(`Field ${field} is empty:`, value);
        }
        return isEmpty;
      });

      if (missingFields.length > 0) {
        console.log('Missing required fields:', missingFields);
        enqueueSnackbar(`Please fill in: ${missingFields.join(', ')}`, { 
          variant: 'error',
          autoHideDuration: 5000
        });
        return false;
      }

      // Check vehicle if expense type is vehicle
      if (formState.expenseType === 'vehicle' && !formState.vehicle) {
        console.log('Vehicle not selected for vehicle expense type');
        enqueueSnackbar('Please select a vehicle', { 
          variant: 'error',
          autoHideDuration: 5000
        });
        return false;
      }

      // Check approvers
      if (!formState.approvers || formState.approvers.length === 0) {
        console.log('No approvers selected');
        enqueueSnackbar('Please select at least one approver', { 
          variant: 'error',
          autoHideDuration: 5000
        });
        return false;
      }

      console.log('All validations passed');
      return true;
    } catch (error) {
      console.error('Error in validateBasicInfo:', error);
      enqueueSnackbar('An error occurred during validation', { 
        variant: 'error',
        autoHideDuration: 5000
      });
      return false;
    }
  };

  const validateLineItems = () => {
    try {
      console.log('Starting line items validation...');
      console.log('Form state:', formState);
      
      if (!formState.lineItems || formState.lineItems.length === 0) {
        console.log('No line items found');
        enqueueSnackbar('Please add at least one line item', { 
          variant: 'error',
          autoHideDuration: 5000 
        });
        return false;
      }

      // Check if all line items have required fields
      const invalidItems = formState.lineItems.filter(item => {
        console.log('Checking line item:', item);
        return !item.description || 
               !item.quantity || 
               item.quantity <= 0 || 
               !item.uom;
      });

      if (invalidItems.length > 0) {
        console.log('Invalid line items found:', invalidItems);
        enqueueSnackbar(
          'All line items must have a description, quantity > 0, and unit of measure', 
          { variant: 'error', autoHideDuration: 5000 }
        );
        return false;
      }

      console.log('All validations passed');
      return true;
    } catch (error) {
      console.error('Error in validateLineItems:', error);
      enqueueSnackbar('An error occurred during validation', { 
        variant: 'error',
        autoHideDuration: 5000
      });
      return false;
    }
  };

  const validateForm = () => {
    try {
      console.log('Starting form validation...');
      console.log('Form state:', formState);
      
      const requiredFields = [
        'organization',
        'requestor',
        'email',
        'department',
        'description',
        'site',
        'expenseType',
        'currency',
        'requiredDate'
      ];

      const missingFields = requiredFields.filter(field => !formState[field as keyof FormState]);
      
      if (missingFields.length > 0) {
        console.log('Missing required fields:', missingFields);
        enqueueSnackbar(`Please fill in all required fields: ${missingFields.join(', ')}`, {
          variant: 'error'
        });
        return false;
      }

      if (formState.estimatedAmount <= 0) {
        console.log('Estimated amount must be greater than 0');
        enqueueSnackbar('Estimated amount must be greater than 0', { variant: 'error' });
        return false;
      }

      // Check for admin approval requirement
      if (formState.estimatedAmount <= PR_AMOUNT_THRESHOLDS.ADMIN_APPROVAL) {
        const hasAdmin = formState.approvers.some(a => a === 'admin@1pwrafrica.com');
        if (!hasAdmin) {
          console.log('PRs under LSL 1,000 must be approved by admin');
          enqueueSnackbar('PRs under LSL 1,000 must be approved by admin', { variant: 'error' });
          return false;
        }
      }

      // Validate quotes if required
      if (requiresQuotes && (!formState.quotes || formState.quotes.length < 3)) {
        console.log('Three quotes are required for this amount');
        enqueueSnackbar(
          `Three quotes are required for amounts over LSL ${PR_AMOUNT_THRESHOLDS.QUOTES_REQUIRED.toLocaleString()}` +
          (isApprovedVendor ? ' (unless using an approved vendor)' : ''),
          { variant: 'error' }
        );
        return false;
      }

      console.log('All validations passed');
      return true;
    } catch (error) {
      console.error('Error in validateForm:', error);
      enqueueSnackbar('An error occurred during validation', { 
        variant: 'error',
        autoHideDuration: 5000
      });
      return false;
    }
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    console.log('Updating line item:', index, field, value);
    
    setFormState(prev => {
      const newLineItems = [...prev.lineItems];
      newLineItems[index] = {
        ...newLineItems[index],
        [field]: value
      };

      console.log('Updated line items:', newLineItems);
      return {
        ...prev,
        lineItems: newLineItems
      };
    });
  };

  const handleAddLineItem = () => {
    console.log('Adding new line item');
    setFormState(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          description: '',
          quantity: 1,
          uom: '',
          notes: ''
        }
      ]
    }));
  };

  const handleRemoveLineItem = (index: number) => {
    console.log('Removing line item:', index);
    setFormState(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const handleAddQuote = () => {
    setFormState(prev => ({
      ...prev,
      quotes: [
        ...prev.quotes,
        {
          id: crypto.randomUUID(),
          vendorName: '',
          amount: 0,
          currency: '',
          notes: ''
        }
      ]
    }));
  };

  const handleRemoveQuote = (index: number) => {
    setFormState(prev => ({
      ...prev,
      quotes: prev.quotes.filter((_, i) => i !== index)
    }));
  };

  const handleQuoteChange = (index: number, field: string, value: any) => {
    setFormState(prev => {
      const newQuotes = [...prev.quotes];
      newQuotes[index] = {
        ...newQuotes[index],
        [field]: value
      };
      return {
        ...prev,
        quotes: newQuotes
      };
    });
  };

  const handleSubmit = async () => {
    console.log('Submitting form...', formState);
    setSubmitting(true);

    try {
      if (!validateForm()) {
        setSubmitting(false);
        return;
      }

      // Create PR document in Firestore
      const prRef = await addDoc(collection(db, 'purchaseRequests'), {
        ...formState,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('PR created with ID:', prRef.id);
      enqueueSnackbar('Purchase Request submitted successfully!', { variant: 'success' });
      
      // Reset form and navigate back
      setFormState(initialState);
      navigate('/purchase-requests');
    } catch (error) {
      console.error('Error submitting PR:', error);
      enqueueSnackbar('Error submitting Purchase Request. Please try again.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderBasicInfo = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Organization"
          value={formState.organization}
          onChange={(e) => handleInputChange('organization', e.target.value)}
          required
          disabled
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Department"
          value={formState.department}
          onChange={(e) => handleInputChange('department', e.target.value)}
          required
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Requestor Name"
          value={formState.requestor}
          onChange={(e) => handleInputChange('requestor', e.target.value)}
          required
          disabled
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={formState.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          required
          disabled
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel>Project Category</InputLabel>
          <Select
            value={formState.projectCategory}
            onChange={(e) => handleInputChange('projectCategory', e.target.value)}
            label="Project Category"
          >
            {projectCategories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel>Site</InputLabel>
          <Select
            value={formState.site}
            onChange={(e) => handleInputChange('site', e.target.value)}
            label="Site"
          >
            {sites.map((site) => (
              <MenuItem key={site.id} value={site.id}>
                {site.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel>Expense Type</InputLabel>
          <Select
            value={formState.expenseType}
            onChange={(e) => handleInputChange('expenseType', e.target.value)}
            label="Expense Type"
          >
            {expenseTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      {formState.expenseType === 'vehicle' && (
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Vehicle</InputLabel>
            <Select
              value={formState.vehicle}
              onChange={(e) => handleInputChange('vehicle', e.target.value)}
              label="Vehicle"
            >
              {vehicles.map((vehicle) => (
                <MenuItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      )}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Preferred Vendor</InputLabel>
          <Select
            value={formState.preferredVendor}
            onChange={(e) => handleInputChange('preferredVendor', e.target.value)}
            label="Preferred Vendor"
          >
            {vendors.map((vendor) => (
              <MenuItem key={vendor.id} value={vendor.id}>
                {vendor.name}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            Select if you have a specific vendor in mind. This may affect quote requirements.
          </FormHelperText>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Estimated Amount"
          type="number"
          value={formState.estimatedAmount}
          onChange={(e) => handleInputChange('estimatedAmount', parseFloat(e.target.value))}
          required
          InputProps={{
            startAdornment: <InputLabel>LSL</InputLabel>,
            inputProps: { min: 0 }
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel>Approvers</InputLabel>
          <Select
            multiple
            value={formState.approvers}
            onChange={(e) => {
              console.log('Selected approvers:', e.target.value);
              handleInputChange('approvers', e.target.value);
            }}
            label="Approvers"
          >
            {availableApprovers.map((approver) => (
              <MenuItem key={approver.id} value={approver.id}>
                {approver.name} ({approver.email})
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Select at least one approver</FormHelperText>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Required Date"
          type="date"
          value={formState.requiredDate}
          onChange={(e) => handleInputChange('requiredDate', e.target.value)}
          required
          InputLabelProps={{
            shrink: true,
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          multiline
          rows={3}
          value={formState.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          required
          helperText="Provide a detailed description of what you need and why"
        />
      </Grid>
    </Grid>
  );

  const renderQuotesSection = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6">
          Quotes {requiresQuotes && <span style={{ color: 'red' }}>*</span>}
        </Typography>
        {requiresQuotes && (
          <Typography variant="body2" color="textSecondary">
            Three quotes are required for this amount
            {formState.estimatedAmount > PR_AMOUNT_THRESHOLDS.FINANCE_APPROVAL && 
              ". This PR will require adjudication review before proceeding to PO."
            }
          </Typography>
        )}
      </Grid>
      {formState.quotes?.map((quote, index) => (
        <Grid item xs={12} key={quote.id}>
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Vendor Name"
                    value={quote.vendorName}
                    onChange={(e) => handleQuoteChange(index, 'vendorName', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    value={quote.amount}
                    onChange={(e) => handleQuoteChange(index, 'amount', Number(e.target.value))}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Currency"
                    value={quote.currency}
                    onChange={(e) => handleQuoteChange(index, 'currency', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={2}
                    value={quote.notes}
                    onChange={(e) => handleQuoteChange(index, 'notes', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
            <CardActions>
              <Button
                startIcon={<DeleteIcon />}
                onClick={() => handleRemoveQuote(index)}
                color="error"
              >
                Remove Quote
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
      <Grid item xs={12}>
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddQuote}
          variant="outlined"
        >
          Add Quote
        </Button>
      </Grid>
    </Grid>
  );

  const renderLineItems = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Line Items
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Add items you need to purchase. Procurement will determine prices later.
      </Typography>
      
      {formState.lineItems.map((item, index) => (
        <Paper key={index} sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={11}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={item.description}
                    onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                    required
                    helperText="Detailed description of the item needed"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value))}
                    required
                    InputProps={{
                      inputProps: { min: 1 }
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Unit of Measure"
                    value={item.uom}
                    onChange={(e) => handleLineItemChange(index, 'uom', e.target.value)}
                    required
                    helperText="e.g., kg, L, pieces"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={2}
                    value={item.notes}
                    onChange={(e) => handleLineItemChange(index, 'notes', e.target.value)}
                    helperText="Any additional specifications or requirements"
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={1}>
              <IconButton
                onClick={() => handleRemoveLineItem(index)}
                disabled={formState.lineItems.length === 1}
              >
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Paper>
      ))}
      
      <Button
        startIcon={<AddIcon />}
        onClick={handleAddLineItem}
        variant="outlined"
        sx={{ mt: 2 }}
      >
        Add Another Item
      </Button>
    </Box>
  );

  const renderReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Purchase Request
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Basic Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Organization: {formState.organization}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Department: {formState.department}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Requestor: {formState.requestor}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Email: {formState.email}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Project Category: {formState.projectCategory}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Site: {formState.site}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Expense Type: {formState.expenseType}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              Required Date: {formState.requiredDate}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="textSecondary">
              Description: {formState.description}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Line Items
        </Typography>
        {formState.lineItems.map((item, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Item {index + 1}:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2">
                  Description: {item.description}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Quantity: {item.quantity}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Unit of Measure: {item.uom}
                </Typography>
              </Grid>
              {item.notes && (
                <Grid item xs={12}>
                  <Typography variant="body2">
                    Notes: {item.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        ))}
      </Paper>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <CircularProgress size={24} /> : 'Submit Purchase Request'}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        New Purchase Request
      </Typography>

      {error ? (
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Box>
      ) : loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading form data...</Typography>
        </Box>
      ) : (
        <>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mt: 4, mb: 2 }}>
            {activeStep === 0 && renderBasicInfo()}
            {activeStep === 1 && renderLineItems()}
            {activeStep === 2 && renderReview()}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              onClick={handleBack}
              sx={{ mr: 1 }}
              disabled={activeStep === 0}
            >
              Back
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
                endIcon={submitting ? <CircularProgress size={20} /> : null}
              >
                Submit
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => {
                  console.log('Next button clicked');
                  handleNext();
                }}
              >
                Next
              </Button>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};
