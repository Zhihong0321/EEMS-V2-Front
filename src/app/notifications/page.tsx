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
        {/* Page Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <BellIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-white">WhatsApp Notifications</h1>
              <p className="text-slate-400">
                Manage notification triggers for your energy management simulators
              </p>
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