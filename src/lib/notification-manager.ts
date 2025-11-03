import { 
  NotificationTrigger, 
  NotificationHistory, 
  NotificationSettings,
  NotificationError,
  CreateNotificationTriggerInput,
  UpdateNotificationTriggerInput,
  Simulator
} from './types';
import { 
  NotificationStorage, 
  LocalStorageNotificationStorage,
  createNotificationTrigger,
  createNotificationHistory
} from './notification-storage';
import { validateNotificationTrigger } from './notification-validation';
import { sendWhatsAppMessage, getWhatsAppStatus } from './whatsapp-api';
import { 
  NotificationValidator,
  NotificationErrorHandler,
  NotificationStorageError,
  NotificationRateLimitError,
  NotificationValidationError,
  WhatsAppErrorHandler,
  notificationErrorHandler
} from './notification-errors';

export class NotificationManager {
  private storage: NotificationStorage;

  constructor(storage?: NotificationStorage) {
    this.storage = storage || new LocalStorageNotificationStorage();
  }

  // Core trigger management methods
  async createTrigger(input: CreateNotificationTriggerInput): Promise<NotificationTrigger> {
    try {
      // Enhanced validation using new validator
      NotificationValidator.validateTriggerData(input);

      // Check for duplicates
      const existingTriggers = await this.storage.getTriggersBySimulator(input.simulatorId);
      const duplicate = existingTriggers.find(t => 
        t.phoneNumber === input.phoneNumber && 
        t.thresholdPercentage === input.thresholdPercentage
      );

      if (duplicate) {
        throw new NotificationValidationError(
          NotificationError.DUPLICATE_TRIGGER,
          'A trigger with the same phone number and threshold already exists for this simulator'
        );
      }

      // Create and save the trigger
      const trigger = createNotificationTrigger(input);
      await this.storage.saveTrigger(trigger);
      
      return trigger;
    } catch (error) {
      const handled = notificationErrorHandler.handleError(error as Error, 'createTrigger');
      throw error; // Re-throw the original error for now
    }
  }

  async updateTrigger(id: string, updates: UpdateNotificationTriggerInput): Promise<NotificationTrigger> {
    // Get existing trigger
    const existingTrigger = await this.storage.getTrigger(id);
    if (!existingTrigger) {
      throw new Error(`Trigger with id ${id} not found`);
    }

    // Validate updates if they include validation-sensitive fields
    if (updates.phoneNumber || updates.thresholdPercentage || updates.simulatorId) {
      const updatedData = {
        phoneNumber: updates.phoneNumber || existingTrigger.phoneNumber,
        thresholdPercentage: updates.thresholdPercentage || existingTrigger.thresholdPercentage,
        simulatorId: updates.simulatorId || existingTrigger.simulatorId
      };

      const validation = validateNotificationTrigger(updatedData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for duplicates (excluding current trigger)
      const existingTriggers = await this.storage.getTriggersBySimulator(updatedData.simulatorId);
      const duplicate = existingTriggers.find(t => 
        t.id !== id &&
        t.phoneNumber === updatedData.phoneNumber && 
        t.thresholdPercentage === updatedData.thresholdPercentage
      );

      if (duplicate) {
        throw new Error('A trigger with the same phone number and threshold already exists for this simulator');
      }
    }

    // Update the trigger
    await this.storage.updateTrigger(id, updates);
    
    // Return updated trigger
    const updatedTrigger = await this.storage.getTrigger(id);
    if (!updatedTrigger) {
      throw new Error('Failed to retrieve updated trigger');
    }
    
    return updatedTrigger;
  }

  async deleteTrigger(id: string): Promise<void> {
    const trigger = await this.storage.getTrigger(id);
    if (!trigger) {
      throw new Error(`Trigger with id ${id} not found`);
    }
    
    await this.storage.deleteTrigger(id);
  }

  async getTrigger(id: string): Promise<NotificationTrigger | null> {
    return await this.storage.getTrigger(id);
  }

  async getTriggersBySimulator(simulatorId: string): Promise<NotificationTrigger[]> {
    return await this.storage.getTriggersBySimulator(simulatorId);
  }

  async getAllTriggers(): Promise<NotificationTrigger[]> {
    return await this.storage.getAllTriggers();
  }

  async getActiveTriggersBySimulator(simulatorId: string): Promise<NotificationTrigger[]> {
    const triggers = await this.storage.getTriggersBySimulator(simulatorId);
    return triggers.filter(t => t.isActive);
  }

  // Threshold monitoring and notification sending
  async checkThresholds(simulatorId: string, currentPercentage: number): Promise<void> {
    try {
      console.log(`[NotificationManager] Checking thresholds for ${simulatorId} at ${currentPercentage}%`);
      
      // Get notification settings
      const settings = await this.storage.getSettings();
      console.log(`[NotificationManager] Settings:`, settings);
      
      // Skip if notifications are globally disabled
      if (!settings.enabledGlobally) {
        console.log(`[NotificationManager] Notifications globally disabled`);
        return;
      }

      // Get active triggers for this simulator
      const activeTriggers = await this.getActiveTriggersBySimulator(simulatorId);
      console.log(`[NotificationManager] Found ${activeTriggers.length} active triggers:`, activeTriggers);
      
      // Check each trigger
      for (const trigger of activeTriggers) {
        console.log(`[NotificationManager] Checking trigger ${trigger.id}: ${currentPercentage}% >= ${trigger.thresholdPercentage}%`);
        if (currentPercentage >= trigger.thresholdPercentage) {
          console.log(`[NotificationManager] Threshold exceeded! Processing trigger ${trigger.id}`);
          await this.processTrigger(trigger, currentPercentage, settings);
        }
      }
    } catch (error) {
      console.error('Error checking thresholds:', error);
      // Don't throw here to prevent disrupting the main application flow
    }
  }

  private async processTrigger(
    trigger: NotificationTrigger, 
    currentPercentage: number, 
    settings: NotificationSettings
  ): Promise<void> {
    try {
      console.log(`[NotificationManager] Processing trigger ${trigger.id} for ${trigger.phoneNumber}`);
      
      // Check cooldown
      const lastNotificationTime = await this.storage.getLastNotificationTime(trigger.id);
      if (lastNotificationTime) {
        const minutesSinceLastNotification = (Date.now() - lastNotificationTime.getTime()) / (1000 * 60);
        console.log(`[NotificationManager] Minutes since last notification: ${minutesSinceLastNotification}, cooldown: ${settings.cooldownMinutes}`);
        if (minutesSinceLastNotification < settings.cooldownMinutes) {
          console.log(`[NotificationManager] Still in cooldown period, skipping`);
          return; // Still in cooldown period
        }
      }

      // Check daily limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayHistory = await this.getTodayNotificationHistory(trigger.id, today);
      console.log(`[NotificationManager] Today's notifications: ${todayHistory.length}, limit: ${settings.maxDailyNotifications}`);
      
      if (todayHistory.length >= settings.maxDailyNotifications) {
        console.log(`[NotificationManager] Daily limit reached, skipping`);
        return; // Daily limit reached
      }

      // Send notification
      console.log(`[NotificationManager] Sending notification to ${trigger.phoneNumber}`);
      let success = false;
      let errorMessage: string | undefined;
      
      try {
        success = await this.sendNotification(trigger, currentPercentage);
      } catch (error) {
        success = false;
        errorMessage = (error as any).detailedMessage || (error instanceof Error ? error.message : 'Unknown error');
        console.log(`[NotificationManager] Notification failed: ${errorMessage}`);
      }
      
      // Record the attempt with detailed information
      const historyEntry = createNotificationHistory(
        trigger,
        currentPercentage,
        success,
        success ? undefined : errorMessage || 'Failed to send WhatsApp message'
      );
      
      console.log(`[NotificationManager] Recording history: ${success ? 'SUCCESS' : 'FAILED'} - ${trigger.phoneNumber}`);
      await this.storage.saveNotificationHistory(historyEntry);
      
      // Update cooldown timestamp if successful
      if (success) {
        await this.storage.setLastNotificationTime(trigger.id, new Date());
      }
      
    } catch (error) {
      console.error('Error processing trigger:', error);
      
      // Record failed attempt with detailed error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const historyEntry = createNotificationHistory(
        trigger,
        currentPercentage,
        false,
        `Processing error: ${errorMessage}`
      );
      
      console.log(`[NotificationManager] Recording FAILED attempt: ${errorMessage}`);
      await this.storage.saveNotificationHistory(historyEntry);
    }
  }

  async sendNotification(trigger: NotificationTrigger, currentPercentage: number): Promise<boolean> {
    try {
      // Check WhatsApp API status first
      const status = await getWhatsAppStatus();
      if (!status.ready) {
        throw WhatsAppErrorHandler.handleWhatsAppError(
          { code: 'API_UNAVAILABLE', message: 'WhatsApp API is not ready' },
          trigger.phoneNumber
        );
      }

      // Create notification message
      const message = this.createNotificationMessage(
        trigger.simulatorId, // We'll need simulator name in a future enhancement
        currentPercentage,
        trigger.thresholdPercentage
      );

      // Send the message
      const result = await sendWhatsAppMessage({
        to: trigger.phoneNumber,
        message: message
      });

      if (!result.success) {
        throw WhatsAppErrorHandler.handleWhatsAppError(
          { message: result.error || 'Failed to send WhatsApp message' },
          trigger.phoneNumber
        );
      }

      return true;
    } catch (error) {
      const handled = notificationErrorHandler.handleError(error as Error, 'sendNotification');
      console.error(`[NotificationManager] Failed to send notification to ${trigger.phoneNumber}:`, handled.message);
      
      // Store the specific error for history logging
      (error as any).detailedMessage = handled.message;
      throw error; // Re-throw so processTrigger can log the detailed error
    }
  }

  private createNotificationMessage(
    simulatorId: string,
    currentPercentage: number,
    thresholdPercentage: number
  ): string {
    const timestamp = new Date().toLocaleString();
    
    return `🚨 EMS Alert: Energy Usage Threshold Exceeded

Simulator: ${simulatorId}
Current Usage: ${currentPercentage.toFixed(1)}% of target
Threshold: ${thresholdPercentage}%

Time: ${timestamp}

Please check your energy consumption and take appropriate action.`;
  }

  // History and settings management
  async getNotificationHistory(simulatorId: string, limit?: number): Promise<NotificationHistory[]> {
    return await this.storage.getNotificationHistory(simulatorId, limit);
  }

  async getAllNotificationHistory(limit?: number): Promise<NotificationHistory[]> {
    return await this.storage.getAllNotificationHistory(limit);
  }

  private async getTodayNotificationHistory(triggerId: string, today: Date): Promise<NotificationHistory[]> {
    const allHistory = await this.storage.getAllNotificationHistory(1000); // Get recent history
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return allHistory.filter(h => {
      const sentDate = new Date(h.sentAt);
      return h.triggerId === triggerId && 
             sentDate >= today && 
             sentDate < tomorrow;
    });
  }

  async getSettings(): Promise<NotificationSettings> {
    return await this.storage.getSettings();
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    try {
      // Enhanced validation using new validator
      NotificationValidator.validateNotificationSettings(settings);

      await this.storage.updateSettings(settings);
      return await this.storage.getSettings();
    } catch (error) {
      const handled = notificationErrorHandler.handleError(error as Error, 'updateSettings');
      throw error; // Re-throw the original error for now
    }
  }

  // Utility methods
  async getSystemStatus(): Promise<{
    whatsappReady: boolean;
    totalTriggers: number;
    activeTriggers: number;
    notificationsEnabled: boolean;
    recentNotifications: number;
  }> {
    try {
      const [whatsappStatus, allTriggers, settings, recentHistory] = await Promise.all([
        getWhatsAppStatus(),
        this.getAllTriggers(),
        this.getSettings(),
        this.getAllNotificationHistory(50)
      ]);

      const activeTriggers = allTriggers.filter(t => t.isActive);
      
      // Count notifications from last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentNotifications = recentHistory.filter(h => 
        new Date(h.sentAt) > yesterday
      ).length;

      return {
        whatsappReady: whatsappStatus.ready,
        totalTriggers: allTriggers.length,
        activeTriggers: activeTriggers.length,
        notificationsEnabled: settings.enabledGlobally,
        recentNotifications
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        whatsappReady: false,
        totalTriggers: 0,
        activeTriggers: 0,
        notificationsEnabled: false,
        recentNotifications: 0
      };
    }
  }

  async toggleTrigger(id: string, isActive: boolean): Promise<NotificationTrigger> {
    return await this.updateTrigger(id, { isActive });
  }

  async bulkToggleTriggers(simulatorId: string, isActive: boolean): Promise<void> {
    const triggers = await this.getTriggersBySimulator(simulatorId);
    
    for (const trigger of triggers) {
      await this.updateTrigger(trigger.id, { isActive });
    }
  }

  async clearNotificationHistory(simulatorId?: string): Promise<void> {
    if (simulatorId) {
      // Clear history for specific simulator
      const allHistory = await this.storage.getAllNotificationHistory(10000);
      const filteredHistory = allHistory.filter(h => h.simulatorId !== simulatorId);
      
      // This is a limitation of our current storage - we'd need to implement selective clearing
      // For now, we'll throw an error to indicate this feature needs enhancement
      throw new Error('Selective history clearing not yet implemented');
    } else {
      // Clear all history by saving empty array
      await this.storage.clearAllData();
    }
  }
}

// Default notification manager instance
export const notificationManager = new NotificationManager();

// Debug function for manual testing (available in browser console)
if (typeof window !== 'undefined') {
  (window as any).testNotifications = async (simulatorId: string, percentage: number) => {
    console.log(`🧪 [TEST] Manual notification test: ${simulatorId} at ${percentage}%`);
    try {
      await notificationManager.checkThresholds(simulatorId, percentage);
      console.log(`🧪 [TEST] Manual test completed`);
    } catch (error) {
      console.error(`🧪 [TEST] Manual test failed:`, error);
    }
  };
}