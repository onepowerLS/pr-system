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
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility, VisibilityOff, Key as KeyIcon } from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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

const permissionLevels = [
  { value: 1, label: 'Full Admin' },
  { value: 2, label: 'Department Head' },
  { value: 3, label: 'Procurement' },
  { value: 4, label: 'Standard User' }
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
    permissionLevel: 4
  });

  useEffect(() => {
    loadUsers();
  }, []);

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
          organization: data.organization || '',
          additionalOrganizations: Array.isArray(data.additionalOrganizations) ? data.additionalOrganizations : [],
          permissionLevel: data.permissionLevel || 4
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
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      organization: '',
      additionalOrganizations: [],
      permissionLevel: 4
    });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData(user);
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
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), formData);
      } else {
        await addDoc(collection(db, 'users'), formData);
      }
      handleClose();
      await loadUsers();
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">User Management</Typography>
        <Button variant="contained" onClick={handleOpen}>
          Add New User
        </Button>
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
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.department}</TableCell>
                <TableCell>{typeof user.organization === 'string' ? user.organization : user.organization?.name || ''}</TableCell>
                <TableCell>
                  {user.additionalOrganizations.map((org) => (
                    <Chip key={org} label={typeof org === 'string' ? org : org?.name || ''} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>
                  {permissionLevels.find(level => level.value === user.permissionLevel)?.label || `Level ${user.permissionLevel}`}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(user)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(user.id)} size="small">
                    <DeleteIcon />
                  </IconButton>
                  <IconButton onClick={() => openPasswordDialog(user.id)} size="small">
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
            margin="dense"
            label="First Name"
            fullWidth
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
          />
          <TextField
            margin="dense"
            label="Last Name"
            fullWidth
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
          />
          <TextField
            margin="dense"
            label="Email"
            fullWidth
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Department</InputLabel>
            <Select
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              label="Department"
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
              onChange={(e) => handleChange('organization', e.target.value)}
              label="Organization"
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
              onChange={(e) => handleChange('additionalOrganizations', e.target.value)}
              label="Additional Organizations"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
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
              value={formData.permissionLevel}
              onChange={(e) => handleChange('permissionLevel', e.target.value)}
              label="Permission Level"
            >
              {permissionLevels.map((level) => (
                <MenuItem key={level.value} value={level.value}>{level.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Save Changes' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>

      <PasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        onSubmit={handlePasswordUpdate}
        userId={selectedUserId}
      />
    </Box>
  );
}
