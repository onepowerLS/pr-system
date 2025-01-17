import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { doc, updateDoc } from 'firebase/firestore';
import { updateEmail, updatePassword } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import { RootState } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import {
  Button,
  TextField,
  Typography,
  Box,
  Snackbar,
  Alert,
} from '@mui/material';

export function UserProfile() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!user?.id || !auth.currentUser) return;

      const userRef = doc(db, 'users', user.id);
      const updates: Record<string, any> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
      };

      // Update email if changed
      if (formData.email !== user.email) {
        await updateEmail(auth.currentUser, formData.email);
        updates.email = formData.email;
      }

      // Update password if provided
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          setSnackbar({
            open: true,
            message: 'Passwords do not match',
            severity: 'error',
          });
          return;
        }
        await updatePassword(auth.currentUser, formData.newPassword);
      }

      // Update Firestore document
      await updateDoc(userRef, updates);

      // Update Redux state
      dispatch(setUser({
        ...user,
        ...updates,
      }));

      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success',
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update profile',
        severity: 'error',
      });
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Profile Management
      </Typography>
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            disabled={!isEditing}
            fullWidth
          />
          
          <TextField
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            disabled={!isEditing}
            fullWidth
          />

          <TextField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled={!isEditing}
            fullWidth
          />

          {isEditing && (
            <>
              <TextField
                label="New Password (optional)"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleInputChange}
                fullWidth
              />

              <TextField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                fullWidth
              />
            </>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            {isEditing ? (
              <>
                <Button
                  variant="outlined"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </Box>
        </Box>
      </form>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
