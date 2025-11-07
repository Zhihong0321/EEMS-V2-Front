'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input, InputWrapper, Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { NotificationSettings } from '@/lib/types';
import { notificationManager } from '@/lib/notification-manager';

export interface NotificationSettingsPanelProps {
  settings: NotificationSettings;
  onSave: (settings: NotificationSettings) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  enabledGlobally: boolean;
  cooldownMinutes: string;
  maxDailyNotifications: string;
}

interface FormErrors {
  cooldownMinutes?: string;
  maxDailyNotifications?: string;
  general?: string;
}

export function NotificationSettingsPanel({ 
  settings, 
  onSave, 
  onCancel, 
  isLoading = false 
}: NotificationSettingsPanelProps) {
  const [formData, setFormData] = useState<FormData>({
    enabledGlobally: settings.enabledGlobally,
    cooldownMinutes: settings.cooldownMinutes.toString(),
    maxDailyNotifications: settings.maxDailyNotifications.toString()
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Reset form when settings change
  useEffect(() => {
    setFormData({
      enabledGlobally: settings.enabledGlobally,
      cooldownMinutes: settings.cooldownMinutes.toString(),
      maxDailyNotifications: settings.maxDailyNotifications.toString()
    });
    setErrors({});
    setIsDirty(false);
  }, [settings]);

  // Validation
  const validateField = (field: keyof FormData, value: string | boolean): string | undefined => {
    switch (field) {
      case 'cooldownMinutes':
        if (!value || typeof value !== 'string') return 'Cooldown minutes is required';
        const cooldownValue = parseInt(value as string);
        if (isNaN(cooldownValue)) return 'Cooldown must be a valid number';
        if (cooldownValue < 1) return 'Cooldown must be at least 1 minute';
        if (cooldownValue > 1440) return 'Cooldown cannot exceed 1440 minutes (24 hours)';
        return undefined;
      
      case 'maxDailyNotifications':
        if (!value || typeof value !== 'string') return 'Max daily notifications is required';
        const maxValue = parseInt(value as string);
        if (isNaN(maxValue)) return 'Max daily notifications must be a valid number';
        if (maxValue < 1) return 'Must allow at least 1 notification per day';
        if (maxValue > 100) return 'Cannot exceed 100 notifications per day';
        return undefined;
      
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

    // Real-time validation for numeric fields
    if (field === 'cooldownMinutes' || field === 'maxDailyNotifications') {
      const error = validateField(field, value);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate cooldown minutes
    const cooldownError = validateField('cooldownMinutes', formData.cooldownMinutes);
    if (cooldownError) newErrors.cooldownMinutes = cooldownError;

    // Validate max daily notifications
    const maxDailyError = validateField('maxDailyNotifications', formData.maxDailyNotifications);
    if (maxDailyError) newErrors.maxDailyNotifications = maxDailyError;

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
      const updatedSettings: Partial<NotificationSettings> = {
        enabledGlobally: formData.enabledGlobally,
        cooldownMinutes: parseInt(formData.cooldownMinutes),
        maxDailyNotifications: parseInt(formData.maxDailyNotifications)
      };
      
      const newSettings = await notificationManager.updateSettings(updatedSettings);
      onSave(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to save settings'
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

  const handleReset = () => {
    const confirmed = window.confirm('Reset all settings to default values?');
    if (!confirmed) return;

    setFormData({
      enabledGlobally: true,
      cooldownMinutes: '15',
      maxDailyNotifications: '10'
    });
    setIsDirty(true);
    setErrors({});
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-white">Notification Settings</h3>
        <p className="text-sm text-slate-400">
          Configure global notification behavior and rate limiting
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

          {/* Global Enable/Disable */}
          <InputWrapper
            label="Global Notifications"
            helperText="Master switch to enable or disable all notifications system-wide"
          >
            <Select
              value={formData.enabledGlobally ? 'enabled' : 'disabled'}
              onChange={(e) => handleInputChange('enabledGlobally', e.target.value === 'enabled')}
              disabled={isSubmitting || isLoading}
            >
              <option value="enabled">✅ Enabled - Notifications will be sent</option>
              <option value="disabled">❌ Disabled - All notifications paused</option>
            </Select>
          </InputWrapper>

          {/* Cooldown Minutes */}
          <InputWrapper
            label="Cooldown Period"
            error={errors.cooldownMinutes}
            helperText="Minimum time between notifications for the same trigger (1-1440 minutes)"
            required
          >
            <div className="relative">
              <Input
                type="number"
                min="1"
                max="1440"
                value={formData.cooldownMinutes}
                onChange={(e) => handleInputChange('cooldownMinutes', e.target.value)}
                placeholder="15"
                error={!!errors.cooldownMinutes}
                disabled={isSubmitting || isLoading}
                className="pr-20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                minutes
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Current: {parseInt(formData.cooldownMinutes) || 0} minutes 
              {parseInt(formData.cooldownMinutes) >= 60 && 
                ` (${Math.floor(parseInt(formData.cooldownMinutes) / 60)}h ${parseInt(formData.cooldownMinutes) % 60}m)`
              }
            </div>
          </InputWrapper>

          {/* Max Daily Notifications */}
          <InputWrapper
            label="Daily Notification Limit"
            error={errors.maxDailyNotifications}
            helperText="Maximum notifications per trigger per day (1-100)"
            required
          >
            <div className="relative">
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.maxDailyNotifications}
                onChange={(e) => handleInputChange('maxDailyNotifications', e.target.value)}
                placeholder="10"
                error={!!errors.maxDailyNotifications}
                disabled={isSubmitting || isLoading}
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                per day
              </span>
            </div>
          </InputWrapper>

          {/* Settings Preview */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <h4 className="text-sm font-medium text-white mb-3">Settings Preview</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={formData.enabledGlobally ? "text-success" : "text-slate-400"}>
                  {formData.enabledGlobally ? 'Notifications Enabled' : 'Notifications Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cooldown:</span>
                <span className="text-slate-300">
                  {parseInt(formData.cooldownMinutes) || 0} minutes between notifications
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Limit:</span>
                <span className="text-slate-300">
                  {parseInt(formData.maxDailyNotifications) || 0} notifications per trigger per day
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isLoading || !isDirty || Object.keys(errors).length > 0}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
            
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={isSubmitting || isLoading}
            >
              Reset
            </Button>
            
            <Button
              type="button"
              variant="ghost"
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