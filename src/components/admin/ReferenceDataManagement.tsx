import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  FormHelperText,
  Chip,
  Tooltip,
  Switch
} from "@mui/material"
import { Edit as EditIcon, Delete as DeleteIcon, Info as InfoIcon } from "@mui/icons-material"
import { ReferenceDataItem } from "@/types/referenceData"
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { 
  REFERENCE_DATA_ACCESS, 
  hasEditAccess, 
  PERMISSION_NAMES,
  REFERENCE_DATA_TYPES
} from '@/config/permissions'
import { referenceDataAdminService } from '@/services/referenceDataAdmin'
import { organizationService } from '@/services/organizationService'

const REFERENCE_DATA_TYPE_LABELS = {
  departments: "Departments",
  projectCategories: "Project Categories",
  sites: "Sites",
  expenseTypes: "Expense Types",
  vehicles: "Vehicles",
  vendors: "Vendors",
  currencies: "Currencies",
  uom: "Units of Measure",
  organizations: "Organizations",
  permissions: "Permissions"
} as const

type ReferenceDataType = keyof typeof REFERENCE_DATA_TYPE_LABELS

const ORG_INDEPENDENT_TYPES = ['vendors', 'currencies', 'uom', 'permissions', 'organizations'] as const;
const CODE_BASED_ID_TYPES = ['currencies', 'uom', 'organizations'] as const;

const SEED_DATA = {
  departments: [
    { id: 'c_level', name: 'C Level', active: true },
    { id: 'dpo', name: 'DPO', active: true },
    { id: 'project_management', name: 'Project Management', active: true },
    { id: 'engineering', name: 'Engineering', active: true },
    { id: 'procurement', name: 'Procurement', active: true },
  ],
  organizations: [
    {
      code: '1PWR_LSO',
      name: '1PWR Lesotho',
      country: 'Lesotho',
      timezoneOffset: 2,
      currency: 'LSL',
      active: true
    },
    {
      code: '1PWR_BEN',
      name: '1PWR Benin',
      country: 'Benin',
      timezoneOffset: 1,
      currency: 'XOF',
      active: true
    },
    {
      code: '1PWR_ZAM',
      name: '1PWR Zambia',
      country: 'Zambia',
      timezoneOffset: 2,
      currency: 'ZMW',
      active: true
    },
    {
      code: 'PUECO_LSO',
      name: 'PUECO Lesotho',
      country: 'Lesotho',
      timezoneOffset: 2,
      currency: 'LSL',
      active: true
    },
    {
      code: 'PUECO_BEN',
      name: 'PUECO Benin',
      country: 'Benin',
      timezoneOffset: 1,
      currency: 'XOF',
      active: true
    },
    {
      code: 'NEO1',
      name: 'NEO1',
      country: 'Lesotho',
      timezoneOffset: 2,
      currency: 'LSL',
      active: true
    },
    {
      code: 'SMP',
      name: 'SMP',
      country: 'Lesotho',
      timezoneOffset: 2,
      currency: 'LSL',
      active: true
    }
  ],
  permissions: [
    {
      id: 'admin',
      code: 'ADMIN',
      name: 'Administrator',
      description: 'Full system access',
      level: 1,
      actions: ['*'],
      scope: ['*'],
      active: true
    },
    {
      id: 'procurement_manager',
      code: 'PROC_MGR',
      name: 'Procurement Manager',
      description: 'Can manage procurement process',
      level: 2,
      actions: ['create', 'read', 'update', 'delete', 'approve'],
      scope: ['pr', 'po', 'vendors'],
      active: true
    },
    {
      id: 'procurement_officer',
      code: 'PROC_OFF',
      name: 'Procurement Officer',
      description: 'Can process procurement requests',
      level: 3,
      actions: ['create', 'read', 'update'],
      scope: ['pr', 'po'],
      active: true
    },
    {
      id: 'department_head',
      code: 'DEPT_HEAD',
      name: 'Department Head',
      description: 'Can approve department requests',
      level: 4,
      actions: ['read', 'approve'],
      scope: ['pr'],
      active: true
    },
    {
      id: 'requester',
      code: 'REQ',
      name: 'Requester',
      description: 'Can create and view requests',
      level: 5,
      actions: ['create', 'read'],
      scope: ['pr'],
      active: true
    }
  ]
} as const;

interface ReferenceDataField {
  name: keyof ReferenceDataItem;
  label: string;
  required?: boolean;
  type?: string;
  readOnly?: boolean;
  hideInTable?: boolean;
}

const isCodeBasedIdType = (type: string): boolean => {
  return CODE_BASED_ID_TYPES.includes(type as any);
};

const commonFields: ReferenceDataField[] = [
  { name: 'name', label: 'Name', required: true }
];

const codeBasedFields: ReferenceDataField[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'code', label: 'Code', required: true }
];

const codeIncludedFields: ReferenceDataField[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'code', label: 'Code', required: true }
];

const vendorFields: ReferenceDataField[] = [
  { name: 'code', label: 'Code', type: 'text', required: true },
  { name: 'name', label: 'Name', required: true },
  { name: 'active', label: 'Active', type: 'boolean' },
  { name: 'approved', label: 'Approved', type: 'boolean' },
  { name: 'productsServices', label: 'Products/Services', type: 'text' },
  { name: 'contactName', label: 'Contact Name' },
  { name: 'contactEmail', label: 'Contact Email', type: 'email', sx: { 
    width: '150px', 
    maxWidth: '150px',
    whiteSpace: 'normal', 
    wordWrap: 'break-word',
    wordBreak: 'break-all',
    overflow: 'hidden'
  } },
  { name: 'contactPhone', label: 'Contact Phone' },
  { name: 'address', label: 'Address' },
  { name: 'city', label: 'City' },
  { name: 'country', label: 'Country' },
  { name: 'url', label: 'Website URL', type: 'url' },
  { name: 'notes', label: 'Notes' }
];

const organizationFields: ReferenceDataField[] = [
  { name: 'code', label: 'Code', required: true },
  { name: 'name', label: 'Name', required: true },
  { name: 'country', label: 'Country', required: true },
  { name: 'timezoneOffset', label: 'Timezone Offset (GMT)', type: 'number', required: true },
  { name: 'currency', label: 'Currency', required: true },
];

const permissionFields: ReferenceDataField[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'code', label: 'Code', required: true },
  { name: 'description', label: 'Description' },
  { name: 'level', label: 'Level', type: 'number' }
];

const vehicleFields: ReferenceDataField[] = [
  { name: 'code', label: 'Code', type: 'text', required: true },
  { name: 'registrationNumber', label: 'Registration Number', type: 'text' },
  { name: 'year', label: 'Year', type: 'number' },
  { name: 'make', label: 'Make', type: 'text' },
  { name: 'model', label: 'Model', type: 'text' },
  { name: 'vinNumber', label: 'VIN Number', type: 'text' },
  { name: 'engineNumber', label: 'Engine Number', type: 'text' },
  { name: 'organizationId', label: 'Organization ID', type: 'text', readOnly: true, hideInTable: true }
];

// Get form fields based on type
const getFormFields = (type: ReferenceDataType): ReferenceDataField[] => {
  if (isCodeBasedIdType(type) && type !== 'organizations') {
    return codeBasedFields;
  }

  switch (type) {
    case 'vendors':
      return vendorFields;
    case 'organizations':
      return organizationFields;
    case 'permissions':
      return permissionFields;
    case 'vehicles':
      return vehicleFields;
    case 'departments':
    case 'sites':
    case 'expenseTypes':
    case 'projectCategories':
      return codeIncludedFields;
    default:
      return commonFields;
  }
};

// Get display fields based on type - used for the table display
function getDisplayFields(type: ReferenceDataType): ReferenceDataField[] {
  switch (type) {
    case 'vendors':
      return [
        { name: 'code', label: 'Code', sx: { width: '100px', whiteSpace: 'normal', wordWrap: 'break-word' } },
        { name: 'name', label: 'Name', sx: { width: '150px', whiteSpace: 'normal', wordWrap: 'break-word' } },
        { name: 'active', label: 'Active', type: 'boolean', sx: { width: '80px', whiteSpace: 'normal', wordWrap: 'break-word' } },
        { name: 'approved', label: 'Approved', type: 'boolean', sx: { width: '80px', whiteSpace: 'normal', wordWrap: 'break-word' } },
        { name: 'productsServices', label: 'Products/Services', sx: { width: '150px', whiteSpace: 'normal', wordWrap: 'break-word' } },
        { name: 'contactName', label: 'Contact Name', sx: { width: '150px', whiteSpace: 'normal', wordWrap: 'break-word' } },
        { name: 'contactPhone', label: 'Contact Phone', sx: { width: '120px', whiteSpace: 'normal', wordWrap: 'break-word' } },
        { name: 'contactEmail', label: 'Contact Email', sx: { 
          width: '150px', 
          maxWidth: '150px',
          whiteSpace: 'normal', 
          wordWrap: 'break-word',
          wordBreak: 'break-all',
          overflow: 'hidden'
        } },
        { name: 'url', label: 'Website URL', sx: { width: '150px', whiteSpace: 'normal', wordWrap: 'break-word' } },
        { name: 'city', label: 'City', sx: { width: '100px', whiteSpace: 'normal', wordWrap: 'break-word' } },
        { name: 'country', label: 'Country', sx: { width: '100px', whiteSpace: 'normal', wordWrap: 'break-word' } },
        { name: 'notes', label: 'Notes', sx: { width: '150px', whiteSpace: 'normal', wordWrap: 'break-word' } }
      ];
    case 'organizations':
      return organizationFields.map(field => ({ ...field, sx: { whiteSpace: 'normal', wordWrap: 'break-word' } }));
    case 'permissions':
      return permissionFields.map(field => ({ ...field, sx: { whiteSpace: 'normal', wordWrap: 'break-word' } }));
    case 'vehicles':
      return vehicleFields.filter(f => !f.hideInTable).map(field => ({ 
        ...field, 
        sx: { 
          width: '187px',  // 150px * 1.25
          whiteSpace: 'normal', 
          wordWrap: 'break-word' 
        } 
      }));
    case 'departments':
    case 'sites':
    case 'expenseTypes':
    case 'projectCategories':
      return codeIncludedFields.map(field => ({ ...field, sx: { whiteSpace: 'normal', wordWrap: 'break-word' } }));
    case 'currencies':
    case 'uom':
      return codeBasedFields.map(field => ({ ...field, sx: { whiteSpace: 'normal', wordWrap: 'break-word' } }));
    default:
      return commonFields.map(field => ({ ...field, sx: { whiteSpace: 'normal', wordWrap: 'break-word' } }));
  }
};

const isOrgIndependentType = (type: string): boolean => {
  return ORG_INDEPENDENT_TYPES.includes(type as any);
};

const getAutocompleteAttribute = (fieldName: string): string => {
  switch (fieldName) {
    case 'name':
      return 'organization';
    case 'code':
      return 'off';
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    case 'address':
      return 'street-address';
    case 'city':
      return 'address-level2';
    case 'country':
      return 'country-name';
    default:
      return 'off';
  }
};

interface ReferenceDataManagementProps {
  isReadOnly: boolean;
}

export function ReferenceDataManagement({ isReadOnly }: ReferenceDataManagementProps) {
  const { user } = useSelector((state: RootState) => state.auth);

  const [selectedType, setSelectedType] = useState<ReferenceDataType>('departments');
  const [items, setItems] = useState<ReferenceDataItem[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ReferenceDataItem | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const canEdit = useMemo(() => {
    return user?.permissionLevel ? hasEditAccess(user.permissionLevel, selectedType) : false;
  }, [user?.permissionLevel, selectedType]);

  // Get editable roles for the current type
  const getEditableRoles = useMemo(() => (type: string): string => {
    const access = REFERENCE_DATA_ACCESS[type];
    return access ? access.editableBy.join(', ') : 'None';
  }, []);

  // Memoize the shouldShowOrgSelect function to prevent unnecessary re-renders
  const shouldShowOrgSelect = useMemo(() => {
    // Show org selector for all users that can access admin portal
    return user?.permissionLevel === 1 || user?.permissionLevel === 2 || user?.permissionLevel === 3 || user?.permissionLevel === 4;
  }, [user?.permissionLevel]);

  const loadOrganizations = useCallback(async () => {
    // Only load organizations if we need to show the selector
    if (!shouldShowOrgSelect) return;
    
    try {
      const orgs = await organizationService.getOrganizations();
      setOrganizations(orgs);
      // Set default organization if none selected
      if (orgs.length > 0 && !selectedOrganization) {
        setSelectedOrganization(orgs[0].id);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load organizations',
        severity: 'error'
      });
    }
  }, [shouldShowOrgSelect, selectedOrganization]);

  const loadItems = async () => {
    try {
      const data = await referenceDataAdminService.getItems(selectedType, selectedOrganization);
      setItems(data);
    } catch (error) {
      console.error(`Error loading ${selectedType}:`, error);
      setSnackbar({
        open: true,
        message: `Failed to load ${selectedType}`,
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    loadItems();
  }, [selectedType, selectedOrganization]);

  useEffect(() => {
    const savedType = localStorage.getItem('selectedReferenceDataType');
    if (savedType && Object.keys(REFERENCE_DATA_TYPE_LABELS).includes(savedType)) {
      setSelectedType(savedType as ReferenceDataType);
    }
  }, []);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter by organization if needed
    if (!isOrgIndependentType(selectedType)) {
      if (!selectedOrganization) {
        return [];
      }
      
      const standardizeOrgId = (id: string) => id.toLowerCase().replace(/\s+/g, '_');
      const standardizedSelectedOrg = standardizeOrgId(selectedOrganization);
      
      result = result.filter(item => {
        const itemOrgId = item.organizationId || item.organization?.id;
        return itemOrgId && standardizeOrgId(itemOrgId) === standardizedSelectedOrg;
      });
    }

    // Sort items based on type
    if (selectedType === 'vendors') {
      result.sort((a, b) => {
        const codeA = a.code || '';
        const codeB = b.code || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true });
      });
    } else {
      // Default sort by name for other types
      result.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      });
    }

    return result;
  }, [items, selectedType, selectedOrganization]);

  const validateForm = (item: Partial<ReferenceDataItem>): boolean => {
    if (!item) {
      setFormErrors({ name: 'Item is required' });
      return false;
    }

    const errors: Record<string, string> = {};

    if (!item.name?.trim()) {
      errors.name = 'Name is required';
    }

    // Only require code for code-based ID types
    if (isCodeBasedIdType(selectedType) && !item.code?.trim()) {
      errors.code = 'Code is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    try {
      if (!editItem) {
        console.log('No editItem found');
        return;
      }

      console.log('Starting save process with item:', editItem);

      // Validate required fields
      const fields = getFormFields(selectedType);
      const errors: Record<string, string> = {};
      
      fields.forEach(field => {
        if (field.required && !editItem[field.name]) {
          errors[field.name] = `${field.label} is required`;
        }
      });

      console.log('Validation errors:', errors);

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      const id = editItem.id;
      const updates = { ...editItem };
      delete updates.id;  // Remove id from updates

      // Add organization info for org-dependent types
      if (!isOrgIndependentType(selectedType) && selectedOrganization) {
        const org = organizations.find(o => o.id === selectedOrganization);
        if (org) {
          updates.organizationId = org.id;
          updates.organization = {
            id: org.id,
            name: org.name
          };
        }
      }

      // For vendors, ensure required fields and handle code generation
      if (selectedType === 'vendors') {
        // Remove organization fields for vendors as they are org-independent
        delete updates.organizationId;
        delete updates.organization;
        
        // Ensure required fields for vendors
        if (!updates.name?.trim()) {
          throw new Error('Vendor name is required');
        }
        
        // Set default values for vendors
        updates.active = updates.active ?? true;
        updates.approved = updates.approved ?? false;
        
        if (!updates.code?.trim()) {
          // Generate a simple numeric code if not provided
          const existingCodes = items
            .map(item => parseInt(item.code || '0'))
            .filter(code => !isNaN(code));
          const maxCode = Math.max(0, ...existingCodes);
          updates.code = String(maxCode + 1).padStart(4, '0');
        }
      }

      console.log('Saving with updates:', updates);
      
      if (id) {
        // Update existing item
        console.log('Updating existing item:', id);
        await referenceDataAdminService.updateItem(selectedType, id, updates);
      } else {
        // Add new item
        console.log('Adding new item');
        await referenceDataAdminService.addItem(selectedType, updates);
      }
      
      console.log('Save successful');
      
      setSnackbar({
        open: true,
        message: id ? 'Item updated successfully' : 'Item added successfully',
        severity: 'success',
      });
      
      // Close dialog and refresh data
      setIsDialogOpen(false);
      const updatedItems = await referenceDataAdminService.getItems(selectedType, selectedOrganization);
      setItems(updatedItems);
      
    } catch (error) {
      console.error('Error saving item:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error saving item',
        severity: 'error',
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSave();
  };

  const handleDelete = async (id: string) => {
    try {
      console.log(`Attempting to delete ${selectedType} item with id: ${id}`);
      await referenceDataAdminService.deleteItem(selectedType, id);
      console.log('Delete successful');
      
      // Refresh the items list
      const updatedItems = await referenceDataAdminService.getItems(selectedType, selectedOrganization);
      setItems(updatedItems);
      
      setSnackbar({
        open: true,
        message: 'Item deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error(`Error deleting ${selectedType} item:`, error);
      setSnackbar({
        open: true,
        message: `Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newType = event.target.value as ReferenceDataType;
    setSelectedType(newType);
    localStorage.setItem('selectedReferenceDataType', newType);
  };

  const renderField = (field: ReferenceDataField) => {
    const value = editItem?.[field.name] || '';
    const error = formErrors[field.name];
    const helperText = error || '';

    if (field.type === 'boolean') {
      return (
        <FormControl 
          key={field.name} 
          fullWidth 
          margin="normal" 
          error={!!error}
        >
          <FormControlLabel
            control={
              <Switch
                name={field.name}
                id={`${selectedType}-${field.name}`}
                checked={!!value}
                onChange={(e) => {
                  if (editItem) {
                    setEditItem({
                      ...editItem,
                      [field.name]: e.target.checked
                    });
                  }
                }}
              />
            }
            label={field.label}
          />
          {helperText && <FormHelperText>{helperText}</FormHelperText>}
        </FormControl>
      );
    }

    if (field.type === 'organization') {
      return (
        <FormControl 
          key={field.name} 
          fullWidth 
          margin="normal" 
          error={!!error}
        >
          <InputLabel id={`${selectedType}-${field.name}-label`}>
            {field.label}
          </InputLabel>
          <Select
            labelId={`${selectedType}-${field.name}-label`}
            id={`${selectedType}-${field.name}`}
            name={field.name}
            value={value}
            label={field.label}
            onChange={(e) => {
              if (editItem) {
                setEditItem({
                  ...editItem,
                  [field.name]: e.target.value
                });
              }
            }}
            required={field.required}
            autoComplete="off"
          >
            {organizations.map((org) => (
              <MenuItem key={org.id} value={org.id}>
                {org.name}
              </MenuItem>
            ))}
          </Select>
          {helperText && <FormHelperText>{helperText}</FormHelperText>}
        </FormControl>
      );
    }

    return (
      <FormControl 
        key={field.name} 
        fullWidth 
        margin="normal" 
        error={!!error}
      >
        <TextField
          id={`${selectedType}-${field.name}`}
          name={field.name}
          label={field.label}
          value={value}
          onChange={(e) => {
            if (editItem) {
              setEditItem({
                ...editItem,
                [field.name]: e.target.value
              });
            }
          }}
          error={!!error}
          helperText={helperText}
          required={field.required}
          type={field.type || 'text'}
          InputProps={{
            readOnly: field.readOnly
          }}
          autoComplete={getAutocompleteAttribute(field.name)}
        />
      </FormControl>
    );
  };

  const renderDialog = () => (
    <Dialog 
      open={isDialogOpen} 
      onClose={handleCloseDialog}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {editItem?.id ? `Edit ${REFERENCE_DATA_TYPE_LABELS[selectedType]}` : `Add ${REFERENCE_DATA_TYPE_LABELS[selectedType]}`}
      </DialogTitle>
      <form onSubmit={handleFormSubmit}>
        <DialogContent>
          {getFormFields(selectedType).map((field) => renderField(field))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {editItem?.id ? 'Save Changes' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );

  const handleAddNew = () => {
    console.log('Opening add dialog for type:', selectedType);
    setEditItem({
      active: true,
      approved: false,
      name: '',
      code: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (item: ReferenceDataItem) => {
    console.log('Opening edit dialog for item:', item);
    setEditItem(item);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    console.log('Closing dialog');
    setIsDialogOpen(false);
    setEditItem(null);
    setFormErrors({});
  };

  // Convert date from "DD-MMM-YY" to "YYYY-MM-DD"
  const formatDateForInput = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch (e) {
      console.error('Error parsing date:', e);
      return '';
    }
  }

  // Convert date from "YYYY-MM-DD" to display format
  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateStr;
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <FormControl sx={{ minWidth: 200, mr: 2 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={selectedType}
            label="Type"
            onChange={(e) => {
              const newType = e.target.value as ReferenceDataType;
              setSelectedType(newType);
              localStorage.setItem('selectedReferenceDataType', newType);
            }}
          >
            {Object.entries(REFERENCE_DATA_TYPE_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {shouldShowOrgSelect && (
          <FormControl sx={{ minWidth: 200, mr: 2 }}>
            <InputLabel>Organization</InputLabel>
            <Select
              value={selectedOrganization}
              label="Organization"
              onChange={(e) => setSelectedOrganization(e.target.value)}
            >
              {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {!isReadOnly && canEdit && (
          <Button 
            variant="contained" 
            onClick={handleAddNew}
            sx={{ ml: 'auto' }}
          >
            Add {REFERENCE_DATA_TYPE_LABELS[selectedType]}
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {getDisplayFields(selectedType).map((field) => (
                <TableCell key={field.name} sx={field.sx}>
                  {field.label}
                </TableCell>
              ))}
              {!isReadOnly && canEdit && <TableCell sx={{ width: 120 }}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                {getDisplayFields(selectedType).map((field) => (
                  <TableCell key={field.name} sx={field.sx}>
                    {field.type === 'boolean' 
                      ? item[field.name] ? 'Yes' : 'No'
                      : item[field.name]}
                  </TableCell>
                ))}
                {!isReadOnly && canEdit && (
                  <TableCell sx={{ width: 120 }}>
                    <IconButton onClick={() => handleEdit(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {renderDialog()}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
