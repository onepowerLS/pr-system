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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Divider,
  Chip,
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
import { Edit as EditIcon, ArrowBack as ArrowBackIcon, AttachFile as AttachFileIcon, Download as DownloadIcon, Visibility as VisibilityIcon, Save as SaveIcon, Add as AddIcon } from '@mui/icons-material';
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
            referenceDataService.getItemsByType('vendors'),
            referenceDataService.getItemsByType('currencies'),
          ]);

          setDepartments(depts);
          setProjectCategories(categories);
          setSites(siteList);
          setExpenseTypes(expenses);
          setVehicles(vehicleList);
          setVendors(vendorList);
          setCurrencies(currencyList);
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

  const handleQuoteSubmit = async (quoteData: Partial<Quote>) => {
    try {
      if (selectedQuote) {
        // Update existing quote
        const updatedQuotes = pr.quotes.map(q => 
          q.id === selectedQuote.id ? { ...q, ...quoteData } : q
        );
        await prService.updatePR(pr.id, { quotes: updatedQuotes });
        enqueueSnackbar('Quote updated successfully', { variant: 'success' });
      } else {
        // Add new quote
        const newQuote = {
          id: crypto.randomUUID(),
          ...quoteData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updatedQuotes = [...(pr.quotes || []), newQuote];
        await prService.updatePR(pr.id, { quotes: updatedQuotes });
        enqueueSnackbar('Quote added successfully', { variant: 'success' });
      }
      handleCloseQuoteForm();
      refreshPR();
    } catch (error) {
      console.error('Error submitting quote:', error);
      enqueueSnackbar('Error submitting quote', { variant: 'error' });
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowQuoteForm(true);
  };

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      const updatedQuotes = pr.quotes.filter(q => q.id !== quoteId);
      await prService.updatePR(pr.id, { quotes: updatedQuotes });
      enqueueSnackbar('Quote deleted successfully', { variant: 'success' });
      refreshPR();
    } catch (error) {
      console.error('Error deleting quote:', error);
      enqueueSnackbar('Error deleting quote', { variant: 'error' });
    }
  };

  const handleCloseQuoteForm = () => {
    setShowQuoteForm(false);
    setSelectedQuote(null);
  };

  const handleFilePreview = (file: { name: string; url: string; type: string }) => {
    if (!isPreviewableFile(file.name)) {
      const extension = file.name.split('.').pop()?.toUpperCase() || 'This type of';
      enqueueSnackbar(`${extension} files cannot be previewed. Click the download button to save the file.`, {
        variant: 'info',
        anchorOrigin: {
          vertical: 'top',
          horizontal: 'right',
        },
      });
    } else {
      setPreviewFile(file);
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
  const steps = ['Basic Information', 'Line Items & Quotes'];

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
                  color={pr.isUrgent || pr.metrics?.isUrgent ? 'error' : 'default'}
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
                <Typography>{pr.createdBy?.email || 'N/A'}</Typography>
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
      <Grid item xs={12}>
        <CustomCard className="mt-6">
          <CustomCardHeader>
            <CardTitle>Line Items</CardTitle>
            <CardDescription>Items requested in this purchase request</CardDescription>
          </CustomCardHeader>
          <CustomCardContent className="p-6 bg-white rounded-lg shadow-sm">
            <div className="border rounded-md">
              <Table>
                <TableHead className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[200px] font-semibold">Description</TableHead>
                    <TableHead className="w-[100px] font-semibold">Quantity</TableHead>
                    <TableHead className="w-[100px] font-semibold">UOM</TableHead>
                    <TableHead className="w-[200px] font-semibold">Notes</TableHead>
                    <TableHead className="font-semibold">Attachments</TableHead>
                    <TableHead className="w-[150px] text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pr.lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.uom}</TableCell>
                      <TableCell>{item.notes || 'N/A'}</TableCell>
                      <TableCell>
                        {item.attachments && item.attachments.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {item.attachments.map((file, fileIndex) => (
                              <div 
                                key={fileIndex} 
                                className="flex items-center gap-2 bg-muted/50 p-1 rounded"
                              >
                                <span className="flex-1 truncate text-sm">
                                  {file.name}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="flex items-center gap-2"
                                  onClick={() => handleFilePreview(file)}
                                >
                                  <EyeIcon className="h-4 w-4" />
                                  <span>Preview</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = file.url;
                                    link.setAttribute('download', file.name);
                                    document.body.appendChild(link);
                                    link.click();
                                    link.parentNode?.removeChild(link);
                                  }}
                                >
                                  <DownloadIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No attachments
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex items-center gap-2"
                            onClick={() => handleFilePreview(item)}
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span>Preview</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = item.url;
                              link.setAttribute('download', item.name);
                              document.body.appendChild(link);
                              link.click();
                              link.parentNode?.removeChild(link);
                            }}
                          >
                            <DownloadIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CustomCardContent>
        </CustomCard>
      </Grid>
    );
  };

  const renderQuotes = () => {
    return (
      <Grid item xs={12}>
        <CustomCard className="mt-6">
          <CustomCardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-semibold">Quotes</CardTitle>
                <CardDescription>
                  {pr.quotes && pr.quotes.length > 0 
                    ? "Vendor quotes for this purchase request"
                    : "No quotes added yet"}
                </CardDescription>
              </div>
              {isEditMode && !showQuoteForm && (
                <Button
                  className="flex items-center gap-2"
                  onClick={handleShowQuoteForm}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Quote
                </Button>
              )}
            </div>
          </CustomCardHeader>
          <CustomCardContent className="p-6 bg-white rounded-lg shadow-sm">
            {showQuoteForm && (
              <QuoteForm
                onSubmit={handleQuoteSubmit}
                onCancel={handleCloseQuoteForm}
                initialData={selectedQuote}
                vendors={vendors}
                currencies={currencies}
              />
            )}
            {pr.quotes && pr.quotes.length > 0 && (
              <div className="border rounded-md mt-4">
                <Table>
                  <TableHead className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[200px] font-semibold">Vendor</TableHead>
                      <TableHead className="w-[150px] font-semibold">Quote Date</TableHead>
                      <TableHead className="w-[120px] font-semibold">Amount</TableHead>
                      <TableHead className="w-[120px] font-semibold">Currency</TableHead>
                      <TableHead className="font-semibold">Notes</TableHead>
                      <TableHead className="w-[200px] text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pr.quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell>{quote.vendorName}</TableCell>
                        <TableCell>{quote.quoteDate}</TableCell>
                        <TableCell>{quote.amount}</TableCell>
                        <TableCell>{quote.currency}</TableCell>
                        <TableCell>{quote.notes}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isEditMode && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => handleEditQuote(quote)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => handleDeleteQuote(quote.id)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CustomCardContent>
        </CustomCard>
      </Grid>
    );
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderBasicInformation();
      case 1:
        return (
          <Grid container spacing={2}>
            {/* Line Items Section */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Line Items
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <div className="border rounded-md">
                  <Table>
                    <TableHead className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[200px] font-semibold">Description</TableHead>
                        <TableHead className="w-[100px] font-semibold">Quantity</TableHead>
                        <TableHead className="w-[100px] font-semibold">UOM</TableHead>
                        <TableHead className="w-[200px] font-semibold">Notes</TableHead>
                        <TableHead className="w-[150px] text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pr.lineItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.uom}</TableCell>
                          <TableCell>{item.notes || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="flex items-center gap-2"
                                onClick={() => handleFilePreview(item)}
                              >
                                <EyeIcon className="h-4 w-4" />
                                <span>Preview</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Paper>
            </Grid>

            {/* Quotes Section */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Quotes</Typography>
                  {isEditMode && !showQuoteForm && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleShowQuoteForm}
                    >
                      Add Quote
                    </Button>
                  )}
                </Box>
                <Divider sx={{ mb: 2 }} />
                {showQuoteForm ? (
                  <QuoteForm
                    onSubmit={handleQuoteSubmit}
                    onCancel={handleCloseQuoteForm}
                    initialData={selectedQuote}
                    vendors={vendors}
                    currencies={currencies}
                  />
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHead className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[200px] font-semibold">Vendor</TableHead>
                          <TableHead className="w-[150px] font-semibold">Quote Date</TableHead>
                          <TableHead className="w-[120px] font-semibold">Amount</TableHead>
                          <TableHead className="w-[120px] font-semibold">Currency</TableHead>
                          <TableHead className="w-[200px] text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pr.quotes?.map((quote) => (
                          <TableRow key={quote.id}>
                            <TableCell>{quote.vendorName}</TableCell>
                            <TableCell>{quote.quoteDate}</TableCell>
                            <TableCell>{quote.amount}</TableCell>
                            <TableCell>{quote.currency}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {isEditMode && (
                                  <>
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => handleEditQuote(quote)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      onClick={() => handleDeleteQuote(quote.id)}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Paper>
            </Grid>
          </Grid>
        );
      default:
        return null;
    }
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

      {/* Main Content */}
      {isEditMode ? (
        <>
          <Box sx={{ width: '100%', mb: 4 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
          <Box sx={{ mb: 4 }}>
            {renderStepContent()}
          </Box>
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
        </>
      ) : (
        // View mode content
        <>
          {renderBasicInformation()}
          {renderLineItems()}
          {renderQuotes()}
        </>
      )}
      {previewFile && (
        <FilePreviewDialog
          open={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
        />
      )}
    </Box>
  );
}
