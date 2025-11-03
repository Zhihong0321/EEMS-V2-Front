# Auto Run Simulator Startup Notifications Implementation

## Overview
Implemented a feature that automatically sends WhatsApp notifications to all configured phone numbers when the Auto Run Simulator starts up.

## What Was Implemented

### 1. Startup Notifications Module (`src/lib/startup-notifications.ts`)
- **`sendStartupNotifications()`** function that:
  - Gets all active triggers for the simulator
  - Sends startup messages to unique phone numbers
  - Logs notification attempts to history with type "startup"
  - Handles errors gracefully without blocking simulator startup

### 2. Enhanced Emitter System (`src/lib/emitter.ts`)
- Modified `useEmitter` hook to accept `simulatorName` parameter
- Added startup notification call in the `start()` function for "auto" mode
- Updated `useAutoEmitter` to pass simulator name to startup notifications
- Notifications are sent before the actual data emission begins

### 3. Updated Type System (`src/lib/types.ts`)
- Added `notificationType` field to `NotificationHistory` type
- Supports: `'threshold' | 'startup' | 'shutdown'`

### 4. Enhanced Notification Storage (`src/lib/notification-storage.ts`)
- Updated `createNotificationHistory()` to accept notification type
- Defaults to 'threshold' for backward compatibility

### 5. Improved History Display (`src/components/notifications/notification-history.tsx`)
- Shows notification type badges (🚀 Startup, threshold percentages)
- Different styling for startup vs threshold notifications
- Updated description text based on notification type

### 6. Updated Components
- **CombinedDashboard**: Passes `simulatorName` to `useAutoEmitter`
- **SimulatorRunContent**: Passes `simulatorName` to `useAutoEmitter`

### 7. Test Infrastructure
- **Test page**: `/test-startup` for manual testing
- **Console functions**: `testStartupNotifications(simulatorId, simulatorName?)`
- **Browser console**: Available test functions for debugging

## How It Works

### Startup Flow:
1. User clicks "Start auto run" in Auto Run Panel
2. `useAutoEmitter.start()` is called
3. For "auto" mode, `sendStartupNotifications()` is called
4. System finds all active triggers for the simulator
5. Sends startup message to each unique phone number
6. Logs each attempt to notification history with type "startup"
7. Simulator begins normal data emission

### Startup Message Format:
```
🚀 EMS Simulator Started!

Simulator: [Simulator Name]
Mode: Auto Run
Started: [Timestamp]

Your energy simulator is now running and generating data. You'll receive threshold alerts as configured.

Happy monitoring! 📊⚡
```

## Testing

### Browser Console Testing:
```javascript
// Test startup notifications for a simulator
testStartupNotifications('your-simulator-id', 'Factory A');

// Check if notifications were logged
// Go to Notifications page > History tab to see startup notifications
```

### Manual Testing:
1. Visit `/test-startup` page
2. Click "Test Startup Notifications" button
3. Check console logs and notification history

### Integration Testing:
1. Create notification triggers for a simulator
2. Go to simulator dashboard
3. Click "Start auto run" in Auto Run Panel
4. Check notification history for startup notifications
5. Verify WhatsApp messages were received

## Key Features

### ✅ Implemented:
- Automatic startup notifications when Auto Run starts
- Notification type tracking in history
- Error handling and logging
- Unique phone number deduplication
- Graceful failure (doesn't block simulator startup)
- Enhanced history display with notification types
- Test infrastructure

### 🔄 Future Enhancements:
- Shutdown notifications when simulator stops
- Configurable startup message templates
- Startup notification enable/disable setting
- Bulk notification management

## Files Modified:
- `src/lib/startup-notifications.ts` (new)
- `src/lib/emitter.ts`
- `src/lib/types.ts`
- `src/lib/notification-storage.ts`
- `src/lib/notification-manager.ts`
- `src/components/notifications/notification-history.tsx`
- `src/components/dashboard/combined-dashboard.tsx`
- `src/components/run/simulator-run-content.tsx`
- `src/app/test-startup/page.tsx` (new)

## Usage Instructions:

1. **Setup**: Ensure you have notification triggers configured for your simulator
2. **Start Simulator**: Click "Start auto run" in the Auto Run Panel
3. **Verify**: Check notification history or WhatsApp messages
4. **Debug**: Use browser console functions for testing

The startup notifications will now automatically fire whenever the Auto Run Simulator is started! 🚀