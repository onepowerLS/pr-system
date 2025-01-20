import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
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
}

const isCodeBasedIdType = (type: string): boolean => {
  return CODE_BASED_ID_TYPES.includes(type as any);
};

const commonFields: ReferenceDataField[] = [
  { name: 'id', label: 'ID' },
  { name: 'name', label: 'Name', required: true }
];

const codeBasedFields: ReferenceDataField[] = [
  ...commonFields,
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
  { name: 'code', label: 'Code', required: true }
];

const permissionFields: ReferenceDataField[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'code', label: 'Code', required: true },
  { name: 'description', label: 'Description' },
  { name: 'level', label: 'Level', type: 'number' }
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
    default:
      return commonFields;
  }
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
        console.log('Loading organizations...');
        const orgs = await organizationService.getActiveOrganizations();
        console.log('Loaded organizations:', orgs);
        setOrganizations(orgs);
        if (orgs.length > 0 && !selectedOrganization) {
          console.log('Setting default organization:', orgs[0]);
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

  // Load items whenever type or selected organization changes
  useEffect(() => {
    const loadItemsAsync = async () => {
      try {
        console.log('Loading items for type:', selectedType);
        let items = await referenceDataAdminService.getItems(selectedType);
        console.log('Loaded items (raw):', items);
        
        // Ensure all items have an id
        items = items.map(item => {
          if (!item.id) {
            console.error('Item missing id:', item);
          }
          return item;
        });
        
        // Only filter by organization for organization-dependent types
        if (!isOrgIndependentType(selectedType) && selectedOrganization) {
          console.log('Filtering by organization:', selectedOrganization);
          items = items.filter(item => {
            // Handle both old string format and new object format
            if (typeof item.organization === 'string') {
              return item.organization === selectedOrganization;
            }
            return item.organization?.id === selectedOrganization;
          });
          console.log('Filtered items:', items);
        }
        
        setItems(items);
      } catch (error) {
        console.error('Error loading items:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load items',
          severity: 'error'
        });
      }
    };
    loadItemsAsync();
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
      name: '',
      code: '',
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

    // For non-code-based types, ensure we keep the original ID
    if (!isCodeBasedIdType(selectedType)) {
      itemCopy.id = item.id;
    }
    
    setEditItem(itemCopy);
    setIsDialogOpen(true);
    setFormErrors({});
  };

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission
    
    try {
      if (!editItem || !validateForm(editItem)) {
        console.log('Form validation failed:', formErrors);
        return;
      }

      // Ensure we have required fields
      if (!editItem.name?.trim() || (isCodeBasedIdType(selectedType) && !editItem.code?.trim())) {
        console.log('Required fields missing');
        return;
      }

      // Build base item with required fields
      const itemToSave: Partial<ReferenceDataItem> = {
        name: editItem.name.trim(),
        active: editItem.active ?? true
      };

      // Only include non-empty optional fields
      const optionalFields = ['contactName', 'contactEmail', 'contactPhone', 'address', 'url', 'notes'] as const;
      for (const field of optionalFields) {
        const value = editItem[field]?.trim();
        if (value) {
          itemToSave[field] = value;
        }
      }

      // Copy any other fields from editItem that we haven't handled
      for (const [key, value] of Object.entries(editItem)) {
        if (
          key !== 'name' && 
          key !== 'active' && 
          !optionalFields.includes(key as any) && 
          value !== undefined && 
          value !== null && 
          value !== ''
        ) {
          itemToSave[key] = value;
        }
      }

      // Handle permissions specially
      if (selectedType === 'permissions') {
        const newId = editItem.code.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (editItem.id && editItem.id !== newId) {
          await referenceDataAdminService.deleteItem(selectedType, editItem.id);
          itemToSave.id = newId;
          await referenceDataAdminService.addItem(selectedType, itemToSave);
        } else if (!editItem.id) {
          itemToSave.id = newId;
          await referenceDataAdminService.addItem(selectedType, itemToSave);
        } else {
          await referenceDataAdminService.updateItem(selectedType, editItem.id, itemToSave);
        }
      } else if (isCodeBasedIdType(selectedType)) {
        // Handle code-based ID types
        const newId = editItem.code.toLowerCase().trim();
        if (editItem.id && editItem.id !== newId) {
          await referenceDataAdminService.deleteItem(selectedType, editItem.id);
          itemToSave.id = newId;
          await referenceDataAdminService.addItem(selectedType, itemToSave);
        } else if (!editItem.id) {
          itemToSave.id = newId;
          await referenceDataAdminService.addItem(selectedType, itemToSave);
        } else {
          await referenceDataAdminService.updateItem(selectedType, editItem.id, itemToSave);
        }
      } else {
        // Handle regular items (including vendors)
        if (editItem.id) {
          await referenceDataAdminService.updateItem(selectedType, editItem.id, itemToSave);
        } else {
          await referenceDataAdminService.addItem(selectedType, itemToSave);
        }
      }

      // Refresh items list
      const updatedItems = await referenceDataAdminService.getItems(selectedType);
      setItems(updatedItems);

      setIsDialogOpen(false);
      setEditItem(null);
      setFormErrors({});
      
      // Show success message using global snackbar
      const itemType = REFERENCE_DATA_TYPES[selectedType].slice(0, -1); // Remove 's' from plural
      setSnackbar({
        open: true,
        message: `${itemType} ${itemToSave.code} ${editItem.id ? 'updated' : 'added'} successfully`,
        severity: 'success',
        autoHideDuration: 3000
      });
    } catch (error) {
      console.error('Error saving item:', error);
      setSnackbar({
        open: true,
        message: `Failed to save item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        autoHideDuration: 3000
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

  return (
    <Box p={3}>
      <Box mb={3} display="flex" gap={2}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={selectedType}
            label="Type"
            onChange={handleTypeChange}
          >
            {Object.entries(REFERENCE_DATA_TYPES).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {!isOrgIndependentType(selectedType) && (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Organization</InputLabel>
            <Select
              value={selectedOrganization}
              label="Organization"
              onChange={(e) => setSelectedOrganization(e.target.value as string)}
            >
              {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Button variant="contained" color="primary" onClick={handleAdd}>
          Add New
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              {selectedType !== 'vendors' && selectedType !== 'departments' && <TableCell>Code</TableCell>}
              <TableCell>Name</TableCell>
              {selectedType === 'vendors' ? (
                <>
                  <TableCell>Approval Date</TableCell>
                  <TableCell>Contact Name</TableCell>
                  <TableCell>Contact Email</TableCell>
                  <TableCell>Contact Phone</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Notes</TableCell>
                </>
              ) : selectedType === 'permissions' ? (
                <>
                  <TableCell>Level</TableCell>
                  <TableCell>Description</TableCell>
                </>
              ) : !isOrgIndependentType(selectedType) && selectedType !== 'departments' ? (
                <TableCell>Organization</TableCell>
              ) : null}
              <TableCell>Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                {selectedType !== 'vendors' && selectedType !== 'departments' && <TableCell>{item.code}</TableCell>}
                <TableCell>{item.name}</TableCell>
                {selectedType === 'vendors' ? (
                  <>
                    <TableCell>{formatDateForDisplay(item.approvalDate)}</TableCell>
                    <TableCell>{item.contactName}</TableCell>
                    <TableCell>{item.contactEmail}</TableCell>
                    <TableCell>{item.contactPhone}</TableCell>
                    <TableCell>{item.address}</TableCell>
                    <TableCell>{item.url}</TableCell>
                    <TableCell>{item.notes}</TableCell>
                  </>
                ) : selectedType === 'permissions' ? (
                  <>
                    <TableCell>{item.level}</TableCell>
                    <TableCell>{item.description}</TableCell>
                  </>
                ) : !isOrgIndependentType(selectedType) && selectedType !== 'departments' ? (
                  <TableCell>
                    {typeof item.organization === 'string' 
                      ? organizations.find(org => org.id === item.organization)?.name
                      : organizations.find(org => org.id === item.organization?.id)?.name}
                  </TableCell>
                ) : null}
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={item.active}
                        onChange={async () => {
                          await handleSave({ ...item, active: !item.active })
                        }}
                      />
                    }
                    label=""
                  />
                </TableCell>
                <TableCell>
                  <Button onClick={() => handleEdit(item)}>Edit</Button>
                  <Button 
                    onClick={() => {
                      console.log('Delete clicked for item:', item);
                      if (item.id) {
                        handleDelete(item.id);
                      } else {
                        console.error('Cannot delete item without id:', item);
                        setSnackbar({
                          open: true,
                          message: 'Cannot delete item: missing ID',
                          severity: 'error'
                        });
                      }
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

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogTitle>
          {editItem?.id ? 'Edit' : 'Add'} {REFERENCE_DATA_TYPES[selectedType]}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleFormSubmit} sx={{ mt: 2 }}>
            {getFormFields(selectedType).map((field, index) => (
              renderField(field)
            ))}
            
            <FormControlLabel
              control={
                <Switch
                  checked={editItem?.active || false}
                  onChange={(e) => setEditItem({ ...editItem, active: e.target.checked } as ReferenceDataItem)}
                />
              }
              label="Active"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" onClick={handleSave}>Save</Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

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
