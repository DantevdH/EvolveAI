/**
 * Centralized Logging Utility
 * 
 * Provides structured logging with levels to reduce noise in production
 * and make debugging easier during development.
 */

export enum LogLevel {
  SILENT = 0,   // No logs
  ERROR = 1,    // Only errors
  WARN = 2,     // Errors + warnings
  INFO = 3,     // Errors + warnings + info (navigation, important state changes)
  DEBUG = 4,    // All logs including detailed debug info
}

// Set current log level based on environment
// In production, you'd want INFO or WARN
const CURRENT_LEVEL: LogLevel = __DEV__ ? LogLevel.INFO : LogLevel.WARN;

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = CURRENT_LEVEL) {
    this.level = level;
  }

  /**
   * Navigation logs - Always show where user is going
   * Format: [NAV] Current Step → Next Step
   */
  navigation(from: string, to: string, reason?: string) {
    if (this.level >= LogLevel.INFO) {
      const reasonText = reason ? ` (${reason})` : '';
      console.log(`[NAV] ${from} → ${to}${reasonText}`);
    }
  }

  /**
   * Step completion logs - Show major milestones
   * Format: [STEP] Step Name - Status
   */
  step(step: string, status: 'started' | 'completed' | 'failed', details?: string) {
    if (this.level >= LogLevel.INFO) {
      const emoji = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '▶️';
      const detailsText = details ? ` - ${details}` : '';
      console.log(`${emoji} [STEP] ${step}${detailsText}`);
    }
  }

  /**
   * Data loading logs - Track API calls and database queries
   * Format: [DATA] Action - Status
   */
  data(action: string, status: 'loading' | 'success' | 'error', details?: any) {
    if (this.level >= LogLevel.INFO) {
      const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
      console.log(`${emoji} [DATA] ${action}`, details || '');
    }
  }

  /**
   * Error logs - Always show errors
   */
  error(message: string, error?: any) {
    if (this.level >= LogLevel.ERROR) {
      console.error(`❌ [ERROR] ${message}`, error || '');
    }
  }

  /**
   * Warning logs - Show potential issues
   */
  warn(message: string, details?: any) {
    if (this.level >= LogLevel.WARN) {
      console.warn(`⚠️ [WARN] ${message}`, details || '');
    }
  }

  /**
   * Debug logs - Detailed information for debugging
   * Only shown when DEBUG level is active
   */
  debug(message: string, data?: any) {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  }

  /**
   * Info logs - General information
   */
  info(message: string, data?: any) {
    if (this.level >= LogLevel.INFO) {
      console.log(`ℹ️ [INFO] ${message}`, data || '');
    }
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: LogLevel) {
    this.level = level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logNavigation = (from: string, to: string, reason?: string) => 
  logger.navigation(from, to, reason);

export const logStep = (step: string, status: 'started' | 'completed' | 'failed', details?: string) => 
  logger.step(step, status, details);

export const logData = (action: string, status: 'loading' | 'success' | 'error', details?: any) => 
  logger.data(action, status, details);

export const logError = (message: string, error?: any) => 
  logger.error(message, error);

export const logWarn = (message: string, details?: any) => 
  logger.warn(message, details);

export const logDebug = (message: string, data?: any) => 
  logger.debug(message, data);

export const logInfo = (message: string, data?: any) => 
  logger.info(message, data);
