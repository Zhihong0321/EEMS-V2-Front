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

  // SIMPLE threshold monitoring - no complex logic
  async checkThresholds(simulatorId: string, currentPercentage: number): Promise<void> {
    console.log(`[NotificationManager] SIMPLE CHECK: ${simulatorId} at ${currentPercentage}%`);
    
    // Get active triggers
    const activeTriggers = await this.getActiveTriggersBySimulator(simulatorId);
    console.log(`[NotificationManager] Found ${activeTriggers.length} active triggers`);
    
    // Check each trigger - SIMPLE LOGIC ONLY
    for (const trigger of activeTriggers) {
      console.log(`[NotificationManager] Checking: ${currentPercentage} >= ${trigger.thresholdPercentage}?`);
      
      if (currentPercentage >= trigger.thresholdPercentage) {
        console.log(`[NotificationManager] 🚨 TRIGGER FIRED! Sending notification...`);
        
        // SIMPLE: Just send the notification, no complex checks
        try {
          const success = await this.sendNotification(trigger, currentPercentage);
          console.log(`[NotificationManager] Notification result: ${success ? 'SUCCESS' : 'FAILED'}`);
        } catch (error) {
          console.error(`[NotificationManager] Notification error:`, error);
        }
      }
    }
  }

  // REMOVED - processTrigger is now handled directly in checkThresholds

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

console.log('🚀 [INIT] NotificationManager loaded and ready');

// Add startup test method
(notificationManager as any).sendStartupTest = async function(phoneNumber: string, simulatorId: string): Promise<boolean> {
  console.log('🚀 [STARTUP] Testing notification system...');
  
  try {
    const message = `🚀 EMS Notification System Test

Simulator: ${simulatorId}
Time: ${new Date().toLocaleString()}

If you receive this, notifications are working! 🎉`;

    const success = await this.sendNotification({
      id: 'startup-test',
      phoneNumber: phoneNumber,
      thresholdPercentage: 0,
      simulatorId: simulatorId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, 0);
    
    console.log('🚀 [STARTUP] Test result:', success);
    return success;
  } catch (error) {
    console.error('🚀 [STARTUP] Test failed:', error);
    return false;
  }
};

// Simple test functions (available in browser console)
if (typeof window !== 'undefined') {
  console.log('🚀 [INIT] Adding test functions to window');
  
  // Test startup notification
  (window as any).testStartup = async (phoneNumber: string, simulatorId: string) => {
    console.log(`🚀 [TEST] Testing startup notification...`);
    try {
      const result = await (notificationManager as any).sendStartupTest(phoneNumber, simulatorId);
      console.log(`🚀 [TEST] Startup test result: ${result}`);
      return result;
    } catch (error) {
      console.error(`🚀 [TEST] Startup test failed:`, error);
      return false;
    }
  };
  
  // Test threshold trigger
  (window as any).testTrigger = async (simulatorId: string, percentage: number) => {
    console.log(`🧪 [TEST] Testing trigger: ${simulatorId} at ${percentage}%`);
    try {
      await notificationManager.checkThresholds(simulatorId, percentage);
      console.log(`🧪 [TEST] Trigger test completed`);
    } catch (error) {
      console.error(`🧪 [TEST] Trigger test failed:`, error);
    }
  };

  // Test startup notifications system
  (window as any).testStartupNotifications = async (simulatorId: string, simulatorName?: string) => {
    console.log(`🚀 [TEST] Testing startup notifications system for ${simulatorId}...`);
    try {
      const { sendStartupNotifications } = await import('./startup-notifications');
      await sendStartupNotifications(simulatorId, 'auto', simulatorName);
      console.log(`🚀 [TEST] Startup notifications system test completed`);
      return true;
    } catch (error) {
      console.error(`🚀 [TEST] Startup notifications system test failed:`, error);
      return false;
    }
  };

  // Debug startup notifications
  (window as any).debugStartupNotifications = async (simulatorId: string) => {
    console.log(`🔍 [TEST] Running startup notifications debug for ${simulatorId}...`);
    try {
      const { debugStartupNotifications } = await import('./startup-debug');
      await debugStartupNotifications(simulatorId);
      console.log(`🔍 [TEST] Debug completed`);
      return true;
    } catch (error) {
      console.error(`🔍 [TEST] Debug failed:`, error);
      return false;
    }
  };

  // Quick trigger check
  (window as any).checkTriggers = async (simulatorId: string) => {
    console.log(`🔍 [TEST] Checking triggers for ${simulatorId}...`);
    try {
      const allTriggers = await notificationManager.getTriggersBySimulator(simulatorId);
      const activeTriggers = await notificationManager.getActiveTriggersBySimulator(simulatorId);
      console.log(`🔍 [TEST] All triggers:`, allTriggers);
      console.log(`🔍 [TEST] Active triggers:`, activeTriggers);
      return { allTriggers, activeTriggers };
    } catch (error) {
      console.error(`🔍 [TEST] Check triggers failed:`, error);
      return null;
    }
  };
  
  console.log('🚀 Available functions:');
  console.log('  testStartup(phoneNumber, simulatorId) - Test if WhatsApp works');
  console.log('  testTrigger(simulatorId, percentage) - Test threshold trigger');
  console.log('  testStartupNotifications(simulatorId, simulatorName?) - Test startup notification system');
  console.log('  debugStartupNotifications(simulatorId) - Debug startup notification issues');
  console.log('  checkTriggers(simulatorId) - Check triggers for a simulator');
}