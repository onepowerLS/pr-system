import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { LoginPage } from './components/auth/LoginPage';
import { Layout } from './components/common/Layout';
import { PrivateRoute } from './components/common/PrivateRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Dashboard } from './components/dashboard/Dashboard';
import { NewPRForm } from './components/pr/NewPRForm';
import { PRList } from './components/pr/PRList';
import { PRDetails } from './components/pr/PRDetails';
import { Snackbar } from './components/common/Snackbar';
import { initializeAuthListener, getCurrentUser } from './services/auth';
import { setUser, setLoading, setError, clearAuth } from './store/slices/authSlice';
import { RootState } from './store';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      console.log('App: Starting initialization');
      try {
        // Check if environment variables are loaded
        const requiredEnvVars = [
          'VITE_FIREBASE_API_KEY',
          'VITE_FIREBASE_AUTH_DOMAIN',
          'VITE_FIREBASE_PROJECT_ID',
          'VITE_FIREBASE_STORAGE_BUCKET',
          'VITE_FIREBASE_MESSAGING_SENDER_ID',
          'VITE_FIREBASE_APP_ID'
        ];

        const missingEnvVars = requiredEnvVars.filter(
          varName => !import.meta.env[varName]
        );

        if (missingEnvVars.length > 0) {
          throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
        }

        console.log('App: Environment variables verified');
        dispatch(setLoading(true));
        dispatch(setError(null));
        
        // Initialize auth listener
        console.log('App: Initializing auth listener');
        initializeAuthListener();
        
        // Get initial user state
        console.log('App: Getting current user');
        const user = await getCurrentUser();
        
        if (user) {
          console.log('App: User found, setting user state');
          dispatch(setUser(user));
        } else {
          console.log('App: No user found, clearing auth state');
          dispatch(clearAuth());
        }
      } catch (error) {
        console.error('App: Initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize application';
        dispatch(setError(errorMessage));
        setInitError(errorMessage);
      } finally {
        dispatch(setLoading(false));
      }
    };

    initializeApp();
  }, [dispatch]);

  // Show initialization error if any
  if (initError) {
    return (
      <div style={{ 
        padding: '20px', 
        color: 'red', 
        textAlign: 'center',
        fontFamily: 'sans-serif'
      }}>
        <h1>Application Error</h1>
        <p>{initError}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            marginTop: '20px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Snackbar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="pr/new"
              element={
                <PrivateRoute>
                  <NewPRForm />
                </PrivateRoute>
              }
            />
            <Route
              path="pr/list"
              element={
                <PrivateRoute>
                  <PRList />
                </PrivateRoute>
              }
            />
            <Route
              path="pr/:id"
              element={
                <PrivateRoute>
                  <PRDetails />
                </PrivateRoute>
              }
            />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
