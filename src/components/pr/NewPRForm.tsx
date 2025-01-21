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
 * 3. Quotes & Vendors
 *    - Vendor selection
 *    - Quote details
 *    - Quote attachments
 * 
 * 4. Review & Submit
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
import { prService } from '../../services/pr';
import { referenceDataService } from '../../services/referenceData';
import { approverService } from '../../services/approver';
import { ReferenceDataItem } from '../../types/referenceData';
import { BasicInformationStep } from './steps/BasicInformationStep';
import { LineItemsStep } from './steps/LineItemsStep';
import { ReviewStep } from './steps/ReviewStep';

// Form steps definition
const steps = ['Basic Information', 'Line Items', 'Review'];

// Type definitions for form data structures
interface ReferenceDataItem {
  id: string;
  name: string;
  code?: string;
  active: boolean;
}

interface LineItem {
  description: string;
  quantity: number;
  uom: string;
  notes: string;
  attachments: UploadedFile[];
}

interface Quote {
  id: string;
  vendorName: string;
  amount: number;
  currency: string;
  notes: string;
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
  lineItems: LineItem[];
  quotes: Quote[];
  isUrgent: boolean;
}

// Business rule thresholds
const PR_AMOUNT_THRESHOLDS = {
  ADMIN_APPROVAL: 1000,    // Requires admin approval above this amount
  QUOTES_REQUIRED: 5000,   // Requires multiple quotes above this amount
  FINANCE_APPROVAL: 50000  // Requires finance approval above this amount
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
  const [requiresQuotes, setRequiresQuotes] = useState(false);
  const [requiresFinanceApproval, setRequiresFinanceApproval] = useState(false);
  const [isApprovedVendor, setIsApprovedVendor] = useState(false);

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
    lineItems: [],
    quotes: [],
    isUrgent: false
  }), [user]);

  // Form state
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

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
          email: user.email
        }
      }));
    }
  }, [user]);

  // Effect to update requirements based on amount and vendor
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

  // Form navigation handlers
  const handleNext = useCallback(() => {
    setActiveStep((prevStep) => prevStep + 1);
  }, []);

  const handleBack = useCallback(() => {
    setActiveStep((prevStep) => prevStep - 1);
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
        const needsQuotes = formState.estimatedAmount >= PR_AMOUNT_THRESHOLDS.QUOTES_REQUIRED;
        return !needsQuotes || (needsQuotes && formState.quotes.length >= 2);
      default:
        return true;
    }
  }, [formState]);

  // Get step content
  const getStepContent = useCallback((step: number) => {
    switch (step) {
      case 0:
        return (
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
          />
        );
      case 1:
        return (
          <LineItemsStep
            formState={formState}
            setFormState={setFormState}
            loading={isLoading}
          />
        );
      case 2:
        return (
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
      default:
        return null;
    }
  }, [formState, setFormState, departments, projectCategories, sites, expenseTypes, vehicles, vendors, availableApprovers, currencies, isLoadingData, isLoading]);

  // Handle next step
  const handleNextStep = () => {
    console.log('Current step:', activeStep);
    console.log('Current form state:', formState);
    
    if (activeStep === 0) {
      console.log('Validating basic info...');
      const isValid = isStepValid(0);
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

      // Check that at least one approver is selected
      if (!formState.approvers || formState.approvers.length === 0) {
        console.log('No approvers selected');
        enqueueSnackbar('Please select at least one approver', { variant: 'error' });
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
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate all form sections before submitting
      const basicInfoValid = await validateBasicInfo();
      console.log('Basic info validation:', basicInfoValid);
      
      const lineItemsValid = await validateLineItems();
      console.log('Line items validation:', lineItemsValid);
      
      const quotesValid = await validateQuotes();
      console.log('Quotes validation:', quotesValid);
      
      if (!basicInfoValid || !lineItemsValid || !quotesValid) {
        console.log('Form validation failed:', { basicInfoValid, lineItemsValid, quotesValid });
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
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          role: user.role,
          department: user.department || ''
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
          vendorName: quote.vendorName,
          amount: Number(quote.amount),
          currency: quote.currency,
          notes: quote.notes || ''
        }))
      };

      // Add optional fields only if they exist and are not undefined/null/empty
      if (formState.vehicle && formState.vehicle.trim() !== '') {
        prData.vehicle = formState.vehicle;
      }
      
      if (formState.preferredVendor && formState.preferredVendor.trim() !== '') {
        prData.preferredVendor = formState.preferredVendor;
      }

      if (formState.approvers?.length > 0) {
        prData.approvers = formState.approvers;
      }

      console.log('Submitting PR data:', prData);

      // Create the PR
      const prId = await prService.createPR(prData);
      console.log('PR created successfully');
      
      // Show success message
      enqueueSnackbar('Purchase Request submitted successfully!', { 
        variant: 'success',
        autoHideDuration: 5000 
      });

      // Refresh PR data before navigating
      if (user) {
        console.log('Refreshing PR data for user:', user.id);
        const updatedPRs = await prService.getUserPRs(user.id, formState.organization?.id || '');
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

  const validateQuotes = async () => {
    try {
      console.log('Validating quotes...');
      
      // Convert estimated amount to number for comparison
      let amount: number;
      try {
        amount = typeof formState.estimatedAmount === 'string' 
          ? parseFloat(formState.estimatedAmount) 
          : formState.estimatedAmount;
          
        if (isNaN(amount)) {
          throw new Error('Invalid amount');
        }
      } catch (err) {
        console.error('Amount conversion error:', err);
        enqueueSnackbar('Invalid estimated amount', { variant: 'error' });
        return false;
      }
      
      // Check if quotes are required based on amount threshold
      const quotesRequired = amount >= PR_AMOUNT_THRESHOLDS.QUOTES_REQUIRED;
      console.log('Quotes required:', quotesRequired, 'Amount:', amount, 'Threshold:', PR_AMOUNT_THRESHOLDS.QUOTES_REQUIRED);
      
      if (quotesRequired) {
        if (!formState.quotes || formState.quotes.length < 3) {
          console.log('Three quotes required but not provided');
          enqueueSnackbar('Three quotes are required for this amount', { 
            variant: 'error',
            autoHideDuration: 5000 
          });
          return false;
        }

        // Validate each quote
        const invalidQuotes = formState.quotes.filter(quote => {
          const quoteAmount = typeof quote.amount === 'string' ? parseFloat(quote.amount) : quote.amount;
          return !quote.vendorName?.trim() || 
                 !quote.amount || 
                 isNaN(quoteAmount) ||
                 quoteAmount <= 0 || 
                 !quote.currency?.trim();
        });

        if (invalidQuotes.length > 0) {
          console.log('Invalid quotes found:', invalidQuotes);
          enqueueSnackbar(
            'All quotes must have a vendor name, valid amount, and currency', 
            { variant: 'error', autoHideDuration: 5000 }
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in validateQuotes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      enqueueSnackbar(`Quote validation error: ${errorMessage}`, { 
        variant: 'error',
        autoHideDuration: 5000
      });
      return false;
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

  const renderBasicInfo = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Organization"
          value={formState.organization?.name || ''}
          onChange={(e) => handleInputChange('organization', { id: e.target.value, name: e.target.value })}
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
      {formState.expenseType === '4' && (
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
              Organization: {formState.organization?.name}
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
          disabled={isSubmitting}
          aria-label="Submit purchase request"
        >
          {isSubmitting ? <CircularProgress size={24} /> : 'Submit Purchase Request'}
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

          {getStepContent(activeStep)}

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
