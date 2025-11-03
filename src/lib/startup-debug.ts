// Debug utilities for startup notifications
import { notificationManager } from './notification-manager';

export async function debugStartupNotifications(simulatorId: string): Promise<void> {
  console.log(`🔍 [DEBUG] Starting startup notification debug for simulator: "${simulatorId}"`);
  
  try {
    // Step 1: Check if notification manager is available
    console.log(`🔍 [DEBUG] Step 1: NotificationManager available:`, !!notificationManager);
    
    // Step 2: Get all triggers for this simulator
    console.log(`🔍 [DEBUG] Step 2: Getting all triggers for simulator "${simulatorId}"`);
    const allTriggers = await notificationManager.getTriggersBySimulator(simulatorId);
    console.log(`🔍 [DEBUG] All triggers found:`, allTriggers.length, allTriggers);
    
    // Step 3: Get active triggers
    console.log(`🔍 [DEBUG] Step 3: Getting active triggers for simulator "${simulatorId}"`);
    const activeTriggers = await notificationManager.getActiveTriggersBySimulator(simulatorId);
    console.log(`🔍 [DEBUG] Active triggers found:`, activeTriggers.length, activeTriggers);
    
    // Step 4: Check WhatsApp API
    console.log(`🔍 [DEBUG] Step 4: Checking WhatsApp API status`);
    const { getWhatsAppStatus } = await import('./whatsapp-api');
    const whatsappStatus = await getWhatsAppStatus();
    console.log(`🔍 [DEBUG] WhatsApp status:`, whatsappStatus);
    
    // Step 5: Test startup notification function
    if (activeTriggers.length > 0) {
      console.log(`🔍 [DEBUG] Step 5: Testing startup notifications...`);
      const { sendStartupNotifications } = await import('./startup-notifications');
      await sendStartupNotifications(simulatorId, 'auto', 'Debug Test Simulator');
      console.log(`🔍 [DEBUG] Startup notifications test completed`);
    } else {
      console.log(`🔍 [DEBUG] Step 5: Skipping startup notifications test - no active triggers`);
    }
    
    // Step 6: Check notification history
    console.log(`🔍 [DEBUG] Step 6: Checking notification history`);
    const history = await notificationManager.getNotificationHistory(simulatorId, 10);
    console.log(`🔍 [DEBUG] Recent history:`, history);
    
  } catch (error) {
    console.error(`🔍 [DEBUG] Error during debug:`, error);
  }
}

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).debugStartupNotifications = debugStartupNotifications;
  console.log('🔍 [DEBUG] Debug function available: debugStartupNotifications(simulatorId)');
}