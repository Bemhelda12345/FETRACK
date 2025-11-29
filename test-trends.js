/* test-trends.js - Minimal test version */
console.log("test-trends.js is loading...");

export async function renderTrendsView() {
  console.log("renderTrendsView called in test-trends.js");
  const container = document.getElementById("app-container");
  container.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h1>✅ Trends Page Loaded Successfully!</h1>
      <p>If you see this, the module import is working.</p>
      <button onclick="window.location.hash = '#dashboard'">Back to Dashboard</button>
    </div>
  `;
}

console.log("test-trends.js loaded completely");
