"use client";

export default function TestDeployPage() {
  const buildTime = new Date().toISOString();
  
  return (
    <div className="min-h-screen bg-red-500 p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-6xl font-bold text-white mb-8">
          🚨 DEPLOYMENT TEST PAGE 🚨
        </h1>
        
        <div className="bg-white text-black p-8 rounded-lg mb-8">
          <h2 className="text-3xl font-bold mb-4">BUILD INFO</h2>
          <p className="text-xl mb-2">Build Time: {buildTime}</p>
          <p className="text-xl mb-2">Random: {Math.random()}</p>
          <p className="text-xl">If you see this, deployment works!</p>
        </div>
        
        <button
          onClick={() => {
            alert(`🎉 JAVASCRIPT WORKS!\n\nBuild: ${buildTime}\nTime: ${new Date().toLocaleString()}`);
          }}
          className="px-8 py-4 bg-yellow-500 text-black text-2xl font-bold rounded-lg hover:bg-yellow-400"
        >
          🧪 TEST BUTTON
        </button>
        
        <div className="mt-8 text-white">
          <p className="text-xl">Navigate to: /test-deploy</p>
          <p className="text-lg">This page should be BRIGHT RED and impossible to miss!</p>
        </div>
      </div>
    </div>
  );
}