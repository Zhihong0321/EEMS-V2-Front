import { 
  NotificationTrigger, 
  NotificationHistory, 
  NotificationSettings,
  NotificationError,
  CreateNotificationTriggerInput,
  UpdateNotificationTriggerInput
} from './types';

// Storage interface defining all notification storage operations
export interface NotificationStorage {
  // Trigger CRUD operations
  saveTrigger(trigger: NotificationTrigger): Promise<void>;
  getTrigger(id: string): Promise<NotificationTrigger | null>;
  getTriggersBySimulator(simulatorId: string): Promise<NotificationTrigger[]>;
  getAllTriggers(): Promise<NotificationTrigger[]>;
  updateTrigger(id: string, updates: Partial<NotificationTrigger>): Promise<void>;
  deleteTrigger(id: string): Promise<void>;
  
  // History tracking
  saveNotificationHistory(history: NotificationHistory): Promise<void>;
  getNotificationHistory(simulatorId: string, limit?: number): Promise<NotificationHistory[]>;
  getAllNotificationHistory(limit?: number): Promise<NotificationHistory[]>;
  
  // Settings management
  getSettings(): Promise<NotificationSettings>;
  updateSettings(settings: Partial<NotificationSettings>): Promise<void>;
  
  // Cooldown tracking
  getLastNotificationTime(triggerId: string): Promise<Date | null>;
  setLastNotificationTime(triggerId: string, time: Date): Promise<void>;
  
  // Utility methods
  clearAllData(): Promise<void>;
  exportData(): Promise<string>;
  importData(data: string): Promise<void>;
}

// Storage keys for localStorage
const STORAGE_KEYS = {
  TRIGGERS: 'notification_triggers',
  HISTORY: 'notification_history',
  SETTINGS: 'notification_settings',
  COOLDOWNS: 'notification_cooldowns'
} as const;

// Default settings
const DEFAULT_SETTINGS: NotificationSettings = {
  cooldownMinutes: 15,
  maxDailyNotifications: 10,
  enabledGlobally: true
};

// localStorage implementation of NotificationStorage
export class LocalStorageNotificationStorage implements NotificationStorage {
  
  // Helper method to safely parse JSON from localStorage
  private safeParseJSON<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error parsing localStorage item ${key}:`, error);
      return defaultValue;
    }
  }

  // Helper method to safely save JSON to localStorage
  private safeSaveJSON(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to localStorage ${key}:`, error);
      throw new Error(`Storage error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate unique ID for triggers and history
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Trigger CRUD operations
  async saveTrigger(trigger: NotificationTrigger): Promise<void> {
    const triggers = this.safeParseJSON<NotificationTrigger[]>(STORAGE_KEYS.TRIGGERS, []);
    
    // Check for duplicate (same simulator + phone + threshold)
    const duplicate = triggers.find(t => 
      t.simulatorId === trigger.simulatorId &&
      t.phoneNumber === trigger.phoneNumber &&
      t.thresholdPercentage === trigger.thresholdPercentage &&
      t.id !== trigger.id
    );
    
    if (duplicate) {
      throw new Error('A trigger with the same simulator, phone number, and threshold already exists');
    }
    
    // Add or update trigger
    const existingIndex = triggers.findIndex(t => t.id === trigger.id);
    if (existingIndex >= 0) {
      triggers[existingIndex] = trigger;
    } else {
      triggers.push(trigger);
    }
    
    this.safeSaveJSON(STORAGE_KEYS.TRIGGERS, triggers);
  }

  async getTrigger(id: string): Promise<NotificationTrigger | null> {
    const triggers = this.safeParseJSON<NotificationTrigger[]>(STORAGE_KEYS.TRIGGERS, []);
    return triggers.find(t => t.id === id) || null;
  }

  async getTriggersBySimulator(simulatorId: string): Promise<NotificationTrigger[]> {
    const triggers = this.safeParseJSON<NotificationTrigger[]>(STORAGE_KEYS.TRIGGERS, []);
    return triggers.filter(t => t.simulatorId === simulatorId);
  }

  async getAllTriggers(): Promise<NotificationTrigger[]> {
    return this.safeParseJSON<NotificationTrigger[]>(STORAGE_KEYS.TRIGGERS, []);
  }

  async updateTrigger(id: string, updates: Partial<NotificationTrigger>): Promise<void> {
    const triggers = this.safeParseJSON<NotificationTrigger[]>(STORAGE_KEYS.TRIGGERS, []);
    const index = triggers.findIndex(t => t.id === id);
    
    if (index === -1) {
      throw new Error(`Trigger with id ${id} not found`);
    }
    
    // Update the trigger with new values and updated timestamp
    triggers[index] = {
      ...triggers[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.safeSaveJSON(STORAGE_KEYS.TRIGGERS, triggers);
  }

  async deleteTrigger(id: string): Promise<void> {
    const triggers = this.safeParseJSON<NotificationTrigger[]>(STORAGE_KEYS.TRIGGERS, []);
    const filteredTriggers = triggers.filter(t => t.id !== id);
    
    if (triggers.length === filteredTriggers.length) {
      throw new Error(`Trigger with id ${id} not found`);
    }
    
    this.safeSaveJSON(STORAGE_KEYS.TRIGGERS, filteredTriggers);
    
    // Also clean up related cooldown data
    const cooldowns = this.safeParseJSON<Record<string, string>>(STORAGE_KEYS.COOLDOWNS, {});
    delete cooldowns[id];
    this.safeSaveJSON(STORAGE_KEYS.COOLDOWNS, cooldowns);
  }

  // History tracking
  async saveNotificationHistory(history: NotificationHistory): Promise<void> {
    const historyList = this.safeParseJSON<NotificationHistory[]>(STORAGE_KEYS.HISTORY, []);
    historyList.push(history);
    
    // Keep only the last 1000 entries to prevent storage bloat
    if (historyList.length > 1000) {
      historyList.splice(0, historyList.length - 1000);
    }
    
    this.safeSaveJSON(STORAGE_KEYS.HISTORY, historyList);
  }

  async getNotificationHistory(simulatorId: string, limit: number = 100): Promise<NotificationHistory[]> {
    const historyList = this.safeParseJSON<NotificationHistory[]>(STORAGE_KEYS.HISTORY, []);
    const filtered = historyList
      .filter(h => h.simulatorId === simulatorId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, limit);
    
    return filtered;
  }

  async getAllNotificationHistory(limit: number = 100): Promise<NotificationHistory[]> {
    const historyList = this.safeParseJSON<NotificationHistory[]>(STORAGE_KEYS.HISTORY, []);
    return historyList
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, limit);
  }

  // Settings management
  async getSettings(): Promise<NotificationSettings> {
    return this.safeParseJSON<NotificationSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    this.safeSaveJSON(STORAGE_KEYS.SETTINGS, updatedSettings);
  }

  // Cooldown tracking
  async getLastNotificationTime(triggerId: string): Promise<Date | null> {
    const cooldowns = this.safeParseJSON<Record<string, string>>(STORAGE_KEYS.COOLDOWNS, {});
    const timestamp = cooldowns[triggerId];
    return timestamp ? new Date(timestamp) : null;
  }

  async setLastNotificationTime(triggerId: string, time: Date): Promise<void> {
    const cooldowns = this.safeParseJSON<Record<string, string>>(STORAGE_KEYS.COOLDOWNS, {});
    cooldowns[triggerId] = time.toISOString();
    this.safeSaveJSON(STORAGE_KEYS.COOLDOWNS, cooldowns);
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  async exportData(): Promise<string> {
    const data = {
      triggers: this.safeParseJSON<NotificationTrigger[]>(STORAGE_KEYS.TRIGGERS, []),
      history: this.safeParseJSON<NotificationHistory[]>(STORAGE_KEYS.HISTORY, []),
      settings: this.safeParseJSON<NotificationSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
      cooldowns: this.safeParseJSON<Record<string, string>>(STORAGE_KEYS.COOLDOWNS, {}),
      exportedAt: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  async importData(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.triggers) {
        this.safeSaveJSON(STORAGE_KEYS.TRIGGERS, parsed.triggers);
      }
      if (parsed.history) {
        this.safeSaveJSON(STORAGE_KEYS.HISTORY, parsed.history);
      }
      if (parsed.settings) {
        this.safeSaveJSON(STORAGE_KEYS.SETTINGS, parsed.settings);
      }
      if (parsed.cooldowns) {
        this.safeSaveJSON(STORAGE_KEYS.COOLDOWNS, parsed.cooldowns);
      }
    } catch (error) {
      throw new Error(`Invalid import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Helper functions for creating triggers with proper IDs and timestamps
export function createNotificationTrigger(input: CreateNotificationTriggerInput): NotificationTrigger {
  const now = new Date().toISOString();
  return {
    id: `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
    ...input
  };
}

export function createNotificationHistory(
  trigger: NotificationTrigger,
  actualPercentage: number,
  success: boolean,
  errorMessage?: string
): NotificationHistory {
  return {
    id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    triggerId: trigger.id,
    simulatorId: trigger.simulatorId,
    phoneNumber: trigger.phoneNumber,
    thresholdPercentage: trigger.thresholdPercentage,
    actualPercentage,
    sentAt: new Date().toISOString(),
    success,
    errorMessage
  };
}

// Default storage instance
export const notificationStorage = new LocalStorageNotificationStorage();