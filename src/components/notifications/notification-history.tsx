'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { NotificationHistory } from '@/lib/types';
import { formatPhoneNumberForDisplay } from '@/lib/notification-validation';
import { notificationManager } from '@/lib/notification-manager';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface NotificationHistoryProps {
  simulatorId: string;
  limit?: number;
}

interface HistoryFilters {
  status: 'all' | 'success' | 'failed';
  timeRange: 'all' | '24h' | '7d' | '30d';
}

function HistoryItem({ history }: { history: NotificationHistory }) {
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (success: boolean) => {
    return success 
      ? "text-success bg-success/10 border-success/20"
      : "text-danger bg-danger/10 border-danger/20";
  };

  return (
    <Card className={clsx(
      "transition-all duration-200",
      history.success 
        ? "border-slate-700 bg-slate-900/60" 
        : "border-red-900/30 bg-red-900/10"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Notification Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {/* Status Indicator */}
              <div className={clsx(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
                getStatusColor(history.success)
              )}>
                {history.success ? (
                  <CheckCircleIcon className="h-3 w-3" />
                ) : (
                  <XCircleIcon className="h-3 w-3" />
                )}
                {history.success ? 'Sent' : 'Failed'}
              </div>

              {/* Threshold Info */}
              <div className="px-2 py-1 rounded-full bg-slate-700/50 text-slate-300 text-xs">
                {history.actualPercentage.toFixed(1)}% / {history.thresholdPercentage}%
              </div>

              {/* Time */}
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <ClockIcon className="h-3 w-3" />
                {formatDate(history.sentAt)}
              </div>
            </div>

            {/* Phone Number */}
            <div className="mb-2">
              <p className="text-sm font-medium text-white">
                {formatPhoneNumberForDisplay(history.phoneNumber)}
              </p>
              <p className="text-xs text-slate-400">
                Usage reached {history.actualPercentage.toFixed(1)}% (threshold: {history.thresholdPercentage}%)
              </p>
            </div>

            {/* Error Message */}
            {!history.success && history.errorMessage && (
              <div className="mt-2 p-2 rounded bg-red-900/20 border border-red-900/30">
                <p className="text-xs text-red-300">
                  Error: {history.errorMessage}
                </p>
              </div>
            )}

            {/* Details Toggle */}
            {!history.success && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mt-2 text-xs text-slate-400 hover:text-slate-300 underline"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            )}

            {/* Detailed Error Info */}
            {showDetails && !history.success && (
              <div className="mt-2 p-3 rounded bg-slate-800/50 border border-slate-700">
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Trigger ID:</span>
                    <span className="ml-2 text-slate-300 font-mono">{history.triggerId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Simulator ID:</span>
                    <span className="ml-2 text-slate-300 font-mono">{history.simulatorId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Sent At:</span>
                    <span className="ml-2 text-slate-300">{new Date(history.sentAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NotificationHistory({ simulatorId, limit = 50 }: NotificationHistoryProps) {
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>({
    status: 'all',
    timeRange: 'all'
  });

  // Load notification history
  useEffect(() => {
    loadHistory();
  }, [simulatorId, limit]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const historyData = await notificationManager.getNotificationHistory(simulatorId, limit);
      setHistory(historyData);
    } catch (err) {
      console.error('Error loading notification history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notification history');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter history based on current filters
  const filteredHistory = history.filter(item => {
    // Status filter
    if (filters.status !== 'all') {
      const matchesStatus = filters.status === 'success' ? item.success : !item.success;
      if (!matchesStatus) return false;
    }

    // Time range filter
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const itemDate = new Date(item.sentAt);
      const diffMs = now.getTime() - itemDate.getTime();
      
      switch (filters.timeRange) {
        case '24h':
          if (diffMs > 24 * 60 * 60 * 1000) return false;
          break;
        case '7d':
          if (diffMs > 7 * 24 * 60 * 60 * 1000) return false;
          break;
        case '30d':
          if (diffMs > 30 * 24 * 60 * 60 * 1000) return false;
          break;
      }
    }

    return true;
  });

  const successCount = history.filter(h => h.success).length;
  const failedCount = history.filter(h => !h.success).length;

  const exportHistory = () => {
    const csvContent = [
      ['Date', 'Phone Number', 'Threshold %', 'Actual %', 'Status', 'Error Message'].join(','),
      ...filteredHistory.map(item => [
        new Date(item.sentAt).toISOString(),
        item.phoneNumber,
        item.thresholdPercentage,
        item.actualPercentage.toFixed(1),
        item.success ? 'Success' : 'Failed',
        item.errorMessage || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-history-${simulatorId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Loading notification history...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-danger mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Error Loading History</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <Button onClick={loadHistory} variant="secondary">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ClockIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Notification History</h3>
          <p className="text-slate-400 mb-4">
            No notifications have been sent for this simulator yet.
          </p>
          <p className="text-sm text-slate-500">
            History will appear here once notification triggers are activated and thresholds are exceeded.
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
              <h3 className="text-lg font-semibold text-white">Notification History</h3>
              <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                <span>{history.length} total</span>
                <span className="text-success">{successCount} sent</span>
                <span className="text-danger">{failedCount} failed</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-4 w-4 text-slate-400" />
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as HistoryFilters['status'] }))}
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800 text-white focus:border-primary focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="success">Sent Only</option>
                  <option value="failed">Failed Only</option>
                </select>
              </div>

              {/* Time Range Filter */}
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as HistoryFilters['timeRange'] }))}
                className="px-3 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800 text-white focus:border-primary focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>

              {/* Export Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={exportHistory}
                disabled={filteredHistory.length === 0}
                className="flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-slate-400">
              No notifications match the current filter criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <HistoryItem key={item.id} history={item} />
          ))}
        </div>
      )}

      {/* Load More */}
      {history.length >= limit && (
        <Card>
          <CardContent className="p-4 text-center">
            <Button
              variant="ghost"
              onClick={() => loadHistory()}
              className="text-slate-400 hover:text-white"
            >
              Load More History
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}