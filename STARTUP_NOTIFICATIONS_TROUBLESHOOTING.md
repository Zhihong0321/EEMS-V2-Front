# Startup Notifications Troubleshooting Guide

## Issue: Auto Run Simulator startup notifications not firing

### Step 1: Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Start Auto Run Simulator
4. Look for these log messages:
   ```
   🚀 [EMITTER] ===== AUTO RUN STARTUP DETECTED =====
   🚀 [EMITTER] SimulatorId: "your-simulator-id"
   🚀 [EMITTER] Now calling sendStartupNotifications...
   ```

### Step 2: Debug Triggers
Run this in browser console to check your triggers:
```javascript
checkTriggers('your-simulator-id')
```

Expected output:
- Should show your triggers
- At least one trigger should have `isActive: true`
- The `simulatorId` should match exactly

### Step 3: Debug Startup Notifications
Run this in browser console:
```javascript
debugStartupNotifications('your-simulator-id')
```

This will show:
- If notification manager is available
- How many triggers are found
- WhatsApp API status
- Detailed step-by-step execution

### Step 4: Manual Test
Run this in browser console:
```javascript
testStartupNotifications('your-simulator-id', 'Test Simulator Name')
```

### Common Issues & Solutions:

#### Issue 1: No console logs at all
**Problem**: The emitter isn't calling startup notifications
**Solution**: 
- Make sure you're clicking "Start auto run" (not manual run)
- Check if there are any JavaScript errors in console
- Refresh the page and try again

#### Issue 2: "No active triggers found"
**Problem**: No triggers configured or triggers are inactive
**Solution**:
- Go to Notifications page
- Create a trigger for your simulator
- Make sure the trigger is active (toggle switch on)
- Make sure the simulatorId matches exactly

#### Issue 3: "WhatsApp API not ready"
**Problem**: WhatsApp API is not configured or not working
**Solution**:
- Check WhatsApp API status: `getWhatsAppStatus()`
- Make sure WhatsApp Web is connected
- Check if API endpoints are working

#### Issue 4: Triggers found but no notifications sent
**Problem**: Error in sending WhatsApp messages
**Solution**:
- Check phone number format (should include country code)
- Test WhatsApp API directly: `testStartup('60123456789', 'test-sim')`
- Check network connectivity

### Debug Commands Reference:

```javascript
// Check if notification system is working
checkTriggers('your-simulator-id')

// Full debug of startup notifications
debugStartupNotifications('your-simulator-id')

// Test startup notifications manually
testStartupNotifications('your-simulator-id', 'Test Name')

// Test WhatsApp API directly
testStartup('60123456789', 'your-simulator-id')

// Check WhatsApp status
getWhatsAppStatus()
```

### Expected Flow:
1. Click "Start auto run"
2. Console shows: `🚀 [EMITTER] ===== AUTO RUN STARTUP DETECTED =====`
3. Debug runs and shows triggers found
4. Startup notifications are sent
5. History is logged with type "startup"
6. WhatsApp messages are received

### If Still Not Working:
1. Check the exact simulatorId being used
2. Verify trigger simulatorId matches exactly
3. Test WhatsApp API independently
4. Check browser console for any errors
5. Try refreshing the page and testing again

### Quick Test Checklist:
- [ ] Notification trigger exists for the simulator
- [ ] Trigger is active (isActive: true)
- [ ] SimulatorId matches exactly
- [ ] WhatsApp API is ready
- [ ] Phone number is valid format
- [ ] No JavaScript errors in console
- [ ] Using "Start auto run" (not manual run)