import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Grid,
  Paper,
  IconButton,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { RootState } from '../../store';
import { prService } from '../../services/pr';
import { setCurrentPR } from '../../store/slices/prSlice';
import { PRRequest, PRItem } from '../../types/pr';

const steps = ['Basic Information', 'Items', 'Review'];

interface FormData {
  department: string;
  projectCategory: string;
  site: string;
  currency: string;
  items: PRItem[];
}

const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
const departments = ['Engineering', 'Marketing', 'Sales', 'Operations', 'HR'];
const projectCategories = ['Hardware', 'Software', 'Office Supplies', 'Travel', 'Other'];
const sites = ['HQ', 'Remote', 'Site A', 'Site B'];

export const NewPRForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      department: '',
      projectCategory: '',
      site: '',
      currency: 'USD',
      items: [{ id: '', description: '', quantity: 1, unitPrice: 0, currency: 'USD', totalPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');
  const totalAmount = watchItems?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setLoading(true);
    try {
      // Calculate total amount and prepare items
      const items = data.items.map((item, index) => ({
        ...item,
        id: \`item_\${index}\`,
        totalPrice: item.quantity * item.unitPrice,
        currency: data.currency,
      }));

      const prData: Omit<PRRequest, 'id' | 'createdAt' | 'updatedAt'> = {
        requestor: user,
        status: 'DRAFT',
        items,
        approvers: [], // Will be assigned based on amount and department
        totalAmount,
        currency: data.currency,
        department: data.department,
        projectCategory: data.projectCategory,
        site: data.site,
      };

      const prId = await prService.createPR(prData);
      const newPR = await prService.getPR(prId);
      if (newPR) {
        dispatch(setCurrentPR(newPR));
        navigate(\`/pr/\${prId}\`);
      }
    } catch (error) {
      console.error('Error creating PR:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Controller
          name="department"
          control={control}
          rules={{ required: 'Department is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Department"
              select
              error={!!errors.department}
              helperText={errors.department?.message}
            >
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Controller
          name="projectCategory"
          control={control}
          rules={{ required: 'Project Category is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Project Category"
              select
              error={!!errors.projectCategory}
              helperText={errors.projectCategory?.message}
            >
              {projectCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Controller
          name="site"
          control={control}
          rules={{ required: 'Site is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Site"
              select
              error={!!errors.site}
              helperText={errors.site?.message}
            >
              {sites.map((site) => (
                <MenuItem key={site} value={site}>
                  {site}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Controller
          name="currency"
          control={control}
          rules={{ required: 'Currency is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Currency"
              select
              error={!!errors.currency}
              helperText={errors.currency?.message}
            >
              {currencies.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      </Grid>
    </Grid>
  );

  const renderItems = () => (
    <Box>
      {fields.map((field, index) => (
        <Paper key={field.id} sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <Controller
                name={\`items.\${index}.description\`}
                control={control}
                rules={{ required: 'Description is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Description"
                    error={!!errors.items?.[index]?.description}
                    helperText={errors.items?.[index]?.description?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name={\`items.\${index}.quantity\`}
                control={control}
                rules={{ required: 'Quantity is required', min: 1 }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Quantity"
                    error={!!errors.items?.[index]?.quantity}
                    helperText={errors.items?.[index]?.quantity?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name={\`items.\${index}.unitPrice\`}
                control={control}
                rules={{ required: 'Unit Price is required', min: 0 }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Unit Price"
                    error={!!errors.items?.[index]?.unitPrice}
                    helperText={errors.items?.[index]?.unitPrice?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body1">
                Total: {watchItems[index]?.quantity * watchItems[index]?.unitPrice || 0}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={1}>
              <IconButton onClick={() => remove(index)} disabled={fields.length === 1}>
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Paper>
      ))}
      <Button
        startIcon={<AddIcon />}
        onClick={() =>
          append({
            id: '',
            description: '',
            quantity: 1,
            unitPrice: 0,
            currency: watch('currency'),
            totalPrice: 0,
          })
        }
      >
        Add Item
      </Button>
    </Box>
  );

  const renderReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        PR Summary
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Department</Typography>
          <Typography variant="body1" color="textSecondary">
            {watch('department')}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Project Category</Typography>
          <Typography variant="body1" color="textSecondary">
            {watch('projectCategory')}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Site</Typography>
          <Typography variant="body1" color="textSecondary">
            {watch('site')}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1">Currency</Typography>
          <Typography variant="body1" color="textSecondary">
            {watch('currency')}
          </Typography>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
        Items
      </Typography>
      {watchItems.map((item, index) => (
        <Paper key={index} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">{item.description}</Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                Quantity: {item.quantity}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                Unit Price: {item.unitPrice}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                Total: {item.quantity * item.unitPrice}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      ))}

      <Typography variant="h6" sx={{ mt: 2 }}>
        Total Amount: {watch('currency')} {totalAmount}
      </Typography>
    </Box>
  );

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderItems();
      case 2:
        return renderReview();
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        New Purchase Request
      </Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <form onSubmit={handleSubmit(onSubmit)}>
        {getStepContent(activeStep)}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          {activeStep !== 0 && (
            <Button onClick={handleBack} sx={{ mr: 1 }}>
              Back
            </Button>
          )}
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              Submit PR
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          )}
        </Box>
      </form>
    </Box>
  );
};
