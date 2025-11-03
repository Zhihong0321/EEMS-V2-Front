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

export async function diagnoseNotificationSystem(simulatorId: string) {
  console.log(`🔍 [DIAGNOSE] Starting notification system diagnosis for ${simulatorId}`);
  
  try {
    // 1. Check if notification manager is available
    console.log(`🔍 [DIAGNOSE] NotificationManager available:`, !!notificationManager);
    
    // 2. Check global settings
    const settings = await notificationManager.getSettings();
    console.log(`🔍 [DIAGNOSE] Global settings:`, settings);
    
    // 3. Check triggers for this simulator
    const allTriggers = await notificationManager.getTriggersBySimulator(simulatorId);
    const activeTriggers = await notificationManager.getActiveTriggersBySimulator(simulatorId);
    console.log(`🔍 [DIAGNOSE] Total triggers: ${allTriggers.length}, Active triggers: ${activeTriggers.length}`);
    console.log(`🔍 [DIAGNOSE] Triggers:`, allTriggers);
    
    // 4. Check WhatsApp API status
    const { getWhatsAppStatus } = await import('./whatsapp-api');
    const whatsappStatus = await getWhatsAppStatus();
    console.log(`🔍 [DIAGNOSE] WhatsApp API status:`, whatsappStatus);
    
    // 5. Test a manual threshold check
    console.log(`🔍 [DIAGNOSE] Testing manual threshold check at 10%...`);
    await notificationManager.checkThresholds(simulatorId, 10);
    
    // 6. Get system status
    const systemStatus = await notificationManager.getSystemStatus();
    console.log(`🔍 [DIAGNOSE] System status:`, systemStatus);
    
    return {
      notificationManagerAvailable: !!notificationManager,
      settings,
      totalTriggers: allTriggers.length,
      activeTriggers: activeTriggers.length,
      triggers: allTriggers,
      whatsappStatus,
      systemStatus
    };
    
  } catch (error) {
    console.error(`🔍 [DIAGNOSE] Error during diagnosis:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Make these available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).debugTriggers = debugTriggerLogic;
  (window as any).resetTriggerHysteresis = resetTriggerHysteresis;
  (window as any).getTriggerDebugInfo = getTriggerDebugInfo;
  (window as any).diagnoseNotificationSystem = diagnoseNotificationSystem;
  console.log('🧪 [DEBUG] Debug functions available: debugTriggers(), resetTriggerHysteresis(), getTriggerDebugInfo(), diagnoseNotificationSystem()');
}