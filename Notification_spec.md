# WhatsApp Notification System - Backend Implementation Specification

## Overview
Move the entire WhatsApp notification system from frontend to backend to optimize serverless costs. The backend will handle all threshold monitoring, notification sending, and data persistence while the frontend becomes a pure UI layer.

## Architecture Goal
- **Frontend**: Pure serverless UI (only alive when users visit)
- **Backend**: Low-spec 24/7 server handling all background notification tasks
- **Cost Optimization**: Prevent frontend from staying alive 24/7 due to notification checking

---

## 1. Database Schema (PostgreSQL)

### 1.1 Notification Triggers Table
```sql
CREATE TABLE notification_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulator_id VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    threshold_percentage DECIMAL(5,2) NOT NULL CHECK (threshold_percentage >= 0 AND threshold_percentage <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate triggers for same simulator + phone + threshold
    UNIQUE(simulator_id, phone_number, threshold_percentage)
);

CREATE INDEX idx_notification_triggers_simulator ON notification_triggers(simulator_id);
CREATE INDEX idx_notification_triggers_active ON notification_triggers(is_active);
```

### 1.2 Notification History Table
```sql
CREATE TABLE notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_id UUID REFERENCES notification_triggers(id) ON DELETE CASCADE,
    simulator_id VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    threshold_percentage DECIMAL(5,2) NOT NULL,
    actual_percentage DECIMAL(5,2) NOT NULL,
    notification_type VARCHAR(20) DEFAULT 'threshold' CHECK (notification_type IN ('threshold', 'startup', 'shutdown')),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notification_history_simulator ON notification_history(simulator_id);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX idx_notification_history_trigger ON notification_history(trigger_id);
```

### 1.3 Notification Cooldowns Table
```sql
CREATE TABLE notification_cooldowns (
    trigger_id UUID PRIMARY KEY REFERENCES notification_triggers(id) ON DELETE CASCADE,
    last_notification_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 1.4 Notification Settings Table
```sql
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cooldown_minutes INTEGER DEFAULT 1 CHECK (cooldown_minutes > 0),
    max_daily_notifications INTEGER DEFAULT 50 CHECK (max_daily_notifications > 0),
    enabled_globally BOOLEAN DEFAULT true,
    whatsapp_api_url VARCHAR(500),
    whatsapp_api_token VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO notification_settings (cooldown_minutes, max_daily_notifications, enabled_globally) 
VALUES (1, 50, true);
```

---

## 2. REST API Endpoints

### 2.1 Trigger Management

#### Create Trigger
```http
POST /api/v1/notifications/triggers
Content-Type: application/json

{
  "simulator_id": "test3",
  "phone_number": "60121000099",
  "threshold_percentage": 5.0,
  "is_active": true
}

Response 201:
{
  "id": "uuid",
  "simulator_id": "test3",
  "phone_number": "60121000099",
  "threshold_percentage": 5.0,
  "is_active": true,
  "created_at": "2024-11-04T10:00:00Z",
  "updated_at": "2024-11-04T10:00:00Z"
}

Response 400: { "error": "Validation failed", "details": ["Phone number invalid"] }
Response 409: { "error": "Duplicate trigger exists" }
```

#### Get Triggers by Simulator
```http
GET /api/v1/notifications/triggers?simulator_id=test3

Response 200:
{
  "triggers": [
    {
      "id": "uuid",
      "simulator_id": "test3",
      "phone_number": "60121000099",
      "threshold_percentage": 5.0,
      "is_active": true,
      "created_at": "2024-11-04T10:00:00Z",
      "updated_at": "2024-11-04T10:00:00Z"
    }
  ],
  "total": 1
}
```

#### Update Trigger
```http
PUT /api/v1/notifications/triggers/{id}
Content-Type: application/json

{
  "threshold_percentage": 10.0,
  "is_active": false
}

Response 200: { /* updated trigger object */ }
Response 404: { "error": "Trigger not found" }
```

#### Delete Trigger
```http
DELETE /api/v1/notifications/triggers/{id}

Response 204: (no content)
Response 404: { "error": "Trigger not found" }
```

### 2.2 Notification History

#### Get History by Simulator
```http
GET /api/v1/notifications/history?simulator_id=test3&limit=50&offset=0

Response 200:
{
  "history": [
    {
      "id": "uuid",
      "trigger_id": "uuid",
      "simulator_id": "test3",
      "phone_number": "60121000099",
      "threshold_percentage": 5.0,
      "actual_percentage": 11.4,
      "notification_type": "threshold",
      "success": true,
      "error_message": null,
      "sent_at": "2024-11-04T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### Get All History (Admin)
```http
GET /api/v1/notifications/history/all?limit=100&offset=0

Response 200: { /* same format as above but across all simulators */ }
```

### 2.3 Settings Management

#### Get Settings
```http
GET /api/v1/notifications/settings

Response 200:
{
  "cooldown_minutes": 1,
  "max_daily_notifications": 50,
  "enabled_globally": true,
  "whatsapp_configured": true
}
```

#### Update Settings
```http
PUT /api/v1/notifications/settings
Content-Type: application/json

{
  "cooldown_minutes": 2,
  "max_daily_notifications": 100,
  "enabled_globally": true,
  "whatsapp_api_url": "https://api.whatsapp.com/send",
  "whatsapp_api_token": "your-token"
}

Response 200: { /* updated settings */ }
```

### 2.4 System Status

#### Get Notification System Status
```http
GET /api/v1/notifications/status

Response 200:
{
  "whatsapp_ready": true,
  "total_triggers": 5,
  "active_triggers": 3,
  "notifications_enabled": true,
  "recent_notifications_24h": 12,
  "background_service_running": true,
  "last_check_at": "2024-11-04T10:35:00Z"
}
```

---

## 3. Background Service Implementation

### 3.1 Threshold Monitor Service
**Purpose**: Continuously monitor all simulators and send notifications when thresholds are exceeded.

**Implementation Requirements**:
```python
# Pseudo-code for background service
class ThresholdMonitorService:
    def __init__(self):
        self.check_interval = 30  # seconds
        self.cooldown_minutes = 1  # per trigger
    
    async def run_forever(self):
        while True:
            try:
                await self.check_all_simulators()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Monitor service error: {e}")
                await asyncio.sleep(5)  # Brief pause on error
    
    async def check_all_simulators(self):
        # 1. Get all unique simulator IDs from active triggers
        simulator_ids = await self.get_active_simulator_ids()
        
        for simulator_id in simulator_ids:
            # 2. Get current percentage from existing simulator API
            current_percentage = await self.get_simulator_percentage(simulator_id)
            
            # 3. Check thresholds for this simulator
            await self.check_simulator_thresholds(simulator_id, current_percentage)
    
    async def check_simulator_thresholds(self, simulator_id, current_percentage):
        # 1. Get active triggers for this simulator
        triggers = await self.get_active_triggers(simulator_id)
        
        for trigger in triggers:
            if current_percentage >= trigger.threshold_percentage:
                # 2. Check cooldown (per-trigger, 1-minute default)
                if await self.is_trigger_in_cooldown(trigger.id):
                    continue
                
                # 3. Send notification
                success = await self.send_whatsapp_notification(trigger, current_percentage)
                
                # 4. Log to history (always, regardless of success)
                await self.log_notification_history(trigger, current_percentage, success)
                
                # 5. Set cooldown (only if successful)
                if success:
                    await self.set_trigger_cooldown(trigger.id)
```

### 3.2 WhatsApp Integration
```python
class WhatsAppService:
    async def send_notification(self, phone_number: str, message: str) -> bool:
        try:
            # Use your existing WhatsApp API integration
            # Return True if successful, False if failed
            pass
        except Exception as e:
            logger.error(f"WhatsApp send failed: {e}")
            return False
    
    def create_threshold_message(self, simulator_id: str, current_pct: float, threshold_pct: float) -> str:
        return f"""🚨 EMS Alert: Energy Usage Threshold Exceeded

Simulator: {simulator_id}
Current Usage: {current_pct:.1f}% of target
Threshold: {threshold_pct}%

Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Please check your energy consumption and take appropriate action."""
    
    def create_startup_message(self, simulator_id: str, mode: str) -> str:
        return f"""🚀 EMS Simulator Started!

Simulator: {simulator_id}
Mode: {mode.title()} Run
Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Your energy simulator is now running and generating data. You'll receive threshold alerts as configured.

Happy monitoring! 📊⚡"""
```

### 3.3 Startup Notifications
**Trigger**: When simulator starts (auto or manual mode)
**Implementation**: Add endpoint to trigger startup notifications

```http
POST /api/v1/notifications/startup
Content-Type: application/json

{
  "simulator_id": "test3",
  "simulator_name": "Test Simulator",
  "mode": "auto"
}

Response 200:
{
  "notifications_sent": 2,
  "success": true,
  "message": "Startup notifications sent to all active triggers"
}
```

---

## 4. Configuration & Deployment

### 4.1 Environment Variables
```bash
# WhatsApp API Configuration
WHATSAPP_API_URL=https://your-whatsapp-api.com/send
WHATSAPP_API_TOKEN=your-secret-token

# Notification Service Configuration
NOTIFICATION_CHECK_INTERVAL=30  # seconds
NOTIFICATION_COOLDOWN_MINUTES=1
MAX_DAILY_NOTIFICATIONS=50

# Database
DATABASE_URL=postgresql://user:pass@host:port/db
```

### 4.2 Service Deployment
- **Background Service**: Must run 24/7 (configure as low-spec always-on instance)
- **API Endpoints**: Can be serverless (only active when called)
- **Database**: PostgreSQL (existing)

---

## 5. API Documentation Requirements

### 5.1 Backend Homepage Documentation
**IMPORTANT**: Please expose all new notification API endpoints in your backend API documentation homepage.

**Required Documentation Sections**:
1. **Notification Triggers API** - All CRUD operations
2. **Notification History API** - Query and retrieval
3. **Notification Settings API** - Configuration management
4. **System Status API** - Health checks and monitoring
5. **Startup Notifications API** - Manual trigger endpoint

**Example Documentation Format**:
```
Backend API Documentation
├── Existing APIs
│   ├── Simulators
│   ├── Blocks
│   └── Readings
└── NEW: Notifications (v1.0)
    ├── Triggers Management
    ├── History & Reporting
    ├── Settings & Configuration
    ├── System Status
    └── Startup Notifications
```

### 5.2 Integration Testing Endpoints
Please also provide test endpoints for frontend integration:
```http
GET /api/v1/notifications/test/whatsapp?phone={number}
POST /api/v1/notifications/test/trigger
```

---

## 6. Migration Strategy

### 6.1 Phase 1: Backend Implementation
1. Implement database schema
2. Create REST API endpoints
3. Implement background service
4. Add WhatsApp integration
5. Update API documentation

### 6.2 Phase 2: Frontend Migration
1. Remove notification logic from frontend
2. Update frontend to use new backend APIs
3. Remove localStorage notification data
4. Update SSE connection (optional for real-time updates)

### 6.3 Phase 3: Testing & Deployment
1. Test notification system end-to-end
2. Verify cost optimization (frontend truly serverless)
3. Monitor background service performance

---

## 7. Success Criteria

✅ **Cost Optimization**: Frontend becomes truly serverless (only alive when users visit)
✅ **Functionality**: All notification features work as before
✅ **Reliability**: Background service runs 24/7 without interruption
✅ **Scalability**: Can handle multiple simulators and triggers
✅ **Monitoring**: Clear system status and health checks
✅ **Documentation**: All APIs documented on backend homepage

---

## Questions for Backend Team

1. **Timeline**: How long to implement this specification?
2. **WhatsApp API**: Do you need help integrating the existing WhatsApp API?
3. **Background Service**: Preferred technology stack for the 24/7 service?
4. **Database**: Any concerns with the proposed schema?
5. **API Documentation**: Current documentation system/format?

Please confirm receipt and provide implementation timeline. Frontend team will wait for API completion before migration.