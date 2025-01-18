import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  InputAdornment,
  IconButton as MuiIconButton,
  CircularProgress
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility, VisibilityOff, Key as KeyIcon } from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getAuth } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  organization: string;
  additionalOrganizations: string[];
  permissionLevel: number;
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

const departments = [
  'CEO',
  'CFO',
  'Asset Management',
  'DPO',
  'EHS',
  'Engineering',
  'Facilities',
  'Finance',
  'Fleet',
  'IT',
  'O&M',
  'Procurement',
  'Production',
  'PUECO',
  'Reticulation'
];

const organizations = [
  '1PWR LESOTHO',
  'SMP',
  'PUECO',
  '1PWR BENIN'
];

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
                <MuiIconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </MuiIconButton>
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
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    organization: '',
    additionalOrganizations: [],
    permissionLevel: undefined
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadUsers(), loadPermissions()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      console.log('Loading permissions...');
      const permissionsRef = collection(db, 'referenceData_permissions');
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
          permissionLevel: typeof data.permissionLevel === 'number' ? data.permissionLevel : 5 // Default to requester (level 5)
        });
      });
      setUsers(loadedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
    // Reset form data
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      organization: '',
      additionalOrganizations: [],
      permissionLevel: undefined
    });
  };

  const handleEdit = (user: User) => {
    console.log('Editing user:', user);
    console.log('Current permissions:', permissions);
    setEditingUser(user);
    // Set form data directly without resetting
    setFormData({
      ...user,
      permissionLevel: typeof user.permissionLevel === 'number' ? user.permissionLevel : 5
    });
    setOpen(true);
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

  const handleSubmit = async () => {
    try {
      const userData = {
        ...formData,
        permissionLevel: Number(formData.permissionLevel),
        organization: formData.organization || '',
        additionalOrganizations: formData.additionalOrganizations || []
      };

      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), userData);
      } else {
        await addDoc(collection(db, 'users'), userData);
      }

      await loadUsers();
      handleClose();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleChange = (field: keyof User, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordUpdate = async (newPassword: string) => {
    try {
      const user = users.find(u => u.id === selectedUserId);
      if (!user) return;

      // Call the updatePassword cloud function
      const updatePasswordFunction = httpsCallable(functions, 'updateUserPassword');
      await updatePasswordFunction({ 
        email: user.email, 
        newPassword 
      });

      // Show success message
      alert('Password updated successfully');
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Failed to update password. Please try again.');
    }
  };

  const openPasswordDialog = (userId: string) => {
    setSelectedUserId(userId);
    setPasswordDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            User Management
          </Typography>
          <Button variant="contained" onClick={handleOpen} sx={{ mb: 2 }}>
            Add New User
          </Button>
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
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>{user.organization}</TableCell>
                    <TableCell>
                      {user.additionalOrganizations?.map((org) => (
                        <Chip key={org} label={org} sx={{ m: 0.5 }} />
                      ))}
                    </TableCell>
                    <TableCell>
                      {permissions.find(p => Number(p.level) === user.permissionLevel)?.name || `Level ${user.permissionLevel}`}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEdit(user)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(user.id)}>
                        <DeleteIcon />
                      </IconButton>
                      <IconButton onClick={() => openPasswordDialog(user.id)}>
                        <KeyIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog open={open} onClose={handleClose}>
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
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>Organization</InputLabel>
                <Select
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                >
                  {organizations.map((org) => (
                    <MenuItem key={org} value={org}>{org}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>Additional Organizations</InputLabel>
                <Select
                  multiple
                  value={formData.additionalOrganizations}
                  onChange={(e) => {
                    const value = e.target.value as string[];
                    setFormData({ ...formData, additionalOrganizations: value });
                  }}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </Box>
                  )}
                >
                  {organizations.map((org) => (
                    <MenuItem key={org} value={org}>{org}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>Permission Level</InputLabel>
                <Select
                  value={formData.permissionLevel?.toString() || '5'}
                  onChange={(e) => {
                    const newLevel = Number(e.target.value);
                    if (!isNaN(newLevel)) {
                      setFormData(prev => ({ ...prev, permissionLevel: newLevel }));
                    }
                  }}
                >
                  {permissions.map((permission) => (
                    <MenuItem key={permission.id} value={permission.level.toString()}>
                      {permission.name} - {permission.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSubmit} variant="contained">
                {editingUser ? 'Update' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>

          <PasswordDialog
            open={passwordDialogOpen}
            onClose={() => setPasswordDialogOpen(false)}
            onSubmit={handlePasswordUpdate}
            userId={selectedUserId}
          />
        </>
      )}
    </Box>
  );
}
