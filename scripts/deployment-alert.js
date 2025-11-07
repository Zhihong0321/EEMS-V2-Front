#!/usr/bin/env node

const https = require('https');
const http = require('http');

const ALERT_URL = 'http://development-alert-production.up.railway.app/notify';
const PROJECT_NAME = process.env.RAILWAY_PROJECT_NAME || 'EEMS-Frontend';

function sendAlert(event) {
  const url = `${ALERT_URL}?project=${encodeURIComponent(PROJECT_NAME)}&event=${event}`;
  
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      console.log(`✅ Deployment alert sent: ${event} (${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`⚠️  Failed to send deployment alert: ${event} - ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`⚠️  Deployment alert timeout: ${event}`);
      resolve(false);
    });
  });
}

const event = process.argv[2];
if (!event) {
  console.error('Usage: node deployment-alert.js <event>');
  console.error('Events: build_start, build_success, build_failure, deployment_success, deployment_failure, service_crash');
  process.exit(1);
}

sendAlert(event);