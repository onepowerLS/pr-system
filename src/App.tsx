import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import { setUser, setLoading, setError } from './store/slices/authSlice';
import { RootState } from './store';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { NewPRForm } from './components/pr/NewPRForm';
import { PRList } from './components/pr/PRList';
import { PRDetails } from './components/pr/PRDetails';
import { PrivateRoute } from './components/common/PrivateRoute';
import { Layout } from './components/common/Layout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { getUserDetails } from './services/auth';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    console.log('App: Setting up auth state listener');
    dispatch(setLoading(true));

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        console.log('App: Auth state changed:', firebaseUser?.email);
        
        if (firebaseUser) {
          const userDetails = await getUserDetails(firebaseUser.uid);
          if (userDetails) {
            console.log('App: User details loaded');
            dispatch(setUser(userDetails));
          } else {
            console.error('App: No user details found');
            dispatch(setError('User account not found'));
          }
        } else {
          console.log('App: No user signed in');
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error('App: Error handling auth state change:', error);
        dispatch(setError(error instanceof Error ? error.message : 'Authentication error'));
      }
    });

    return () => {
      console.log('App: Cleaning up auth state listener');
      unsubscribe();
    };
  }, [dispatch]);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout>
                  <Navigate to="/dashboard" replace />
                </Layout>
              </PrivateRoute>
            }
          />

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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
