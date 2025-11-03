'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function DebugStartupPage() {
  const [simulatorId, setSimulatorId] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testStep1_CheckTriggers = async () => {
    if (!simulatorId) {
      addResult('❌ Please enter a simulator ID first');
      return;
    }

    setIsLoading(true);
    try {
      addResult(`🔍 Step 1: Checking triggers for simulator "${simulatorId}"`);
      
      const { notificationManager } = await import('@/lib/notification-manager');
      
      const allTriggers = await notificationManager.getTriggersBySimulator(simulatorId);
      addResult(`📋 Found ${allTriggers.length} total triggers`);
      
      if (allTriggers.length > 0) {
        allTriggers.forEach((trigger, index) => {
          addResult(`  Trigger ${index + 1}: ${trigger.phoneNumber} (${trigger.thresholdPercentage}%) - ${trigger.isActive ? 'ACTIVE' : 'INACTIVE'}`);
        });
      }
      
      const activeTriggers = await notificationManager.getActiveTriggersBySimulator(simulatorId);
      addResult(`✅ Found ${activeTriggers.length} active triggers`);
      
      if (activeTriggers.length === 0) {
        addResult('⚠️ No active triggers found - this is why startup notifications are not firing!');
      }
      
    } catch (error) {
      addResult(`❌ Error checking triggers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testStep2_CheckWhatsApp = async () => {
    setIsLoading(true);
    try {
      addResult('🔍 Step 2: Checking WhatsApp API status');
      
      const { getWhatsAppStatus } = await import('@/lib/whatsapp-api');
      const status = await getWhatsAppStatus();
      
      addResult(`📱 WhatsApp API Ready: ${status.ready ? 'YES' : 'NO'}`);
      addResult(`📱 WhatsApp Status: ${JSON.stringify(status)}`);
      
      if (!status.ready) {
        addResult('⚠️ WhatsApp API is not ready - this could prevent notifications');
      }
      
    } catch (error) {
      addResult(`❌ Error checking WhatsApp: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testStep3_ManualStartup = async () => {
    if (!simulatorId) {
      addResult('❌ Please enter a simulator ID first');
      return;
    }

    setIsLoading(true);
    try {
      addResult(`🚀 Step 3: Testing startup notifications manually for "${simulatorId}"`);
      
      const { sendStartupNotifications } = await import('@/lib/startup-notifications');
      await sendStartupNotifications(simulatorId, 'auto', 'Debug Test Simulator');
      
      addResult('✅ Manual startup notifications completed - check console for details');
      
    } catch (error) {
      addResult(`❌ Error in manual startup test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testStep4_CheckHistory = async () => {
    if (!simulatorId) {
      addResult('❌ Please enter a simulator ID first');
      return;
    }

    setIsLoading(true);
    try {
      addResult(`📚 Step 4: Checking notification history for "${simulatorId}"`);
      
      const { notificationManager } = await import('@/lib/notification-manager');
      const history = await notificationManager.getNotificationHistory(simulatorId, 10);
      
      addResult(`📚 Found ${history.length} history entries`);
      
      const startupHistory = history.filter(h => h.notificationType === 'startup');
      addResult(`🚀 Found ${startupHistory.length} startup notifications in history`);
      
      if (history.length > 0) {
        history.slice(0, 3).forEach((entry, index) => {
          const type = entry.notificationType || 'threshold';
          const status = entry.success ? '✅' : '❌';
          addResult(`  ${index + 1}. ${status} ${type} - ${entry.phoneNumber} - ${new Date(entry.sentAt).toLocaleString()}`);
        });
      }
      
    } catch (error) {
      addResult(`❌ Error checking history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    clearResults();
    addResult('🔍 Starting comprehensive startup notifications debug...');
    
    await testStep1_CheckTriggers();
    await testStep2_CheckWhatsApp();
    await testStep3_ManualStartup();
    await testStep4_CheckHistory();
    
    addResult('🏁 Debug completed - check results above');
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Startup Notifications Debug</h1>
          <p className="text-slate-400">
            Debug why startup notifications are not firing when Auto Run Simulator starts.
          </p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">Debug Configuration</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Simulator ID
              </label>
              <Input
                type="text"
                value={simulatorId}
                onChange={(e) => setSimulatorId(e.target.value)}
                placeholder="Enter your simulator ID (e.g., sim_123abc)"
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                You can find this in the URL when viewing a simulator (e.g., /sim/[id])
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={testStep1_CheckTriggers}
                disabled={isLoading || !simulatorId}
                variant="secondary"
              >
                1. Check Triggers
              </Button>
              <Button 
                onClick={testStep2_CheckWhatsApp}
                disabled={isLoading}
                variant="secondary"
              >
                2. Check WhatsApp
              </Button>
              <Button 
                onClick={testStep3_ManualStartup}
                disabled={isLoading || !simulatorId}
                variant="secondary"
              >
                3. Test Startup
              </Button>
              <Button 
                onClick={testStep4_CheckHistory}
                disabled={isLoading || !simulatorId}
                variant="secondary"
              >
                4. Check History
              </Button>
              <Button 
                onClick={runAllTests}
                disabled={isLoading || !simulatorId}
                className="bg-primary hover:bg-primary/90"
              >
                🚀 Run All Tests
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Debug Results</h2>
            <Button onClick={clearResults} variant="ghost" size="sm">
              Clear
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-slate-500">No results yet. Run a test to see debug output.</p>
              ) : (
                results.map((result, index) => (
                  <div key={index} className="text-slate-300 mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">Common Issues & Solutions</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div>
              <p className="font-medium text-white">❌ No active triggers found:</p>
              <p className="ml-4 text-slate-400">
                Go to Notifications page → Create a trigger for your simulator → Make sure it&apos;s active
              </p>
            </div>
            
            <div>
              <p className="font-medium text-white">❌ WhatsApp API not ready:</p>
              <p className="ml-4 text-slate-400">
                Check WhatsApp Web connection → Scan QR code if needed → Test API endpoints
              </p>
            </div>
            
            <div>
              <p className="font-medium text-white">❌ Wrong simulator ID:</p>
              <p className="ml-4 text-slate-400">
                Check the URL when viewing your simulator → Copy the exact ID from /sim/[id]
              </p>
            </div>
            
            <div>
              <p className="font-medium text-white">❌ No console logs when starting Auto Run:</p>
              <p className="ml-4 text-slate-400">
                Make sure you&apos;re clicking &quot;Start auto run&quot; (not manual) → Check for JavaScript errors → Refresh page
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}