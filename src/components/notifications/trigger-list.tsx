'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { NotificationTrigger } from '@/lib/types';
import { formatPhoneNumberForDisplay } from '@/lib/notification-validation';
import { 
  PencilIcon, 
  TrashIcon, 
  PowerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface TriggerListProps {
  triggers: NotificationTrigger[];
  onEdit: (trigger: NotificationTrigger) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  isLoading?: boolean;
}

interface TriggerItemProps {
  trigger: NotificationTrigger;
  onEdit: (trigger: NotificationTrigger) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  isLoading?: boolean;
}

function TriggerItem({ trigger, onEdit, onDelete, onToggle, isLoading }: TriggerItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this notification trigger?\n\nPhone: ${formatPhoneNumberForDisplay(trigger.phoneNumber)}\nThreshold: ${trigger.thresholdPercentage}%\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete(trigger.id);
    } catch (error) {
      console.error('Error deleting trigger:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(trigger.id, !trigger.isActive);
    } catch (error) {
      console.error('Error toggling trigger:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={clsx(
      "transition-all duration-200",
      trigger.isActive 
        ? "border-slate-700 bg-slate-900/60" 
        : "border-slate-800 bg-slate-900/30 opacity-75"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Trigger Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {/* Status Indicator */}
              <div className={clsx(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                trigger.isActive
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-slate-700/50 text-slate-400 border border-slate-700"
              )}>
                {trigger.isActive ? (
                  <CheckCircleIcon className="h-3 w-3" />
                ) : (
                  <ClockIcon className="h-3 w-3" />
                )}
                {trigger.isActive ? 'Active' : 'Inactive'}
              </div>

              {/* Threshold Badge */}
              <div className="px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                {trigger.thresholdPercentage}% threshold
              </div>
            </div>

            {/* Phone Number */}
            <div className="mb-2">
              <p className="text-sm font-medium text-white">
                {formatPhoneNumberForDisplay(trigger.phoneNumber)}
              </p>
              <p className="text-xs text-slate-400">
                WhatsApp notifications when usage ≥ {trigger.thresholdPercentage}%
              </p>
            </div>

            {/* Timestamps */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Created: {formatDate(trigger.createdAt)}</span>
              {trigger.updatedAt !== trigger.createdAt && (
                <span>Updated: {formatDate(trigger.updatedAt)}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Toggle Active/Inactive */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              disabled={isLoading || isToggling || isDeleting}
              isLoading={isToggling}
              className={clsx(
                "h-8 w-8 p-0",
                trigger.isActive 
                  ? "text-slate-400 hover:text-orange-400" 
                  : "text-slate-500 hover:text-success"
              )}
              title={trigger.isActive ? 'Disable notifications' : 'Enable notifications'}
            >
              <PowerIcon className="h-4 w-4" />
            </Button>

            {/* Edit */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(trigger)}
              disabled={isLoading || isToggling || isDeleting}
              className="h-8 w-8 p-0 text-slate-400 hover:text-primary"
              title="Edit trigger"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>

            {/* Delete */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading || isToggling || isDeleting}
              isLoading={isDeleting}
              className="h-8 w-8 p-0 text-slate-400 hover:text-danger"
              title="Delete trigger"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TriggerList({ 
  triggers, 
  onEdit, 
  onDelete, 
  onToggle, 
  isLoading = false 
}: TriggerListProps) {
  const [sortBy, setSortBy] = useState<'created' | 'threshold' | 'status'>('created');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Filter and sort triggers
  const filteredAndSortedTriggers = triggers
    .filter(trigger => {
      if (filterStatus === 'all') return true;
      return filterStatus === 'active' ? trigger.isActive : !trigger.isActive;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'threshold':
          return a.thresholdPercentage - b.thresholdPercentage;
        case 'status':
          return Number(b.isActive) - Number(a.isActive);
        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const activeTriggers = triggers.filter(t => t.isActive).length;
  const inactiveTriggers = triggers.filter(t => !t.isActive).length;

  if (triggers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Notification Triggers</h3>
          <p className="text-slate-400 mb-4">
            You haven't set up any WhatsApp notification triggers yet.
          </p>
          <p className="text-sm text-slate-500">
            Create your first trigger to receive alerts when energy usage exceeds your specified thresholds.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats and Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Notification Triggers</h3>
              <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                <span>{triggers.length} total</span>
                <span className="text-success">{activeTriggers} active</span>
                <span className="text-slate-500">{inactiveTriggers} inactive</span>
              </div>
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800 text-white focus:border-primary focus:outline-none"
                disabled={isLoading}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800 text-white focus:border-primary focus:outline-none"
                disabled={isLoading}
              >
                <option value="created">Sort by Created</option>
                <option value="threshold">Sort by Threshold</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Triggers List */}
      {filteredAndSortedTriggers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-slate-400">
              No triggers match the current filter criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedTriggers.map((trigger) => (
            <TriggerItem
              key={trigger.id}
              trigger={trigger}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {triggers.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Bulk Actions</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const inactiveTriggers = triggers.filter(t => !t.isActive);
                    if (inactiveTriggers.length === 0) return;
                    
                    const confirmed = window.confirm(
                      `Enable notifications for ${inactiveTriggers.length} inactive trigger(s)?`
                    );
                    if (confirmed) {
                      inactiveTriggers.forEach(t => onToggle(t.id, true));
                    }
                  }}
                  disabled={isLoading || inactiveTriggers === 0}
                  className="text-success hover:text-success"
                >
                  Enable All
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const activeTriggers = triggers.filter(t => t.isActive);
                    if (activeTriggers.length === 0) return;
                    
                    const confirmed = window.confirm(
                      `Disable notifications for ${activeTriggers.length} active trigger(s)?`
                    );
                    if (confirmed) {
                      activeTriggers.forEach(t => onToggle(t.id, false));
                    }
                  }}
                  disabled={isLoading || activeTriggers === 0}
                  className="text-orange-400 hover:text-orange-300"
                >
                  Disable All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}