/* trends.js */
import { auth, database } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

async function getConsumptionData() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekData = [];
  
  // Generate structure for the past 7 days with 0 values
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = days[date.getDay()];
    weekData.push({
      date: dayName,
      fullDate: date.toISOString().split('T')[0],
      usage: 0,
      dayOfWeek: date.getDay()
    });
  }
  
  try {
    const user = auth.currentUser;
    if (!user) {
      return weekData; // Return 0 values if no user
    }
    
    // Get daily usage data instead of total readings
    const dailyUsageRef = ref(database, `daily_usage/${user.uid}`);
    const snapshot = await get(dailyUsageRef);
    
    if (!snapshot.exists()) {
      return weekData; // Return 0 values if no data
    }
    
    const data = snapshot.val();
    
    // Map daily usage data to our week structure
    weekData.forEach(day => {
      if (data[day.fullDate]) {
        day.usage = parseFloat(data[day.fullDate].usage || 0);
      }
    });
    
    return weekData;
  } catch (error) {
    console.error("Error fetching consumption data:", error);
    return weekData; // Return 0 values on error
  }
}

// Create CSS-based chart for better mobile compatibility
function createCSSChart(container, data) {
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="no-data-message">No consumption data available.</div>';
    return;
  }

  const maxUsage = Math.max(...data.map(item => item.usage));
  const minUsage = Math.min(...data.map(item => item.usage));
  const usageRange = maxUsage - minUsage || 1; // Prevent division by zero

  let chartHTML = `
    <div class="css-chart">
      <div class="chart-title">Daily Electricity Consumption (kWh)</div>
      <div class="chart-area">
        <div class="y-axis">
          <div class="y-label">${maxUsage.toFixed(1)}</div>
          <div class="y-label">${((maxUsage + minUsage) / 2).toFixed(1)}</div>
          <div class="y-label">${minUsage.toFixed(1)}</div>
        </div>
        <div class="chart-content">
          <div class="chart-grid">
            <div class="grid-line"></div>
            <div class="grid-line"></div>
            <div class="grid-line"></div>
            <div class="grid-line"></div>
            <div class="grid-line"></div>
          </div>
          <div class="chart-bars">
  `;

  data.forEach((point, index) => {
    const heightPercent = ((point.usage - minUsage) / usageRange) * 80 + 10; // Min 10% height
    chartHTML += `
      <div class="bar-container">
        <div class="bar-value">${point.usage.toFixed(1)}</div>
        <div class="bar" style="height: ${heightPercent}%">
          <div class="bar-dot"></div>
        </div>
        <div class="bar-label">${point.date}</div>
      </div>
    `;
  });

  chartHTML += `
          </div>
          <svg class="chart-line" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="`;

  // Create line points
  data.forEach((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - (((point.usage - minUsage) / usageRange) * 80 + 10);
    chartHTML += `${x},${y} `;
  });

  chartHTML += `" fill="none" stroke="#66bb6a" stroke-width="2" vector-effect="non-scaling-stroke"/>
          </svg>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = chartHTML;
}

// Render the Trends view
export async function renderTrendsView() {
  const container = document.getElementById("app-container");
  container.innerHTML = `
    <div class="trends-container">
      <div class="trends-header">
        <button class="back-btn" id="back-btn">← Back to Dashboard</button>
        <h2>Consumption Trends</h2>
        <p>Daily electricity usage pattern for the past week</p>
        <button class="refresh-btn" id="refresh-trends">Refresh Trends</button>
      </div>
      
      <div class="trends-content">
        <div class="chart-wrapper" id="chart-container">
          <div class="loading">Loading consumption data...</div>
        </div>
        
        <div class="trends-stats">
          <div class="stat-card">
            <h3>Average Daily Usage</h3>
            <div class="stat-value" id="avg-usage">0.0 kWh</div>
          </div>
          <div class="stat-card">
            <h3>Peak Usage Day</h3>
            <div class="stat-value" id="peak-day">No data</div>
          </div>
          <div class="stat-card">
            <h3>Lowest Usage Day</h3>
            <div class="stat-value" id="low-day">No data</div>
          </div>
          <div class="stat-card">
            <h3>Weekly Total</h3>
            <div class="stat-value" id="weekly-total">0.0 kWh</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Get consumption data and create chart
  try {
    const historyData = await getConsumptionData();
    const chartContainer = document.getElementById("chart-container");
    
    // Create CSS-based chart for better mobile compatibility
    createCSSChart(chartContainer, historyData);
    
    // Update statistics
    updateTrendsStats(historyData);
    
  } catch (error) {
    console.error("Error rendering trends:", error);
    document.getElementById("chart-container").innerHTML = 
      '<div class="error-message">Error loading consumption data from Firebase.</div>';
  }
  
  // Back button functionality
  document.getElementById("back-btn").addEventListener("click", () => {
    window.location.hash = "#dashboard";
  });

  // Refresh trends functionality
  document.getElementById("refresh-trends").addEventListener("click", async () => {
    const chartContainer = document.getElementById("chart-container");
    chartContainer.innerHTML = '<div class="loading">Refreshing consumption data...</div>';
    try {
      const newData = await getConsumptionData();
      createCSSChart(chartContainer, newData);
      updateTrendsStats(newData);
    } catch (error) {
      console.error("Error refreshing trends data:", error);
      chartContainer.innerHTML = '<div class="error-message">Error refreshing data.</div>';
    }
  });
}

// Update trends statistics
function updateTrendsStats(data) {
  if (!data || data.length === 0) {
    document.getElementById("avg-usage").textContent = "0.0 kWh";
    document.getElementById("peak-day").textContent = "No data";
    document.getElementById("low-day").textContent = "No data";
    document.getElementById("weekly-total").textContent = "0.0 kWh";
    return;
  }
  
  // Calculate statistics based on actual usage (not dummy data)
  const actualUsageData = data.filter(item => item.usage > 0);
  
  if (actualUsageData.length === 0) {
    document.getElementById("avg-usage").textContent = "0.0 kWh";
    document.getElementById("peak-day").textContent = "No data";
    document.getElementById("low-day").textContent = "No data";
    document.getElementById("weekly-total").textContent = "0.0 kWh";
    return;
  }
  
  const totalUsage = actualUsageData.reduce((sum, item) => sum + item.usage, 0);
  const avgUsage = totalUsage / actualUsageData.length;
  
  const peakUsage = Math.max(...actualUsageData.map(item => item.usage));
  const lowUsage = Math.min(...actualUsageData.map(item => item.usage));
  
  const peakDay = actualUsageData.find(item => item.usage === peakUsage);
  const lowDay = actualUsageData.find(item => item.usage === lowUsage);
  
  // Update DOM elements with real data
  document.getElementById("avg-usage").textContent = `${avgUsage.toFixed(1)} kWh`;
  
  if (peakUsage > 0) {
    document.getElementById("peak-day").textContent = `${peakDay.date} (${peakUsage.toFixed(1)} kWh)`;
    document.getElementById("low-day").textContent = `${lowDay.date} (${lowUsage.toFixed(1)} kWh)`;
  } else {
    document.getElementById("peak-day").textContent = "No data";
    document.getElementById("low-day").textContent = "No data";
  }
  
  document.getElementById("weekly-total").textContent = `${totalUsage.toFixed(1)} kWh`;
}

// Cleanup function for trends view
export function cleanupTrendsView() {
  // Remove any event listeners if needed
  console.log("Trends view cleaned up");
}
