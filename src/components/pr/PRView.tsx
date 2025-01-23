import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { useDropzone } from 'react-dropzone';
import { referenceDataService } from '@/services/referenceData';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Button,
  Card,
  CardContent,
  CardHeader,
  Step,
  StepLabel,
  Stepper,
} from '@mui/material';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import {
  Edit as EditIcon, 
  ArrowBack as ArrowBackIcon, 
  Visibility as VisibilityIcon, 
  Save as SaveIcon, 
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { RootState } from '@/store';
import { prService } from '@/services/pr';
import { PRRequest, PRStatus } from '@/types/pr';
import { formatCurrency } from '@/utils/formatters';
import mammoth from 'mammoth';
import { ProcurementActions } from './ProcurementActions';
import { QuoteForm } from './QuoteForm';
import { QuoteList } from './QuoteList';
import { Button as CustomButton } from '@/components/ui/button';
import { Card as CustomCard, CardContent as CustomCardContent, CardDescription, CardFooter, CardHeader as CustomCardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, EyeIcon, FileIcon } from 'lucide-react';
import { QuoteCard } from './QuoteCard';
import { StorageService } from '@/services/storage';
import { CircularProgress, Chip } from '@mui/material';
import { ReferenceDataItem } from '@/types/pr';

interface EditablePRFields {
  department?: string;
  projectCategory?: string;
  site?: string;
  expenseType?: string;
  vehicle?: string;
  preferredVendor?: string;
  estimatedAmount?: number;
  currency?: string;
  requiredDate?: string;
  description?: string;
}

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  maxFiles?: number;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  notes?: string;
  attachments?: Array<{
    name: string;
    url: string;
  }>;
}

interface UomOption {
  code: string;
  label: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect,
  maxFiles = 5 
}) => {
  const acceptedTypes = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
  };

  const { getRootProps, getInputProps, fileRejections } = useDropzone({
    onDrop: onFileSelect,
    accept: acceptedTypes,
    maxFiles,
    maxSize: 10485760, // 10MB
    validator: (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const validExts = Object.values(acceptedTypes).flat();
      if (!ext || !validExts.includes(`.${ext}`)) {
        return {
          code: 'invalid-file-type',
          message: `File type .${ext} is not supported`
        };
      }
      return null;
    }
  });

  return (
    <Box>
      <Box {...getRootProps()} sx={{
        border: '2px dashed #ccc',
        borderRadius: 2,
        p: 2,
        textAlign: 'center',
        cursor: 'pointer',
        '&:hover': {
          borderColor: 'primary.main'
        }
      }}>
        <input {...getInputProps()} />
        <Typography>
          Drag & drop files here, or click to select files
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Supported formats: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (max 10MB)
        </Typography>
      </Box>
      {fileRejections.length > 0 && (
        <Box sx={{ mt: 1, color: 'error.main' }}>
        {fileRejections.map(({ file, errors }) => (
          <Typography key={file.name} variant="caption" component="div">
            {errors.map(e => e.message).join(', ')}
          </Typography>
        ))}
      </Box>
      )}
    </Box>
  );
};

const FilePreviewDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  file: { name: string; url: string; type: string };
}> = ({ open, onClose, file }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getFileType = (fileName: string): 'image' | 'pdf' | 'docx' | 'rtf' | 'text' | 'unsupported' => {
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return 'image';
    if (lowerFileName.endsWith('.pdf')) return 'pdf';
    if (lowerFileName.endsWith('.docx')) return 'docx';
    if (lowerFileName.endsWith('.rtf')) return 'rtf';
    if (lowerFileName.match(/\.(txt|md|log)$/)) return 'text';
    return 'unsupported';
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);

    const fileType = getFileType(file.name);
    
    const fetchAndProcess = async () => {
      try {
        const response = await fetch(file.url);
        const blob = await response.blob();

        switch (fileType) {
          case 'text':
          case 'rtf':  
            const text = await blob.text();
            // For RTF, do thorough cleanup of RTF markup
            const cleanedText = fileType === 'rtf' 
              ? text
                  // Remove RTF header
                  .replace(/^[{]\\rtf[^}]+[}]/g, '')
                  // Remove font tables
                  .replace(/[{]\\fonttbl[^}]+[}]/g, '')
                  // Remove color tables
                  .replace(/[{]\\colortbl[^}]+[}]/g, '')
                  // Remove style sheets
                  .replace(/[{]\\stylesheet[^}]+[}]/g, '')
                  // Remove info groups
                  .replace(/[{]\\info[^}]+[}]/g, '')
                  // Remove Unicode character escapes
                  .replace(/\\u[0-9]+\s?/g, '')
                  // Remove special characters and control words
                  .replace(/\\[a-z]+[0-9]*/g, '')
                  // Remove numeric control sequences
                  .replace(/\\[0-9]+/g, '')
                  // Remove remaining braces
                  .replace(/[{}]/g, '')
                  // Fix line endings
                  .replace(/\\par\s*/g, '\n')
                  // Remove any remaining backslashes
                  .replace(/\\/g, '')
                  // Remove multiple spaces
                  .replace(/\s+/g, ' ')
                  // Remove multiple newlines
                  .replace(/\n+/g, '\n')
                  // Trim whitespace
                  .trim()
              : text;
            setContent(cleanedText);
            break;
          case 'docx':
            const arrayBuffer = await blob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setContent(result.value);
            break;
        }
      } catch (err) {
        console.error('Error processing file:', err);
        setError('Failed to process file. You can try downloading it instead.');
        enqueueSnackbar('Error previewing file. You can try downloading it instead.', { 
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    if (['text', 'docx', 'rtf'].includes(fileType)) {
      fetchAndProcess();
    } else {
      setLoading(false);
    }
  }, [open, file.url]);

  const renderContent = () => {
    const fileType = getFileType(file.name);

    if (error) {
      return (
        <Box p={3} textAlign="center">
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              const link = document.createElement('a');
              link.href = file.url;
              link.setAttribute('download', file.name);
              document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
            }}
          >
            Download Instead
          </Button>
        </Box>
      );
    }

    switch (fileType) {
      case 'image':
        return (
          <Box display="flex" justifyContent="center" alignItems="center" p={2}>
            <img 
              src={file.url} 
              alt={file.name} 
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          </Box>
        );
      case 'pdf':
        return (
          <Box height="70vh" width="100%">
            <iframe
              src={`${file.url}#view=FitH`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="PDF Preview"
            />
          </Box>
        );
      case 'docx':
        return (
          <Box 
            sx={{ 
              p: 2,
              maxHeight: '70vh',
              overflow: 'auto',
              '& img': { maxWidth: '100%' }
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      case 'rtf':
      case 'text':
        return (
          <Box 
            component="pre"
            sx={{ 
              p: 2,
              maxHeight: '70vh',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: 'monospace'
            }}
          >
            {content}
          </Box>
        );
      default:
        return (
          <Box p={3} textAlign="center">
            <Typography gutterBottom>
              This file type cannot be previewed directly.
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                const link = document.createElement('a');
                link.href = file.url;
                link.setAttribute('download', file.name);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
              }}
            >
              Download File
            </Button>
          </Box>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        {file.name}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          renderContent()
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={() => {
            const link = document.createElement('a');
            link.href = file.url;
            link.setAttribute('download', file.name);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
          }}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const UOM_MAPPING = {
  'EA': 'Each',
  'KG': 'Kilogram',
  'BOX': 'Box',
  'PK': 'Pack',
  'SET': 'Set',
  'M': 'Meter',
  'L': 'Liter',
  'HR': 'Hour',
  'DAY': 'Day',
  'WK': 'Week',
  'MTH': 'Month',
  'YR': 'Year',
  'SVC': 'Service',
  'JOB': 'Job',
  'UNIT': 'Unit',
  'OTH': 'Other'
} as const;

const UOM_OPTIONS: UomOption[] = Object.entries(UOM_MAPPING).map(([code, label]) => ({
  code,
  label
}));

export function PRView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.pathname.endsWith('/edit');
  const [pr, setPr] = useState<PRRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedPR, setEditedPR] = useState<Partial<PRRequest>>({});
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [lineItems, setLineItems] = useState<Array<LineItem>>([]);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const canProcessPR = currentUser?.permissionLevel === 3 || currentUser?.permissionLevel === 2;
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; type: string } | null>(null);
  const [departments, setDepartments] = useState<ReferenceDataItem[]>([]);
  const [projectCategories, setProjectCategories] = useState<ReferenceDataItem[]>([]);
  const [sites, setSites] = useState<ReferenceDataItem[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ReferenceDataItem[]>([]);
  const [vehicles, setVehicles] = useState<ReferenceDataItem[]>([]);
  const [vendors, setVendors] = useState<ReferenceDataItem[]>([]);
  const [currencies, setCurrencies] = useState<ReferenceDataItem[]>([]);
  const [loadingReference, setLoadingReference] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  // Fetch PR data
  useEffect(() => {
    const fetchPR = async () => {
      if (!id) return;
      try {
        console.log('Fetching PR with ID:', id);
        const prData = await prService.getPR(id);
        if (!prData) {
          console.error('PR not found');
          setError('PR not found');
          return;
        }
        console.log('PR data received:', prData);
        setPr(prData);

        // Load reference data after PR is loaded
        try {
          setLoadingReference(true);
          const [
            depts,
            categories,
            siteList,
            expenses,
            vehicleList,
            vendorList,
            currencyList,
          ] = await Promise.all([
            referenceDataService.getItemsByType('departments', prData.organization),
            referenceDataService.getItemsByType('projectCategories', prData.organization),
            referenceDataService.getItemsByType('sites', prData.organization),
            referenceDataService.getItemsByType('expenseTypes', prData.organization),
            referenceDataService.getItemsByType('vehicles', prData.organization),
            referenceDataService.getVendors(),
            referenceDataService.getCurrencies()
          ]);

          setDepartments(depts.filter(d => d.active));
          setProjectCategories(categories.filter(c => c.active));
          setSites(siteList.filter(s => s.active));
          setExpenseTypes(expenses.filter(e => e.active));
          setVehicles(vehicleList.filter(v => v.active));
          setVendors(vendorList.filter(v => v.active));
          setCurrencies(currencyList.filter(c => c.active));
        } catch (err) {
          console.error('Error loading reference data:', err);
          enqueueSnackbar('Failed to load reference data', { variant: 'error' });
        } finally {
          setLoadingReference(false);
        }
      } catch (err) {
        console.error('Error fetching PR:', err);
        setError('Failed to load PR');
      } finally {
        setLoading(false);
      }
    };

    fetchPR();
  }, [id]);

  useEffect(() => {
    if (pr?.lineItems) {
      setLineItems(pr.lineItems);
    }
  }, [pr?.lineItems]);

  const handleAddLineItem = (): void => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 0,
      uom: 'EA',
      notes: '',
      attachments: []
    };
    setLineItems(prevItems => [...prevItems, newItem]);
  };

  const handleUpdateLineItem = (index: number, updatedItem: LineItem): void => {
    setLineItems(prevItems => 
      prevItems.map((item, i) => 
        i === index ? { ...item, ...updatedItem } : item
      )
    );
  };

  const handleDeleteLineItem = (index: number): void => {
    setLineItems(prevItems => prevItems.filter((_, i) => i !== index));
  };

  // Add file upload handler for line items
  const handleLineItemFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const result = await StorageService.uploadToTempStorage(file);
      
      setLineItems(prev => prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            attachments: [
              ...(item.attachments || []),
              {
                name: file.name,
                url: result.url,
                path: result.path
              }
            ]
          };
        }
        return item;
      }));
    } catch (error) {
      console.error('Error uploading file:', error);
      enqueueSnackbar('Failed to upload file', { variant: 'error' });
    }
  };

  // Remove attachment from line item
  const handleRemoveLineItemAttachment = (lineItemIndex: number, attachmentIndex: number) => {
    setLineItems(prev => prev.map((item, i) => 
      i === lineItemIndex ? {
        ...item,
        attachments: (item.attachments || []).filter((_, j) => j !== attachmentIndex)
      } : item
    ));
  };

  // Initialize editedPR when entering edit mode
  useEffect(() => {
    if (isEditMode && pr) {
      setEditedPR({
        description: pr.description,
        department: pr.department,
        projectCategory: pr.projectCategory,
        site: pr.site,
        expenseType: pr.expenseType,
        vehicle: pr.vehicle,
        estimatedAmount: pr.estimatedAmount,
        requiredDate: pr.requiredDate,
        preferredVendor: pr.preferredVendor,
        comments: pr.comments,
      });
    } else {
      setEditedPR({});
    }
  }, [isEditMode, pr]);

  const canEdit = currentUser?.permissionLevel <= 3; // Admin (1), Approver (2), or Procurement (3)
  const canEditInQueue = pr?.status === PRStatus.IN_QUEUE && (currentUser?.permissionLevel === 1 || currentUser?.permissionLevel === 3);
  const isReadOnlyField = (fieldName: string) => {
    if (!canEditInQueue) return true;
    return ['urgency', 'requestor', 'requiredDate'].includes(fieldName);
  };

  const handleQuoteSubmit = async (quoteData: Quote) => {
    try {
      const updatedQuotes = selectedQuote
        ? pr?.quotes?.map(q => q.id === selectedQuote.id ? quoteData : q) || []
        : [...(pr?.quotes || []), quoteData];

      await prService.updatePR(id!, { quotes: updatedQuotes });
      
      setPr(prev => prev ? {
        ...prev,
        quotes: updatedQuotes
      } : null);
      
      setShowQuoteForm(false);
      setSelectedQuote(null);
      enqueueSnackbar('Quote saved successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error saving quote:', error);
      enqueueSnackbar('Failed to save quote', { variant: 'error' });
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowQuoteForm(true);
  };

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      const updatedQuotes = pr?.quotes?.filter(q => q.id !== quoteId) || [];
      await prService.updatePR(id!, { quotes: updatedQuotes });
      
      setPr(prev => prev ? {
        ...prev,
        quotes: updatedQuotes
      } : null);
      
      enqueueSnackbar('Quote deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting quote:', error);
      enqueueSnackbar('Failed to delete quote', { variant: 'error' });
    }
  };

  const handleFieldChange = (field: keyof EditablePRFields, value: any): void => {
    setEditedPR(prev => {
      const newEdits = { ...prev };
      
      if (value === '') {
        delete newEdits[field];
      } else {
        newEdits[field] = value;
      }
      
      return newEdits;
    });
  };

  const handleCancel = (): void => {
    setEditedPR({});
    navigate(`/pr/${id}`);
  };

  const handleSave = async (): Promise<void> => {
    if (!pr?.id) {
      enqueueSnackbar('PR ID is missing', { variant: 'error' });
      return;
    }
    
    try {
      setLoading(true);
      
      const updatedData = {
        ...pr,
        ...editedPR,
        updatedAt: new Date().toISOString()
      };

      // Remove any undefined or null values
      Object.keys(updatedData).forEach(key => {
        if (updatedData[key] === undefined || updatedData[key] === null) {
          delete updatedData[key];
        }
      });

      await prService.updatePR(pr.id, updatedData);
      
      // Fetch the updated PR data
      const updatedPR = await prService.getPR(pr.id);
      if (!updatedPR) {
        throw new Error('Failed to fetch updated PR data');
      }

      setPr(updatedPR);
      setEditedPR({});
      navigate(`/pr/${pr.id}`);
      enqueueSnackbar('PR updated successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error updating PR:', error);
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Failed to update PR - please try again',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShowQuoteForm = () => {
    console.log('Opening quote form');
    setShowQuoteForm(true);
  };

  const refreshPR = async () => {
    try {
      setLoading(true);
      const updatedPR = await prService.getPR(pr.id);
      if (updatedPR) {
        setPr(updatedPR);
      }
    } catch (err) {
      console.error('Error refreshing PR:', err);
      enqueueSnackbar('Failed to refresh PR data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const canEditRequiredDate = !(currentUser?.role === 'procurement' && pr?.status === PRStatus.IN_QUEUE);

  // Step management
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Basic Information', 'Line Items', 'Quotes'];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const renderBasicInformation = () => {
    return (
      <Grid container spacing={2}>
        {/* Editable Information - Left Side */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={isEditMode ? editedPR.description || pr?.description : pr?.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  disabled={!isEditMode}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth disabled={!isEditMode}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={isEditMode ? (editedPR.department || pr?.department || '') : (pr?.department || '')}
                    onChange={(e) => handleFieldChange('department', e.target.value)}
                    label="Department"
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth disabled={!isEditMode}>
                  <InputLabel>Project Category</InputLabel>
                  <Select
                    value={isEditMode ? (editedPR.projectCategory || pr?.projectCategory || '') : (pr?.projectCategory || '')}
                    onChange={(e) => handleFieldChange('projectCategory', e.target.value)}
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
              <Grid item xs={6}>
                <FormControl fullWidth disabled={!isEditMode}>
                  <InputLabel>Site</InputLabel>
                  <Select
                    value={isEditMode ? (editedPR.site || pr?.site || '') : (pr?.site || '')}
                    onChange={(e) => handleFieldChange('site', e.target.value)}
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
              <Grid item xs={6}>
                <FormControl fullWidth disabled={!isEditMode}>
                  <InputLabel>Expense Type</InputLabel>
                  <Select
                    value={isEditMode ? (editedPR.expenseType || pr?.expenseType || '') : (pr?.expenseType || '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      const selectedType = expenseTypes.find(type => type.id === value);
                      const isVehicleExpense = selectedType?.code === '4';
                      
                      setEditedPR(prev => ({
                        ...prev,
                        expenseType: value,
                        vehicle: isVehicleExpense ? prev.vehicle : undefined
                      }));
                    }}
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
              {(isEditMode ? editedPR.expenseType || pr?.expenseType : pr?.expenseType) === '4' && (
                <Grid item xs={6}>
                  <FormControl fullWidth disabled={!isEditMode}>
                    <InputLabel>Vehicle</InputLabel>
                    <Select
                      value={isEditMode ? (editedPR.vehicle || pr?.vehicle || '') : (pr?.vehicle || '')}
                      onChange={(e) => handleFieldChange('vehicle', e.target.value)}
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
              <Grid item xs={6}>
                <FormControl fullWidth disabled={!isEditMode}>
                  <InputLabel>Preferred Vendor</InputLabel>
                  <Select
                    value={isEditMode ? (editedPR.preferredVendor || pr?.preferredVendor || '') : (pr?.preferredVendor || '')}
                    onChange={(e) => handleFieldChange('preferredVendor', e.target.value)}
                    label="Preferred Vendor"
                  >
                    {vendors.map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Estimated Amount"
                  type="number"
                  value={isEditMode ? editedPR.estimatedAmount || pr?.estimatedAmount || '' : pr?.estimatedAmount || ''}
                  onChange={(e) => handleFieldChange('estimatedAmount', parseFloat(e.target.value))}
                  disabled={!isEditMode}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {pr?.currency}
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Required Date"
                  type="date"
                  value={isEditMode ? editedPR.requiredDate || pr?.requiredDate || '' : pr?.requiredDate || ''}
                  onChange={(e) => handleFieldChange('requiredDate', e.target.value)}
                  disabled={!isEditMode || !canEditRequiredDate}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Comments"
                  value={isEditMode ? editedPR.comments || pr?.comments : pr?.comments}
                  onChange={(e) => handleFieldChange('comments', e.target.value)}
                  disabled={!isEditMode}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Additional Information - Right Side */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Additional Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography color="textSecondary">Project Category</Typography>
                <Typography>
                  {projectCategories.find(c => c.id === pr.projectCategory)?.name || pr.projectCategory || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Site</Typography>
                <Typography>
                  {sites.find(s => s.id === pr.site)?.name || pr.site || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Organization</Typography>
                <Typography>{pr.organization || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Required Date</Typography>
                <Typography>
                  {pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Urgency</Typography>
                <Chip
                  label={pr.isUrgent || pr.metrics?.isUrgent ? 'Urgent' : 'Normal'}
                  color={
                    pr.isUrgent || pr.metrics?.isUrgent ? 'error' : 'default'
                  }
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Expense Type</Typography>
                <Typography>
                  {expenseTypes.find(e => e.id === pr.expenseType)?.name || pr.expenseType || 'N/A'}
                </Typography>
              </Grid>
              {pr.vehicle && (
                <Grid item xs={6}>
                  <Typography color="textSecondary">Vehicle</Typography>
                  <Typography>
                    {vehicles.find(v => v.id === pr.vehicle)?.name || pr.vehicle || 'N/A'}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={6}>
                <Typography color="textSecondary">Created By</Typography>
                <Typography>
                  {pr.requestor?.firstName && pr.requestor?.lastName ? (
                    `${pr.requestor.firstName} ${pr.requestor.lastName}`
                  ) : (
                    console.error('PR requestor not found:', {
                      prId: pr.id,
                      requestorId: pr.requestorId,
                      requestorEmail: pr.requestorEmail
                    }),
                    <span style={{ color: 'red' }}>Error loading user details</span>
                  )}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Created Date</Typography>
                <Typography>
                  {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="textSecondary">Last Updated</Typography>
                <Typography>
                  {pr.updatedAt ? new Date(pr.updatedAt).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderLineItems = () => {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Line Items</Typography>
              {isEditMode && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddLineItem}
                >
                  Add Line Item
                </Button>
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            <div className="w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead align="right">Quantity</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Attachments</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          fullWidth
                          value={item.description}
                          onChange={(e) => handleUpdateLineItem(index, { ...item, description: e.target.value })}
                          disabled={!isEditMode && pr?.status !== 'IN_QUEUE'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateLineItem(index, { ...item, quantity: parseFloat(e.target.value) })}
                          disabled={!isEditMode && pr?.status !== 'IN_QUEUE'}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.uom}
                          onChange={(e) => handleUpdateLineItem(index, { ...item, uom: e.target.value })}
                          disabled={!isEditMode && pr?.status !== 'IN_QUEUE'}
                        >
                          {UOM_OPTIONS.map((option) => (
                            <MenuItem key={option.code} value={option.code}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          value={item.notes}
                          onChange={(e) => handleUpdateLineItem(index, { ...item, notes: e.target.value })}
                          disabled={!isEditMode && pr?.status !== 'IN_QUEUE'}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {item.attachments?.map((file, fileIndex) => (
                            <div key={fileIndex} className="flex items-center gap-2">
                              <span className="flex-1 truncate text-sm">{file.name}</span>
                              <IconButton 
                                size="small"
                                onClick={() => handleFilePreview(file)}
                                title="Preview"
                              >
                                <VisibilityIcon />
                              </IconButton>
                              <IconButton 
                                size="small"
                                onClick={() => handleDownloadAttachment(file)}
                                title="Download"
                              >
                                <DownloadIcon />
                              </IconButton>
                              {isEditMode && (
                                <IconButton 
                                  size="small"
                                  onClick={() => handleRemoveLineItemAttachment(index, fileIndex)}
                                  color="error"
                                  title="Delete"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </div>
                          ))}
                          {isEditMode && (
                            <div>
                              <input
                                type="file"
                                id={`line-item-file-${index}`}
                                onChange={(e) => handleLineItemFileUpload(e, index)}
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                              />
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<AttachFileIcon />}
                                onClick={() => document.getElementById(`line-item-file-${index}`)?.click()}
                              >
                                Attach File
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell align="right">
                        {(isEditMode || pr?.status === 'IN_QUEUE') && (
                          <IconButton onClick={() => handleDeleteLineItem(index)} color="error">
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderQuotes = () => {
    if (!pr) return null;

    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Quotes</Typography>
              {isEditMode && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowQuoteForm(true)}
                >
                  Add Quote
                </Button>
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            {pr.quotes?.length > 0 ? (
              <QuoteList 
                quotes={pr.quotes} 
                onEdit={handleEditQuote}
                onDelete={handleDeleteQuote}
                isEditable={isEditMode}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No quotes added yet
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderBasicInformation();
      case 1:
        return renderLineItems();
      case 2:
        return renderQuotes();
      default:
        return null;
    }
  };

  const renderQuoteDialog = () => {
    if (!showQuoteForm) return null;

    return (
      <Dialog 
        open={true}
        onClose={() => {
          setShowQuoteForm(false);
          setSelectedQuote(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedQuote ? 'Edit Quote' : 'Add New Quote'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <QuoteForm
              onSubmit={handleQuoteSubmit}
              onCancel={() => {
                setShowQuoteForm(false);
                setSelectedQuote(null);
              }}
              initialData={selectedQuote}
              vendors={vendors}
              currencies={currencies}
              isEditing={isEditMode}
            />
          </Box>
        </DialogContent>
      </Dialog>
    );
  };

  // Show loading state while reference data is loading
  if (loadingReference || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !pr) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error || 'PR not found'}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Title and Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          PR Details: {pr.prNumber}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            variant="outlined"
          >
            Back to Dashboard
          </Button>
          {canEdit && !isEditMode && (
            <Button
              startIcon={<EditIcon />}
              onClick={() => navigate(`/pr/${id}/edit`)}
              variant="contained"
            >
              Edit PR
            </Button>
          )}
        </Box>
      </Box>

      {/* Procurement Actions */}
      {canProcessPR && (
        <Box sx={{ mb: 3 }}>
          <ProcurementActions
            prId={pr.id}
            currentStatus={pr.status}
            requestorEmail={pr.requestorEmail}
            currentUser={currentUser}
            onStatusChange={async () => {
              await refreshPR();
            }}
          />
        </Box>
      )}

      {/* PR Status */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Status
        </Typography>
        <Chip
          label={PRStatus[pr.status]}
          color={
            pr.status === PRStatus.REJECTED
              ? 'error'
              : pr.status === PRStatus.REVISION_REQUIRED
              ? 'warning'
              : 'primary'
          }
          sx={{ fontWeight: 'bold' }}
        />
      </Box>

      {/* Workflow History */}
      {pr.workflowHistory && pr.workflowHistory.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Workflow History
          </Typography>
          <Paper sx={{ p: 2 }}>
            {pr.workflowHistory.map((history, index) => (
              <Box key={index} sx={{ mb: index !== pr.workflowHistory.length - 1 ? 2 : 0 }}>
                <Typography variant="subtitle2" color="primary">
                  {history.timestamp?.toDate().toLocaleString() || 'Unknown Date'} - {PRStatus[history.step]}
                </Typography>
                {history.notes && (
                  <Typography variant="body2" sx={{ mt: 0.5, ml: 2 }}>
                    {history.notes}
                  </Typography>
                )}
                {history.user && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                    By: {history.user.email}
                  </Typography>
                )}
                {index !== pr.workflowHistory.length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            ))}
          </Paper>
        </Box>
      )}

      {/* Stepper */}
      {isEditMode && (
        <Box sx={{ width: '100%', mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ mb: 4 }}>
        {isEditMode ? renderStepContent() : (
          <>
            {renderBasicInformation()}
            {renderLineItems()}
            {renderQuotes()}
          </>
        )}
      </Box>

      {/* Navigation Buttons */}
      {isEditMode && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {activeStep > 0 && (
            <Button onClick={handleBack} variant="outlined">
              Back
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button onClick={handleNext} variant="contained">
              Next
            </Button>
          ) : (
            <Button onClick={handleSave} variant="contained" color="primary">
              Save Changes
            </Button>
          )}
        </Box>
      )}

      {/* Dialogs */}
      {renderQuoteDialog()}
    </Box>
  );
}

const handleDownloadQuoteAttachment = async (attachment: { name: string; url: string }) => {
  try {
    const response = await fetch(attachment.url);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading file:', error);
    enqueueSnackbar('Error downloading file', { variant: 'error' });
  }
};
