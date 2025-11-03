// Simple startup test to verify WhatsApp notifications work
import { sendWhatsAppMessage, getWhatsAppStatus } from './whatsapp-api';

export async function sendStartupNotification(phoneNumber: string, simulatorId: string): Promise<boolean> {
  console.log('🚀 [STARTUP] Testing WhatsApp notification...');
  
  try {
    // Check if WhatsApp is ready
    const status = await getWhatsAppStatus();
    console.log('🚀 [STARTUP] WhatsApp status:', status);
    
    if (!status.ready) {
      console.error('🚀 [STARTUP] WhatsApp not ready!');
      return false;
    }
    
    // Send simple test message
    const message = `🚀 EMS Notification System Started

Simulator: ${simulatorId}
Time: ${new Date().toLocaleString()}

This is a startup test. If you receive this, notifications are working! 🎉`;

    const result = await sendWhatsAppMessage({
      to: phoneNumber,
      message: message
    });
    
    console.log('🚀 [STARTUP] Send result:', result);
    return result.success;
    
  } catch (error) {
    console.error('🚀 [STARTUP] Error:', error);
    return false;
  }
}

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).testStartupNotification = sendStartupNotification;
  console.log('🚀 [STARTUP] Test function available: testStartupNotification(phoneNumber, simulatorId)');
}