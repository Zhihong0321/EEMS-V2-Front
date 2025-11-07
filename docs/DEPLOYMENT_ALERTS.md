# Deployment Alerts Integration

This project is integrated with the Development Alert API to provide audio notifications for deployment events.

## Features

- 🔊 Audio notifications for build and deployment events
- 🚨 Automatic crash detection and alerts
- 📡 Zero-configuration setup
- 🎯 Event-specific sound customization

## Supported Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `build_start` | Build process begins | `npm run build` |
| `build_success` | Build completes successfully | After successful build |
| `build_failure` | Build fails | On build error |
| `deployment_success` | Service starts successfully | `npm run start` |
| `deployment_failure` | Deployment fails | On deployment error |
| `service_crash` | Service crashes unexpectedly | Process exit/error |

## Configuration

The project name is automatically detected from:
1. `RAILWAY_PROJECT_NAME` environment variable (Railway deployments)
2. Falls back to `EEMS-Frontend` as default

## Manual Testing

Test the alert system manually:

```bash
# Test individual alerts
npm run alert build_start
npm run alert build_success
npm run alert deployment_success

# Test all alerts in sequence
npm run test:alerts
```

## Scripts

- `scripts/deployment-alert.js` - Core alert functionality
- `scripts/monitor-service.js` - Service monitoring and crash detection

## Integration Details

The alerts are integrated into the build process:
- Build notifications are sent before/after `next build`
- Deployment notifications are sent when the service starts
- Crash detection monitors the service process

## Customization

To customize the project name, set the `RAILWAY_PROJECT_NAME` environment variable:

```bash
export RAILWAY_PROJECT_NAME="My-Custom-Project"
```

## Alert Endpoint

All alerts are sent to: `http://development-alert-production.up.railway.app/notify`

The service provides audio feedback directly in your browser when deployment events occur.