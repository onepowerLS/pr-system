/**
 * Get the base URL for the application based on the environment
 * @returns {string} Base URL for the application
 */
export function getBaseUrl(): string {
  // In production, use the actual domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://app.1pwrafrica.com';
  }
  
  // In development, use localhost
  return 'http://localhost:5173';
}
