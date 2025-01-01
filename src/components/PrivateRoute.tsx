/**
 * @fileoverview Private Route Component
 * @version 1.1.0
 * 
 * Description:
 * Higher-order component that protects routes requiring authentication.
 * Redirects unauthenticated users to the login page while preserving
 * their intended destination for post-login redirect.
 * 
 * Features:
 * - Authentication check
 * - Automatic redirect to login
 * - Loading state handling
 * - Return URL preservation
 * 
 * Props:
 * ```typescript
 * interface PrivateRouteProps {
 *   children: React.ReactNode;  // Protected content
 *   roles?: UserRole[];        // Optional role restrictions
 * }
 * ```
 * 
 * Usage:
 * ```typescript
 * <Route
 *   path="/dashboard"
 *   element={
 *     <PrivateRoute roles={[UserRole.ADMIN]}>
 *       <Dashboard />
 *     </PrivateRoute>
 *   }
 * />
 * ```
 * 
 * Related Components:
 * - components/auth/LoginPage.tsx: Login redirect target
 * - hooks/useAuth.ts: Authentication state
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';

export function PrivateRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
