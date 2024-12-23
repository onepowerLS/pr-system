import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Box, Button, TextField, Typography, CircularProgress } from '@mui/material';
import { authService } from '../../services/auth';
import { setUser, setError } from '../../store/slices/authSlice';

export const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('LoginPage: Starting login attempt');
    setLoading(true);
    setLocalError(null);

    try {
      console.log('LoginPage: Attempting login with email:', email);
      const firebaseUser = await authService.login(email, password);
      console.log('LoginPage: Login successful, getting user details');
      
      const userDetails = await authService.getUserDetails(firebaseUser.uid);
      if (userDetails) {
        console.log('LoginPage: User details loaded, setting user');
        dispatch(setUser(userDetails));
        navigate('/dashboard');
      } else {
        console.error('LoginPage: No user details found after login');
        setLocalError('User account not found. Please contact support.');
      }
    } catch (error) {
      console.error('LoginPage: Login error:', error);
      setLocalError(error instanceof Error ? error.message : 'Login failed');
      dispatch(setError(error instanceof Error ? error.message : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Box
        component="form"
        onSubmit={handleLogin}
        sx={{
          backgroundColor: 'white',
          padding: 3,
          borderRadius: 2,
          boxShadow: 3,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Login
        </Typography>

        {error && (
          <Typography color="error" align="center" gutterBottom>
            {error}
          </Typography>
        )}

        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          disabled={loading}
          sx={{ mt: 3 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Login'}
        </Button>
      </Box>
    </Box>
  );
};
