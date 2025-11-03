// Debug utility for testing trigger logic
import { notificationManager } from './notification-manager';

export async function debugTriggerLogic(simulatorId: string, testPercentages: number[]) {
  console.log(`🧪 [DEBUG] Testing trigger logic for simulator ${simulatorId}`);
  
  // Get all triggers for this simulator
  const triggers = await notificationManager.getTriggersBySimulator(simulatorId);
  console.log(`🧪 [DEBUG] Found ${triggers.length} triggers:`, triggers.map(t => ({
    id: t.id,
    threshold: t.thresholdPercentage,
    active: t.isActive,
    phone: t.phoneNumber
  })));
  
  // Test each percentage
  for (const percentage of testPercentages) {
    console.log(`\n🧪 [DEBUG] Testing percentage: ${percentage}%`);
    
    for (const trigger of triggers) {
      const shouldTrigger = percentage >= trigger.thresholdPercentage;
      console.log(`🧪 [DEBUG] Trigger ${trigger.id}: ${percentage}% >= ${trigger.thresholdPercentage}% = ${shouldTrigger}`);
    }
    
    // Actually test the trigger logic
    try {
      await notificationManager.checkThresholds(simulatorId, percentage);
    } catch (error) {
      console.error(`🧪 [DEBUG] Error testing ${percentage}%:`, error);
    }
  }
}

export async function resetTriggerHysteresis(triggerId: string) {
  console.log(`🧪 [DEBUG] Resetting hysteresis for trigger ${triggerId}`);
  const manager = notificationManager as any;
  if (manager.storage && manager.storage.setLastTriggerPercentage) {
    await manager.storage.setLastTriggerPercentage(triggerId, 0);
    console.log(`🧪 [DEBUG] Hysteresis reset complete`);
  } else {
    console.error(`🧪 [DEBUG] Cannot access storage methods`);
  }
}

export async function getTriggerDebugInfo(triggerId: string) {
  console.log(`🧪 [DEBUG] Getting debug info for trigger ${triggerId}`);
  const manager = notificationManager as any;
  
  if (manager.storage) {
    const trigger = await manager.storage.getTrigger(triggerId);
    const lastNotification = await manager.storage.getLastNotificationTime(triggerId);
    const lastPercentage = await manager.storage.getLastTriggerPercentage?.(triggerId);
    
    console.log(`🧪 [DEBUG] Trigger info:`, {
      trigger,
      lastNotification,
      lastPercentage
    });
    
    return { trigger, lastNotification, lastPercentage };
  }
  
  return null;
}

// Make these available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).debugTriggers = debugTriggerLogic;
  (window as any).resetTriggerHysteresis = resetTriggerHysteresis;
  (window as any).getTriggerDebugInfo = getTriggerDebugInfo;
  console.log('🧪 [DEBUG] Debug functions available: debugTriggers(), resetTriggerHysteresis(), getTriggerDebugInfo()');
}