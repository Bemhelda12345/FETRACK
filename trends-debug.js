/* trends-debug.js - Debug version to find the problematic import */
console.log("trends-debug.js is loading...");

export async function renderTrendsView() {
  console.log("renderTrendsView called in debug-trends.js");
  const container = document.getElementById("app-container");
  
  // Show loading state
  container.innerHTML = `
    <div style="padding: 2rem;">
      <h1>🔍 Trends Debug Page</h1>
      <p>Testing imports...</p>
      <div id="debug-output" style="border: 1px solid #ccc; padding: 1rem; margin: 1rem 0; background: #f5f5f5; font-family: monospace; min-height: 200px;">
        <p>Loading...</p>
      </div>
      <button onclick="window.location.hash = '#dashboard'" style="padding: 0.5rem 1rem; margin-top: 1rem;">Back</button>
    </div>
  `;
  
  const debugOutput = document.getElementById("debug-output");
  let output = "";
  
  const log = (msg) => {
    console.log(msg);
    output += msg + "\n";
    debugOutput.innerHTML = `<pre>${output}</pre>`;
  };
  
  try {
    log("✓ trends-debug.js loaded");
    
    log("\n[1/3] Testing firebase-config.js...");
    try {
      await import("./firebase-config.js");
      log("✓ firebase-config.js imported successfully");
    } catch (e) {
      log("✗ firebase-config.js failed: " + e.message);
      throw e;
    }
    
    log("\n[2/3] Testing analytics.js...");
    try {
      const analyticsModule = await import("./analytics.js");
      log("✓ analytics.js imported");
      log("  Exports: " + Object.keys(analyticsModule).join(", "));
    } catch (e) {
      log("✗ analytics.js failed: " + e.message);
      throw e;
    }
    
    log("\n[3/3] Testing alerts.js...");
    try {
      const alertsModule = await import("./alerts.js");
      log("✓ alerts.js imported");
      log("  Exports: " + Object.keys(alertsModule).join(", "));
    } catch (e) {
      log("✗ alerts.js failed: " + e.message);
      throw e;
    }
    
    log("\n✅ ALL IMPORTS SUCCESSFUL!");
    log("\nNow try importing the real trends.js...");
    
  } catch (error) {
    log("\n❌ ERROR: " + error.message);
    log("Stack: " + error.stack);
  }
}
