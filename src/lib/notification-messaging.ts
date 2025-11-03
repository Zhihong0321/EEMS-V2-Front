import { NotificationTrigger, Simulator, LatestBlock } from './types';

// Message template types
export type MessageTemplate = {
  id: string;
  name: string;
  template: string;
  variables: string[];
};

export type MessageContext = {
  simulatorName: string;
  simulatorId: string;
  currentPercentage: number;
  thresholdPercentage: number;
  targetKwh: number;
  accumulatedKwh: number;
  timestamp: Date;
  phoneNumber: string;
  blockStartTime?: string;
};

// Default message templates
export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'default',
    name: 'Default Alert',
    template: `🚨 EMS Alert: {{simulatorName}}

Current Usage: {{currentPercentage}}% of target
Threshold: {{thresholdPercentage}}%
Target: {{targetKwh}} kWh
Current: {{accumulatedKwh}} kWh

Time: {{timestamp}}

Please check your energy consumption and take appropriate action.`,
    variables: ['simulatorName', 'currentPercentage', 'thresholdPercentage', 'targetKwh', 'accumulatedKwh', 'timestamp']
  },
  {
    id: 'simple',
    name: 'Simple Alert',
    template: `⚡ {{simulatorName}}: {{currentPercentage}}% usage (threshold: {{thresholdPercentage}}%)`,
    variables: ['simulatorName', 'currentPercentage', 'thresholdPercentage']
  },
  {
    id: 'detailed',
    name: 'Detailed Alert',
    template: `🚨 ENERGY ALERT 🚨

Facility: {{simulatorName}}
Alert Time: {{timestamp}}

USAGE DETAILS:
• Current: {{accumulatedKwh}} kWh ({{currentPercentage}}%)
• Target: {{targetKwh}} kWh
• Threshold: {{thresholdPercentage}}%
• Block Start: {{blockStartTime}}

STATUS: THRESHOLD EXCEEDED
Action required to prevent overconsumption.`,
    variables: ['simulatorName', 'timestamp', 'accumulatedKwh', 'currentPercentage', 'targetKwh', 'thresholdPercentage', 'blockStartTime']
  },
  {
    id: 'urgent',
    name: 'Urgent Alert',
    template: `🔴 URGENT: {{simulatorName}} at {{currentPercentage}}%!

Immediate action required.
Target: {{targetKwh}} kWh
Current: {{accumulatedKwh}} kWh

Contact facility manager immediately.`,
    variables: ['simulatorName', 'currentPercentage', 'targetKwh', 'accumulatedKwh']
  }
];

export class NotificationMessageFormatter {
  private templates: Map<string, MessageTemplate>;

  constructor(customTemplates?: MessageTemplate[]) {
    this.templates = new Map();
    
    // Load default templates
    DEFAULT_MESSAGE_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
    
    // Add custom templates
    if (customTemplates) {
      customTemplates.forEach(template => {
        this.templates.set(template.id, template);
      });
    }
  }

  /**
   * Format a notification message using the specified template
   */
  formatMessage(
    templateId: string,
    context: MessageContext
  ): string {
    const template = this.templates.get(templateId);
    if (!template) {
      // Fall back to default template
      return this.formatMessage('default', context);
    }

    let message = template.template;
    
    // Replace template variables
    const replacements: Record<string, string> = {
      simulatorName: context.simulatorName,
      simulatorId: context.simulatorId,
      currentPercentage: context.currentPercentage.toFixed(1),
      thresholdPercentage: context.thresholdPercentage.toString(),
      targetKwh: context.targetKwh.toFixed(1),
      accumulatedKwh: context.accumulatedKwh.toFixed(2),
      timestamp: context.timestamp.toLocaleString(),
      phoneNumber: context.phoneNumber,
      blockStartTime: context.blockStartTime || 'N/A'
    };

    // Replace all variables in the template
    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, value);
    });

    return message;
  }

  /**
   * Create message context from simulator data and trigger
   */
  static createMessageContext(
    simulator: Simulator,
    trigger: NotificationTrigger,
    currentPercentage: number,
    latestBlock?: LatestBlock
  ): MessageContext {
    return {
      simulatorName: simulator.name,
      simulatorId: simulator.id,
      currentPercentage,
      thresholdPercentage: trigger.thresholdPercentage,
      targetKwh: simulator.target_kwh,
      accumulatedKwh: latestBlock?.accumulated_kwh || 0,
      timestamp: new Date(),
      phoneNumber: trigger.phoneNumber,
      blockStartTime: latestBlock?.block_start_local
    };
  }

  /**
   * Get available templates
   */
  getTemplates(): MessageTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add or update a custom template
   */
  addTemplate(template: MessageTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Remove a custom template (cannot remove default templates)
   */
  removeTemplate(templateId: string): boolean {
    const defaultIds = DEFAULT_MESSAGE_TEMPLATES.map(t => t.id);
    if (defaultIds.includes(templateId)) {
      return false; // Cannot remove default templates
    }
    
    return this.templates.delete(templateId);
  }

  /**
   * Validate template syntax
   */
  validateTemplate(template: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for unmatched braces
    const openBraces = (template.match(/{{/g) || []).length;
    const closeBraces = (template.match(/}}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Unmatched template braces');
    }
    
    // Extract variables
    const variableMatches = template.match(/{{(\w+)}}/g);
    if (variableMatches) {
      const variables = variableMatches.map(match => match.slice(2, -2));
      const validVariables = DEFAULT_MESSAGE_TEMPLATES[0].variables;
      
      // Check for invalid variables
      const invalidVariables = variables.filter(v => !validVariables.includes(v));
      if (invalidVariables.length > 0) {
        errors.push(`Invalid variables: ${invalidVariables.join(', ')}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Threshold monitoring utilities
export class ThresholdMonitor {
  private lastCheckedPercentages: Map<string, number> = new Map();
  private thresholdCrossings: Map<string, Date> = new Map();

  /**
   * Check if a threshold crossing should trigger a notification
   * Implements hysteresis to prevent rapid firing
   */
  shouldTriggerNotification(
    simulatorId: string,
    currentPercentage: number,
    thresholdPercentage: number,
    hysteresisPercentage: number = 2
  ): boolean {
    const lastPercentage = this.lastCheckedPercentages.get(simulatorId) || 0;
    const lastCrossing = this.thresholdCrossings.get(simulatorId);
    
    // Update last checked percentage
    this.lastCheckedPercentages.set(simulatorId, currentPercentage);
    
    // Check if we're crossing the threshold upward
    const crossingUpward = lastPercentage < thresholdPercentage && currentPercentage >= thresholdPercentage;
    
    // Check if we're well above threshold (for continued notifications)
    const wellAboveThreshold = currentPercentage >= (thresholdPercentage + hysteresisPercentage);
    
    // Check if enough time has passed since last crossing (prevent rapid firing)
    const now = new Date();
    const timeSinceLastCrossing = lastCrossing ? (now.getTime() - lastCrossing.getTime()) / 1000 : Infinity;
    const minTimeBetweenCrossings = 300; // 5 minutes
    
    if (crossingUpward || (wellAboveThreshold && timeSinceLastCrossing > minTimeBetweenCrossings)) {
      this.thresholdCrossings.set(simulatorId, now);
      return true;
    }
    
    return false;
  }

  /**
   * Get threshold crossing history for debugging
   */
  getThresholdCrossings(): Map<string, Date> {
    return new Map(this.thresholdCrossings);
  }

  /**
   * Clear threshold crossing history for a simulator
   */
  clearHistory(simulatorId: string): void {
    this.lastCheckedPercentages.delete(simulatorId);
    this.thresholdCrossings.delete(simulatorId);
  }

  /**
   * Clear all threshold crossing history
   */
  clearAllHistory(): void {
    this.lastCheckedPercentages.clear();
    this.thresholdCrossings.clear();
  }
}

// Rate limiting utilities
export class NotificationRateLimiter {
  private notificationCounts: Map<string, { count: number; resetTime: Date }> = new Map();
  private cooldowns: Map<string, Date> = new Map();

  /**
   * Check if a notification can be sent based on rate limits
   */
  canSendNotification(
    triggerId: string,
    maxPerHour: number = 4,
    cooldownMinutes: number = 15
  ): { canSend: boolean; reason?: string; waitTime?: number } {
    const now = new Date();
    
    // Check cooldown
    const lastNotification = this.cooldowns.get(triggerId);
    if (lastNotification) {
      const minutesSince = (now.getTime() - lastNotification.getTime()) / (1000 * 60);
      if (minutesSince < cooldownMinutes) {
        return {
          canSend: false,
          reason: 'Cooldown period active',
          waitTime: Math.ceil(cooldownMinutes - minutesSince)
        };
      }
    }
    
    // Check hourly rate limit
    const hourlyData = this.notificationCounts.get(triggerId);
    if (hourlyData) {
      // Reset counter if an hour has passed
      if (now > hourlyData.resetTime) {
        this.notificationCounts.set(triggerId, {
          count: 0,
          resetTime: new Date(now.getTime() + 60 * 60 * 1000) // Next hour
        });
      } else if (hourlyData.count >= maxPerHour) {
        const minutesUntilReset = (hourlyData.resetTime.getTime() - now.getTime()) / (1000 * 60);
        return {
          canSend: false,
          reason: 'Hourly rate limit exceeded',
          waitTime: Math.ceil(minutesUntilReset)
        };
      }
    }
    
    return { canSend: true };
  }

  /**
   * Record a notification being sent
   */
  recordNotification(triggerId: string): void {
    const now = new Date();
    
    // Update cooldown
    this.cooldowns.set(triggerId, now);
    
    // Update hourly counter
    const hourlyData = this.notificationCounts.get(triggerId);
    if (hourlyData && now <= hourlyData.resetTime) {
      hourlyData.count++;
    } else {
      this.notificationCounts.set(triggerId, {
        count: 1,
        resetTime: new Date(now.getTime() + 60 * 60 * 1000)
      });
    }
  }

  /**
   * Get rate limiting status for debugging
   */
  getRateLimitStatus(triggerId: string): {
    hourlyCount: number;
    hourlyLimit: number;
    resetTime: Date | null;
    lastNotification: Date | null;
  } {
    const hourlyData = this.notificationCounts.get(triggerId);
    const lastNotification = this.cooldowns.get(triggerId);
    
    return {
      hourlyCount: hourlyData?.count || 0,
      hourlyLimit: 4, // Default limit
      resetTime: hourlyData?.resetTime || null,
      lastNotification: lastNotification || null
    };
  }

  /**
   * Clear rate limiting data for a trigger
   */
  clearTriggerData(triggerId: string): void {
    this.notificationCounts.delete(triggerId);
    this.cooldowns.delete(triggerId);
  }
}

// Default instances
export const messageFormatter = new NotificationMessageFormatter();
export const thresholdMonitor = new ThresholdMonitor();
export const rateLimiter = new NotificationRateLimiter();