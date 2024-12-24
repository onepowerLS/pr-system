import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, TextField, Typography, CircularProgress } from '@mui/material';
import { signIn } from '../../services/auth';
import { setError } from '../../store/slices/authSlice';
import { RootState } from '../../store';

export const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const globalError = useSelector((state: RootState) => state.auth.error);
  const isAuthenticated = useSelector((state: RootState) => !!state.auth.user);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      console.log('LoginPage: User is authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('LoginPage: Starting login attempt');
    setLoading(true);
    setLocalError(null);
    dispatch(setError(null));

    try {
      console.log('LoginPage: Attempting login with email:', email);
      await signIn(email, password);
      console.log('LoginPage: Login successful');
    } catch (error) {
      console.error('LoginPage: Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setLocalError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 3,
        backgroundColor: '#f5f5f5',
      }}
    >
      <Box
        component="form"
        onSubmit={handleLogin}
        sx={{
          width: '100%',
          maxWidth: 400,
          p: 4,
          backgroundColor: 'white',
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom textAlign="center">
          PR System Login
        </Typography>

        {(localError || globalError) && (
          <Typography color="error" sx={{ mb: 2 }} textAlign="center">
            {localError || globalError}
          </Typography>
        )}

        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Sign In'
          )}
        </Button>
      </Box>
    </Box>
  );
};
