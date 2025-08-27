/**
 * Logger utility for the PR System
 * Provides a centralized way to handle logging with different levels
 * and automatic suppression in production environments
 */

// Determine if we're in production or development
const isProduction = process.env.NODE_ENV === 'production';

// Module-specific debug flags
// Set to true to enable debugging for specific modules even in production
const DEBUG_FLAGS: Record<string, boolean> = {
  referenceData: false,
  componentRendering: false,
  formState: false,
  prService: true,  // Enable detailed logging for PR service
  approverHandling: true  // Enable detailed logging for approver selection
};

/**
 * Logger interface with methods for different log levels
 */
export interface Logger {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
}

/**
 * Create a namespaced logger that prefixes all logs with the module name
 * @param module The module name to use as prefix
 * @returns A logger instance
 */
export function createLogger(module: string): Logger {
  // Check if debugging is enabled for this module
  const isDebugEnabled = !isProduction || DEBUG_FLAGS[module] === true;
  
  return {
    debug: (message: string, data?: any) => {
      if (isDebugEnabled) {
        console.log(`[${module}] ${message}`, data !== undefined ? data : '');
      }
    },
    info: (message: string, data?: any) => {
      if (isDebugEnabled) {
        console.info(`[${module}] ${message}`, data !== undefined ? data : '');
      }
    },
    warn: (message: string, data?: any) => {
      console.warn(`[${module}] ${message}`, data !== undefined ? data : '');
    },
    error: (message: string, data?: any) => {
      console.error(`[${module}] ${message}`, data !== undefined ? data : '');
    }
  };
}

/**
 * Default logger with no module prefix
 */
export const logger = createLogger('app');

export default logger;
