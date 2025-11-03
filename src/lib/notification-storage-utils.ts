import { 
  NotificationTrigger, 
  NotificationHistory, 
  NotificationSettings,
  NotificationError
} from './types';
import { validateNotificationTrigger } from './notification-validation';

// Storage namespace isolation
export const NOTIFICATION_STORAGE_PREFIX = 'ems_notifications_';

// Enhanced storage keys with namespace
export const STORAGE_KEYS = {
  TRIGGERS: `${NOTIFICATION_STORAGE_PREFIX}triggers`,
  HISTORY: `${NOTIFICATION_STORAGE_PREFIX}history`,
  SETTINGS: `${NOTIFICATION_STORAGE_PREFIX}settings`,
  COOLDOWNS: `${NOTIFICATION_STORAGE_PREFIX}cooldowns`,
  METADATA: `${NOTIFICATION_STORAGE_PREFIX}metadata`
} as const;

// Storage metadata for versioning and migration
export type StorageMetadata = {
  version: string;
  lastMigration?: string;
  createdAt: string;
  lastAccessed: string;
};

const CURRENT_STORAGE_VERSION = '1.0.0';

// Data serialization utilities
export class NotificationDataSerializer {
  
  /**
   * Safely serialize data to JSON string with error handling
   */
  static serialize<T>(data: T): string {
    try {
      return JSON.stringify(data, null, 0);
    } catch (error) {
      throw new Error(`Serialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Safely deserialize JSON string with validation
   */
  static deserialize<T>(jsonString: string, validator?: (data: any) => data is T): T {
    try {
      const parsed = JSON.parse(jsonString);
      
      if (validator && !validator(parsed)) {
        throw new Error('Data validation failed after deserialization');
      }
      
      return parsed;
    } catch (error) {
      throw new Error(`Deserialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compress data for storage (simple string compression)
   */
  static compress(data: string): string {
    // Simple compression by removing unnecessary whitespace
    return data.replace(/\s+/g, ' ').trim();
  }

  /**
   * Validate trigger data structure
   */
  static validateTrigger(data: any): data is NotificationTrigger {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.id === 'string' &&
      typeof data.simulatorId === 'string' &&
      typeof data.phoneNumber === 'string' &&
      typeof data.thresholdPercentage === 'number' &&
      typeof data.isActive === 'boolean' &&
      typeof data.createdAt === 'string' &&
      typeof data.updatedAt === 'string'
    );
  }

  /**
   * Validate history data structure
   */
  static validateHistory(data: any): data is NotificationHistory {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.id === 'string' &&
      typeof data.triggerId === 'string' &&
      typeof data.simulatorId === 'string' &&
      typeof data.phoneNumber === 'string' &&
      typeof data.thresholdPercentage === 'number' &&
      typeof data.actualPercentage === 'number' &&
      typeof data.sentAt === 'string' &&
      typeof data.success === 'boolean'
    );
  }

  /**
   * Validate settings data structure
   */
  static validateSettings(data: any): data is NotificationSettings {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.cooldownMinutes === 'number' &&
      typeof data.maxDailyNotifications === 'number' &&
      typeof data.enabledGlobally === 'boolean'
    );
  }
}

// Storage cleanup utilities
export class NotificationStorageCleanup {
  
  /**
   * Clean up old notification history entries
   * Keeps only the most recent entries per simulator
   */
  static cleanupHistory(history: NotificationHistory[], maxEntriesPerSimulator: number = 50): NotificationHistory[] {
    const simulatorGroups = new Map<string, NotificationHistory[]>();
    
    // Group by simulator
    history.forEach(entry => {
      if (!simulatorGroups.has(entry.simulatorId)) {
        simulatorGroups.set(entry.simulatorId, []);
      }
      simulatorGroups.get(entry.simulatorId)!.push(entry);
    });
    
    // Keep only recent entries per simulator
    const cleanedHistory: NotificationHistory[] = [];
    simulatorGroups.forEach(entries => {
      const sorted = entries.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      cleanedHistory.push(...sorted.slice(0, maxEntriesPerSimulator));
    });
    
    return cleanedHistory.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  /**
   * Clean up expired cooldown entries
   */
  static cleanupCooldowns(cooldowns: Record<string, string>, cooldownMinutes: number): Record<string, string> {
    const now = new Date();
    const cleanedCooldowns: Record<string, string> = {};
    
    Object.entries(cooldowns).forEach(([triggerId, timestamp]) => {
      const cooldownTime = new Date(timestamp);
      const minutesSince = (now.getTime() - cooldownTime.getTime()) / (1000 * 60);
      
      // Keep cooldown if it's still active
      if (minutesSince < cooldownMinutes) {
        cleanedCooldowns[triggerId] = timestamp;
      }
    });
    
    return cleanedCooldowns;
  }

  /**
   * Remove orphaned data (history entries for deleted triggers)
   */
  static removeOrphanedData(
    triggers: NotificationTrigger[], 
    history: NotificationHistory[], 
    cooldowns: Record<string, string>
  ): { history: NotificationHistory[]; cooldowns: Record<string, string> } {
    const triggerIds = new Set(triggers.map(t => t.id));
    
    // Filter history to only include entries for existing triggers
    const cleanedHistory = history.filter(h => triggerIds.has(h.triggerId));
    
    // Filter cooldowns to only include entries for existing triggers
    const cleanedCooldowns: Record<string, string> = {};
    Object.entries(cooldowns).forEach(([triggerId, timestamp]) => {
      if (triggerIds.has(triggerId)) {
        cleanedCooldowns[triggerId] = timestamp;
      }
    });
    
    return { history: cleanedHistory, cooldowns: cleanedCooldowns };
  }
}

// Storage migration utilities
export class NotificationStorageMigration {
  
  /**
   * Get current storage metadata
   */
  static getMetadata(): StorageMetadata {
    try {
      const metadataStr = localStorage.getItem(STORAGE_KEYS.METADATA);
      if (metadataStr) {
        return JSON.parse(metadataStr);
      }
    } catch (error) {
      console.warn('Failed to read storage metadata:', error);
    }
    
    // Return default metadata
    const now = new Date().toISOString();
    return {
      version: CURRENT_STORAGE_VERSION,
      createdAt: now,
      lastAccessed: now
    };
  }

  /**
   * Update storage metadata
   */
  static updateMetadata(updates: Partial<StorageMetadata>): void {
    const current = this.getMetadata();
    const updated = {
      ...current,
      ...updates,
      lastAccessed: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to update storage metadata:', error);
    }
  }

  /**
   * Check if migration is needed
   */
  static needsMigration(): boolean {
    const metadata = this.getMetadata();
    return metadata.version !== CURRENT_STORAGE_VERSION;
  }

  /**
   * Perform storage migration if needed
   */
  static async performMigration(): Promise<void> {
    if (!this.needsMigration()) {
      return;
    }

    const metadata = this.getMetadata();
    console.log(`Migrating notification storage from version ${metadata.version} to ${CURRENT_STORAGE_VERSION}`);
    
    try {
      // Future migration logic would go here
      // For now, just update the version
      this.updateMetadata({
        version: CURRENT_STORAGE_VERSION,
        lastMigration: new Date().toISOString()
      });
      
      console.log('Storage migration completed successfully');
    } catch (error) {
      console.error('Storage migration failed:', error);
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Storage health check utilities
export class NotificationStorageHealth {
  
  /**
   * Check storage health and return diagnostics
   */
  static checkHealth(): {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
    storageUsage: {
      triggers: number;
      history: number;
      totalSize: number;
    };
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        issues.push('localStorage is not available');
        return {
          isHealthy: false,
          issues,
          recommendations: ['Use a different storage backend'],
          storageUsage: { triggers: 0, history: 0, totalSize: 0 }
        };
      }

      // Check storage quota
      let totalSize = 0;
      let triggerCount = 0;
      let historyCount = 0;

      try {
        const triggersData = localStorage.getItem(STORAGE_KEYS.TRIGGERS);
        if (triggersData) {
          totalSize += triggersData.length;
          triggerCount = JSON.parse(triggersData).length;
        }

        const historyData = localStorage.getItem(STORAGE_KEYS.HISTORY);
        if (historyData) {
          totalSize += historyData.length;
          historyCount = JSON.parse(historyData).length;
        }

        // Check for large storage usage (>1MB)
        if (totalSize > 1024 * 1024) {
          issues.push('Storage usage is high (>1MB)');
          recommendations.push('Consider cleaning up old notification history');
        }

        // Check for too many history entries
        if (historyCount > 1000) {
          issues.push(`Too many history entries (${historyCount})`);
          recommendations.push('Clean up old notification history');
        }

      } catch (error) {
        issues.push('Failed to analyze storage data');
      }

      // Check for migration needs
      if (NotificationStorageMigration.needsMigration()) {
        issues.push('Storage migration is needed');
        recommendations.push('Run storage migration');
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        recommendations,
        storageUsage: {
          triggers: triggerCount,
          history: historyCount,
          totalSize
        }
      };

    } catch (error) {
      return {
        isHealthy: false,
        issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Check browser console for detailed errors'],
        storageUsage: { triggers: 0, history: 0, totalSize: 0 }
      };
    }
  }

  /**
   * Repair common storage issues
   */
  static async repairStorage(): Promise<{ success: boolean; message: string }> {
    try {
      const health = this.checkHealth();
      
      if (health.isHealthy) {
        return { success: true, message: 'Storage is already healthy' };
      }

      // Perform repairs based on issues
      if (health.issues.includes('Storage migration is needed')) {
        await NotificationStorageMigration.performMigration();
      }

      // Clean up if storage is too large
      if (health.storageUsage.totalSize > 1024 * 1024 || health.storageUsage.history > 1000) {
        const historyData = localStorage.getItem(STORAGE_KEYS.HISTORY);
        if (historyData) {
          const history = JSON.parse(historyData);
          const cleaned = NotificationStorageCleanup.cleanupHistory(history, 100);
          localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(cleaned));
        }
      }

      return { success: true, message: 'Storage repairs completed successfully' };
    } catch (error) {
      return { 
        success: false, 
        message: `Repair failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}