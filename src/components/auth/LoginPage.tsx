import { useState } from 'react';
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

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('LoginPage: Starting login attempt');
    setLoading(true);
    setLocalError(null);
    dispatch(setError(null));

    try {
      console.log('LoginPage: Attempting login with email:', email);
      await signIn(email, password);
      console.log('LoginPage: Login successful, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('LoginPage: Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setLocalError(errorMessage);
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
          PR System Login
        </Typography>

        {(localError || globalError) && (
          <Typography color="error" align="center" sx={{ mb: 2 }}>
            {localError || globalError}
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
          required
          autoFocus
          autoComplete="email"
        />

        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          autoComplete="current-password"
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
          sx={{ mt: 3, mb: 2 }}
        >
          {loading ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </Box>
    </Box>
  );
};
