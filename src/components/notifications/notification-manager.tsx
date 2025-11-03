'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { NotificationTrigger, NotificationSettings } from '@/lib/types';
import { notificationManager } from '@/lib/notification-manager';
import { TriggerForm } from './trigger-form';
import { TriggerList } from './trigger-list';
import { NotificationHistory } from './notification-history';
import { NotificationSettingsPanel } from './notification-settings';
import { 
  PlusIcon, 
  Cog6ToothIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface NotificationManagerProps {
  simulatorId: string;
  simulatorName?: string;
}

type ActiveTab = 'triggers' | 'history' | 'settings';
type ActiveModal = 'create' | 'edit' | 'settings' | null;

export function NotificationManager({ simulatorId, simulatorName }: NotificationManagerProps) {
  const [triggers, setTriggers] = useState<NotificationTrigger[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('triggers');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [editingTrigger, setEditingTrigger] = useState<NotificationTrigger | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    whatsappReady: boolean;
    totalTriggers: number;
    activeTriggers: number;
    notificationsEnabled: boolean;
    recentNotifications: number;
  } | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [simulatorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [triggersData, settingsData, statusData] = await Promise.all([
        notificationManager.getTriggersBySimulator(simulatorId),
        notificationManager.getSettings(),
        notificationManager.getSystemStatus()
      ]);
      
      setTriggers(triggersData);
      setSettings(settingsData);
      setSystemStatus(statusData);
    } catch (err) {
      console.error('Error loading notification data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notification data');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger management handlers
  const handleCreateTrigger = () => {
    setEditingTrigger(null);
    setActiveModal('create');
  };

  const handleEditTrigger = (trigger: NotificationTrigger) => {
    setEditingTrigger(trigger);
    setActiveModal('edit');
  };

  const handleSaveTrigger = async (trigger: NotificationTrigger) => {
    // Update local state
    if (editingTrigger) {
      setTriggers(prev => prev.map(t => t.id === trigger.id ? trigger : t));
    } else {
      setTriggers(prev => [...prev, trigger]);
    }
    
    // Close modal
    setActiveModal(null);
    setEditingTrigger(null);
    
    // Refresh system status
    const statusData = await notificationManager.getSystemStatus();
    setSystemStatus(statusData);
  };

  const handleDeleteTrigger = async (id: string) => {
    try {
      await notificationManager.deleteTrigger(id);
      setTriggers(prev => prev.filter(t => t.id !== id));
      
      // Refresh system status
      const statusData = await notificationManager.getSystemStatus();
      setSystemStatus(statusData);
    } catch (err) {
      console.error('Error deleting trigger:', err);
      alert('Failed to delete trigger: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleToggleTrigger = async (id: string, isActive: boolean) => {
    try {
      const updatedTrigger = await notificationManager.toggleTrigger(id, isActive);
      setTriggers(prev => prev.map(t => t.id === id ? updatedTrigger : t));
      
      // Refresh system status
      const statusData = await notificationManager.getSystemStatus();
      setSystemStatus(statusData);
    } catch (err) {
      console.error('Error toggling trigger:', err);
      alert('Failed to update trigger: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleSettingsUpdate = async (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    setActiveModal(null);
    
    // Refresh system status
    const statusData = await notificationManager.getSystemStatus();
    setSystemStatus(statusData);
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingTrigger(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Loading notification system...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-danger mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Error Loading Notifications</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <Button onClick={loadData} variant="secondary">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with System Status */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BellIcon className="h-6 w-6" />
                WhatsApp Notifications
              </h2>
              <p className="text-slate-400 mt-1">
                {simulatorName ? `Manage notifications for ${simulatorName}` : `Simulator: ${simulatorId}`}
              </p>
            </div>

            {/* System Status Indicators */}
            {systemStatus && (
              <div className="flex items-center gap-4 text-sm">
                {/* WhatsApp Status */}
                <div className={clsx(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full border",
                  systemStatus.whatsappReady
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-danger/10 text-danger border-danger/20"
                )}>
                  {systemStatus.whatsappReady ? (
                    <CheckCircleIcon className="h-3 w-3" />
                  ) : (
                    <ExclamationTriangleIcon className="h-3 w-3" />
                  )}
                  WhatsApp {systemStatus.whatsappReady ? 'Ready' : 'Not Ready'}
                </div>

                {/* Notifications Status */}
                <div className={clsx(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full border",
                  systemStatus.notificationsEnabled
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-slate-700/50 text-slate-400 border-slate-700"
                )}>
                  <BellIcon className="h-3 w-3" />
                  {systemStatus.notificationsEnabled ? 'Enabled' : 'Disabled'}
                </div>

                {/* Active Triggers */}
                <div className="text-slate-400">
                  {systemStatus.activeTriggers} / {systemStatus.totalTriggers} active
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-0">
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('triggers')}
              className={clsx(
                "flex-1 px-6 py-4 text-sm font-medium transition-colors",
                activeTab === 'triggers'
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Triggers ({triggers.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={clsx(
                "flex-1 px-6 py-4 text-sm font-medium transition-colors",
                activeTab === 'history'
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-slate-400 hover:text-white"
              )}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={clsx(
                "flex-1 px-6 py-4 text-sm font-medium transition-colors",
                activeTab === 'settings'
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Settings
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === 'triggers' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-white">Notification Triggers</h3>
              <p className="text-sm text-slate-400">
                Configure when to send WhatsApp notifications based on energy usage thresholds
              </p>
            </div>
            <Button onClick={handleCreateTrigger} className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Add Trigger
            </Button>
          </div>

          {/* Triggers List */}
          <TriggerList
            triggers={triggers}
            onEdit={handleEditTrigger}
            onDelete={handleDeleteTrigger}
            onToggle={handleToggleTrigger}
            isLoading={isLoading}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Notification History</h3>
            <p className="text-sm text-slate-400">
              View all sent and failed notifications for this simulator
            </p>
          </div>
          <NotificationHistory simulatorId={simulatorId} />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-white">Notification Settings</h3>
              <p className="text-sm text-slate-400">
                Configure global notification behavior and rate limiting
              </p>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setActiveModal('settings')}
              className="flex items-center gap-2"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              Edit Settings
            </Button>
          </div>
          
          {settings && (
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Global Status</h4>
                    <p className={clsx(
                      "text-sm",
                      settings.enabledGlobally ? "text-success" : "text-slate-400"
                    )}>
                      {settings.enabledGlobally ? 'Notifications Enabled' : 'Notifications Disabled'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Cooldown Period</h4>
                    <p className="text-sm text-slate-300">{settings.cooldownMinutes} minutes</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Daily Limit</h4>
                    <p className="text-sm text-slate-300">{settings.maxDailyNotifications} per trigger</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      {(activeModal === 'create' || activeModal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <TriggerForm
              simulatorId={simulatorId}
              trigger={editingTrigger || undefined}
              onSave={handleSaveTrigger}
              onCancel={closeModal}
              isLoading={false}
            />
          </div>
        </div>
      )}

      {activeModal === 'settings' && settings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <NotificationSettingsPanel
              settings={settings}
              onSave={handleSettingsUpdate}
              onCancel={closeModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}