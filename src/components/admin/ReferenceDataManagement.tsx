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
  { name: 'name', label: 'Name', required: true },
  { name: 'contactName', label: 'Contact Name' },
  { name: 'contactEmail', label: 'Contact Email', type: 'email' },
  { name: 'contactPhone', label: 'Contact Phone' },
  { name: 'address', label: 'Address' },
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
        const orgs = await organizationService.getActiveOrganizations();
        console.log('Loaded organizations:', orgs);
        setOrganizations(orgs);
        // Only set default organization if none is selected and we have orgs
        if (orgs.length > 0 && !selectedOrganization) {
          const defaultOrg = orgs[0];
          console.log('Setting default organization:', defaultOrg);
          setSelectedOrganization(defaultOrg.id);
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

  // Load items when type or organization changes
  useEffect(() => {
    const loadItems = async () => {
      try {
        let loadedItems;
        if (isOrgIndependentType(selectedType)) {
          console.log('Loading items for org-independent type:', selectedType);
          loadedItems = await referenceDataAdminService.getItems(selectedType);
        } else {
          if (!selectedOrganization) {
            console.log('No organization selected, clearing items');
            setItems([]);
            return;
          }
          console.log('Loading items for type and organization:', {
            type: selectedType,
            organizationId: selectedOrganization
          });
          loadedItems = await referenceDataAdminService.getItemsByOrganization(selectedType, selectedOrganization);
        }
        console.log('Loaded items:', loadedItems);
        setItems(loadedItems);
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
  }, [selectedType, selectedOrganization]);

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
      const { id, ...updates } = editedItem;
      
      // Standardize organization ID if present
      if (!isOrgIndependentType(selectedType) && selectedOrganization) {
        const standardizeOrgId = (id: string) => id.toLowerCase().replace(/\s+/g, '_');
        const standardizedOrgId = standardizeOrgId(selectedOrganization);
        updates.organizationId = standardizedOrgId;
        if (updates.organization) {
          updates.organization.id = standardizedOrgId;
        }
      }

      // For vehicles, ensure organization is properly structured
      if (selectedType === 'vehicles') {
        if (typeof updates.organization === 'string') {
          const org = organizations.find(o => o.id === updates.organization);
          if (org) {
            updates.organization = org;
          }
        }
        // Ensure organizationId is set
        if (!updates.organizationId && updates.organization?.id) {
          updates.organizationId = updates.organization.id;
        }
      }

      console.log('Saving item:', { id, updates, editedItem, fullItem: items.find(i => i.id === id) });
      
      if (id) {
        // Update existing item
        await referenceDataAdminService.updateItem(selectedType, id, updates);
      } else {
        // Add new item
        await referenceDataAdminService.addItem(selectedType, updates);
      }
      
      setSnackbar({
        open: true,
        message: id ? 'Item updated successfully' : 'Item added successfully',
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
        message: error instanceof Error ? error.message : 'Error updating item',
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
            const orgs = await referenceDataAdminService.getActiveItems('organizations');
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
    if (isOrgIndependentType(selectedType)) {
      return items;
    }
    const standardizeOrgId = (id: string) => id.toLowerCase().replace(/\s+/g, '_');
    const standardizedSelectedOrg = standardizeOrgId(selectedOrganization);
    return items.filter(item => {
      const itemOrgId = item.organizationId || item.organization?.id;
      return itemOrgId && standardizeOrgId(itemOrgId) === standardizedSelectedOrg;
    });
  }, [items, selectedType, selectedOrganization]);

  console.log('Filtered items:', filteredItems);

  const ReferenceDataForm = ({ open, onClose, item, type, onSubmit }: {
    open: boolean;
    onClose: () => void;
    item?: ReferenceDataItem;
    type: ReferenceDataType;
    onSubmit: (item: any) => void;
  }) => {
    const [editItem, setEditItem] = useState<any>(item || {});

    // Ensure we preserve organization data when editing
    useEffect(() => {
      if (item) {
        setEditItem({
          ...item,
          organizationId: item.organizationId || item.organization?.id
        });
      } else {
        setEditItem({});
      }
    }, [item]);

    const renderFormField = (field: ReferenceDataField) => {
      const value = editItem[field.name] || '';
      const error = formErrors[field.name];
      const helperText = error || '';

      if (field.type === 'organization') {
        return (
          <FormControl key={field.name} fullWidth margin="normal" error={!!error}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={editItem.organizationId || ''}
              onChange={(e) => setEditItem({
                ...editItem,
                organizationId: e.target.value
              })}
              label={field.label}
              required={field.required}
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
        <TextField
          key={field.name}
          label={field.label}
          value={value}
          onChange={(e) => setEditItem({
            ...editItem,
            [field.name]: e.target.value
          })}
          fullWidth
          margin="normal"
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

        {!isOrgIndependentType(selectedType) && (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Organization</InputLabel>
            <Select
              value={selectedOrganization || ''}
              onChange={(e) => {
                const value = e.target.value;
                console.log('Selected organization:', value);
                setSelectedOrganization(value);
              }}
              label="Organization"
            >
              {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

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

      <ReferenceDataForm 
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
