import { NotificationError } from './types';

// Custom error classes for better error handling
export class NotificationValidationError extends Error {
  public readonly type: NotificationError;
  public readonly field?: string;
  public readonly code: string;

  constructor(type: NotificationError, message: string, field?: string) {
    super(message);
    this.name = 'NotificationValidationError';
    this.type = type;
    this.field = field;
    this.code = type;
  }
}

export class NotificationStorageError extends Error {
  public readonly type: NotificationError;
  public readonly operation: string;

  constructor(message: string, operation: string) {
    super(message);
    this.name = 'NotificationStorageError';
    this.type = NotificationError.STORAGE_ERROR;
    this.operation = operation;
  }
}

export class NotificationRateLimitError extends Error {
  public readonly type: NotificationError;
  public readonly waitTimeMinutes: number;

  constructor(message: string, waitTimeMinutes: number) {
    super(message);
    this.name = 'NotificationRateLimitError';
    this.type = NotificationError.RATE_LIMIT_EXCEEDED;
    this.waitTimeMinutes = waitTimeMinutes;
  }
}

export class NotificationWhatsAppError extends Error {
  public readonly type: NotificationError;
  public readonly apiError?: string;
  public readonly retryable: boolean;

  constructor(message: string, apiError?: string, retryable: boolean = true) {
    super(message);
    this.name = 'NotificationWhatsAppError';
    this.type = NotificationError.WHATSAPP_API_UNAVAILABLE;
    this.apiError = apiError;
    this.retryable = retryable;
  }
}

// Error handler class for centralized error management
export class NotificationErrorHandler {
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();

  /**
   * Handle and categorize errors
   */
  handleError(error: Error, context?: string): {
    type: NotificationError;
    message: string;
    shouldRetry: boolean;
    retryAfterMinutes?: number;
  } {
    const contextKey = context || 'general';
    
    // Increment error count
    const currentCount = this.errorCounts.get(contextKey) || 0;
    this.errorCounts.set(contextKey, currentCount + 1);
    this.lastErrors.set(contextKey, new Date());

    // Handle specific error types
    if (error instanceof NotificationValidationError) {
      return {
        type: error.type,
        message: error.message,
        shouldRetry: false
      };
    }

    if (error instanceof NotificationRateLimitError) {
      return {
        type: error.type,
        message: error.message,
        shouldRetry: true,
        retryAfterMinutes: error.waitTimeMinutes
      };
    }

    if (error instanceof NotificationWhatsAppError) {
      return {
        type: error.type,
        message: error.message,
        shouldRetry: error.retryable,
        retryAfterMinutes: error.retryable ? 5 : undefined
      };
    }

    if (error instanceof NotificationStorageError) {
      return {
        type: error.type,
        message: error.message,
        shouldRetry: true,
        retryAfterMinutes: 1
      };
    }

    // Handle generic errors
    if (error.message.includes('localStorage')) {
      return {
        type: NotificationError.STORAGE_ERROR,
        message: 'Storage is not available or full',
        shouldRetry: false
      };
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        type: NotificationError.WHATSAPP_API_UNAVAILABLE,
        message: 'Network error occurred',
        shouldRetry: true,
        retryAfterMinutes: 2
      };
    }

    // Default error handling
    return {
      type: NotificationError.VALIDATION_ERROR,
      message: error.message || 'Unknown error occurred',
      shouldRetry: false
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByContext: Record<string, number>;
    recentErrors: Record<string, Date>;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorsByContext: Record<string, number> = {};
    const recentErrors: Record<string, Date> = {};

    this.errorCounts.forEach((count, context) => {
      errorsByContext[context] = count;
    });

    this.lastErrors.forEach((date, context) => {
      recentErrors[context] = date;
    });

    return {
      totalErrors,
      errorsByContext,
      recentErrors
    };
  }

  /**
   * Clear error statistics
   */
  clearErrorStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  /**
   * Check if context has too many recent errors
   */
  hasTooManyErrors(context: string, maxErrors: number = 10, timeWindowMinutes: number = 60): boolean {
    const errorCount = this.errorCounts.get(context) || 0;
    const lastError = this.lastErrors.get(context);
    
    if (!lastError || errorCount < maxErrors) {
      return false;
    }

    const minutesSinceLastError = (Date.now() - lastError.getTime()) / (1000 * 60);
    return minutesSinceLastError < timeWindowMinutes;
  }
}

// Enhanced validation utilities
export class NotificationValidator {
  
  /**
   * Validate phone number with detailed error messages
   */
  static validatePhoneNumber(phoneNumber: string): void {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new NotificationValidationError(
        NotificationError.INVALID_PHONE_NUMBER,
        'Phone number is required',
        'phoneNumber'
      );
    }

    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    if (!cleaned.startsWith('+')) {
      throw new NotificationValidationError(
        NotificationError.INVALID_PHONE_NUMBER,
        'Phone number must start with country code (e.g., +60123456789)',
        'phoneNumber'
      );
    }

    const numberOnly = cleaned.substring(1);
    
    if (!/^\d+$/.test(numberOnly)) {
      throw new NotificationValidationError(
        NotificationError.INVALID_PHONE_NUMBER,
        'Phone number can only contain digits after country code',
        'phoneNumber'
      );
    }

    if (numberOnly.length < 10 || numberOnly.length > 15) {
      throw new NotificationValidationError(
        NotificationError.INVALID_PHONE_NUMBER,
        'Phone number must be 10-15 digits including country code',
        'phoneNumber'
      );
    }

    // Validate common country codes
    const countryCode = numberOnly.substring(0, 3);
    const invalidCodes = ['000', '111', '222', '333', '444', '555', '666', '777', '888', '999'];
    
    if (invalidCodes.includes(countryCode)) {
      throw new NotificationValidationError(
        NotificationError.INVALID_PHONE_NUMBER,
        'Invalid country code',
        'phoneNumber'
      );
    }
  }

  /**
   * Validate threshold percentage with detailed error messages
   */
  static validateThresholdPercentage(threshold: number): void {
    if (threshold === null || threshold === undefined) {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'Threshold percentage is required',
        'thresholdPercentage'
      );
    }

    if (typeof threshold !== 'number' || isNaN(threshold)) {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'Threshold must be a valid number',
        'thresholdPercentage'
      );
    }

    if (threshold < 1) {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'Threshold must be at least 1%',
        'thresholdPercentage'
      );
    }

    if (threshold > 200) {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'Threshold cannot exceed 200%',
        'thresholdPercentage'
      );
    }

    // Check for reasonable precision (max 1 decimal place)
    const decimalPlaces = (threshold.toString().split('.')[1] || '').length;
    if (decimalPlaces > 1) {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'Threshold can have at most 1 decimal place',
        'thresholdPercentage'
      );
    }
  }

  /**
   * Validate simulator ID
   */
  static validateSimulatorId(simulatorId: string): void {
    if (!simulatorId || typeof simulatorId !== 'string') {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'Simulator ID is required',
        'simulatorId'
      );
    }

    if (simulatorId.trim().length === 0) {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'Simulator ID cannot be empty',
        'simulatorId'
      );
    }

    if (simulatorId.length > 100) {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'Simulator ID is too long (max 100 characters)',
        'simulatorId'
      );
    }

    // Check for valid characters (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9\-_]+$/.test(simulatorId)) {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'Simulator ID can only contain letters, numbers, hyphens, and underscores',
        'simulatorId'
      );
    }
  }

  /**
   * Validate notification settings
   */
  static validateNotificationSettings(settings: any): void {
    if (typeof settings !== 'object' || settings === null) {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'Settings must be an object',
        'settings'
      );
    }

    if (settings.cooldownMinutes !== undefined) {
      if (typeof settings.cooldownMinutes !== 'number' || isNaN(settings.cooldownMinutes)) {
        throw new NotificationValidationError(
          NotificationError.VALIDATION_ERROR,
          'Cooldown minutes must be a number',
          'cooldownMinutes'
        );
      }

      if (settings.cooldownMinutes < 1 || settings.cooldownMinutes > 1440) {
        throw new NotificationValidationError(
          NotificationError.VALIDATION_ERROR,
          'Cooldown minutes must be between 1 and 1440 (24 hours)',
          'cooldownMinutes'
        );
      }
    }

    if (settings.maxDailyNotifications !== undefined) {
      if (typeof settings.maxDailyNotifications !== 'number' || isNaN(settings.maxDailyNotifications)) {
        throw new NotificationValidationError(
          NotificationError.VALIDATION_ERROR,
          'Max daily notifications must be a number',
          'maxDailyNotifications'
        );
      }

      if (settings.maxDailyNotifications < 1 || settings.maxDailyNotifications > 100) {
        throw new NotificationValidationError(
          NotificationError.VALIDATION_ERROR,
          'Max daily notifications must be between 1 and 100',
          'maxDailyNotifications'
        );
      }
    }

    if (settings.enabledGlobally !== undefined) {
      if (typeof settings.enabledGlobally !== 'boolean') {
        throw new NotificationValidationError(
          NotificationError.VALIDATION_ERROR,
          'Enabled globally must be a boolean',
          'enabledGlobally'
        );
      }
    }
  }

  /**
   * Validate complete trigger data
   */
  static validateTriggerData(data: any): void {
    if (typeof data !== 'object' || data === null) {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'Trigger data must be an object'
      );
    }

    this.validateSimulatorId(data.simulatorId);
    this.validatePhoneNumber(data.phoneNumber);
    this.validateThresholdPercentage(data.thresholdPercentage);

    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
      throw new NotificationValidationError(
        NotificationError.VALIDATION_ERROR,
        'isActive must be a boolean',
        'isActive'
      );
    }
  }
}

// WhatsApp API error handling
export class WhatsAppErrorHandler {
  
  /**
   * Handle WhatsApp API errors with specific error codes
   */
  static handleWhatsAppError(error: any, phoneNumber?: string): NotificationWhatsAppError {
    let message = 'WhatsApp API error occurred';
    let retryable = true;
    let apiError = '';

    if (error && typeof error === 'object') {
      if (error.message) {
        apiError = error.message;
        message = `WhatsApp API error: ${error.message}`;
      }

      // Handle specific error codes
      if (error.code) {
        switch (error.code) {
          case 'PHONE_NOT_WHATSAPP':
            message = `Phone number ${phoneNumber} is not registered with WhatsApp`;
            retryable = false;
            break;
          case 'RATE_LIMIT':
            message = 'WhatsApp API rate limit exceeded';
            retryable = true;
            break;
          case 'INVALID_PHONE':
            message = `Invalid phone number format: ${phoneNumber}`;
            retryable = false;
            break;
          case 'API_UNAVAILABLE':
            message = 'WhatsApp API is temporarily unavailable';
            retryable = true;
            break;
          case 'AUTHENTICATION_FAILED':
            message = 'WhatsApp API authentication failed';
            retryable = false;
            break;
          default:
            message = `WhatsApp API error (${error.code}): ${error.message || 'Unknown error'}`;
            break;
        }
      }
    }

    return new NotificationWhatsAppError(message, apiError, retryable);
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: Error): boolean {
    if (error instanceof NotificationWhatsAppError) {
      return error.retryable;
    }

    // Network errors are generally retryable
    if (error.message.includes('network') || 
        error.message.includes('timeout') || 
        error.message.includes('fetch')) {
      return true;
    }

    return false;
  }

  /**
   * Get retry delay based on error type
   */
  static getRetryDelay(error: Error, attemptNumber: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 300000; // 5 minutes

    if (error instanceof NotificationRateLimitError) {
      return Math.min(error.waitTimeMinutes * 60 * 1000, maxDelay);
    }

    // Exponential backoff for other retryable errors
    const delay = baseDelay * Math.pow(2, attemptNumber - 1);
    return Math.min(delay, maxDelay);
  }
}

// Default error handler instance
export const notificationErrorHandler = new NotificationErrorHandler();