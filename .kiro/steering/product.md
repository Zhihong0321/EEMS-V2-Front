# Product Overview

## Eternalgy EMS Frontend

A Next.js-based Energy Management System (EMS) frontend that provides real-time monitoring and simulation capabilities for electrical energy consumption. The system focuses on 30-minute Maximum Demand (MD) control and WhatsApp-based alerting.

### Core Features

- **Simulator Management**: Create and manage energy meter simulators with configurable targets
- **Real-time Dashboard**: Live visualization of energy consumption with 30-minute block windows
- **Dual Emitter Modes**: 
  - Auto mode: Automated readings with configurable base power and volatility
  - Manual mode: User-controlled power levels with fast-forward capability (30x speed)
- **WhatsApp Notifications**: Automated alerts when consumption reaches 80% of target thresholds
- **Historical Analysis**: Track performance across the last 10 consumption blocks

### Target Users

Energy managers and facility operators who need to monitor and control maximum demand to avoid penalty charges from utility providers.

### Business Context

- **Timezone**: Asia/Kuala_Lumpur (UTC+8) for display purposes
- **Deployment**: Railway platform with Node.js runtime
- **Architecture**: Prototype-focused with REST + Server-Sent Events (SSE) for real-time updates