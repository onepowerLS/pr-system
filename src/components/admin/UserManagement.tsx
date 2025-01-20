import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  InputAdornment,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility, VisibilityOff, Key as KeyIcon } from '@mui/icons-material';
import { doc, collection, query, where, getDocs, updateDoc, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { User } from '../../types/user';
import { updateUserEmail, createUser, updateUserPassword } from '../../services/auth';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { referenceDataService } from '../../services/referenceData';
import { ReferenceData } from '../../types/referenceData';

// Helper function to generate random password
function generateRandomPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  level: string | number;
  actions: string[];
  scope: string[];
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (newPassword: string) => void;
  userId: string;
}

function PasswordDialog({ open, onClose, onSubmit, userId }: PasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    onSubmit(newPassword);
    setNewPassword('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Change Password</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!newPassword}>
          Update Password
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [departments, setDepartments] = useState<ReferenceData[]>([]);
  const [organizations, setOrganizations] = useState<ReferenceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [passwordMode, setPasswordMode] = useState<'random' | 'custom'>('custom');
  const [customPassword, setCustomPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    organization: '',
    additionalOrganizations: [],
    permissionLevel: undefined,
    isActive: true
  });
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadUsers(), 
        loadPermissions(),
        loadOrganizations()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      console.log('Loading permissions...');
      const permissionsRef = collection(db, 'rd_permissions');
      const permissionsQuery = query(permissionsRef);
      const querySnapshot = await getDocs(permissionsQuery);
      const loadedPermissions: Permission[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Permission data:', { id: doc.id, ...data });
        loadedPermissions.push({
          ...data,
          id: doc.id,
          level: Number(data.level) // Always convert to number when loading
        });
      });
      
      // Sort permissions by level
      loadedPermissions.sort((a, b) => Number(a.level) - Number(b.level));
      console.log('Loaded permissions:', loadedPermissions);
      setPermissions(loadedPermissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const loadedUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedUsers.push({
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          department: data.department || '',
          organization: typeof data.organization === 'string' ? data.organization : '',
          additionalOrganizations: Array.isArray(data.additionalOrganizations) 
            ? data.additionalOrganizations.map(org => typeof org === 'string' ? org : org?.name || '')
            : [],
          permissionLevel: typeof data.permissionLevel === 'number' ? data.permissionLevel : 5, // Default to requester (level 5)
          isActive: data.isActive !== false
        });
      });
      setUsers(loadedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Helper function to normalize organization ID
  const normalizeOrgId = (orgId: string): string => {
    return orgId.toLowerCase().replace(/\s+/g, '_');
  };

  // Helper function to find department by name (case insensitive)
  const findDepartmentByName = (deptName: string): ReferenceData | undefined => {
    return departments.find(d => 
      d.name.toLowerCase() === deptName.toLowerCase()
    );
  };

  // Helper function to find department by ID
  const findDepartmentById = (deptId: string): ReferenceData | undefined => {
    return departments.find(d => d.id === deptId);
  };

  // Load departments for a specific organization
  const loadDepartmentsForOrg = async (organization: string) => {
    console.log('Loading departments for organization:', organization);
    setIsDepartmentsLoading(true);
    
    try {
      const loadedDepartments = await referenceDataService.getDepartments(organization);
      console.log('Loaded departments:', loadedDepartments);
      console.log('Available department values:', loadedDepartments.map(dept => ({
        id: dept.id,
        name: dept.name,
        organization: dept.organization
      })));
      
      setDepartments(loadedDepartments);
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
    } finally {
      setIsDepartmentsLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      console.log('Loading organizations...');
      const loadedOrganizations = await referenceDataService.getOrganizations();
      console.log('Loaded organizations:', loadedOrganizations);
      setOrganizations(loadedOrganizations);
    } catch (error) {
      console.error('Error loading organizations:', error);
      showSnackbar('Error loading organizations', 'error');
    }
  };

  // Load departments whenever organization changes in the form
  useEffect(() => {
    if (formData.organization) {
      loadDepartmentsForOrg(formData.organization);
    } else {
      setDepartments([]);
    }
  }, [formData.organization]);

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      organization: '',
      additionalOrganizations: [],
      permissionLevel: 5,
      isActive: true
    });
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    // Reset form data
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      organization: '',
      additionalOrganizations: [],
      permissionLevel: 5,
      isActive: true
    });
  };

  const handleEdit = (user: User) => {
    console.log('Editing user:', user);
    
    const normalizedOrg = normalizeOrgId(user.organization);
    const dept = findDepartmentByName(user.department);
    
    console.log('Normalized values:', {
      originalOrg: user.organization,
      normalizedOrg,
      originalDept: user.department,
      foundDept: dept
    });
    
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: dept?.id || '',
      organization: normalizedOrg,
      additionalOrganizations: user.additionalOrganizations || [],
      permissionLevel: user.permissionLevel || 5,
      isActive: user.isActive
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        await loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleUserUpdate = async (userId: string, updatedData: Partial<User>) => {
    try {
      setIsLoading(true);
      
      // If email is being updated, use special function to sync with Firebase Auth
      if (updatedData.email) {
        await updateUserEmail(userId, updatedData.email);
      }

      // Update other user data in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updatedData,
        updatedAt: new Date().toISOString()
      });

      // Refresh user list
      await loadUsers();
      
      showSnackbar('User updated successfully', 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to update user', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewUser = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    department: string;
    organization: string;
    permissionLevel: number;
    isActive: boolean;
  }) => {
    try {
      setIsLoading(true);
      
      // Use createUser function that handles both Auth and Firestore
      await createUser(userData);

      // Refresh user list
      await loadUsers();
      
      showSnackbar('User created successfully', 'success');
    } catch (error) {
      console.error('Error creating user:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to create user', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const dept = findDepartmentById(formData.department);
      
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        department: dept?.name || '',
        organization: formData.organization,
        permissionLevel: Number(formData.permissionLevel),
        additionalOrganizations: formData.additionalOrganizations || [],
        isActive: formData.isActive
      };

      if (editingUser) {
        await handleUserUpdate(editingUser.id, userData);
      } else {
        await handleNewUser({
          email: userData.email,
          password: generateRandomPassword(),
          firstName: userData.firstName,
          lastName: userData.lastName,
          department: userData.department,
          organization: userData.organization,
          permissionLevel: userData.permissionLevel,
          isActive: userData.isActive
        });
      }

      setIsDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      // Handle error appropriately
    }
  };

  const handleChange = (field: keyof User, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordUpdate = async (userId: string, email: string, newPassword: string) => {
    try {
      setIsLoading(true);
      
      // Trim and validate email
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        throw new Error('Email is required');
      }

      const result = await updateUserPassword(userId, trimmedEmail, newPassword);
      
      if (result.data?.success) {
        showSnackbar('Password updated successfully', 'success');
        setPasswordDialogOpen(false);
        // Reset states
        setCustomPassword('');
        setGeneratedPassword('');
        setPasswordMode('custom');
        setShowPassword(false);
      } else {
        throw new Error(result.data?.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to update password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordDialogOpen = (user: User) => {
    if (!user.email) {
      showSnackbar('User has no email address', 'error');
      return;
    }
    setSelectedUserId(user.id);
    setPasswordDialogOpen(true);
    // Generate a random password by default
    setGeneratedPassword(generateRandomPassword());
  };

  // Helper functions to get names from IDs
  const getOrganizationName = (id: string): string => {
    const org = organizations.find(o => o.id === id);
    return org?.name || id;
  };

  const getDepartmentName = (id: string): string => {
    const dept = departments.find(d => d.id === id);
    return dept?.name || id;
  };

  return (
    <Box sx={{ p: 3 }}>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" gutterBottom>
              User Management
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => handleSyncEmails()}
                disabled={isLoading}
              >
                Sync User Emails
              </Button>
              <Button
                variant="contained"
                onClick={handleAdd}
                disabled={isLoading}
              >
                Add New User
              </Button>
            </Box>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Organization</TableCell>
                  <TableCell>Additional Organizations</TableCell>
                  <TableCell>Permission Level</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>{getOrganizationName(user.organization || '')}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {user.additionalOrganizations?.map((orgId) => (
                          <Chip 
                            key={orgId} 
                            label={getOrganizationName(orgId)}
                            size="small"
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {permissions.find(p => Number(p.level) === user.permissionLevel)?.name || `Level ${user.permissionLevel}`}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isActive !== false}
                        onChange={async () => {
                          try {
                            await handleUserUpdate(user.id, { isActive: !user.isActive });
                            showSnackbar('User status updated successfully', 'success');
                          } catch (error) {
                            console.error('Error updating user status:', error);
                            showSnackbar('Failed to update user status', 'error');
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEdit(user)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(user.id)}>
                        <DeleteIcon />
                      </IconButton>
                      <IconButton onClick={() => handlePasswordDialogOpen(user)}>
                        <KeyIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog open={isDialogOpen} onClose={handleClose}>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="First Name"
                fullWidth
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Last Name"
                fullWidth
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>Organization</InputLabel>
                <Select
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value, department: '' })}
                  label="Organization"
                >
                  {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  label="Department"
                  disabled={!formData.organization || isDepartmentsLoading}
                >
                  {isDepartmentsLoading ? (
                    <MenuItem disabled>Loading departments...</MenuItem>
                  ) : departments.length === 0 ? (
                    <MenuItem disabled>No departments available</MenuItem>
                  ) : (
                    departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>Additional Organizations</InputLabel>
                <Select
                  multiple
                  value={formData.additionalOrganizations || []}
                  onChange={(e) => {
                    const value = e.target.value as string[];
                    setFormData({
                      ...formData,
                      additionalOrganizations: value
                    });
                  }}
                  label="Additional Organizations"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => {
                        const org = organizations.find(o => o.id === value);
                        return (
                          <Chip 
                            key={value} 
                            label={org?.name || value}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>Permission Level</InputLabel>
                <Select
                  value={formData.permissionLevel}
                  onChange={(e) => setFormData({ ...formData, permissionLevel: Number(e.target.value) })}
                  label="Permission Level"
                >
                  {permissions.map((permission) => (
                    <MenuItem key={permission.level} value={permission.level}>
                      {permission.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive !== false}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSubmit} variant="contained">
                {editingUser ? 'Update' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog 
            open={isPasswordDialogOpen} 
            onClose={() => {
              setPasswordDialogOpen(false);
              setCustomPassword('');
              setGeneratedPassword('');
              setPasswordMode('custom');
              setShowPassword(false);
            }}
          >
            <DialogTitle>Update Password</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <FormControl component="fieldset">
                  <RadioGroup
                    row
                    value={passwordMode}
                    onChange={(e) => setPasswordMode(e.target.value as 'random' | 'custom')}
                  >
                    <FormControlLabel 
                      value="custom" 
                      control={<Radio />} 
                      label="Custom Password" 
                    />
                    <FormControlLabel 
                      value="random" 
                      control={<Radio />} 
                      label="Random Password" 
                    />
                  </RadioGroup>
                </FormControl>
              </Box>

              {passwordMode === 'custom' ? (
                <TextField
                  fullWidth
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
              ) : (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Generated Password"
                    type={showPassword ? 'text' : 'password'}
                    value={generatedPassword}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    size="small"
                    onClick={() => setGeneratedPassword(generateRandomPassword())}
                    sx={{ mt: 1 }}
                  >
                    Generate New Password
                  </Button>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  const user = users.find(u => u.id === selectedUserId);
                  if (user?.email) {
                    const newPassword = passwordMode === 'custom' ? customPassword : generatedPassword;
                    if (newPassword.length < 6) {
                      showSnackbar('Password must be at least 6 characters long', 'error');
                      return;
                    }
                    handlePasswordUpdate(selectedUserId, user.email, newPassword);
                  }
                }}
                color="primary"
                disabled={passwordMode === 'custom' ? !customPassword : !generatedPassword}
              >
                Update Password
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
}
