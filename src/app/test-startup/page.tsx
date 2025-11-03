'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { sendStartupNotifications } from '@/lib/startup-notifications';

export default function TestStartupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const testStartupNotifications = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('🧪 [TEST] Starting startup notification test...');
      
      // Test with a sample simulator ID
      const testSimulatorId = 'test-simulator-123';
      const testSimulatorName = 'Test Factory A';
      
      await sendStartupNotifications(testSimulatorId, 'auto', testSimulatorName);
      
      setResult('✅ Startup notifications sent successfully! Check console for details.');
      console.log('🧪 [TEST] Startup notification test completed');
      
    } catch (error) {
      console.error('🧪 [TEST] Startup notification test failed:', error);
      setResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Startup Notifications Test</h1>
          <p className="text-slate-400">
            Test the startup notification system that triggers when Auto Run Simulator starts.
          </p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">Test Startup Notifications</h2>
            <p className="text-sm text-slate-400">
              This will send startup notifications to all active triggers for the test simulator.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <h3 className="font-medium text-white mb-2">Test Parameters:</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Simulator ID: test-simulator-123</li>
                <li>• Simulator Name: Test Factory A</li>
                <li>• Mode: auto</li>
                <li>• Will send to all active triggers for this simulator</li>
              </ul>
            </div>

            <Button 
              onClick={testStartupNotifications}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Sending Notifications...' : '🚀 Test Startup Notifications'}
            </Button>

            {result && (
              <div className={`p-4 rounded-lg border ${
                result.startsWith('✅') 
                  ? 'bg-green-900/20 border-green-600/30 text-green-200'
                  : 'bg-red-900/20 border-red-600/30 text-red-200'
              }`}>
                <p className="text-sm">{result}</p>
              </div>
            )}

            <div className="text-xs text-slate-500 space-y-1">
              <p>💡 <strong>Note:</strong> Make sure you have:</p>
              <ul className="ml-4 space-y-1">
                <li>• Created notification triggers for simulator "test-simulator-123"</li>
                <li>• WhatsApp API configured and working</li>
                <li>• Valid phone numbers in your triggers</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">How It Works</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div className="space-y-2">
              <p><strong>1. Auto Run Simulator Starts:</strong></p>
              <p className="ml-4 text-slate-400">
                When you click "Start auto run" in the Auto Run Panel, the emitter calls <code>sendStartupNotifications()</code>
              </p>
            </div>
            
            <div className="space-y-2">
              <p><strong>2. Find Active Triggers:</strong></p>
              <p className="ml-4 text-slate-400">
                The system finds all active notification triggers for the simulator
              </p>
            </div>
            
            <div className="space-y-2">
              <p><strong>3. Send Notifications:</strong></p>
              <p className="ml-4 text-slate-400">
                Sends a startup message to each unique phone number with active triggers
              </p>
            </div>
            
            <div className="space-y-2">
              <p><strong>4. Log History:</strong></p>
              <p className="ml-4 text-slate-400">
                Records each notification attempt in the notification history with type "startup"
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}