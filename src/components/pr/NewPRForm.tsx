import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { PR } from '../../types/pr';
import { prService } from '../../services/pr';
import { RootState } from '../../store';
import { User } from '../../types/user';
import { referenceDataService } from '../../services/referenceData';
import { ReferenceDataItem } from '../../types/referenceData';

const steps = ['Basic Information', 'Line Items', 'Review'];

interface ReferenceDataItem {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
}

interface FormState {
  organization: string;
  requestor: string;
  email: string;
  department: string;
  projectCategory: string;
  description: string;
  site: string;
  expenseType: string;
  vehicle: string;
  vendor: string;
  estimatedAmount: number;
  requiredDate: string;
  lineItems: {
    id: string;
    description: string;
    quantity: number;
    uom: string;
    notes: string;
  }[];
  attachments: any[];
}

export const NewPRForm = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useSelector((state: RootState) => state.auth);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reference data state
  const [departments, setDepartments] = useState<ReferenceDataItem[]>([]);
  const [projectCategories, setProjectCategories] = useState<ReferenceDataItem[]>([]);
  const [sites, setSites] = useState<ReferenceDataItem[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ReferenceDataItem[]>([]);
  const [vehicles, setVehicles] = useState<ReferenceDataItem[]>([]);
  const [vendors, setVendors] = useState<ReferenceDataItem[]>([]);

  // Form state
  const [formState, setFormState] = useState<FormState>({
    organization: '',
    requestor: user?.displayName || '',
    email: user?.email || '',
    department: '',
    projectCategory: '',
    description: '',
    site: '',
    expenseType: '',
    vehicle: '',
    vendor: '',
    estimatedAmount: 0,
    requiredDate: '',
    lineItems: [],
    attachments: []
  });

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [
          deptData,
          projectCatData,
          siteData,
          expenseTypeData,
          vehicleData,
          vendorData
        ] = await Promise.all([
          referenceDataService.getDepartments(),
          referenceDataService.getProjectCategories(),
          referenceDataService.getSites(),
          referenceDataService.getExpenseTypes(),
          referenceDataService.getVehicles(),
          referenceDataService.getVendors()
        ]);

        setDepartments(deptData);
        setProjectCategories(projectCatData);
        setSites(siteData);
        setExpenseTypes(expenseTypeData);
        setVehicles(vehicleData);
        setVendors(vendorData);
      } catch (error) {
        console.error('Error loading reference data:', error);
        enqueueSnackbar('Error loading form data', { variant: 'error' });
      }
    };

    loadReferenceData();

    // Cleanup function
    return () => {
      setFormState({
        organization: '',
        requestor: '',
        email: '',
        department: '',
        projectCategory: '',
        description: '',
        site: '',
        expenseType: '',
        vehicle: '',
        vendor: '',
        estimatedAmount: 0,
        requiredDate: '',
        lineItems: [],
        attachments: []
      });
      setActiveStep(0);
      setLoading(false);
    };
  }, [user, enqueueSnackbar]);

  const validateBasicInfo = () => {
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

    const errors: string[] = [];

    requiredFields.forEach(field => {
      if (!formState[field]) {
        errors.push(`${field} is required`);
      }
    });

    if (formState.estimatedAmount <= 0) {
      errors.push('Estimated amount must be greater than 0');
    }

    if (errors.length > 0) {
      enqueueSnackbar(errors[0], { variant: 'error' });
      return false;
    }

    return true;
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    setFormState(prev => {
      const newLineItems = [...prev.lineItems];
      newLineItems[index] = {
        ...newLineItems[index],
        [field]: value
      };
      return {
        ...prev,
        lineItems: newLineItems
      };
    });
  };

  const handleAddLineItem = () => {
    setFormState(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          id: crypto.randomUUID(),
          description: '',
          quantity: 1,
          uom: '',
          notes: ''
        }
      ]
    }));
  };

  const handleRemoveLineItem = (index: number) => {
    setFormState(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const validateLineItems = () => {
    const errors: string[] = [];
    
    if (formState.lineItems.length === 0) {
      errors.push('At least one line item is required');
      return false;
    }

    for (const item of formState.lineItems) {
      if (!item.description) {
        errors.push('Line item description is required');
      }
      if (item.quantity < 1) {
        errors.push('Quantity must be at least 1');
      }
      if (!item.uom) {
        errors.push('Unit of measure (UOM) is required');
      }
    }

    if (errors.length > 0) {
      enqueueSnackbar(errors[0], { variant: 'error' });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateBasicInfo()) {
      return;
    }

    if (activeStep === 1 && !validateLineItems()) {
      return;
    }

    setActiveStep(prevStep => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const prData = {
        ...formState,
        createdBy: user?.id || '',
        status: 'DRAFT',
      };

      await prService.createPR(prData);
      enqueueSnackbar('Purchase Request created successfully', { variant: 'success' });
      
      // Reset form state before navigating
      setFormState({
        organization: '',
        requestor: '',
        email: '',
        department: '',
        projectCategory: '',
        description: '',
        site: '',
        expenseType: '',
        vehicle: '',
        vendor: '',
        estimatedAmount: 0,
        requiredDate: '',
        lineItems: [],
        attachments: []
      });
      setActiveStep(0);
      
      // Navigate after state cleanup
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating PR:', error);
      enqueueSnackbar('Failed to create Purchase Request', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Organization"
          value={formState.organization}
          onChange={(e) => handleInputChange('organization', e.target.value)}
          disabled
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Requestor"
          value={formState.requestor}
          onChange={(e) => handleInputChange('requestor', e.target.value)}
          required
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
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Department"
          select
          value={formState.department}
          onChange={(e) => handleInputChange('department', e.target.value)}
          required
        >
          {departments.map((dept) => (
            <MenuItem key={dept.id} value={dept.id}>
              {dept.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Project Category"
          select
          value={formState.projectCategory}
          onChange={(e) => handleInputChange('projectCategory', e.target.value)}
          required
        >
          {projectCategories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          multiline
          rows={4}
          value={formState.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          required
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Site"
          select
          value={formState.site}
          onChange={(e) => handleInputChange('site', e.target.value)}
          required
        >
          {sites.map((site) => (
            <MenuItem key={site.id} value={site.id}>
              {site.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Expense Type"
          select
          value={formState.expenseType}
          onChange={(e) => handleInputChange('expenseType', e.target.value)}
          required
        >
          {expenseTypes.map((type) => (
            <MenuItem key={type.id} value={type.id}>
              {type.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {formState.expenseType === 'vehicle' && (
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Vehicle"
            select
            value={formState.vehicle}
            onChange={(e) => handleInputChange('vehicle', e.target.value)}
          >
            {vehicles.map((vehicle) => (
              <MenuItem key={vehicle.id} value={vehicle.id}>
                {vehicle.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      )}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Preferred Vendor (Optional)"
          select
          value={formState.vendor}
          onChange={(e) => handleInputChange('vendor', e.target.value)}
        >
          {vendors.map((vendor) => (
            <MenuItem key={vendor.id} value={vendor.id}>
              {vendor.name}
            </MenuItem>
          ))}
        </TextField>
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
            inputProps: { min: 0 }
          }}
        />
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
                onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
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
            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end">
                <IconButton
                  onClick={() => handleRemoveLineItem(index)}
                  disabled={formState.lineItems.length === 1}
                  color="error"
                  title="Remove item"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
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
      <Typography variant="h6" gutterBottom>Review Your Request</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Organization</Typography>
          <Typography variant="body1" color="textSecondary">
            {formState.organization}
          </Typography>
        </Grid>
        {/* ... other review fields ... */}
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
        Line Items
      </Typography>
      {formState.lineItems.map((item, index) => (
        <Paper key={index} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">{item.description}</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="textSecondary">
                Quantity: {item.quantity} {item.uom}
              </Typography>
            </Grid>
            {item.notes && (
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Notes: {item.notes}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      ))}
    </Box>
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <form onSubmit={(e) => handleSubmit()} noValidate>
        {loading ? (
          <Box display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2, mb: 2 }}>
            {activeStep === 0 && renderBasicInfo()}
            {activeStep === 1 && renderLineItems()}
            {activeStep === 2 && renderReview()}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </Box>
      </form>
    </Box>
  );
};
