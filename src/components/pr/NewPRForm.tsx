/**
 * @fileoverview Purchase Request Form Component
 * @version 2.0.0
 * 
 * Description:
 * Complex form component for creating and editing purchase requests.
 * Implements a multi-step wizard with validation, file uploads,
 * and dynamic form fields based on PR type and organization settings.
 * 
 * Features:
 * - Multi-step form wizard
 * - Form state management with React Hooks
 * - File upload with preview
 * - Dynamic validation rules
 * - Auto-save functionality
 * - Mobile-responsive design
 * 
 * Form Steps:
 * 1. Basic Information
 *    - Organization and department
 *    - Requestor and email
 *    - Project category and site
 *    - Expense type and description
 * 
 * 2. Line Items
 *    - Item details
 *    - Quantity and UOM
 *    - Notes and attachments
 * 
 * 3. Review & Submit
 *    - Summary view
 *    - Total calculation
 *    - Submit for approval
 * 
 * Props:
 * ```typescript
 * interface NewPRFormProps {
 *   initialData?: Partial<FormState>;  // For edit mode
 *   onSubmit: (data: FormState) => Promise<void>;
 *   onCancel: () => void;
 * }
 * ```
 * 
 * State Management:
 * - Form data in React Hooks
 * - File uploads in local state
 * - Validation state in React Hooks
 * - Step navigation in local state
 * 
 * Related Components:
 * - components/pr/steps/*: Step components
 * - components/common/FileUpload: File handling
 * - services/pr.ts: PR data service
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Card,
  CardContent,
  CardActions,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { PRStatus } from '../../types/pr';
import { RootState } from '../../store/types';
import { setUserPRs } from '../../store/slices/prSlice';
import { referenceDataService } from '../../services/referenceData';
import { approverService } from '../../services/approver';
import { Attachment } from '../../types/pr'; // Import Attachment
import { ReferenceDataItem } from '../../types/referenceData'; // Re-add import
import { BasicInformationStep } from './steps/BasicInformationStep';
import { LineItemsStep } from './steps/LineItemsStep';
import { ReviewStep } from './steps/ReviewStep';
import { createPR, getUserPRs } from '../../services/pr'; // Updated import
import {handleNext} from '../pr/PRView';
// Form steps definition
const steps = ['Basic Information', 'Line Items', 'Review'];

// Type definitions for form data structures
interface LineItem {
  description: string;
  quantity: number;
  uom: string;
  notes: string;
  attachments: Attachment[]; // Use Attachment type
}

interface Quote {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  currency: string;
  quoteDate: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  attachments?: Attachment[]; // Use Attachment type
}

// Main form state interface
export interface FormState {
  organization: { id: string; name: string } | null;
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
  requiredDate: string | null;
  approvers: string[];
  preferredVendor?: string;
  customVendorName?: string;
  lineItems: LineItem[];
  quotes: Quote[];
  isUrgent: boolean;
}

// Business rule thresholds - DEFAULT VALUES ONLY
// IMPORTANT: These values should be retrieved from the Rules collection
// which contains administrator-configurable thresholds
// These constants are used only as fallbacks
const PR_AMOUNT_THRESHOLDS = {
  ADMIN_APPROVAL: 1000,    // Default value - actual threshold from Rules collection
  QUOTES_REQUIRED: 5000,   // Default value - actual threshold from Rules collection
  FINANCE_APPROVAL: 50000  // Default value - actual threshold from Rules collection
} as const;

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
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  // Memoize selector to prevent unnecessary re-renders
  const { user, loading: authLoading } = useSelector((state: RootState) => {
    console.log('NewPRForm: Getting user from state:', state.auth);
    return {
      user: state.auth.user,
      loading: state.auth.loading
    };
  }, (prev, next) => {
    return prev.user?.id === next.user?.id && 
           prev.loading === next.loading;
  });

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Form loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Reference data state
  const [departments, setDepartments] = useState<ReferenceDataItem[]>([]);
  const [projectCategories, setProjectCategories] = useState<ReferenceDataItem[]>([]);
  const [sites, setSites] = useState<ReferenceDataItem[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ReferenceDataItem[]>([]);
  const [vehicles, setVehicles] = useState<ReferenceDataItem[]>([]);
  const [vendors, setVendors] = useState<ReferenceDataItem[]>([]);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [availableApprovers, setAvailableApprovers] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<ReferenceDataItem[]>([]);

  // Business rule state
  const [requiresFinanceApproval, setRequiresFinanceApproval] = useState(false);

  // Initial form state
  const initialFormState = useMemo(() => ({
    organization: {
      id: '1pwr_lesotho',
      name: '1PWR LESOTHO'
    },
    requestor: user ? `${user.firstName} ${user.lastName}` : '',
    email: user?.email || '',
    department: '',
    projectCategory: '',
    description: '',
    site: '',
    expenseType: '',
    vehicle: undefined,
    estimatedAmount: 0,
    currency: 'LSL',
    requiredDate: null,
    approvers: [],
    preferredVendor: undefined,
    customVendorName: undefined,
    lineItems: [],
    quotes: [], // Keep this for compatibility with PR View
    isUrgent: false
  }), [user]);

  // Form state
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Validation state
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load reference data when organization changes
  useEffect(() => {
    const loadReferenceData = async () => {
      if (!formState.organization) {
        console.log('No organization selected, skipping reference data load');
        return;
      }

      setIsLoadingData(true);
      console.log('Loading reference data for organization:', formState.organization);

      try {
        // Load departments first
        const deptItems = await referenceDataService.getDepartments(formState.organization);
        console.log('Loaded departments:', deptItems);
        setDepartments(deptItems);

        // Load other reference data
        const [
          projectCategoryItems,
          siteItems,
          expenseTypeItems,
          vehicleItems,
          vendorItems,
          approverItems,
          currencyItems
        ] = await Promise.all([
          referenceDataService.getProjectCategories(formState.organization.id),
          referenceDataService.getSites(formState.organization.id),
          referenceDataService.getExpenseTypes(formState.organization.id),
          referenceDataService.getVehicles(formState.organization.id),
          referenceDataService.getVendors(),
          approverService.getApprovers(formState.organization.id),
          referenceDataService.getCurrencies()
        ]);

        setProjectCategories(projectCategoryItems);
        setSites(siteItems);
        setExpenseTypes(expenseTypeItems);
        setVehicles(vehicleItems);
        setVendors(vendorItems);
        setApprovers(approverItems);
        setAvailableApprovers(approverItems);
        setCurrencies(currencyItems);

      } catch (error) {
        console.error('Error loading reference data:', error);
        setError('Failed to load form data. Please try again.');
        enqueueSnackbar('Failed to load form data', { variant: 'error' });
      } finally {
        setIsLoadingData(false);
        setIsInitialized(true);
      }
    };

    if (!isInitialized) {
      loadReferenceData();
    }
  }, [formState.organization, isInitialized, enqueueSnackbar]);

  // Load data on mount
  useEffect(() => {
    setIsLoading(true);
  }, []);

  // Reset initialization on unmount
  useEffect(() => {
    return () => {
      setIsInitialized(false);
    };
  }, []);

  // Handle auth loading state
  useEffect(() => {
    if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading]);

  // Update form state when user changes
  useEffect(() => {
    if (user) {
      setFormState(prev => ({
        ...prev,
        requestor: `${user.firstName} ${user.lastName}`,
        email: user.email,
        createdBy: user.id,
        requester: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          department: formState.department || '' // Use formState department
        }
      }));
    }
  }, [user]);

  // Effect to update requirements based on amount and vendor
  useEffect(() => {
    console.log('NewPRForm: Updating requirements based on amount and vendor');
    try {
      const amount = formState.estimatedAmount;
      const needsFinanceApproval = amount >= PR_AMOUNT_THRESHOLDS.FINANCE_APPROVAL;
      
      console.log('NewPRForm: Setting requirements:', {
        amount,
        needsFinanceApproval
      });

      setRequiresFinanceApproval(needsFinanceApproval);
    } catch (error) {
      console.error('NewPRForm: Error updating requirements:', error);
    }
  }, [formState.estimatedAmount]);

  // Form navigation handlers
  // const handleNext = useCallback(() => {
  //   setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  //   // Reset validation state when moving to a new step
  //   setValidationAttempted(false);
  //   setValidationErrors([]);
  // }, [steps.length]);



const handleNext = async () => {
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "bokangleqele7@gmail.com" }),
    });
    console.log('Response status:', res.status);

    if (!res.ok) {
      const text = await res.text();
      console.log('Response text:', text);
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    const data = await res.json();
    console.log('Response data:', data);

    if (data.success) {
      console.log("Email sent ");
      setError(null);
    } else {
      console.error("Email failed:", data.error);
      setError(data.error);
    }
  } catch (err) {
    console.error("Request error:", err);
      if (err instanceof Error) {
    setError(err.message);
  } else {
    setError(String(err)); 
  }
  }
};

// In your JSX
{error && <div style={{ color: 'red' }}>{error}</div>}



  const handleBack = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
    // Reset validation state when moving to a new step
    setValidationAttempted(false);
    setValidationErrors([]);
  }, []);

  const handleReset = useCallback(() => {
    setActiveStep(0);
    setFormState(initialFormState);
  }, [initialFormState]);

  // Handle step validation
  const isStepValid = useCallback((step: number): boolean => {
    switch (step) {
      case 0: // Basic Information
        return !!(
          formState.organization &&
          formState.requestor &&
          formState.email &&
          formState.department &&
          formState.projectCategory &&
          formState.description &&
          formState.site &&
          formState.expenseType
        );
      case 1: // Line Items
        return formState.lineItems.length > 0 && formState.lineItems.every(item => 
          item.description && 
          item.quantity > 0 && 
          item.uom
        );
      case 2: // Review
        return true;
      default:
        return true;
    }
  }, [formState]);

  // Get step content
  const renderBasicInfo = () => (
    <BasicInformationStep
      formState={formState}
      setFormState={setFormState}
      departments={departments}
      projectCategories={projectCategories}
      sites={sites}
      expenseTypes={expenseTypes}
      vehicles={vehicles}
      vendors={vendors}
      approvers={availableApprovers}
      currencies={currencies}
      loading={isLoadingData}
      isSubmitted={validationAttempted}
      validationErrors={validationErrors}
    />
  );

  const renderLineItems = () => (
    <LineItemsStep
      formState={formState}
      setFormState={setFormState}
      loading={isLoading}
    />
  );

  const renderReview = () => (
    <ReviewStep
      formState={formState}
      setFormState={setFormState}
      vendors={vendors}
      projectCategories={projectCategories}
      sites={sites}
      approvers={availableApprovers}
      loading={isLoading}
      onSubmit={handleSubmit}
    />
  );

  // Update step rendering logic
  const renderStep = () => {
    const currentStep = steps[activeStep];
    if (!currentStep) return null;

    switch (activeStep) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderLineItems();
      case 2:
        return renderReview();
      default:
        return null;
    }
  };

  // Handle next step
  const handleNextStep = () => {
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
      const isValid = isStepValid(1);
      console.log('Line items validation result:', isValid);
      if (!isValid) {
        console.log('Line items validation failed');
        return;
      }
      console.log('Line items validation passed, moving to next step');
    }

    handleNext();
  };

  // Validation functions
  const validateBasicInfo = () => {
    try {
      console.log('Starting basic info validation...');
      console.log('Form state:', formState);
      
      // Clear previous validation errors
      const errors: string[] = [];
      setValidationAttempted(true);
      
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
        
        // Add each missing field to the validation errors
        missingFields.forEach(field => {
          const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').trim();
          errors.push(`${fieldName} is required`);
        });
        
        enqueueSnackbar(`Please fill in: ${missingFields.join(', ')}`, { 
          variant: 'error',
          autoHideDuration: 5000 
        });
      }

      // Convert estimatedAmount to number if it's a string
      const estimatedAmount = typeof formState.estimatedAmount === 'string' 
        ? parseFloat(formState.estimatedAmount) 
        : formState.estimatedAmount;

      if (isNaN(estimatedAmount) || estimatedAmount <= 0) {
        console.log('Invalid estimated amount:', estimatedAmount);
        errors.push('Estimated amount must be greater than 0');
        enqueueSnackbar('Estimated amount must be greater than 0', { variant: 'error' });
      }

      // Check vehicle if expense type is "4 - Vehicle"
      if (formState.expenseType === '4' && !formState.vehicle) {
        console.log('Vehicle not selected for vehicle expense type');
        errors.push('Please select a vehicle for vehicle expense');
        enqueueSnackbar('Please select a vehicle for vehicle expense', { variant: 'error' });
      }

      // Check approvers
      if (!formState.approvers || formState.approvers.length === 0) {
        console.log('No approvers selected');
        errors.push('Please select at least one approver');
        enqueueSnackbar('Please select at least one approver', { 
          variant: 'error',
          autoHideDuration: 5000 
        });
      }

      // Check required date
      if (!formState.requiredDate) {
        console.log('No required date selected');
        errors.push('Please select a required date');
        enqueueSnackbar('Please select a required date', { variant: 'error' });
      }

      // Update validation errors state
      setValidationErrors(errors);
      
      console.log('Validation errors:', errors);
      const isValid = errors.length === 0;
      console.log('All validations passed:', isValid);
      return isValid;
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

      // Convert estimatedAmount to number if it's a string
      const estimatedAmount = typeof formState.estimatedAmount === 'string' 
        ? parseFloat(formState.estimatedAmount) 
        : formState.estimatedAmount;

      if (isNaN(estimatedAmount) || estimatedAmount <= 0) {
        console.log('Invalid estimated amount:', estimatedAmount);
        enqueueSnackbar('Estimated amount must be greater than 0', { variant: 'error' });
        return false;
      }

      // Check vehicle if expense type is "4 - Vehicle"
      if (formState.expenseType === '4' && !formState.vehicle) {
        console.log('Vehicle not selected for vehicle expense type');
        enqueueSnackbar('Please select a vehicle for vehicle expense', { variant: 'error' });
        return false;
      }

      // Check for line items
      if (!formState.lineItems || formState.lineItems.length === 0) {
        console.log('No line items found');
        enqueueSnackbar('Please add at least one line item', { variant: 'error' });
        return false;
      }

      // Check if all line items have required fields
      const invalidItems = formState.lineItems.filter(item => {
        return !item.description || !item.quantity || item.quantity <= 0 || !item.uom;
      });

      if (invalidItems.length > 0) {
        console.log('Invalid line items found:', invalidItems);
        enqueueSnackbar('All line items must have a description, quantity > 0, and unit of measure', { 
          variant: 'error' 
        });
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
          notes: '',
          attachments: []
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

  const handleSubmit = async () => {
    console.log('Form submit triggered');
    if (!user) {
      console.error('Cannot submit PR: User is not authenticated.');
      setError('You must be logged in to submit a Purchase Request.');
      enqueueSnackbar('Authentication error. Please log in again.', { variant: 'error' });
      return; // Prevent submission if user is null
    }

    // Validate form
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Validate all form sections before submitting
      const basicInfoValid = await validateBasicInfo();
      console.log('Basic info validation:', basicInfoValid);
      
      const lineItemsValid = await validateLineItems();
      console.log('Line items validation:', lineItemsValid);
      
      if (!basicInfoValid || !lineItemsValid) {
        console.log('Form validation failed:', { basicInfoValid, lineItemsValid });
        setIsSubmitting(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formState.email)) {
        enqueueSnackbar('Please enter a valid email address', { variant: 'error' });
        setIsSubmitting(false);
        return;
      }

      // Validate and convert estimated amount
      let amount: number;
      try {
        amount = typeof formState.estimatedAmount === 'string' 
          ? parseFloat(formState.estimatedAmount) 
          : formState.estimatedAmount;
          
        if (isNaN(amount) || amount <= 0) {
          throw new Error('Invalid amount');
        }
      } catch (err) {
        console.error('Amount validation error:', err);
        enqueueSnackbar('Please enter a valid estimated amount', { variant: 'error' });
        setIsSubmitting(false);
        return;
      }

      // Prepare PR data with proper type conversions
      const prData = {
        requestorId: user.id,
        requestorEmail: user.email,
        requestor: {
          id: user.id,
          name: formState.requestor,
          email: user.email,
          role: user.role,
          department: formState.department || '' // Use formState department
        },
        organization: formState.organization?.name || '',
        department: formState.department,
        projectCategory: formState.projectCategory,
        description: formState.description,
        site: formState.site,
        expenseType: formState.expenseType,
        estimatedAmount: amount,
        currency: formState.currency,
        requiredDate: formState.requiredDate,
        status: PRStatus.SUBMITTED,
        isUrgent: formState.isUrgent,
        lineItems: formState.lineItems.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          uom: item.uom,
          notes: item.notes || '',
          attachments: item.attachments
        })),
        quotes: formState.quotes.map(quote => ({
          vendorId: quote.vendorId,
          vendorName: quote.vendorName,
          amount: Number(quote.amount),
          currency: quote.currency,
          quoteDate: quote.quoteDate,
          contactName: quote.contactName || '',
          contactPhone: quote.contactPhone || '',
          contactEmail: quote.contactEmail || '',
          notes: quote.notes || '',
          attachments: quote.attachments
        }))
      };

      // Add optional fields only if they exist and are not undefined/null/empty
      if (formState.vehicle && formState.vehicle.trim() !== '') {
        prData.vehicle = formState.vehicle;
      }
      
      if (formState.preferredVendor && formState.preferredVendor.trim() !== '') {
        if (formState.preferredVendor === 'other') {
          if (formState.customVendorName && formState.customVendorName.trim() !== '') {
            prData.preferredVendor = formState.customVendorName.trim();
          }
        } else {
          prData.preferredVendor = formState.preferredVendor;
        }
      }

      console.log('Submitting PR data:', prData);

      // Create the PR
      const { prId, prNumber } = await createPR(prData); // Removed 'as any' cast
      console.log('PR created successfully with ID:', prId, 'and Number:', prNumber);
      
      // Show success message
      enqueueSnackbar('Purchase Request submitted successfully!', { 
        variant: 'success',
        autoHideDuration: 5000 
      });

      // Refresh PR data before navigating
      if (user) {
        console.log('Refreshing PR data for user:', user.id);
        const updatedPRs = await getUserPRs(user.id, formState.organization?.id || '');
        console.log('Updated PRs:', updatedPRs);
        dispatch(setUserPRs(updatedPRs));
      }

      // Reset form and navigate back
      setFormState(initialFormState);
      console.log('Navigating to dashboard...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting PR:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to submit Purchase Request: ${errorMessage}. Please try again or contact support.`);
      enqueueSnackbar('Error submitting Purchase Request. Please try again.', { 
        variant: 'error',
        autoHideDuration: 5000 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormState(prev => {
      // If changing expense type from vehicle to something else, clear the vehicle field
      if (field === 'expenseType') {
        const isVehicleExpense = value === '4' || value === '4 - Vehicle';
        const wasVehicleExpense = prev.expenseType === '4' || prev.expenseType === '4 - Vehicle';
        
        if (wasVehicleExpense && !isVehicleExpense) {
          console.log('Clearing vehicle field as expense type changed from vehicle');
          return {
            ...prev,
            [field]: value,
            vehicle: undefined // Clear vehicle when changing from vehicle expense type
          };
        }
      }
      
      return {
        ...prev,
        [field]: value
      };
    });
  };

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
      ) : isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading...</Typography>
        </Box>
      ) : (
        <>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStep()}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              color="inherit"
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>

            {activeStep === steps.length - 1 ? null : (
              <Button onClick={handleNext}>
                Next
              </Button>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};
