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
import { PRView } from './components/pr/PRView';
import { PrivateRoute } from './components/common/PrivateRoute';
import { Layout } from './components/common/Layout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { getUserDetails } from './services/auth';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    console.log('App: Setting up auth state listener');
    
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
      } finally {
        dispatch(setLoading(false));
      }
    });

    return () => {
      console.log('App: Cleaning up auth state listener');
      unsubscribe();
    };
  }, [dispatch]);

  console.log('App: Current state:', { user, loading });

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={
            loading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh' 
              }}>
                Loading...
              </div>
            ) : (
              user ? <Navigate to="/dashboard" replace /> : <LoginPage />
            )
          } />
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pr/new" element={<NewPRForm />} />
              <Route path="/pr/:id" element={<PRView />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
