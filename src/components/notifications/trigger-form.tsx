'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input, InputWrapper, Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  NotificationTrigger, 
  CreateNotificationTriggerInput,
  UpdateNotificationTriggerInput 
} from '@/lib/types';
import { 
  validatePhoneNumber, 
  validateThresholdPercentage,
  formatPhoneNumberForDisplay 
} from '@/lib/notification-validation';
import { notificationManager } from '@/lib/notification-manager';

export interface TriggerFormProps {
  simulatorId: string;
  trigger?: NotificationTrigger;
  onSave: (trigger: NotificationTrigger) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  phoneNumber: string;
  thresholdPercentage: string;
  isActive: boolean;
}

interface FormErrors {
  phoneNumber?: string;
  thresholdPercentage?: string;
  general?: string;
}

export function TriggerForm({ 
  simulatorId, 
  trigger, 
  onSave, 
  onCancel, 
  isLoading = false 
}: TriggerFormProps) {
  const [formData, setFormData] = useState<FormData>({
    phoneNumber: trigger?.phoneNumber || '',
    thresholdPercentage: trigger?.thresholdPercentage?.toString() || '',
    isActive: trigger?.isActive ?? true
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const isEditing = !!trigger;

  // Reset form when trigger changes
  useEffect(() => {
    if (trigger) {
      setFormData({
        phoneNumber: trigger.phoneNumber,
        thresholdPercentage: trigger.thresholdPercentage.toString(),
        isActive: trigger.isActive
      });
    } else {
      setFormData({
        phoneNumber: '',
        thresholdPercentage: '',
        isActive: true
      });
    }
    setErrors({});
    setIsDirty(false);
  }, [trigger]);

  // Real-time validation
  const validateField = (field: keyof FormData, value: string | boolean): string | undefined => {
    switch (field) {
      case 'phoneNumber':
        if (!value || typeof value !== 'string' || (value as string).trim() === '') {
          return 'Phone number is required';
        }
        const phoneValidation = validatePhoneNumber(value as string);
        return phoneValidation.isValid ? undefined : phoneValidation.error;
      
      case 'thresholdPercentage':
        if (!value || typeof value !== 'string' || (value as string).trim() === '') {
          return 'Threshold percentage is required';
        }
        const thresholdValidation = validateThresholdPercentage(value as string);
        return thresholdValidation.isValid ? undefined : thresholdValidation.error;
      
      default:
        return undefined;
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);

    // Clear previous error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Real-time validation for phone number and threshold
    if (field === 'phoneNumber' || field === 'thresholdPercentage') {
      const error = validateField(field, value);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate phone number
    const phoneError = validateField('phoneNumber', formData.phoneNumber);
    if (phoneError) newErrors.phoneNumber = phoneError;

    // Validate threshold percentage
    const thresholdError = validateField('thresholdPercentage', formData.thresholdPercentage);
    if (thresholdError) newErrors.thresholdPercentage = thresholdError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const thresholdValue = parseFloat(formData.thresholdPercentage);
      
      if (isEditing && trigger) {
        // Update existing trigger
        const updates: UpdateNotificationTriggerInput = {
          phoneNumber: formData.phoneNumber,
          thresholdPercentage: thresholdValue,
          isActive: formData.isActive
        };
        
        const updatedTrigger = await notificationManager.updateTrigger(trigger.id, updates);
        onSave(updatedTrigger);
      } else {
        // Create new trigger
        const input: CreateNotificationTriggerInput = {
          simulatorId,
          phoneNumber: formData.phoneNumber,
          thresholdPercentage: thresholdValue,
          isActive: formData.isActive
        };
        
        const newTrigger = await notificationManager.createTrigger(input);
        onSave(newTrigger);
      }
    } catch (error) {
      console.error('Error saving trigger:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to save trigger'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    onCancel();
  };

  const formatPhoneNumberDisplay = (value: string): string => {
    if (!value) return value;
    const validation = validatePhoneNumber(value);
    if (validation.isValid && validation.formattedNumber) {
      return formatPhoneNumberForDisplay(validation.formattedNumber);
    }
    return value;
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-white">
          {isEditing ? 'Edit Notification Trigger' : 'Create Notification Trigger'}
        </h3>
        <p className="text-sm text-slate-400">
          {isEditing 
            ? 'Update the notification settings for this trigger'
            : 'Set up a new WhatsApp notification when energy usage exceeds the threshold'
          }
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 rounded-md bg-danger/10 border border-danger/20">
              <p className="text-sm text-danger">{errors.general}</p>
            </div>
          )}

          {/* Phone Number Input */}
          <InputWrapper
            label="WhatsApp Phone Number"
            error={errors.phoneNumber}
            helperText="Enter phone number with country code (e.g., 60123456789)"
            required
          >
            <Input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              placeholder="60123456789"
              error={!!errors.phoneNumber}
              disabled={isSubmitting || isLoading}
            />
          </InputWrapper>

          {/* Phone Number Preview */}
          {formData.phoneNumber && !errors.phoneNumber && (
            <div className="text-xs text-slate-400">
              Formatted: {formatPhoneNumberDisplay(formData.phoneNumber)}
            </div>
          )}

          {/* Threshold Percentage Input */}
          <InputWrapper
            label="Threshold Percentage"
            error={errors.thresholdPercentage}
            helperText="Notification will be sent when usage reaches this percentage (1-200%)"
            required
          >
            <div className="relative">
              <Input
                type="number"
                min="1"
                max="200"
                step="0.1"
                value={formData.thresholdPercentage}
                onChange={(e) => handleInputChange('thresholdPercentage', e.target.value)}
                placeholder="80"
                error={!!errors.thresholdPercentage}
                disabled={isSubmitting || isLoading}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                %
              </span>
            </div>
          </InputWrapper>

          {/* Active Status */}
          <InputWrapper
            label="Status"
            helperText="Enable or disable this notification trigger"
          >
            <Select
              value={formData.isActive ? 'active' : 'inactive'}
              onChange={(e) => handleInputChange('isActive', e.target.value === 'active')}
              disabled={isSubmitting || isLoading}
            >
              <option value="active">Active - Notifications enabled</option>
              <option value="inactive">Inactive - Notifications disabled</option>
            </Select>
          </InputWrapper>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isLoading || Object.keys(errors).length > 0}
              className="flex-1"
            >
              {isSubmitting 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update Trigger' : 'Create Trigger')
              }
            </Button>
            
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}