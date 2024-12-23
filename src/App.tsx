import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { LoginPage } from './components/auth/LoginPage';
import { Layout } from './components/common/Layout';
import { PrivateRoute } from './components/common/PrivateRoute';
import { Dashboard } from './components/dashboard/Dashboard';
import { NewPRForm } from './components/pr/NewPRForm';
import { PRList } from './components/pr/PRList';
import { PRDetails } from './components/pr/PRDetails';
import { Snackbar } from './components/common/Snackbar';
import { authService } from './services/auth';
import { setUser, setLoading, setError, clearAuth } from './store/slices/authSlice';
import { UserRole } from './types/pr';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const initAuth = async () => {
      dispatch(setLoading(true));
      dispatch(setError(null));
      try {
        const firebaseUser = await authService.getCurrentUser();
        if (firebaseUser) {
          try {
            const userDetails = await authService.getUserDetails(firebaseUser.uid);
            if (userDetails) {
              dispatch(setUser(userDetails));
            } else {
              dispatch(clearAuth());
              console.error('No user details found');
            }
          } catch (error) {
            dispatch(clearAuth());
            if (error instanceof Error) {
              dispatch(setError(error.message));
            } else {
              dispatch(setError('Failed to load user details'));
            }
            console.error('Error fetching user details:', error);
          }
        } else {
          dispatch(clearAuth());
        }
      } catch (error) {
        dispatch(clearAuth());
        if (error instanceof Error) {
          dispatch(setError(error.message));
        } else {
          dispatch(setError('Authentication failed'));
        }
        console.error('Auth initialization error:', error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    initAuth();
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/pr/new"
          element={
            <PrivateRoute>
              <Layout>
                <NewPRForm />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/pr/list"
          element={
            <PrivateRoute>
              <Layout>
                <PRList />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/pr/:id"
          element={
            <PrivateRoute>
              <Layout>
                <PRDetails />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Snackbar />
    </Router>
  );
}

export default App
