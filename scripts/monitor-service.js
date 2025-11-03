#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Import our alert function
const alertScript = path.join(__dirname, 'deployment-alert.js');

function sendAlert(event) {
  return new Promise((resolve) => {
    const child = spawn('node', [alertScript, event], { stdio: 'inherit' });
    child.on('close', (code) => resolve(code === 0));
  });
}

function startService() {
  console.log('🚀 Starting service with monitoring...');
  
  const service = spawn('npm', ['run', 'start'], { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  service.on('error', (err) => {
    console.error('❌ Service error:', err);
    sendAlert('service_crash');
  });

  service.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Service exited with code ${code}`);
      sendAlert('service_crash');
    } else if (signal) {
      console.error(`❌ Service killed with signal ${signal}`);
      sendAlert('service_crash');
    }
  });

  // Handle process termination
  process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM, shutting down gracefully...');
    service.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('📡 Received SIGINT, shutting down gracefully...');
    service.kill('SIGINT');
  });
}

if (require.main === module) {
  startService();
}

module.exports = { startService, sendAlert };