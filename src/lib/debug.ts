// Debug utility for conditional logging (production-safe)
const DEBUG = process.env.NODE_ENV === 'development';

export const debug = {
  log: (...args: any[]) => {
    if (DEBUG) console.log(...args);
  },
  error: (...args: any[]) => {
    console.error(...args); // Always log errors
  },
  warn: (...args: any[]) => {
    if (DEBUG) console.warn(...args);
  },
};

