import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { LoginPage } from './components/auth/LoginPage';
import { Layout } from './components/common/Layout';
import { PrivateRoute } from './components/common/PrivateRoute';
import { Dashboard } from './components/dashboard/Dashboard';
import { NewPRForm } from './components/pr/NewPRForm';
import { authService } from './services/auth';
import { setUser, setLoading } from './store/slices/authSlice';
import { UserRole } from './types/pr';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const initAuth = async () => {
      dispatch(setLoading(true));
      try {
        const firebaseUser = await authService.getCurrentUser();
        if (firebaseUser) {
          const userDetails = await authService.getUserDetails(firebaseUser.uid);
          dispatch(setUser(userDetails));
        }
      } catch (error) {
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
                {/* PR List component will be added later */}
                <div>PR List Coming Soon</div>
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/pr/:id"
          element={
            <PrivateRoute>
              <Layout>
                {/* PR Details component will be added later */}
                <div>PR Details Coming Soon</div>
              </Layout>
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App
