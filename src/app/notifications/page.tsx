"use client";

import { useState, useEffect } from 'react';
import { NotificationManager } from '@/components/notifications';
import { getSimulators } from '@/lib/api';
import type { Simulator } from '@/lib/types';
import { Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BellIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NotificationsPage() {
  const [simulators, setSimulators] = useState<Simulator[]>([]);
  const [selectedSimulatorId, setSelectedSimulatorId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSimulators();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSimulators = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSimulators();
      setSimulators(data);
      
      // Auto-select first simulator if available
      if (data.length > 0 && !selectedSimulatorId) {
        setSelectedSimulatorId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading simulators:', err);
      setError(err instanceof Error ? err.message : 'Failed to load simulators');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSimulator = simulators.find(s => s.id === selectedSimulatorId);

  const handleDebugNotifications = async () => {
    if (!selectedSimulatorId) {
      console.error('No simulator selected for debugging');
      return;
    }
    
    console.log('🔍 [DEBUG] Starting notification system diagnosis...');
    
    // Import the debug function
    const { diagnoseNotificationSystem } = await import('@/lib/debug-triggers');
    const result = await diagnoseNotificationSystem(selectedSimulatorId);
    
    console.log('🔍 [DEBUG] Diagnosis complete:', result);
    alert(`Diagnosis complete! Check console for details.\n\nQuick summary:\n- Triggers: ${result.totalTriggers || 0}\n- Active: ${result.activeTriggers || 0}\n- WhatsApp Ready: ${result.whatsappStatus?.ready || false}\n- Notifications Enabled: ${result.settings?.enabledGlobally || false}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-400">Loading simulators...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Error Loading Simulators</h3>
              <p className="text-slate-400 mb-4">{error}</p>
              <button 
                onClick={loadSimulators}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (simulators.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <BellIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Simulators Available</h3>
              <p className="text-slate-400">
                You need to create at least one simulator before setting up notifications.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CACHE BUST - BIG TEST SECTION */}
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-bold text-red-400 mb-2">🚨 CACHE BUST TEST SECTION</h2>
          <p className="text-red-300 mb-4">If you can see this red section, the cache has been cleared!</p>
          <button
            onClick={async () => {
              alert('🎉 CACHE CLEARED! Test button works!');
              try {
                const { sendWhatsAppMessage } = await import('@/lib/whatsapp-api');
                const result = await sendWhatsAppMessage({
                  to: '60123456789',
                  message: `🚨 EMERGENCY TEST\n\nTime: ${new Date().toLocaleString()}\n\nThis proves the cache is cleared and buttons work!`
                });
                console.log('Emergency test result:', result);
                alert(result.success ? '✅ WhatsApp test SUCCESS!' : '❌ WhatsApp test FAILED: ' + result.error);
              } catch (error) {
                alert('❌ Error: ' + (error instanceof Error ? error.message : 'Unknown'));
              }
            }}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg"
          >
            🚨 EMERGENCY TEST BUTTON
          </button>
        </div>

        {/* Page Header */}
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellIcon className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-white">WhatsApp Notifications [BUILD: {new Date().toISOString()}]</h1>
                <p className="text-slate-400">
                  Manage notification triggers - TEST BUTTONS SHOULD BE VISIBLE NOW!
                </p>
              </div>
            </div>
            
            {/* Test Buttons - Always visible for debugging */}
            <div className="flex gap-2">
              {!selectedSimulatorId && (
                <div className="text-yellow-400 text-sm">
                  No simulator selected (simulators: {simulators.length})
                </div>
              )}
              
              {/* Simple test button that always works */}
              <button
                onClick={async () => {
                  try {
                    const phoneNumber = '60123456789'; // Replace with your number
                    const message = `🧪 SIMPLE TEST\n\nTime: ${new Date().toLocaleString()}\n\nThis is a basic test message!`;
                    
                    // Send via WhatsApp API
                    const { sendWhatsAppMessage } = await import('@/lib/whatsapp-api');
                    const result = await sendWhatsAppMessage({
                      to: phoneNumber,
                      message: message
                    });
                    
                    console.log('Test result:', result);
                    
                    if (result.success) {
                      alert('✅ Simple test sent successfully!');
                    } else {
                      alert('❌ Simple test failed: ' + result.error);
                    }
                  } catch (error) {
                    console.error('Test error:', error);
                    alert('❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
                title="Simple test - no simulator required"
              >
                🚀 Simple Test
              </button>
                <button
                  onClick={async () => {
                    try {
                      const phoneNumber = '60123456789'; // Replace with your number
                      const message = `🧪 TEST NOTIFICATION\n\nTime: ${new Date().toLocaleString()}\nSimulator: ${selectedSimulator?.name}\n\nThis is a test message from your EMS system!`;
                      
                      // Send via WhatsApp API
                      const { sendWhatsAppMessage } = await import('@/lib/whatsapp-api');
                      const result = await sendWhatsAppMessage({
                        to: phoneNumber,
                        message: message
                      });
                      
                      // Log to notification history
                      const testTrigger = {
                        id: `test-${Date.now()}`,
                        simulatorId: selectedSimulatorId,
                        phoneNumber: phoneNumber,
                        thresholdPercentage: 0,
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };
                      
                      const { createNotificationHistory, LocalStorageNotificationStorage } = await import('@/lib/notification-storage');
                      const historyEntry = createNotificationHistory(
                        testTrigger,
                        0, // percentage
                        result.success,
                        result.success ? undefined : (result.error || 'Failed to send test notification')
                      );
                      
                      const storage = new LocalStorageNotificationStorage();
                      await storage.saveNotificationHistory(historyEntry);
                      
                      if (result.success) {
                        alert('✅ Test notification sent and logged to history!');
                      } else {
                        alert('❌ Failed to send test notification: ' + result.error + '\n(Still logged to history)');
                      }
                    } catch (error) {
                      alert('❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm font-medium"
                  title="Send test WhatsApp message"
                >
                  📱 Send Test
                </button>
              <button
                onClick={handleDebugNotifications}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors text-sm font-medium"
                title="Debug notification system"
                disabled={!selectedSimulatorId}
              >
                🔍 Debug System
              </button>
            </div>
          </div>

          {/* Simulator Selector */}
          {simulators.length > 1 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">Select Simulator</h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <label htmlFor="simulator-select" className="text-sm font-medium text-slate-300 min-w-0">
                    Simulator:
                  </label>
                  <Select
                    id="simulator-select"
                    value={selectedSimulatorId}
                    onChange={(e) => setSelectedSimulatorId(e.target.value)}
                    className="flex-1 max-w-md"
                  >
                    {simulators.map((simulator) => (
                      <option key={simulator.id} value={simulator.id}>
                        {simulator.name} (Target: {simulator.target_kwh} kWh)
                      </option>
                    ))}
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </header>

        {/* Notification Manager */}
        {selectedSimulator && (
          <NotificationManager 
            simulatorId={selectedSimulator.id}
            simulatorName={selectedSimulator.name}
          />
        )}
      </div>
    </div>
  );
}