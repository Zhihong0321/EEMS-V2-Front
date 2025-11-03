"use client";

import { useEffect, useState } from 'react';

export default function TestDeployPage() {
  // DEPLOYMENT VERIFICATION - UPDATE THIS TIMESTAMP TO TEST DEPLOYMENTS
  const DEPLOYMENT_ID = "2024-11-03-15:45:30-KIRO-TEST-v47";
  const buildTime = new Date().toISOString();
  const [versionInfo, setVersionInfo] = useState<any>(null);

  useEffect(() => {
    // Fetch version info from API
    fetch('/api/version?' + Date.now())
      .then(res => res.json())
      .then(data => setVersionInfo(data))
      .catch(err => console.error('Failed to fetch version:', err));
  }, []);
  
  return (
    <div className="min-h-screen bg-red-500 p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-6xl font-bold text-white mb-8 animate-pulse">
          🚨 DEPLOYMENT TEST v47 🚨
        </h1>
        
        <div className="bg-yellow-400 text-black p-8 rounded-lg mb-8 border-8 border-white">
          <h2 className="text-4xl font-bold mb-4">🔥 DEPLOYMENT VERIFICATION 🔥</h2>
          <p className="text-2xl mb-2 font-bold">DEPLOYMENT ID: {DEPLOYMENT_ID}</p>
          <p className="text-xl mb-2">Client Build Time: {buildTime}</p>
          <p className="text-xl mb-2">Client Random: {Math.random()}</p>
          
          {versionInfo && (
            <div className="mt-4 p-4 bg-green-200 rounded">
              <h3 className="text-lg font-bold">🌐 SERVER VERSION INFO:</h3>
              <p>Version: {versionInfo.version}</p>
              <p>Build Time: {versionInfo.buildTime}</p>
              <p>Build ID: {versionInfo.buildId}</p>
              <p>Server Random: {versionInfo.random}</p>
            </div>
          )}
          
          <p className="text-xl font-bold text-green-800 mt-4">✅ IF YOU SEE v47, DEPLOYMENT WORKS!</p>
        </div>
        
        <button
          onClick={() => {
            alert(`🎉 DEPLOYMENT v47 CONFIRMED!\n\nDeployment ID: ${DEPLOYMENT_ID}\nBuild: ${buildTime}\nTime: ${new Date().toLocaleString()}`);
          }}
          className="px-8 py-4 bg-green-500 text-white text-3xl font-bold rounded-lg hover:bg-green-400 border-4 border-white animate-bounce"
        >
          🎯 CLICK TO CONFIRM v47
        </button>
        
        <div className="mt-8 text-white bg-black p-4 rounded-lg">
          <p className="text-2xl font-bold">🔍 DEBUGGING STEPS:</p>
          <p className="text-lg">1. Navigate to: /test-deploy</p>
          <p className="text-lg">2. Look for &quot;v47&quot; in the title</p>
          <p className="text-lg">3. Check DEPLOYMENT ID matches above</p>
          <p className="text-lg">4. If old version shows, clear cache (Ctrl+F5)</p>
        </div>
      </div>
    </div>
  );
}