import { useState, useEffect, useMemo } from "react"
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material"
import { ReferenceDataItem } from "@/types/referenceData"
import { Organization } from "@/types/organization"
import { referenceDataAdminService } from "@/services/referenceDataAdmin"
import { organizationService } from "@/services/organizationService"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/config/firebase"

const REFERENCE_DATA_TYPES = {
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

type ReferenceDataType = keyof typeof REFERENCE_DATA_TYPES

const ORG_INDEPENDENT_TYPES = ['vendors', 'currencies', 'uom', 'permissions', 'organizations'] as const;
const CODE_BASED_ID_TYPES = ['currencies', 'uom'] as const;

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
      id: '1pwr_lesotho',
      code: '1PWR_LSO',
      name: '1PWR LESOTHO',
      shortName: '1PWR LSO',
      country: 'Lesotho',
      timezone: 'Africa/Maseru',
      currency: 'LSL',
      active: true
    },
    { 
      id: '1pwr_benin',
      code: '1PWR_BEN',
      name: '1PWR BENIN',
      shortName: '1PWR BEN',
      country: 'Benin',
      timezone: 'Africa/Porto-Novo',
      currency: 'XOF',
      active: true
    },
    { 
      id: '1pwr_zambia',
      code: '1PWR_ZAM',
      name: '1PWR ZAMBIA',
      shortName: '1PWR ZAM',
      country: 'Zambia',
      timezone: 'Africa/Lusaka',
      currency: 'ZMW',
      active: false
    },
    { 
      id: 'pueco_lesotho',
      code: 'PUECO_LSO',
      name: 'PUECO LESOTHO',
      shortName: 'PUECO LSO',
      country: 'Lesotho',
      timezone: 'Africa/Maseru',
      currency: 'LSL',
      active: true
    },
    { 
      id: 'pueco_benin',
      code: 'PUECO_BEN',
      name: 'PUECO BENIN',
      shortName: 'PUECO BEN',
      country: 'Benin',
      timezone: 'Africa/Porto-Novo',
      currency: 'XOF',
      active: false
    },
    { 
      id: 'neo1',
      code: 'NEO1',
      name: 'NEO1',
      shortName: 'NEO1',
      country: 'Lesotho',
      timezone: 'Africa/Maseru',
      currency: 'LSL',
      active: true
    },
    { 
      id: 'smp',
      code: 'SMP',
      name: 'SMP',
      shortName: 'SMP',
      country: 'Lesotho',
      timezone: 'Africa/Maseru',
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
  { name: 'name', label: 'Name', required: true },
  { name: 'contactName', label: 'Contact Name' },
  { name: 'contactEmail', label: 'Contact Email', type: 'email' },
  { name: 'contactPhone', label: 'Contact Phone' },
  { name: 'address', label: 'Address' },
  { name: 'url', label: 'Website URL', type: 'url' },
  { name: 'notes', label: 'Notes' }
];

const organizationFields: ReferenceDataField[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'code', label: 'Code', required: true },
  { name: 'shortName', label: 'Short Name' },
  { name: 'country', label: 'Country' },
  { name: 'timezone', label: 'Timezone' },
  { name: 'currency', label: 'Default Currency' }
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
  { name: 'organization', label: 'Organization', type: 'organization' }
];

// Get form fields based on type
const getFormFields = (type: ReferenceDataType): ReferenceDataField[] => {
  if (isCodeBasedIdType(type)) {
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
const getDisplayFields = (type: ReferenceDataType): ReferenceDataField[] => {
  const fields = getFormFields(type);
  return fields.filter(field => !field.hideInTable);
};

export function ReferenceDataManagement() {
  const [selectedType, setSelectedType] = useState<ReferenceDataType>("departments")
  const [items, setItems] = useState<ReferenceDataItem[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<string>("")
  const [editItem, setEditItem] = useState<ReferenceDataItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

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

  // Check if the type is organization-independent
  const isOrgIndependentType = (type: ReferenceDataType): boolean => {
    return ORG_INDEPENDENT_TYPES.includes(type as any);
  };

  // Load organizations on mount
  useEffect(() => {
    const loadOrgs = async () => {
      try {
        const orgs = await referenceDataAdminService.getActiveItems('organizations');
        setOrganizations(orgs);
        // Only set default organization if none is selected
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
    };
    loadOrgs();
  }, []);

  // Load items when type changes
  useEffect(() => {
    const loadItems = async () => {
      try {
        const items = await referenceDataAdminService.getItems(selectedType);
        setItems(items);
      } catch (error) {
        console.error(`Error loading ${selectedType}:`, error);
        setSnackbar({
          open: true,
          message: `Failed to load ${REFERENCE_DATA_TYPES[selectedType]}`,
          severity: 'error'
        });
      }
    };
    loadItems();
  }, [selectedType]);

  useEffect(() => {
    const updateCurrencies = async () => {
      if (selectedType === 'currencies') {
        // Get current items
        const currentItems = await referenceDataAdminService.getItems('currencies');
        
        // Delete items that don't have lowercase code IDs
        const itemsToDelete = currentItems.filter(item => 
          item.id !== item.code?.toLowerCase()
        );
        
        if (itemsToDelete.length > 0) {
          console.log('Deleting currencies with incorrect IDs:', itemsToDelete);
          for (const item of itemsToDelete) {
            await referenceDataAdminService.deleteItem('currencies', item.id);
          }
        }

        // Add currencies with correct IDs
        const currenciesToAdd = [
          { code: 'EUR', name: 'Euro' },
          { code: 'GBP', name: 'British Pound Sterling' },
          { code: 'XOF', name: 'West African CFA Franc' },
          { code: 'ZMW', name: 'Zambian Kwacha' }
        ].filter(currency => 
          !currentItems.some(item => item.id === currency.code.toLowerCase())
        );

        if (currenciesToAdd.length > 0) {
          console.log('Adding currencies with correct IDs:', currenciesToAdd);
          const results = await referenceDataAdminService.addCurrencies(currenciesToAdd);
          console.log('Currency addition results:', results);
        }

        // Refresh the items list
        const updatedItems = await referenceDataAdminService.getItems(selectedType);
        setItems(updatedItems);
      }
    };

    updateCurrencies();
  }, [selectedType]);

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

  const handleAdd = () => {
    const newItem: Partial<ReferenceDataItem> = {
      active: true
    };
    setEditItem(newItem);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: ReferenceDataItem) => {
    // Create a copy of the item to avoid modifying the original
    const itemCopy = { ...item };
    
    // For permissions, ensure we have all required fields
    if (selectedType === 'permissions') {
      itemCopy.level = itemCopy.level || 5; // Default to lowest level
      itemCopy.description = itemCopy.description || '';
      itemCopy.actions = itemCopy.actions || [];
      itemCopy.scope = itemCopy.scope || [];
    }
    
    // For vehicles, ensure organization is properly structured
    if (selectedType === 'vehicles' && itemCopy.organization) {
      // If organization is a string ID, convert it to an organization object
      if (typeof itemCopy.organization === 'string') {
        const org = organizations.find(o => o.id === itemCopy.organization);
        if (org) {
          itemCopy.organization = {
            id: org.id,
            name: org.name || org.id
          };
        }
      }
    }

    setEditItem(itemCopy);
    setIsDialogOpen(true);
    setFormErrors({});
  };

  const handleSave = async (editedItem: any) => {
    try {
      // For vehicles, ensure organization is properly structured
      if (selectedType === 'vehicles' && editedItem.organization) {
        // If organization is a string ID, convert it to an organization object
        if (typeof editedItem.organization === 'string') {
          const org = organizations.find(o => o.id === editedItem.organization);
          if (org) {
            editedItem.organization = org;
          }
        }
      }

      await referenceDataAdminService.updateItem(selectedType, editedItem);
      setSnackbar({
        open: true,
        message: 'Item updated successfully',
        severity: 'success',
      });
      setIsDialogOpen(false);
      // Refresh data
      const updatedItems = await referenceDataAdminService.getItems(selectedType);
      setItems(updatedItems);
    } catch (error) {
      console.error('Error submitting form:', error);
      setSnackbar({
        open: true,
        message: 'Error updating item',
        severity: 'error',
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent form submission
  };

  const handleDelete = async (id: string) => {
    try {
      console.log(`Attempting to delete ${selectedType} item with id: ${id}`);
      await referenceDataAdminService.deleteItem(selectedType, id);
      console.log('Delete successful');
      
      // Refresh the items list
      const updatedItems = await referenceDataAdminService.getItems(selectedType);
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

  useEffect(() => {
    const savedType = localStorage.getItem('selectedReferenceDataType');
    if (savedType && Object.keys(REFERENCE_DATA_TYPES).includes(savedType)) {
      setSelectedType(savedType as ReferenceDataType);
    }
  }, []);

  const renderField = (field: ReferenceDataField) => {
    const value = editItem?.[field.name] || '';
    const error = formErrors[field.name];
    const helperText = error || '';

    if (field.type === 'organization') {
      const [organizations, setOrganizations] = useState<Organization[]>([]);
      useEffect(() => {
        const loadOrganizations = async () => {
          try {
            const orgs = await referenceDataAdminService.getItems('organizations');
            setOrganizations(orgs);
          } catch (error) {
            console.error('Error loading organizations:', error);
          }
        };
        loadOrganizations();
      }, []);

      return (
        <FormControl key={field.name} fullWidth margin="normal">
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={editItem?.organization?.id || ''}
            onChange={(e) => {
              const org = organizations.find(o => o.id === e.target.value);
              setEditItem({ ...editItem, organization: org || null });
            }}
            label={field.label}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {organizations.map((org) => (
              <MenuItem key={org.id} value={org.id}>
                {org.name}
              </MenuItem>
            ))}
          </Select>
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
        />
      </FormControl>
    );
  };

  const filteredItems = useMemo(() => {
    console.log('Filtering by organization:', selectedOrganization);
    if (!selectedOrganization || isOrgIndependentType(selectedType)) {
      return items;
    }

    return items.filter(item => {
      // Handle both nested organization object and organization ID string
      const itemOrgId = typeof item.organization === 'string' 
        ? item.organization 
        : item.organization?.id;
      
      return itemOrgId === selectedOrganization;
    });
  }, [items, selectedOrganization, selectedType]);

  console.log('Filtered items:', filteredItems);

  const EditDialog = ({ open, onClose, onSubmit, item, type }: any) => {
    const [editItem, setEditItem] = useState<any>(item || {});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [organizations, setOrganizations] = useState<Organization[]>([]);

    useEffect(() => {
      setEditItem(item || {});
    }, [item]);

    useEffect(() => {
      const loadOrganizations = async () => {
        try {
          const orgs = await referenceDataAdminService.getActiveItems('organizations');
          setOrganizations(orgs);
        } catch (error) {
          console.error('Error loading organizations:', error);
        }
      };

      if (open) {
        loadOrganizations();
      }
    }, [open]);

    const handleChange = (field: string, value: any) => {
      setEditItem(prev => ({
        ...prev,
        [field]: value
      }));
      // Clear error when field is changed
      if (formErrors[field]) {
        setFormErrors(prev => ({
          ...prev,
          [field]: ''
        }));
      }
    };

    const renderFormField = (field: ReferenceDataField) => {
      const error = formErrors[field.name];
      const helperText = error || '';

      if (field.type === 'organization') {
        return (
          <FormControl key={field.name} fullWidth margin="normal">
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={editItem?.organization?.id || editItem?.organization || ''}
              onChange={(e) => {
                const selectedValue = e.target.value;
                if (!selectedValue) {
                  handleChange('organization', null);
                } else {
                  const org = organizations.find(o => o.id === selectedValue);
                  handleChange('organization', org);
                }
              }}
              label={field.label}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name || org.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      }

      return (
        <TextField
          key={field.name}
          fullWidth
          margin="normal"
          label={field.label}
          type={field.type || 'text'}
          value={editItem[field.name] || ''}
          onChange={(e) => handleChange(field.name, e.target.value)}
          error={!!error}
          helperText={helperText}
          required={field.required}
        />
      );
    };

    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>
          {item?.id ? 'Edit' : 'Add'} {REFERENCE_DATA_TYPES[type]}
        </DialogTitle>
        <DialogContent>
          {getFormFields(type).map(field => renderFormField(field))}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(editItem)} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box p={3}>
      <Box mb={3} display="flex" gap={2}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ReferenceDataType)}
            label="Type"
          >
            {Object.entries(REFERENCE_DATA_TYPES).map(([type, label]) => (
              <MenuItem key={type} value={type}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" onClick={handleAdd}>
          Add {REFERENCE_DATA_TYPES[selectedType]}
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {getDisplayFields(selectedType).map((field) => (
                <TableCell key={field.name}>{field.label}</TableCell>
              ))}
              <TableCell>Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                {getDisplayFields(selectedType).map((field) => (
                  <TableCell key={field.name}>
                    {field.type === 'organization' 
                      ? (typeof item.organization === 'string' 
                          ? organizations.find(o => o.id === item.organization)?.name 
                          : item.organization?.name) || 'None'
                      : item[field.name]}
                  </TableCell>
                ))}
                <TableCell>
                  <Switch
                    checked={item.active}
                    onChange={async () => {
                      try {
                        await handleSave({ ...item, active: !item.active });
                      } catch (error) {
                        console.error('Error toggling active state:', error);
                        setSnackbar({
                          open: true,
                          message: 'Failed to update active state',
                          severity: 'error'
                        });
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button onClick={() => handleEdit(item)}>Edit</Button>
                  <Button 
                    onClick={() => {
                      if (!item.id) {
                        console.error('Cannot delete item without id:', item);
                        setSnackbar({
                          open: true,
                          message: 'Cannot delete item: missing ID',
                          severity: 'error'
                        });
                        return;
                      }
                      handleDelete(item.id);
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <EditDialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSubmit={handleSave} 
        item={editItem} 
        type={selectedType} 
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
