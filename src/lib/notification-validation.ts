import { PhoneNumberValidation, ThresholdValidation, NotificationError } from './types';

/**
 * Validates phone number format for WhatsApp notifications
 * Accepts international format with country code (e.g., 60123456789)
 */
export function validatePhoneNumber(phoneNumber: string): PhoneNumberValidation {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      error: 'Phone number is required'
    };
  }

  // Remove all whitespace and special characters including +
  const cleaned = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  
  // Check if all characters are digits
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Phone number can only contain digits'
    };
  }

  // Check length (country code + number should be 10-15 digits total)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return {
      isValid: false,
      error: 'Phone number must be 10-15 digits including country code'
    };
  }

  // Basic country code validation (1-4 digits at start)
  const countryCodeMatch = cleaned.match(/^(\d{1,4})/);
  if (!countryCodeMatch) {
    return {
      isValid: false,
      error: 'Invalid country code format'
    };
  }

  return {
    isValid: true,
    formattedNumber: cleaned
  };
}

/**
 * Validates threshold percentage for notification triggers
 * Must be between 1% and 200%
 */
export function validateThresholdPercentage(threshold: number | string): ThresholdValidation {
  if (threshold === null || threshold === undefined || threshold === '') {
    return {
      isValid: false,
      error: 'Threshold percentage is required'
    };
  }

  const numericValue = typeof threshold === 'string' ? parseFloat(threshold) : threshold;
  
  if (isNaN(numericValue)) {
    return {
      isValid: false,
      error: 'Threshold must be a valid number'
    };
  }

  if (numericValue < 1) {
    return {
      isValid: false,
      error: 'Threshold must be at least 1%'
    };
  }

  if (numericValue > 200) {
    return {
      isValid: false,
      error: 'Threshold cannot exceed 200%'
    };
  }

  // Round to 1 decimal place for consistency
  const normalizedValue = Math.round(numericValue * 10) / 10;

  return {
    isValid: true,
    normalizedValue
  };
}

/**
 * Validates notification trigger data before creation/update
 */
export function validateNotificationTrigger(data: {
  phoneNumber: string;
  thresholdPercentage: number;
  simulatorId: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate phone number
  const phoneValidation = validatePhoneNumber(data.phoneNumber);
  if (!phoneValidation.isValid) {
    errors.push(phoneValidation.error!);
  }

  // Validate threshold
  const thresholdValidation = validateThresholdPercentage(data.thresholdPercentage);
  if (!thresholdValidation.isValid) {
    errors.push(thresholdValidation.error!);
  }

  // Validate simulator ID
  if (!data.simulatorId || typeof data.simulatorId !== 'string' || data.simulatorId.trim().length === 0) {
    errors.push('Simulator ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Formats phone number for display (adds spaces for readability)
 */
export function formatPhoneNumberForDisplay(phoneNumber: string): string {
  const validation = validatePhoneNumber(phoneNumber);
  if (!validation.isValid || !validation.formattedNumber) {
    return phoneNumber;
  }

  const number = validation.formattedNumber;
  // Format as XX XXX XXX XXXX (adjust based on length)
  if (number.length <= 13) {
    return number.replace(/(\d{1,3})(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4');
  }
  return number;
}

/**
 * Checks if two phone numbers are equivalent (ignoring formatting)
 */
export function arePhoneNumbersEqual(phone1: string, phone2: string): boolean {
  const validation1 = validatePhoneNumber(phone1);
  const validation2 = validatePhoneNumber(phone2);
  
  if (!validation1.isValid || !validation2.isValid) {
    return false;
  }
  
  return validation1.formattedNumber === validation2.formattedNumber;
}