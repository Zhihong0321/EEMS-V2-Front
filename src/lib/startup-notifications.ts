import { notificationManager } from './notification-manager';
import { sendWhatsAppMessage } from './whatsapp-api';
import { createNotificationHistory } from './notification-storage';
import { LocalStorageNotificationStorage } from './notification-storage';

export async function sendStartupNotifications(
  simulatorId: string,
  mode: "auto" | "manual",
  simulatorName?: string
): Promise<void> {
  console.log(`🚀 [STARTUP] Sending startup notifications for ${mode} mode on simulator ${simulatorId}`);
  
  try {
    // Get all active triggers for this simulator
    const activeTriggers = await notificationManager.getActiveTriggersBySimulator(simulatorId);
    
    if (activeTriggers.length === 0) {
      console.log(`🚀 [STARTUP] No active triggers found for simulator ${simulatorId}`);
      return;
    }

    console.log(`🚀 [STARTUP] Found ${activeTriggers.length} active triggers`);

    // Get simulator name if not provided
    const displayName = simulatorName || simulatorId;
    
    // Create startup message
    const message = createStartupMessage(displayName, mode);
    
    // Send notification to each unique phone number
    const uniquePhoneNumbers = [...new Set(activeTriggers.map(t => t.phoneNumber))];
    const storage = new LocalStorageNotificationStorage();
    
    for (const phoneNumber of uniquePhoneNumbers) {
      const triggersForPhone = activeTriggers.filter(t => t.phoneNumber === phoneNumber);
      let result: { success: boolean; error?: string } = { success: false, error: 'Unknown error' };
      
      try {
        console.log(`🚀 [STARTUP] Sending to ${phoneNumber}...`);
        
        // Send WhatsApp message
        result = await sendWhatsAppMessage({
          to: phoneNumber,
          message: message
        });
        
        console.log(`🚀 [STARTUP] ${result.success ? '✅ Sent' : '❌ Failed'} to ${phoneNumber}`);
        
      } catch (error) {
        console.error(`🚀 [STARTUP] Error sending to ${phoneNumber}:`, error);
        result = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error during startup notification'
        };
      }
      
      // ALWAYS log to history, regardless of success or failure
      try {
        for (const trigger of triggersForPhone) {
          const historyEntry = createNotificationHistory(
            trigger,
            0, // percentage (startup event)
            result.success,
            result.success ? undefined : result.error,
            'startup' // Add startup type
          );
          
          await storage.saveNotificationHistory(historyEntry);
        }
        console.log(`🚀 [STARTUP] History logged for ${triggersForPhone.length} triggers`);
      } catch (historyError) {
        console.error(`🚀 [STARTUP] Failed to log history for ${phoneNumber}:`, historyError);
        // Continue processing other phone numbers even if history logging fails
      }
    }
    
    console.log(`🚀 [STARTUP] Startup notifications completed for ${uniquePhoneNumbers.length} phone numbers`);
    
  } catch (error) {
    console.error('🚀 [STARTUP] Error in sendStartupNotifications:', error);
  }
}

function createStartupMessage(simulatorName: string, mode: "auto" | "manual"): string {
  const timestamp = new Date().toLocaleString();
  const modeDisplay = mode === "auto" ? "Auto Run" : "Manual Run";
  
  return `🚀 EMS Simulator Started!

Simulator: ${simulatorName}
Mode: ${modeDisplay}
Started: ${timestamp}

Your energy simulator is now running and generating data. You'll receive threshold alerts as configured.

Happy monitoring! 📊⚡`;
}