import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CircularProgress, Box, Typography } from '@mui/material';
import { RootState } from '../../store';

interface PrivateRouteProps {
  requiredRoles?: string[];
}

export const PrivateRoute = ({ requiredRoles }: PrivateRouteProps) => {
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
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!user) {
    console.log('PrivateRoute: No user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
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
          bgcolor: 'background.default'
        }}
      >
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Typography color="textSecondary" sx={{ mb: 2 }}>
          Please try logging in again
        </Typography>
        <Navigate to="/login" state={{ from: location }} replace />
      </Box>
    );
  }

  if (requiredRoles && !requiredRoles.some(role => user.roles?.includes(role))) {
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
        <Typography variant="h6" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography color="textSecondary">
          You don't have the required permissions to access this page
        </Typography>
      </Box>
    );
  }

  return <Outlet />;
};
