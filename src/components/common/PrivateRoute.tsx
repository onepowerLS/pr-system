import { Navigate, useLocation, useNavigate, useEffect } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CircularProgress, Box, Typography } from '@mui/material';
import { RootState } from '../../store';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const PrivateRoute = ({ children, requiredRoles }: PrivateRouteProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state: RootState) => {
    console.log('PrivateRoute: Checking auth state:', state.auth);
    return state.auth;
  });

  useEffect(() => {
    console.log('PrivateRoute: Auth state changed:', { user, loading, error });
    if (!loading && !user) {
      console.log('PrivateRoute: No user found, redirecting to login');
      navigate('/login');
    }
  }, [user, loading, error, navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Typography>Please try refreshing the page.</Typography>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
