import { SseEvent, LatestBlock, Simulator } from './types';
import { NotificationManager } from './notification-manager';
import { 
  messageFormatter, 
  thresholdMonitor, 
  rateLimiter,
  NotificationMessageFormatter 
} from './notification-messaging';

export type MonitoringConfig = {
  enableRealTimeMonitoring: boolean;
  hysteresisPercentage: number;
  maxNotificationsPerHour: number;
  cooldownMinutes: number;
  messageTemplateId: string;
};

const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enableRealTimeMonitoring: true,
  hysteresisPercentage: 2,
  maxNotificationsPerHour: 4,
  cooldownMinutes: 15,
  messageTemplateId: 'default'
};

export class NotificationMonitor {
  private notificationManager: NotificationManager;
  private config: MonitoringConfig;
  private isMonitoring: boolean = false;
  private simulatorCache: Map<string, Simulator> = new Map();

  constructor(
    notificationManager: NotificationManager,
    config: Partial<MonitoringConfig> = {}
  ) {
    this.notificationManager = notificationManager;
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(): void {
    this.isMonitoring = true;
    console.log('Notification monitoring started');
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Notification monitoring stopped');
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Process SSE events for threshold monitoring
   * This should be called from your existing SSE event handler
   */
  async processSSEEvent(event: SseEvent, simulatorId?: string): Promise<void> {
    if (!this.isMonitoring || !this.config.enableRealTimeMonitoring) {
      return;
    }

    try {
      switch (event.type) {
        case 'block-update':
          if (simulatorId && event.percent_of_target !== undefined) {
            await this.handleBlockUpdate(simulatorId, event.percent_of_target, event);
          }
          break;
        
        case 'alert-80pct':
          // Handle existing 80% alerts - we can enhance these with our notification system
          if (simulatorId) {
            await this.handleLegacyAlert(simulatorId, 80, event.message);
          }
          break;
        
        default:
          // Ignore other event types
          break;
      }
    } catch (error) {
      console.error('Error processing SSE event for notifications:', error);
    }
  }

  /**
   * Handle block update events
   */
  private async handleBlockUpdate(
    simulatorId: string,
    currentPercentage: number,
    event: Extract<SseEvent, { type: 'block-update' }>
  ): Promise<void> {
    try {
      // Get active triggers for this simulator
      const activeTriggers = await this.notificationManager.getActiveTriggersBySimulator(simulatorId);
      
      if (activeTriggers.length === 0) {
        return; // No triggers to check
      }

      // Check each trigger
      for (const trigger of activeTriggers) {
        await this.checkTriggerThreshold(
          simulatorId,
          trigger.id,
          currentPercentage,
          trigger.thresholdPercentage,
          event
        );
      }
    } catch (error) {
      console.error(`Error handling block update for simulator ${simulatorId}:`, error);
    }
  }

  /**
   * Check if a specific trigger threshold should fire
   */
  private async checkTriggerThreshold(
    simulatorId: string,
    triggerId: string,
    currentPercentage: number,
    thresholdPercentage: number,
    blockData: Extract<SseEvent, { type: 'block-update' }>
  ): Promise<void> {
    try {
      // Use threshold monitor to check if we should trigger (with hysteresis)
      const shouldTrigger = thresholdMonitor.shouldTriggerNotification(
        `${simulatorId}-${triggerId}`,
        currentPercentage,
        thresholdPercentage,
        this.config.hysteresisPercentage
      );

      if (!shouldTrigger) {
        return;
      }

      // Check rate limiting
      const rateLimitCheck = rateLimiter.canSendNotification(
        triggerId,
        this.config.maxNotificationsPerHour,
        this.config.cooldownMinutes
      );

      if (!rateLimitCheck.canSend) {
        console.log(`Rate limit prevents notification for trigger ${triggerId}: ${rateLimitCheck.reason}`);
        return;
      }

      // Get trigger and simulator details
      const [trigger, simulator] = await Promise.all([
        this.notificationManager.getTrigger(triggerId),
        this.getSimulator(simulatorId)
      ]);

      if (!trigger || !simulator) {
        console.error(`Missing trigger or simulator data for ${triggerId}/${simulatorId}`);
        return;
      }

      // Send enhanced notification
      const success = await this.sendEnhancedNotification(
        trigger,
        simulator,
        currentPercentage,
        blockData
      );

      if (success) {
        // Record the notification in rate limiter
        rateLimiter.recordNotification(triggerId);
        console.log(`Notification sent successfully for trigger ${triggerId}`);
      } else {
        console.error(`Failed to send notification for trigger ${triggerId}`);
      }

    } catch (error) {
      console.error(`Error checking trigger threshold ${triggerId}:`, error);
    }
  }

  /**
   * Send enhanced notification with better formatting
   */
  private async sendEnhancedNotification(
    trigger: any,
    simulator: Simulator,
    currentPercentage: number,
    blockData: Extract<SseEvent, { type: 'block-update' }>
  ): Promise<boolean> {
    try {
      // Create message context with block data
      const messageContext = NotificationMessageFormatter.createMessageContext(
        simulator,
        trigger,
        currentPercentage,
        {
          simulator_id: simulator.id,
          block_start_local: blockData.block_start_local || '',
          block_start_utc: '',
          block_end_utc: '',
          target_kwh: simulator.target_kwh,
          accumulated_kwh: blockData.accumulated_kwh,
          percent_of_target: currentPercentage,
          alerted_80pct: false,
          chart_bins: blockData.chart_bins || { bin_seconds: 0, points: [] }
        }
      );

      // Format message using configured template
      const message = messageFormatter.formatMessage(
        this.config.messageTemplateId,
        messageContext
      );

      // Send via notification manager with custom message
      return await this.sendCustomMessage(trigger.phoneNumber, message);

    } catch (error) {
      console.error('Error sending enhanced notification:', error);
      return false;
    }
  }

  /**
   * Send custom message via WhatsApp API
   */
  private async sendCustomMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Import WhatsApp API here to avoid circular dependencies
      const { sendWhatsAppMessage, getWhatsAppStatus } = await import('./whatsapp-api');
      
      // Check API status
      const status = await getWhatsAppStatus();
      if (!status.ready) {
        throw new Error('WhatsApp API is not ready');
      }

      // Send message
      const result = await sendWhatsAppMessage({
        to: phoneNumber,
        message: message
      });

      return result.success;
    } catch (error) {
      console.error('Error sending custom message:', error);
      return false;
    }
  }

  /**
   * Handle legacy 80% alerts
   */
  private async handleLegacyAlert(
    simulatorId: string,
    percentage: number,
    message: string
  ): Promise<void> {
    // This can be used to integrate with existing alert system
    console.log(`Legacy alert for ${simulatorId}: ${message}`);
    
    // Optionally trigger our notification system for 80% alerts
    // if users have triggers set at or below 80%
    await this.handleBlockUpdate(simulatorId, percentage, {
      type: 'block-update',
      accumulated_kwh: 0, // We don't have this data from legacy alerts
      percent_of_target: percentage
    });
  }

  /**
   * Get simulator data (with caching)
   */
  private async getSimulator(simulatorId: string): Promise<Simulator | null> {
    // Check cache first
    if (this.simulatorCache.has(simulatorId)) {
      return this.simulatorCache.get(simulatorId)!;
    }

    try {
      // This would need to be implemented based on your existing simulator API
      // For now, return a mock simulator
      const simulator: Simulator = {
        id: simulatorId,
        name: `Simulator ${simulatorId}`,
        target_kwh: 100, // Default value
        whatsapp_number: null
      };
      
      // Cache the result
      this.simulatorCache.set(simulatorId, simulator);
      return simulator;
    } catch (error) {
      console.error(`Error fetching simulator ${simulatorId}:`, error);
      return null;
    }
  }

  /**
   * Update simulator cache
   */
  updateSimulatorCache(simulator: Simulator): void {
    this.simulatorCache.set(simulator.id, simulator);
  }

  /**
   * Clear simulator cache
   */
  clearSimulatorCache(): void {
    this.simulatorCache.clear();
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    isMonitoring: boolean;
    config: MonitoringConfig;
    cachedSimulators: number;
    thresholdCrossings: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      config: this.config,
      cachedSimulators: this.simulatorCache.size,
      thresholdCrossings: thresholdMonitor.getThresholdCrossings().size
    };
  }

  /**
   * Manual threshold check (for testing or manual triggers)
   */
  async manualThresholdCheck(simulatorId: string, currentPercentage: number): Promise<void> {
    await this.handleBlockUpdate(simulatorId, currentPercentage, {
      type: 'block-update',
      accumulated_kwh: 0,
      percent_of_target: currentPercentage
    });
  }
}

// Default monitor instance
export const notificationMonitor = new NotificationMonitor(
  // This will be injected when the notification manager is available
  {} as NotificationManager
);