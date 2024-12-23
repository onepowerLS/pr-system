import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { store } from './store';
import './index.css';
import App from './App';

console.log('main.tsx: Starting application initialization');

try {
  console.log('main.tsx: Creating theme');
  const theme = createTheme({
    palette: {
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: '#f5f5f5',
      },
    },
  });
  console.log('main.tsx: Theme created');

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Failed to find the root element');
  }
  console.log('main.tsx: Root element found');

  console.log('main.tsx: Creating root');
  const root = createRoot(rootElement);
  
  console.log('main.tsx: Rendering app');
  root.render(
    <StrictMode>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <SnackbarProvider maxSnack={3}>
            <CssBaseline />
            <App />
          </SnackbarProvider>
        </ThemeProvider>
      </Provider>
    </StrictMode>,
  );
  console.log('main.tsx: App rendered successfully');
} catch (error) {
  console.error('main.tsx: Failed to initialize application:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="color: red; margin: 20px; font-family: sans-serif;">
        <h1>Application Error</h1>
        <p>Sorry, the application failed to load. Please check the console for more details.</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.stack : 'Unknown error'}</pre>
      </div>
    `;
  }
  throw error;
}
