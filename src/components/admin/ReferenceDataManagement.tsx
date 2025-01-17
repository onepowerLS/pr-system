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
  uom: "Units of Measure"
} as const

type ReferenceDataType = keyof typeof REFERENCE_DATA_TYPES

const SEED_DATA = {
  departments: [
    { id: 'c_level', name: 'C Level', active: true },
    { id: 'dpo', name: 'DPO', active: true },
    { id: 'project_management', name: 'Project Management', active: true },
    { id: 'engineering', name: 'Engineering', active: true },
    { id: 'procurement', name: 'Procurement', active: true },
    { id: 'finance', name: 'Finance', active: true },
    { id: 'hr', name: 'Human Resources', active: true },
    { id: 'legal', name: 'Legal', active: true },
    { id: 'it', name: 'Information Technology', active: true },
    { id: 'operations', name: 'Operations', active: true },
    { id: 'ehs', name: 'EHS', active: true },
    { id: 'communications', name: 'Communications', active: true }
  ],
  projectCategories: [
    { id: '1:20mw', name: '1:20MW', active: true },
    { id: '2:engineering_randd', name: '2:Engineering R&D', active: true },
    { id: '4:minigrids', name: '4:Minigrids', active: true },
    { id: '5:general', name: '5:General', active: true },
    { id: 'maintenance', name: 'Maintenance', active: true },
    { id: 'expansion', name: 'Expansion', active: true },
    { id: 'operations', name: 'Operations', active: true }
  ],
  sites: [
    { id: 'ha_makebe', name: 'Ha Makebe', code: 'MAK', active: true },
    { id: 'ha_raliemere', name: 'Ha Raliemere', code: 'RAL', active: true },
    { id: 'tosing', name: 'Tosing', code: 'TOS', active: true },
    { id: 'sebapala', name: 'Sebapala', code: 'SEB', active: true },
    { id: 'sehlabathebe', name: 'Sehlabathebe', code: 'SEH', active: true },
    { id: 'sehonghong', name: 'Sehonghong', code: 'SHG', active: true },
    { id: 'mashai', name: 'Mashai', code: 'MAS', active: true },
    { id: 'matsoaing', name: 'Matsoaing', code: 'MAT', active: true },
    { id: 'lebakeng', name: 'Lebakeng', code: 'LEB', active: true },
    { id: 'tlhanyaku', name: 'Tlhanyaku', code: 'TLH', active: true },
    { id: 'ribaneng', name: 'Ribaneng', code: 'RIB', active: true }
  ],
  expenseTypes: [
    { id: 'audit_+_accounting_fees', name: '1 - Audit + Accounting Fees', code: '1', active: true },
    { id: 'bank_fees', name: '2 - Bank Fees', code: '2', active: true },
    { id: 'materials_and_supplies', name: '3A - Materials and supplies (including fees to clearing agents)', code: '3A', active: true },
    { id: 'materials_and_supplies_ehs', name: '3B - Materials and supplies - EHS items (other than PPE)', code: '3B', active: true },
    { id: 'vehicle', name: '4 - Vehicle', code: '4', active: true }
  ],
  vehicles: [
    { id: 'v001', name: 'Toyota Hilux (ABC123)', active: true, organization: '1PWR LESOTHO' },
    { id: 'v002', name: 'Ford Ranger (XYZ789)', active: true, organization: '1PWR LESOTHO' },
    { id: 'v003', name: 'Isuzu D-Max (DEF456)', active: true, organization: '1PWR LESOTHO' }
  ],
  vendors: [
    { id: 'other', name: 'Other', active: true },
    { id: 'herholdts', name: 'Herholdts', active: true },
    { id: 'revenue_services_lesotho', name: 'Revenue Services Lesotho', active: true },
    { id: 'lesotho_electricity_company', name: 'Lesotho Electricity Company', active: true }
  ],
  currencies: [
    { id: 'lsl', name: 'Lesotho Loti', code: 'LSL', active: true },
    { id: 'zar', name: 'South African Rand', code: 'ZAR', active: true },
    { id: 'usd', name: 'US Dollar', code: 'USD', active: true },
    { id: 'eur', name: 'Euro', code: 'EUR', active: true },
    { id: 'gbp', name: 'British Pound', code: 'GBP', active: true }
  ]
}

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
    return ['vendors', 'currencies', 'uom'].includes(type);
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
          items = items.filter(item => item.organization === selectedOrganization);
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

  const validateForm = (item: Partial<ReferenceDataItem> | null): boolean => {
    if (!item) {
      setFormErrors({ name: 'Item is required', code: 'Item is required' });
      return false;
    }

    const errors: Record<string, string> = {};

    if (!item.name?.trim()) {
      errors.name = 'Name is required';
    }

    if (!item.code?.trim()) {
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
    setEditItem(item)
    setIsDialogOpen(true)
    setFormErrors({})
  }

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission
    
    try {
      if (!editItem || !validateForm(editItem)) {
        console.log('Form validation failed:', formErrors);
        return;
      }

      // Ensure we have required fields
      if (!editItem.code?.trim() || !editItem.name?.trim()) {
        console.log('Required fields missing');
        return;
      }

      const itemToSave = { 
        code: editItem.code.trim(),
        name: editItem.name.trim(),
        active: true
      };
      
      console.log('Saving item:', itemToSave);
      await referenceDataAdminService.addItem(selectedType, itemToSave);

      // Refresh items list
      const updatedItems = await referenceDataAdminService.getItems(selectedType);
      setItems(updatedItems);

      setIsDialogOpen(false);
      setEditItem(null);
      setFormErrors({});
      
      // Show success message using global snackbar
      setSnackbar({
        open: true,
        message: `${selectedType === 'currencies' ? 'Currency' : 'Unit of Measure'} ${itemToSave.code} added successfully`,
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
              {selectedType !== 'vendors' && <TableCell>Code</TableCell>}
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
              ) : !isOrgIndependentType(selectedType) ? (
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
                {selectedType !== 'vendors' && <TableCell>{item.code}</TableCell>}
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
                ) : !isOrgIndependentType(selectedType) ? (
                  <TableCell>
                    {organizations.find(org => org.id === item.organization)?.name}
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
            <TextField
              fullWidth
              label="Name"
              value={editItem?.name || ''}
              onChange={(e) => setEditItem({ ...editItem, name: e.target.value } as ReferenceDataItem)}
              error={!!formErrors.name}
              helperText={formErrors.name}
              sx={{ mb: 2 }}
            />
            
            {/* Only show code field for non-vendor types */}
            {selectedType !== 'vendors' && (
              <TextField
                fullWidth
                label="Code"
                value={editItem?.code || ''}
                onChange={(e) => setEditItem({ ...editItem, code: e.target.value } as ReferenceDataItem)}
                sx={{ mb: 2 }}
              />
            )}
            
            {/* Only show organization field for organization-dependent types */}
            {!isOrgIndependentType(selectedType) && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Organization</InputLabel>
                <Select
                  value={editItem?.organization || ''}
                  label="Organization"
                  onChange={(e) => setEditItem({ ...editItem, organization: e.target.value } as ReferenceDataItem)}
                  error={!!formErrors.organization}
                >
                  {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Vendor-specific fields */}
            {selectedType === 'vendors' && (
              <>
                <TextField
                  fullWidth
                  label="Approval Date"
                  type="date"
                  value={formatDateForInput(editItem?.approvalDate || '')}
                  onChange={(e) => setEditItem({ ...editItem, approvalDate: e.target.value } as ReferenceDataItem)}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Contact Name"
                  value={editItem?.contactName || ''}
                  onChange={(e) => setEditItem({ ...editItem, contactName: e.target.value } as ReferenceDataItem)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Contact Email"
                  type="email"
                  value={editItem?.contactEmail || ''}
                  onChange={(e) => setEditItem({ ...editItem, contactEmail: e.target.value } as ReferenceDataItem)}
                  sx={{ mb: 2 }}
                  error={!!formErrors.contactEmail}
                  helperText={formErrors.contactEmail}
                  required
                />
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={editItem?.contactPhone || ''}
                  onChange={(e) => setEditItem({ ...editItem, contactPhone: e.target.value } as ReferenceDataItem)}
                  sx={{ mb: 2 }}
                  error={!!formErrors.contactPhone}
                  helperText={formErrors.contactPhone}
                  required
                />
                <TextField
                  fullWidth
                  label="Address"
                  multiline
                  rows={2}
                  value={editItem?.address || ''}
                  onChange={(e) => setEditItem({ ...editItem, address: e.target.value } as ReferenceDataItem)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="URL"
                  value={editItem?.url || ''}
                  onChange={(e) => setEditItem({ ...editItem, url: e.target.value } as ReferenceDataItem)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={editItem?.notes || ''}
                  onChange={(e) => setEditItem({ ...editItem, notes: e.target.value } as ReferenceDataItem)}
                  sx={{ mb: 2 }}
                />
              </>
            )}

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
