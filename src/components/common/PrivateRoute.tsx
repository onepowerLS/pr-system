import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { RootState } from '../../store';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const PrivateRoute = ({ children, requiredRoles }: PrivateRouteProps) => {
  const location = useLocation();
  const { user, loading, error } = useSelector((state: RootState) => {
    console.log('PrivateRoute: Checking auth state:', state.auth);
    return state.auth;
  });

  console.log('PrivateRoute: Current state:', { user, loading, error, path: location.pathname });

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading...
        </Typography>
        <Typography color="textSecondary" sx={{ mt: 1 }}>
          Please wait while we verify your credentials
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          bgcolor: 'background.default',
          p: 3
        }}
      >
        <Typography variant="h5" color="error" gutterBottom>
          Authentication Error
        </Typography>
        <Typography color="textSecondary" align="center" sx={{ mb: 3 }}>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  if (!user) {
    console.log('PrivateRoute: No user found, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    console.log('PrivateRoute: User lacks required role:', { userRole: user.role, requiredRoles });
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('PrivateRoute: Access granted');
  return <>{children}</>;
};
