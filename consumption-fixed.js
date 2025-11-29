import { database, auth } from "./firebase-config.js";
import { ref, onValue, set, push, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { getUserProfile } from "./profile.js";
import { showToastNotification, clearAlertFromHistory } from "./alerts.js";

let consumptionListener = null;
let lastDailyConsumption = null;
let currentConsumedAmount = 0; // Store current consumed amount for Bill projection
let currentConsumption = 0; // Store current meter reading
let currentRate = 0; // Store current rate

// Render the consumption dashboard
export function renderConsumptionDashboard() {
  const container = document.getElementById("app-container");
  container.innerHTML = `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h2>Electric Consumption Dashboard</h2>
        <p>Monitor your electricity usage and manage payments</p>
      </div>
      
      <div class="dashboard-grid">
        <!-- Current Consumption Card -->
        <div class="consumption-card card">
          <div class="card-header">
            <h3>Current Consumption</h3>
            <div class="status-indicator" id="connection-status">
              <span class="status-dot"></span>
              <span class="status-text">Connecting...</span>
            </div>
          </div>
          <div class="card-content">
            <div class="consumption-display">
              <div class="consumption-value" id="consumption-value">
                <span class="value">--</span>
                <span class="unit">kWh</span>
              </div>
            </div>
            <div class="consumption-details consumption-details-centered">
              <div class="detail-item">
                <span class="label">Date & Time:</span>
                <span class="value" id="last-updated">--</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bill Summary Card -->
        <div class="bill-card card">
          <div class="card-header">
            <h3>Consumed Amount</h3>
          </div>
          <div class="card-content">
            <div class="bill-amount">
              <span class="currency">₱</span>
              <span class="amount" id="bill-amount">0.00</span>
            </div>
            <div class="consumption-rate" id="consumption-rate">
              Rate: <span>--</span> ₱/kWh
            </div>
            <div class="consumption-formula" id="consumption-formula">
              <small>(kWh - Past Usage) × Price</small>
            </div>
            <button class="calculate-bill-btn" id="calculate-bill-btn">
              🧮 Bill Calculator
            </button>
            <button class="pay-bill-btn" id="pay-bill-btn" style="
              width: 100%;
              padding: 0.75rem;
              margin-top: 0.75rem;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              font-size: 0.95rem;
            ">💳 Pay Bill</button>
          </div>
        </div>

        <!-- Analytics Quick Access Card -->
        <div class="analytics-quick-card card">
          <div class="card-header">
            <h3>📊 Analytics</h3>
          </div>
          <div class="card-content">
            <p style="margin: 0 0 1rem 0; font-size: 0.9rem; color: white;">Quick access to your consumption analysis</p>
            <div class="analytics-quick-buttons">
              <button class="quick-analytics-btn" data-analytics="overview" title="Daily consumption overview">
                <span>📊</span>
                <span>Overview</span>
              </button>
              <button class="quick-analytics-btn" data-analytics="trends" title="Monthly & weekly trends">
                <span>📈</span>
                <span>Trends</span>
              </button>
              <button class="quick-analytics-btn" data-analytics="projections" title="Bill projections">
                <span>🎯</span>
                <span>Projections</span>
              </button>
              <button class="quick-analytics-btn" data-analytics="recommendations" title="Energy savings tips">
                <span>💡</span>
                <span>Tips</span>
              </button>
              <button class="quick-analytics-btn" data-analytics="alerts" title="Alerts & history">
                <span>🚨</span>
                <span>Alerts</span>
              </button>
              <button class="quick-analytics-btn" data-analytics="calendar" title="Monthly usage calendar">
                <span>📅</span>
                <span>Calendar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Dialog -->
    <dialog id="analytics-dialog" style="
      border: none;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 2rem;
      width: 90%;
      max-width: 900px;
      max-height: 80vh;
      overflow-y: auto;
      background: white;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 id="analytics-dialog-title" style="margin: 0; color: #1e3c72;">📊 Analytics</h2>
        <button id="analytics-close-btn" style="
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-weight: 600;
        ">Close</button>
      </div>
      
      <div style="border-bottom: 2px solid #e5e7eb; margin-bottom: 1.5rem; position: relative; z-index: 1;">
        <div style="display: flex; gap: 1rem; overflow-x: auto;">
          <button class="analytics-tab-btn" data-tab="overview" style="
            padding: 0.75rem 1rem;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            color: #666;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            position: relative;
            z-index: 2;
            pointer-events: auto;
          ">📊 Overview</button>
          <button class="analytics-tab-btn" data-tab="trends" style="
            padding: 0.75rem 1rem;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            color: #666;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            position: relative;
            z-index: 2;
            pointer-events: auto;
          ">📈 Trends</button>
          <button class="analytics-tab-btn" data-tab="projections" style="
            padding: 0.75rem 1rem;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            color: #666;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            position: relative;
            z-index: 2;
            pointer-events: auto;
          ">🎯 Bill</button>
          <button class="analytics-tab-btn" data-tab="recommendations" style="
            padding: 0.75rem 1rem;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            color: #666;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            position: relative;
            z-index: 2;
            pointer-events: auto;
          ">💡 Tips</button>
          <button class="analytics-tab-btn" data-tab="alerts" style="
            padding: 0.75rem 1rem;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            color: #666;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            position: relative;
            z-index: 2;
            pointer-events: auto;
          ">🚨 Alerts</button>
          <button class="analytics-tab-btn" data-tab="calendar" style="
            padding: 0.75rem 1rem;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            color: #666;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
            position: relative;
            z-index: 2;
            pointer-events: auto;
          ">📅 Calendar</button>
        </div>
      </div>
      
      <div id="analytics-dialog-content">
        <div id="tab-overview" class="analytics-tab-content" style="display: none;"></div>
        <div id="tab-trends" class="analytics-tab-content" style="display: none;"></div>
        <div id="tab-projections" class="analytics-tab-content" style="display: none;"></div>
        <div id="tab-recommendations" class="analytics-tab-content" style="display: none;"></div>
        <div id="tab-alerts" class="analytics-tab-content" style="display: none;"></div>
        <div id="tab-calendar" class="analytics-tab-content" style="display: none;"></div>
      </div>
    </dialog>
  `;

  // Initialize dashboard functionality
  initializeDashboard();
}

// Initialize dashboard functionality
function initializeDashboard() {
  // Set initial date and time
  document.getElementById("last-updated").textContent = new Date().toLocaleString();
  
  fetchUserDevice();
  setupEventListeners();
  setupAnalyticsButtons();
  startAutoRefresh();
}

// Auto-refresh timer (updates every 10 seconds)
let autoRefreshTimer = null;

function startAutoRefresh() {
  // Clear any existing timer
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }
  
  // Update "Date & Time" every 1 second
  autoRefreshTimer = setInterval(() => {
    const lastUpdatedElement = document.getElementById("last-updated");
    if (lastUpdatedElement && lastUpdatedElement.textContent !== "--" && lastUpdatedElement.textContent !== "Error loading data") {
      // Smoothly update the timestamp without reloading data
      lastUpdatedElement.textContent = new Date().toLocaleString();
    }
  }, 1000); // 1 second
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// Fetch user device data based on phone number from profile
async function fetchUserDevice() {
  const user = auth.currentUser;
  if (!user) {
    console.error("User not authenticated");
    updateConnectionStatus("error");
    displayError("User not authenticated. Please sign in again.");
    return;
  }
  
  console.log("Fetching user device data for:", user.email);
  updateConnectionStatus("connecting");
  
  try {
    const profileData = await getUserProfile(user.uid);
    
    if (!profileData || !profileData.phone) {
      updateConnectionStatus("no-data");
      displayError("Phone number missing in your profile. Please update your profile with your device phone number.");
      return;
    }
    
    const userPhone = profileData.phone.trim();
    console.log("Looking for device with phone number:", userPhone);
    
    const devicesRef = ref(database, "devices");
    
    consumptionListener = onValue(devicesRef, (snapshot) => {
      try {
        const devices = snapshot.val();
        console.log("Received devices data:", devices);
        
        if (!devices) {
          updateConnectionStatus("no-data");
          displayError("No device data available in the database.");
          return;
        }
        
        let matchedDevice = null;
        let matchedDeviceId = null;
        
        for (const deviceId in devices) {
          const device = devices[deviceId];
          const devicePhone = device["Contact Number"] || device.phone || device.contactNumber || deviceId;

          // Normalize phone numbers by removing +63 prefix for flexible matching
          const normalizedDevicePhone = devicePhone ? devicePhone.toString().trim().replace(/^\+63/, '') : '';
          const normalizedUserPhone = userPhone.replace(/^\+63/, '');

          if (normalizedDevicePhone && normalizedDevicePhone === normalizedUserPhone) {
            matchedDevice = device;
            matchedDeviceId = deviceId;
            console.log("Found matching device:", deviceId, device);
            break;
          }
        }
        
        if (matchedDevice) {
          updateConnectionStatus("connected");
          updateDeviceData(matchedDevice, matchedDeviceId);
        } else {
          updateConnectionStatus("no-data");
          displayError(`No device found matching your phone number: ${userPhone}. Please verify your profile phone number matches your device registration.`);
        }
        
      } catch (error) {
        console.error("Error processing devices data:", error);
        updateConnectionStatus("error");
        displayError("Error loading device data: " + error.message);
      }
    }, (error) => {
      console.error("Error fetching devices data:", error);
      updateConnectionStatus("error");
      displayError("Failed to connect to device database: " + error.message);
    });
    
  } catch (error) {
    console.error("Error fetching user profile:", error);
    updateConnectionStatus("error");
    displayError("Failed to load user profile: " + error.message);
  }
}

// Update device data display based on matched device
function updateDeviceData(deviceData, deviceId) {
  if (!deviceData || typeof deviceData !== "object") {
    displayError("Invalid device data received");
    return;
  }
  
  console.log("Updating device data display:", deviceData);
  
  const consumption = Number(deviceData.kwh || deviceData.kwhr || 0);
  const rate = Number(deviceData.price || deviceData.Price || 12.50);
  const timestamp = deviceData.timestamp || Date.now();
  const deviceName = deviceData.Name || deviceData.name || `Device ${deviceId}`;
  const deviceAddress = deviceData.Address || deviceData.address || "Unknown Location";
  
  console.log("Extracted data:", { consumption, rate, timestamp, deviceName, deviceAddress });
  
  // Update consumption display (show total meter reading)
  document.getElementById("consumption-value").innerHTML = `
    <span class="value">${consumption % 1 === 0 ? consumption : consumption.toFixed(2)}</span>
    <span class="unit">kWh</span>
  `;
  
  document.getElementById("consumption-rate").innerHTML = `
    Rate: <span>₱${rate.toFixed(2)}</span> /kWh
  `;
  
  // Get past usage from device data - use previousUsage field
  const pastUsage = Number(deviceData.previousUsage || deviceData.past_usage || deviceData["past usage"] || 0);

  // Calculate consumed amount: (kWh - past usage) × rate
  const consumedAmount = Math.max(0, (consumption - pastUsage)) * rate;
  
  // Store for Bill projection in analytics
  currentConsumedAmount = consumedAmount;
  currentConsumption = consumption;
  currentRate = rate;
  
  // Export to window for payment form auto-population
  window.currentConsumedAmount = consumedAmount;
  window.currentConsumption = consumption;
  window.currentRate = rate;
  
  document.getElementById("bill-amount").textContent = consumedAmount.toFixed(2);
  
  // Update the formula display with actual values
  const formatNumber = (num) => {
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };
  
  document.getElementById("consumption-formula").innerHTML = `
    <small>(${formatNumber(consumption)} kWh - ${formatNumber(pastUsage)} Past Usage) × ₱${formatNumber(rate)} = ₱${formatNumber(consumedAmount)}</small>
  `;
  
  console.log(`Calculation: (${consumption} - ${pastUsage}) × ${rate} = ${consumedAmount}`);

  // Calculate actual usage based on previous readings
  calculateDailyUsage(consumption, deviceId);

  window.currentConsumptionData = {
    consumption,
    rate,
    timestamp,
    deviceName,
    deviceAddress,
    deviceId
  };

  console.log("Device data display updated successfully");
}

// Calculate daily usage based on previous readings
async function calculateDailyUsage(currentConsumption, deviceId) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
    const currentDay = now.getDate();
    
    // Get yesterday's reading
    const yesterdayRef = ref(database, `meter_readings/${user.uid}/${yesterday}`);
    const yesterdaySnapshot = await get(yesterdayRef);
    
    // Get month cycle data
    const monthCycleRef = ref(database, `month_cycle/${user.uid}/${currentMonth}`);
    const monthCycleSnapshot = await get(monthCycleRef);
    
    let todayUsage = 0;
    let monthlyAccumulatedUsage = 0;
    
    // Calculate today's usage
    if (yesterdaySnapshot.exists()) {
      const yesterdayReading = yesterdaySnapshot.val().reading;
      todayUsage = Math.max(0, currentConsumption - yesterdayReading);
    } else {
      // First reading or no yesterday data
      todayUsage = 0;
    }
    
    // Check if we need to reset monthly cycle (every 30 days)
    if (monthCycleSnapshot.exists()) {
      const cycleData = monthCycleSnapshot.val();
      const cycleStartDay = cycleData.startDay || 1;
      const accumulated = cycleData.accumulated || 0;
      
      // Check if we're on day 30 - time to reset
      if (currentDay === 30) {
        // Reset the cycle - start fresh
        monthlyAccumulatedUsage = todayUsage;
        await set(monthCycleRef, {
          startDay: 1,
          accumulated: todayUsage,
          lastReset: Date.now(),
          resetReading: currentConsumption
        });
        console.log(`Monthly cycle reset on day 30. New cycle starting with ${todayUsage} kWh`);
      } else {
        // Accumulate today's usage to the monthly total
        monthlyAccumulatedUsage = accumulated + todayUsage;
        await update(monthCycleRef, {
          accumulated: monthlyAccumulatedUsage,
          lastUpdated: Date.now()
        });
      }
    } else {
      // First time this month - initialize the cycle
      monthlyAccumulatedUsage = todayUsage;
      await set(monthCycleRef, {
        startDay: currentDay,
        accumulated: todayUsage,
        lastReset: Date.now(),
        resetReading: currentConsumption
      });
      console.log(`Initialized new monthly cycle starting day ${currentDay} with ${todayUsage} kWh`);
    }
    
    // Store today's reading for tomorrow's calculation
    const todayRef = ref(database, `meter_readings/${user.uid}/${today}`);
    await set(todayRef, { reading: currentConsumption, timestamp: Date.now() });
    
    // Get user's phone number
    const profileRef = ref(database, `users/${user.uid}/profile`);
    const profileSnapshot = await get(profileRef);
    const phoneNumber = profileSnapshot.exists() ? profileSnapshot.val().phone : null;
    
    // Store today's usage for trends (use phone number if available, otherwise uid)
    const userIdentifier = phoneNumber || user.uid;
    const todayUsageRef = ref(database, `daily_usage/${userIdentifier}/${today}`);
    await set(todayUsageRef, { usage: todayUsage, timestamp: Date.now(), phoneNumber: phoneNumber });
    
    // Update display
    document.getElementById("last-updated").textContent = now.toLocaleString();

    // Update past usage every end of month (30th day)
    if (currentDay === 30) {
      const deviceRef = ref(database, `devices/${deviceId}`);
      await update(deviceRef, { previousUsage: currentConsumption });
      console.log(`Updated previous usage to ${currentConsumption} kWh on day 30`);
    }

    console.log(`Current meter reading: ${currentConsumption} kWh`);
    console.log(`Today's usage: ${todayUsage} kWh`);
    console.log(`This month's accumulated usage: ${monthlyAccumulatedUsage} kWh`);
    console.log(`Current day of month: ${currentDay}`);

  } catch (error) {
    console.error("Error calculating daily usage:", error);
    document.getElementById("last-updated").textContent = new Date().toLocaleString();
  }
}

// Update connection status indicator
function updateConnectionStatus(status) {
  const statusElement = document.getElementById("connection-status");
  const statusDot = statusElement.querySelector(".status-dot");
  const statusText = statusElement.querySelector(".status-text");
  
  statusElement.className = `status-indicator ${status}`;
  
  switch (status) {
    case "connecting":
      statusText.textContent = "Connecting...";
      break;
    case "connected":
      statusText.textContent = "Live";
      break;
    case "no-data":
      statusText.textContent = "No Data";
      break;
    case "error":
      statusText.textContent = "Error";
      break;
  }
}

// Display error message
function displayError(message) {
  console.error("Dashboard Error:", message);
  
  document.getElementById("consumption-value").innerHTML = `
    <span class="value error">0.00</span>
    <span class="unit">kWh</span>
  `;
  document.getElementById("consumption-rate").innerHTML = `Rate: <span>0.00</span> ₱/kWh`;
  
  document.getElementById("bill-amount").textContent = "0.00";
  
  document.getElementById("last-updated").textContent = "Error loading data";
}

// Set up event listeners
function setupEventListeners() {
  const calcBtn = document.getElementById("calculate-bill-btn");
  const payBtn = document.getElementById("pay-bill-btn");
  
  if (calcBtn) {
    calcBtn.addEventListener("click", openBillCalculator);
  }
  
  if (payBtn) {
    payBtn.addEventListener("click", () => {
      window.location.hash = '#pay';
    });
  }
}

// Bill Calculator Functions
function openBillCalculator() {
  const dialog = document.getElementById('bill-calculator-dialog');
  const closeBtn = document.getElementById('calc-close-btn');
  const cancelBtn = document.getElementById('calc-cancel-btn');
  const calculateBtn = document.getElementById('calc-calculate-btn');
  const resultDiv = document.getElementById('calc-result');
  
  // Reset form
  document.getElementById('calc-current-reading').value = '';
  document.getElementById('calc-previous-reading').value = '';
  document.getElementById('calc-price-per-kwh').value = '';
  resultDiv.style.display = 'none';
  
  // Show dialog
  dialog.showModal();
  
  // Event handlers
  const handleClose = () => {
    dialog.close();
  };
  
  const handleCalculate = () => {
    const currentReading = parseFloat(document.getElementById('calc-current-reading').value);
    const previousReading = parseFloat(document.getElementById('calc-previous-reading').value);
    const pricePerKwh = parseFloat(document.getElementById('calc-price-per-kwh').value);
    
    // Validate inputs
    if (isNaN(currentReading) || isNaN(previousReading) || isNaN(pricePerKwh)) {
      alert('Please fill in all fields with valid numbers.');
      return;
    }
    
    if (currentReading < previousReading) {
      alert('Current reading must be greater than or equal to previous reading.');
      return;
    }
    
    if (pricePerKwh <= 0) {
      alert('Price per kWh must be greater than 0.');
      return;
    }
    
    // Calculate consumption and bill
    const consumption = currentReading - previousReading;
    const totalBill = consumption * pricePerKwh;
    
    // Display result with formula breakdown
    document.getElementById('current-val').textContent = currentReading.toFixed(2);
    document.getElementById('past-val').textContent = previousReading.toFixed(2);
    document.getElementById('rate-val').textContent = pricePerKwh.toFixed(2);
    document.getElementById('rate-val2').textContent = pricePerKwh.toFixed(2);
    document.getElementById('consumption-val').textContent = consumption.toFixed(2);
    document.getElementById('calc-result-amount').textContent = totalBill.toFixed(2);
    
    resultDiv.style.display = 'block';
  };
  
  // Add event listeners
  closeBtn.onclick = handleClose;
  cancelBtn.onclick = handleClose;
  calculateBtn.onclick = handleCalculate;
  
  // Close on backdrop click
  dialog.onclick = (e) => {
    if (e.target === dialog) {
      handleClose();
    }
  };
  
  // Handle Enter key in inputs
  const inputs = [
    document.getElementById('calc-current-reading'),
    document.getElementById('calc-previous-reading'),
    document.getElementById('calc-price-per-kwh')
  ];
  
  inputs.forEach(input => {
    input.onkeypress = (e) => {
      if (e.key === 'Enter') {
        handleCalculate();
      }
    };
  });
}

// Process payment
async function processPayment() {
  const paymentBtn = document.getElementById("payment-btn");
  const btnText = paymentBtn.querySelector(".btn-text");
  const btnLoading = paymentBtn.querySelector(".btn-loading");
  const paymentMessage = document.getElementById("payment-message");
  
  btnText.style.display = "none";
  btnLoading.style.display = "inline";
  paymentBtn.disabled = true;
  paymentMessage.textContent = "";
  paymentMessage.className = "payment-message";

  try {
    const billAmount = document.getElementById("bill-amount").textContent;
    const billAmountFloat = parseFloat(billAmount);
    
    if (!billAmount || billAmount === "0.00" || billAmountFloat <= 0) {
      throw new Error("No amount to pay or invalid amount");
    }

    const confirmPayment = confirm(`Are you sure you want to make a payment of ₱${billAmount}?`);
    if (!confirmPayment) {
      throw new Error("Payment cancelled by user");
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated. Please sign in again.");
    }

    const paymentData = {
      userId: user.uid,
      userEmail: user.email,
      amount: billAmountFloat,
      currency: "PHP",
      timestamp: Date.now(),
      date: new Date().toISOString(),
      status: "completed",
      paymentMethod: "credit_card",
      transactionId: generateTransactionId(),
      description: "Electricity bill payment (Raw Amount)"
    };
    
    const paymentsRef = ref(database, `payments/${user.uid}`);
    await push(paymentsRef, paymentData);
    
    paymentMessage.textContent = `Payment of ₱${billAmount} processed successfully! Transaction ID: ${paymentData.transactionId}`;
    paymentMessage.className = "payment-message success";
    
    setTimeout(() => {
      document.getElementById("bill-amount").textContent = "0.00";
    }, 1000);
    
  } catch (error) {
    console.error("Payment processing error:", error);
    
    if (error.message === "Payment cancelled by user") {
      paymentMessage.textContent = "Payment cancelled";
      paymentMessage.className = "payment-message";
    } else {
      paymentMessage.textContent = error.message || "Payment failed. Please try again.";
      paymentMessage.className = "payment-message error";
    }
  } finally {
    btnText.style.display = "inline";
    btnLoading.style.display = "none";
    paymentBtn.disabled = false;
  }
}

// Quick action functions


// Utility functions
function generateTransactionId() {
  return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

async function getFirebaseHistory() {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  try {
    const historyRef = ref(database, `history/${user.uid}`);
    const snapshot = await get(historyRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const data = snapshot.val();
    const history = [];
    
    for (const key in data) {
      const item = data[key];
      history.push({
        date: item.date || new Date(item.timestamp).toLocaleDateString(),
        usage: parseFloat(item.usage || 0).toFixed(2),
        cost: parseFloat(item.cost || 0).toFixed(2)
      });
    }
    
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return history.slice(0, 7);
  } catch (error) {
    console.error("Error fetching history from Firebase:", error);
    return [];
  }
}

// Setup analytics quick access buttons
function setupAnalyticsButtons() {
  console.log('setupAnalyticsButtons called');
  
  const dialog = document.getElementById('analytics-dialog');
  
  if (!dialog) {
    console.error('Analytics dialog not found in DOM');
    return;
  }
  
  // Individual button click handlers
  const analyticsButtons = document.querySelectorAll('.quick-analytics-btn');
  console.log('Found ' + analyticsButtons.length + ' analytics buttons');
  
  analyticsButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const analysisType = btn.getAttribute('data-analytics');
      console.log('Analytics button clicked:', analysisType);
      
      try {
        await initializeAnalyticsDialog(analysisType);
        dialog.showModal();
        console.log('Dialog shown successfully');
      } catch (err) {
        console.error('Error with analytics:', err);
        alert('Error loading analytics');
      }
    });
  });
  
  // Close button handler
  const closeBtn = document.getElementById('analytics-close-btn');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      console.log('Close button clicked');
      dialog.close();
    });
  }
  
  // Backdrop close
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close();
    }
  });
}

// Show monthly calendar with usage data
async function showMonthlyCalendar() {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    // Get current month data
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Get user's phone number for data lookup
    const profileRef = ref(database, `users/${user.uid}/profile`);
    const profileSnapshot = await get(profileRef);
    const phoneNumber = profileSnapshot.exists() ? profileSnapshot.val().phone : null;
    const userIdentifier = phoneNumber || user.uid;
    
    // Fetch daily usage data for the current month
    const dailyUsageRef = ref(database, `daily_usage/${userIdentifier}`);
    const snapshot = await get(dailyUsageRef);
    
    const dailyUsageMap = {};
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const date in data) {
        const dateObj = new Date(date);
        if (dateObj.getFullYear() === currentYear && dateObj.getMonth() === currentMonth) {
          dailyUsageMap[parseInt(date.split('-')[2])] = data[date].usage || 0;
        }
      }
    }
    
    // Create calendar HTML
    const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    let calendarHTML = `
      <div style="padding: 2rem; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1e3c72; text-align: center; margin-bottom: 1.5rem;">📅 ${monthName} Usage</h2>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
          ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `
            <div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.85rem;">
              ${day}
            </div>
          `).join('')}
    `;
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarHTML += `<div style="padding: 0.75rem;"></div>`;
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const usage = dailyUsageMap[day] || 0;
      const intensity = Math.min(usage / 10, 1); // Normalize to 0-1 for color intensity
      const bgColor = `rgba(59, 130, 246, ${0.2 + intensity * 0.6})`;
      const textColor = intensity > 0.5 ? '#fff' : '#1e3c72';
      
      calendarHTML += `
        <div style="
          padding: 0.75rem;
          background: ${bgColor};
          border-radius: 6px;
          text-align: center;
          font-weight: 600;
          color: ${textColor};
          min-height: 50px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border: 1px solid rgba(59, 130, 246, 0.3);
        ">
          <div style="font-size: 0.9rem;">${day}</div>
          ${usage > 0 ? `<div style="font-size: 0.7rem; margin-top: 0.25rem;">${usage.toFixed(1)} kWh</div>` : ''}
        </div>
      `;
    }
    
    calendarHTML += `
        </div>
        <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border-left: 4px solid #3b82f6;">
          <div style="font-size: 0.9rem; color: #1e3c72; margin-bottom: 0.5rem;"><strong>Legend:</strong></div>
          <div style="font-size: 0.8rem; color: #666;">
            <div>🟦 Light Blue = Low Usage</div>
            <div>🟦 Dark Blue = High Usage</div>
          </div>
        </div>
        <button id="calendar-close-btn" style="
          width: 100%;
          margin-top: 1rem;
          padding: 0.75rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 1rem;
        ">Close Calendar</button>
      </div>
    `;
    
    // Create modal for calendar
    let calendarModal = document.getElementById('calendar-modal');
    if (!calendarModal) {
      calendarModal = document.createElement('dialog');
      calendarModal.id = 'calendar-modal';
      calendarModal.style.cssText = `
        width: 100%;
        max-width: 600px;
        border: none;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        padding: 0;
      `;
      document.body.appendChild(calendarModal);
    }
    
    calendarModal.innerHTML = calendarHTML;
    calendarModal.showModal();
    
    // Close button
    document.getElementById('calendar-close-btn').onclick = () => {
      calendarModal.close();
    };
    
    // Click outside to close
    calendarModal.onclick = (e) => {
      if (e.target === calendarModal) {
        calendarModal.close();
      }
    };
  } catch (error) {
    console.error("Error showing calendar:", error);
    alert('Error loading calendar data');
  }
}

// Initialize analytics dialog with tab interface
async function initializeAnalyticsDialog(activeTab = 'overview') {
  const dialog = document.getElementById('analytics-dialog');
  const title = document.getElementById('analytics-dialog-title');
  const content = document.getElementById('analytics-dialog-content');
  
  console.log('Initializing analytics dialog with active tab:', activeTab);
  
  try {
    // Import modules
    const analyticsModule = await import('./analytics.js');
    const alertsModule = await import('./alerts.js');
    
    const { 
      getDailyUsageData,
      getMonthlyConsumption,
      getWeeklyConsumption,
      getPeakUsageAnalysis,
      getConsumptionTrend,
      projectMonthlyBill,
      getEnergySavingsRecommendations,
      detectAnomalies
    } = analyticsModule;
    
    const { 
      getConsumptionAlert,
      getNotificationHistory,
      getTamperingAlerts,
      getOutageAlerts,
      getSecurityAlerts
    } = alertsModule;
    
    title.textContent = '📊 Analytics & Insights';
    
    // Get user's phone number for data lookup - always fetch fresh from database
    const user = auth.currentUser;
    const profileRef = ref(database, `users/${user.uid}/profile`);
    const profileSnapshot = await get(profileRef);
    const phoneNumber = profileSnapshot.exists() ? profileSnapshot.val().phone : null;
    
    console.log('Loading analytics for phone number:', phoneNumber || 'uid: ' + user.uid);
    console.log('Profile data:', profileSnapshot.exists() ? profileSnapshot.val() : 'No profile');
    
    // Clear profile update flag if it was set
    if (sessionStorage.getItem('profileUpdated') === 'true') {
      console.log('Profile was updated, reloading with new phone number');
      sessionStorage.removeItem('profileUpdated');
    }
    
    // Clear only the tab content, not the navigation
    document.getElementById('tab-overview').innerHTML = 'Loading overview...';
    document.getElementById('tab-trends').innerHTML = 'Loading trends...';
    document.getElementById('tab-projections').innerHTML = 'Loading projections...';
    document.getElementById('tab-recommendations').innerHTML = 'Loading recommendations...';
    document.getElementById('tab-alerts').innerHTML = 'Loading alerts...';
    document.getElementById('tab-calendar').innerHTML = 'Loading calendar...';
    
    // Load all tab data
    console.log('Loading all tab data...');
    
    // Overview tab - with comprehensive chart
    const dailyData = await getDailyUsageData(7, phoneNumber);
    const peakAnalysis = await getPeakUsageAnalysis(phoneNumber);
    const trend = await getConsumptionTrend(phoneNumber);
    const avgDaily = dailyData.length > 0 ? (dailyData.reduce((s, d) => s + d.usage, 0) / dailyData.length).toFixed(1) : '0';
    const weeklyTotal = dailyData.reduce((s, d) => s + d.usage, 0).toFixed(1);
    
    // Create comprehensive CSS chart with line graph
    let chartHTML = '';
    if (dailyData && dailyData.length > 0) {
      const maxUsage = Math.max(...dailyData.map(d => d.usage));
      const minUsage = Math.min(...dailyData.map(d => d.usage));
      const usageRange = maxUsage - minUsage || 1;
      
      chartHTML = `
        <div style="background: #f9fafb; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
          <div style="font-weight: 600; color: #1e3c72; margin-bottom: 1rem;">Daily Electricity Consumption (kWh)</div>
          <div style="display: flex; gap: 0.5rem; align-items: flex-end; min-height: 150px; padding: 1rem 0.5rem 0; border-left: 2px solid #ddd; border-bottom: 2px solid #ddd; position: relative;">
            <!-- Y-axis labels -->
            <div style="position: absolute; left: -45px; top: 0; height: 100%; display: flex; flex-direction: column; justify-content: space-between; font-size: 0.75rem; color: #999; width: 40px;">
              <div>${maxUsage.toFixed(1)}</div>
              <div>${((maxUsage + minUsage) / 2).toFixed(1)}</div>
              <div>${minUsage.toFixed(1)}</div>
            </div>
            
            <!-- Bars and line -->
            <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" viewBox="0 0 ${dailyData.length * 40} 150" preserveAspectRatio="none">
              <polyline points="${dailyData.map((d, i) => {
                const x = (i / (dailyData.length - 1 || 1)) * (dailyData.length * 40);
                const y = 150 - (((d.usage - minUsage) / usageRange) * 120 + 10);
                return x + ',' + y;
              }).join(' ')}" fill="none" stroke="#3b82f6" stroke-width="2" vector-effect="non-scaling-stroke"/>
            </svg>
            
            ${dailyData.map((d, i) => {
              const heightPercent = ((d.usage - minUsage) / usageRange) * 80 + 10;
              return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
                  <div style="font-size: 0.7rem; color: #666; height: 16px;">${d.usage.toFixed(1)}</div>
                  <div style="background: linear-gradient(to top, #3b82f6, #60a5fa); border-radius: 2px; width: 100%; height: ${heightPercent * 1.2}px; min-height: 8px; transition: all 0.3s;" title="${d.usage.toFixed(1)} kWh"></div>
                  <div style="font-size: 0.7rem; color: #999; text-align: center; width: 100%;">${d.date}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    
    const overviewHTML = `
      ${chartHTML}
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: rgba(59, 130, 246, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 0.85rem; color: #1e3c72; margin-bottom: 0.25rem;">Average Daily</div>
          <div style="font-size: 1.8rem; font-weight: bold; color: #3b82f6;">${avgDaily}</div>
          <div style="font-size: 0.75rem; color: #666;">kWh</div>
        </div>
        <div style="background: rgba(99, 102, 241, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 0.85rem; color: #1e3c72; margin-bottom: 0.25rem;">Peak Day</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: #6366f1;">${peakAnalysis?.peakDay || 'N/A'}</div>
          <div style="font-size: 0.75rem; color: #666;">${peakAnalysis?.peakUsage?.toFixed(1) || '0'} kWh</div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: rgba(34, 197, 94, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 0.85rem; color: #1e3c72; margin-bottom: 0.25rem;">Weekly Total</div>
          <div style="font-size: 1.8rem; font-weight: bold; color: #22c55e;">${weeklyTotal}</div>
          <div style="font-size: 0.75rem; color: #666;">kWh</div>
        </div>
        <div style="background: rgba(168, 85, 247, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 0.85rem; color: #1e3c72; margin-bottom: 0.25rem;">Trend</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: #a855f7;">${trend?.direction || 'Stable'}</div>
          <div style="font-size: 0.75rem; color: #666;">${trend?.percentageChange ? (Math.abs(trend.percentageChange).toFixed(1) + '%') : '0%'}</div>
        </div>
      </div>
    `;
    
    document.getElementById('tab-overview').innerHTML = overviewHTML;
    
    // Trends tab - with charts and anomaly detection
    const monthlyData = await getMonthlyConsumption(phoneNumber);
    const weeklyData = await getWeeklyConsumption(phoneNumber);
    const anomalies = await detectAnomalies(phoneNumber);
    
    // Create monthly chart HTML - using same structure as trends.js
    let monthlyChartHTML = '';
    if (monthlyData && monthlyData.length > 0) {
      const maxUsage = Math.max(...monthlyData.map(item => item.usage || 0));
      monthlyChartHTML = `<div class="simple-chart">`;
      
      monthlyData.forEach(item => {
        const heightPercent = (item.usage || 0) / maxUsage * 100;
        const monthName = item.month ? new Date(item.month + '-01').toLocaleDateString('en', { month: 'short', year: 'numeric' }) : 'N/A';
        monthlyChartHTML += `
          <div class="chart-bar-container">
            <div class="chart-bar" style="height: ${heightPercent}%;" title="${(item.usage || 0).toFixed(1)} kWh"></div>
            <div class="chart-bar-label">${monthName}</div>
            <div class="chart-bar-value">${(item.usage || 0).toFixed(1)}</div>
          </div>
        `;
      });
      
      monthlyChartHTML += `</div>`;
    }
    
    // Create weekly chart HTML - using same structure as trends.js
    let weeklyChartHTML = '';
    if (weeklyData && weeklyData.length > 0) {
      const maxUsage = Math.max(...weeklyData.map(item => item.usage || 0));
      weeklyChartHTML = `<div class="simple-chart">`;
      
      weeklyData.slice(-8).forEach((item, index) => {
        const heightPercent = (item.usage || 0) / maxUsage * 100;
        const weekLabel = `W${Math.ceil((new Date(item.week).getDate()) / 7)}`;
        weeklyChartHTML += `
          <div class="chart-bar-container">
            <div class="chart-bar" style="height: ${heightPercent}%;" title="${(item.usage || 0).toFixed(1)} kWh"></div>
            <div class="chart-bar-label">${weekLabel}</div>
            <div class="chart-bar-value">${(item.usage || 0).toFixed(1)}</div>
          </div>
        `;
      });
      
      weeklyChartHTML += `</div>`;
    }
    
    // Create anomalies display
    let anomaliesHTML = '';
    if (anomalies && anomalies.length > 0) {
      anomaliesHTML = `
        <div style="margin-top: 1.5rem;">
          <h4 style="color: #1e3c72; margin-bottom: 1rem;">⚠️ WARNING</h4>
          ${anomalies.map(anom => `
            <div style="background: ${anom.severity === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 146, 60, 0.15)'}; padding: 0.75rem; border-radius: 6px; border-left: 3px solid ${anom.severity === 'high' ? '#ef4444' : '#f59e0b'}; margin-bottom: 0.75rem;">
              <div style="font-weight: 600; color: #1e3c72;">${anom.date}</div>
              <div style="font-size: 0.85rem; color: #333; margin-top: 0.25rem;">Usage: <strong>${(anom.usage).toFixed(1)} kWh</strong> (${anom.deviation > 0 ? '+' : ''}${anom.deviation.toFixed(1)}% from average)</div>
              <div style="font-size: 0.75rem; color: #666; margin-top: 0.25rem;">Severity: <strong style="color: ${anom.severity === 'high' ? '#ef4444' : '#f59e0b'};">${anom.severity.toUpperCase()}</strong></div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      anomaliesHTML = '<div style="margin-top: 1.5rem;"><p style="color: #10b981;">✓ No warnings detected</p></div>';
    }
    
    const trendsHTML = `
      <h4 style="margin-top: 0; color: #1e3c72;">Current Trend: <span style="color: #3b82f6;">${trend?.direction || 'Stable'}</span></h4>
      <p style="color: #666; margin-bottom: 1.5rem;">
        ${trend?.percentageChange ? Math.abs(trend.percentageChange).toFixed(1) + '%' : '0%'} 
        ${trend?.direction === 'Increasing' ? '📈' : trend?.direction === 'Decreasing' ? '📉' : '➡️'}
      </p>
      
      <h4 style="color: #1e3c72; margin-bottom: 1rem;">Monthly Consumption Chart</h4>
      ${monthlyChartHTML}
      
      <h4 style="color: #1e3c72; margin-bottom: 1rem; margin-top: 1.5rem;">Weekly Consumption Chart</h4>
      ${weeklyChartHTML}
      
      ${anomaliesHTML}
    `;
    
    document.getElementById('tab-trends').innerHTML = trendsHTML;
    
    // Projections tab
    let projectionsHTML;
    
    // Use the current rate from the dashboard (already displayed in consumed amount card)
    if (currentRate && currentRate > 0) {
      console.log('Calculating projection with rate:', currentRate, 'and phone:', phoneNumber);
      const projection = await projectMonthlyBill(currentRate, phoneNumber);
      console.log('Projection result:', projection);
      
      // Use the current consumed amount displayed on the dashboard
      const currentBill = currentConsumedAmount;
      
      // Calculate days in current month and current day
      const now = new Date();
      const currentDay = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const remainingDays = daysInMonth - currentDay;
      
      // Estimate end of month bill based on current daily average
      const avgDailyUsage = projection?.averageDaily || 0;
      const projectedRemainingUsage = avgDailyUsage * remainingDays;
      const projectedRemainingBill = projectedRemainingUsage * currentRate;
      const estimatedMonthEndBill = currentBill + projectedRemainingBill;
      
      projectionsHTML = `
        <h4 style="margin-top: 0; color: #1e3c72;">💡 Current Bill & Projection</h4>
        
        <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.3)); padding: 1.5rem; border-radius: 12px; text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 0.9rem; color: #1e3c72; margin-bottom: 0.5rem;">Current Bill (Day ${currentDay} of ${daysInMonth})</div>
          <div style="font-size: 2.5rem; font-weight: bold; color: #22c55e;">₱${currentBill.toFixed(2)}</div>
          <div style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;">Actual consumption so far</div>
        </div>
        
        <div style="background: rgba(59, 130, 246, 0.15); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border-left: 4px solid #3b82f6;">
          <div style="font-size: 0.9rem; color: #1e3c72; margin-bottom: 0.5rem;">Estimated Month-End Bill</div>
          <div style="font-size: 1.8rem; font-weight: bold; color: #3b82f6;">₱${estimatedMonthEndBill.toFixed(2)}</div>
          <div style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;">
            Current: ₱${currentBill.toFixed(2)} + Projected (${remainingDays} days): ₱${projectedRemainingBill.toFixed(2)}
          </div>
        </div>
        
        <div style="background: rgba(251, 146, 60, 0.15); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;">
          <div style="font-size: 0.8rem; color: #1e3c72; margin-bottom: 0.25rem;">Average Daily Usage</div>
          <div style="font-size: 1.3rem; font-weight: bold; color: #f59e0b;">${avgDailyUsage.toFixed(2)} kWh/day</div>
          <div style="font-size: 0.75rem; color: #666; margin-top: 0.25rem;">≈ ₱${(avgDailyUsage * currentRate).toFixed(2)} per day</div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div style="background: rgba(34, 197, 94, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.8rem; color: #1e3c72; margin-bottom: 0.25rem;">Current Consumption</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #22c55e;">${currentConsumption.toFixed(1)}</div>
            <div style="font-size: 0.75rem; color: #666;">kWh (meter reading)</div>
          </div>
          <div style="background: rgba(99, 102, 241, 0.2); padding: 1rem; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.8rem; color: #1e3c72; margin-bottom: 0.25rem;">Rate</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #6366f1;">₱${currentRate}</div>
            <div style="font-size: 0.75rem; color: #666;">/kWh</div>
          </div>
        </div>
      `;
    } else {
      projectionsHTML = '<p style="color: #ef5350;">⚠️ Loading device data... Please make sure your device is connected and showing a consumed amount on the dashboard.</p>';
    }
    
    document.getElementById('tab-projections').innerHTML = projectionsHTML;
    
    // Recommendations tab
    const recommendations = await getEnergySavingsRecommendations(phoneNumber);
    
    const recsHTML = `
      <h4 style="margin-top: 0; color: #1e3c72;">Energy Savings Tips</h4>
      ${recommendations.map(rec => `
        <div style="background: ${rec.impact === 'high' ? 'rgba(239, 68, 68, 0.15)' : rec.impact === 'medium' ? 'rgba(251, 146, 60, 0.15)' : 'rgba(34, 197, 94, 0.15)'}; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid ${rec.impact === 'high' ? '#ef4444' : rec.impact === 'medium' ? '#fb923c' : '#22c55e'};">
          <div style="font-weight: 600; color: #1e3c72; margin-bottom: 0.5rem;">${rec.title}</div>
          <div style="font-size: 0.9rem; color: #333; margin-bottom: 0.5rem;">${rec.description}</div>
          <div style="font-size: 0.75rem; color: #666;">Impact: <strong style="color: #1e3c72;">${rec.impact.toUpperCase()}</strong></div>
        </div>
      `).join('')}
    `;
    
    document.getElementById('tab-recommendations').innerHTML = recsHTML;
    
    // Alerts tab
    const alert = await getConsumptionAlert();
    const history = await getNotificationHistory(5);
    console.log('Fetching security alerts...');
    const securityAlerts = await getSecurityAlerts();
    console.log('Security alerts received:', securityAlerts);
    
    // Format security alerts display
    let securityAlertsHTML = '';
    if (securityAlerts && securityAlerts.length > 0) {
      securityAlertsHTML = `
        <h4 style="color: #1e3c72; margin-bottom: 1rem;">🚨 Security Alerts</h4>
        <div style="max-height: 250px; overflow-y: auto;">
          ${securityAlerts.map((secAlert, index) => `
            <div style="background: ${secAlert.type === 'tampering' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 146, 60, 0.15)'}; padding: 0.75rem; border-radius: 6px; border-left: 3px solid ${secAlert.type === 'tampering' ? '#ef4444' : '#f59e0b'}; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: flex-start;">
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #1e3c72;">
                  ${secAlert.type === 'tampering' ? '⚠️ Tampering Detected' : '🔌 Power Outage'}
                </div>
                <div style="font-size: 0.85rem; color: #333; margin-top: 0.25rem;">
                  <strong>${secAlert.date}</strong> - ${secAlert.count} ${secAlert.type === 'tampering' ? 'tampering incident(s)' : 'outage incident(s)'}
                </div>
                ${secAlert.devices && secAlert.devices.length > 0 ? `
                  <div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">
                    Device(s): <strong>${secAlert.devices.join(', ')}</strong>
                  </div>
                ` : ''}
                ${secAlert.timestamps && secAlert.timestamps.length > 0 ? `
                  <div style="font-size: 0.75rem; color: #666; margin-top: 0.25rem;">
                    Detected: ${new Date(secAlert.timestamps[0]).toLocaleString()}
                  </div>
                ` : ''}
              </div>
              <button class="clear-alert-btn" data-alert-index="${index}" data-alert-type="${secAlert.type}" data-alert-timestamp="${secAlert.timestamps && secAlert.timestamps.length > 0 ? secAlert.timestamps[0] : Date.now()}" style="background: #ef4444; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem; margin-left: 0.5rem; white-space: nowrap; flex-shrink: 0;">Clear</button>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    const alertsHTML = `
      <h4 style="margin-top: 0; color: #1e3c72;">Active Alerts</h4>
      ${alert ? `
        <div style="background: rgba(239, 68, 68, 0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <div style="font-weight: 600; color: #ef4444; margin-bottom: 0.5rem;">⚠️ Consumption Threshold</div>
          <div style="font-size: 0.9rem; color: #333;">Alert when consumption exceeds: <strong style="color: #1e3c72;">${alert.threshold} kWh</strong></div>
        </div>
      ` : '<p style="color: #666;">No active consumption alerts</p>'}
      
      ${securityAlertsHTML}
      
      <h4 style="color: #1e3c72; margin-top: 1rem;">Recent Notifications</h4>
      ${history && history.length > 0 ? `
        <div style="max-height: 250px; overflow-y: auto;">
          ${history.map(notif => `
            <div style="padding: 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.1);">
              <div style="font-weight: 500; font-size: 0.9rem; color: #1e3c72;">${notif.message}</div>
              <div style="font-size: 0.75rem; color: #999; margin-top: 0.25rem;">${new Date(notif.timestamp).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>
      ` : '<p style="color: #666;">No recent notifications</p>'}
    `;
    
    document.getElementById('tab-alerts').innerHTML = alertsHTML;
    
    // Add event listeners for clear alert buttons
    document.querySelectorAll('.clear-alert-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const alertIndex = e.target.dataset.alertIndex;
        const alertType = e.target.dataset.alertType;
        const alertTimestamp = e.target.dataset.alertTimestamp;
        
        // Remove the alert from the display
        const alertElement = e.target.closest('div[style*="flex"]');
        if (alertElement) {
          alertElement.style.opacity = '0.5';
          alertElement.style.textDecoration = 'line-through';
          e.target.textContent = 'Cleared';
          e.target.disabled = true;
          e.target.style.opacity = '0.5';
          e.target.style.cursor = 'not-allowed';
        }
        
        // Clear the alert from database history
        await clearAlertFromHistory(alertType, alertTimestamp);
        
        showToastNotification(`${alertType === 'tampering' ? 'Tampering' : 'Outage'} alert cleared from history`, 'success');
      });
    });
    
    // Calendar tab
    const now = new Date();
    let displayYear = now.getFullYear();
    let displayMonth = now.getMonth();
    
    // Function to render calendar
    async function renderCalendar(year, month) {
      const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      // Get daily usage data for calendar
      const calendarDailyData = await getDailyUsageData(31);
      const dailyUsageMap = {};
      calendarDailyData.forEach(item => {
        const itemDate = new Date(item.date);
        if (itemDate.getFullYear() === year && itemDate.getMonth() === month) {
          const day = parseInt(item.date.split('-')[2]);
          dailyUsageMap[day] = item.usage || 0;
        }
      });
      
      return { monthName, firstDay, daysInMonth, dailyUsageMap };
    }
    
    // Build initial calendar
    const calendarData = await renderCalendar(displayYear, displayMonth);
    const monthName = calendarData.monthName;
    const firstDay = calendarData.firstDay;
    const daysInMonth = calendarData.daysInMonth;
    const dailyUsageMap = calendarData.dailyUsageMap;
    
    let calendarGridHTML = '<div style="margin-bottom: 1rem;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;"><div style="display: flex; align-items: center; gap: 0.5rem;"><button id="cal-prev-month" style="padding: 0.5rem 0.75rem; background: #e5e7eb; color: #1e3c72; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">◀</button><h4 style="margin: 0; color: #1e3c72; min-width: 200px; text-align: center;">📅 ' + monthName + '</h4><button id="cal-next-month" style="padding: 0.5rem 0.75rem; background: #e5e7eb; color: #1e3c72; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">▶</button></div><label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;"><input type="checkbox" id="calendar-edit-toggle" style="cursor: pointer; width: 18px; height: 18px;"><span style="color: #666; font-size: 0.9rem;">Edit</span></label></div><div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; margin-bottom: 1.5rem;">';
    
    // Add day headers
    calendarGridHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Sun</div>';
    calendarGridHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Mon</div>';
    calendarGridHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Tue</div>';
    calendarGridHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Wed</div>';
    calendarGridHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Thu</div>';
    calendarGridHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Fri</div>';
    calendarGridHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Sat</div>';
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarGridHTML += '<div style="padding: 0.5rem;"></div>';
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const usage = dailyUsageMap[day] || 0;
      const intensity = Math.min(usage / 10, 1);
      const bgColor = 'rgba(59, 130, 246, ' + (0.2 + intensity * 0.6) + ')';
      const textColor = intensity > 0.5 ? '#fff' : '#1e3c72';
      const dateStr = displayYear + '-' + String(displayMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      
      calendarGridHTML += '<div style="padding: 0.5rem; background: ' + bgColor + '; border-radius: 6px; text-align: center; font-weight: 600; color: ' + textColor + '; min-height: 50px; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 1px solid rgba(59, 130, 246, 0.3); font-size: 0.75rem; cursor: pointer; transition: all 0.3s;" class="calendar-day" data-date="' + dateStr + '" data-usage="' + usage + '"><div>' + day + '</div><div style="font-size: 0.65rem; margin-top: 0.2rem;">' + usage.toFixed(1) + ' kWh</div></div>';
    }
    
    calendarGridHTML += '</div><div style="padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border-left: 4px solid #3b82f6;"><div style="font-size: 0.8rem; color: #1e3c72; margin-bottom: 0.25rem;"><strong>Color Intensity:</strong></div><div style="font-size: 0.75rem; color: #666;">Light Blue = Low Usage • Dark Blue = High Usage</div></div></div><dialog id="edit-consumption-modal" style="border: none; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); padding: 0; width: 100%; max-width: 400px;"><div style="padding: 1.5rem;"><h3 style="color: #1e3c72; margin-top: 0;">Edit Daily Consumption</h3><div style="margin-bottom: 1rem;"><label style="display: block; color: #1e3c72; font-weight: 600; margin-bottom: 0.5rem;">Date</label><div id="edit-date-display" style="padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-radius: 6px; color: #1e3c72; font-weight: 600;"></div></div><div style="margin-bottom: 1rem;"><label style="display: block; color: #1e3c72; font-weight: 600; margin-bottom: 0.5rem;">Consumption (kWh)</label><input type="number" id="edit-consumption-input" step="0.01" min="0" style="width: 100%; padding: 0.75rem; border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 6px; font-size: 1rem; box-sizing: border-box;"></div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;"><button id="edit-cancel-btn" style="padding: 0.75rem; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Cancel</button><button id="edit-save-btn" style="padding: 0.75rem; background: #22c55e; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Save</button></div></div></dialog>';
    
    document.getElementById('tab-calendar').innerHTML = calendarGridHTML;
    
    // Month navigation
    async function updateCalendarMonth(newYear, newMonth) {
      displayYear = newYear;
      displayMonth = newMonth;
      
      const data = await renderCalendar(displayYear, displayMonth);
      const navMonthName = data.monthName;
      const navFirstDay = data.firstDay;
      const navDaysInMonth = data.daysInMonth;
      const navDailyUsageMap = data.dailyUsageMap;
      
      let newCalendarHTML = '<div style="margin-bottom: 1rem;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;"><div style="display: flex; align-items: center; gap: 0.5rem;"><button id="cal-prev-month" style="padding: 0.5rem 0.75rem; background: #e5e7eb; color: #1e3c72; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">◀</button><h4 style="margin: 0; color: #1e3c72; min-width: 200px; text-align: center;">📅 ' + navMonthName + '</h4><button id="cal-next-month" style="padding: 0.5rem 0.75rem; background: #e5e7eb; color: #1e3c72; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">▶</button></div><label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;"><input type="checkbox" id="calendar-edit-toggle" style="cursor: pointer; width: 18px; height: 18px;"><span style="color: #666; font-size: 0.9rem;">Edit</span></label></div><div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; margin-bottom: 1.5rem;">';
      
      // Add day headers
      newCalendarHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Sun</div>';
      newCalendarHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Mon</div>';
      newCalendarHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Tue</div>';
      newCalendarHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Wed</div>';
      newCalendarHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Thu</div>';
      newCalendarHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Fri</div>';
      newCalendarHTML += '<div style="text-align: center; font-weight: 600; color: #1e3c72; padding: 0.5rem 0; font-size: 0.8rem;">Sat</div>';
      
      // Empty cells for days before month starts
      for (let i = 0; i < navFirstDay; i++) {
        newCalendarHTML += '<div style="padding: 0.5rem;"></div>';
      }
      
      // Days of month
      for (let day = 1; day <= navDaysInMonth; day++) {
        const usage = navDailyUsageMap[day] || 0;
        const intensity = Math.min(usage / 10, 1);
        const bgColor = 'rgba(59, 130, 246, ' + (0.2 + intensity * 0.6) + ')';
        const textColor = intensity > 0.5 ? '#fff' : '#1e3c72';
        const dateStr = displayYear + '-' + String(displayMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        
        newCalendarHTML += '<div style="padding: 0.5rem; background: ' + bgColor + '; border-radius: 6px; text-align: center; font-weight: 600; color: ' + textColor + '; min-height: 50px; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 1px solid rgba(59, 130, 246, 0.3); font-size: 0.75rem; cursor: pointer; transition: all 0.3s;" class="calendar-day" data-date="' + dateStr + '" data-usage="' + usage + '"><div>' + day + '</div><div style="font-size: 0.65rem; margin-top: 0.2rem;">' + usage.toFixed(1) + ' kWh</div></div>';
      }
      
      newCalendarHTML += '</div><div style="padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border-left: 4px solid #3b82f6;"><div style="font-size: 0.8rem; color: #1e3c72; margin-bottom: 0.25rem;"><strong>Color Intensity:</strong></div><div style="font-size: 0.75rem; color: #666;">Light Blue = Low Usage • Dark Blue = High Usage</div></div></div><dialog id="edit-consumption-modal" style="border: none; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); padding: 0; width: 100%; max-width: 400px;"><div style="padding: 1.5rem;"><h3 style="color: #1e3c72; margin-top: 0;">Edit Daily Consumption</h3><div style="margin-bottom: 1rem;"><label style="display: block; color: #1e3c72; font-weight: 600; margin-bottom: 0.5rem;">Date</label><div id="edit-date-display" style="padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-radius: 6px; color: #1e3c72; font-weight: 600;"></div></div><div style="margin-bottom: 1rem;"><label style="display: block; color: #1e3c72; font-weight: 600; margin-bottom: 0.5rem;">Consumption (kWh)</label><input type="number" id="edit-consumption-input" step="0.01" min="0" style="width: 100%; padding: 0.75rem; border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 6px; font-size: 1rem; box-sizing: border-box;"></div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;"><button id="edit-cancel-btn" style="padding: 0.75rem; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Cancel</button><button id="edit-save-btn" style="padding: 0.75rem; background: #22c55e; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Save</button></div></div></dialog>';
      
      document.getElementById('tab-calendar').innerHTML = newCalendarHTML;
      setupCalendarEvents();
    }
    
    function setupCalendarEvents() {
      const editToggle = document.getElementById('calendar-edit-toggle');
      const calendarDays = document.querySelectorAll('.calendar-day');
      const editModal = document.getElementById('edit-consumption-modal');
      let selectedDate = null;
      
      function openEditModal(e) {
        if (!editToggle.checked) return;
        selectedDate = e.currentTarget.getAttribute('data-date');
        const usage = parseFloat(e.currentTarget.getAttribute('data-usage'));
        document.getElementById('edit-date-display').textContent = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('edit-consumption-input').value = usage;
        editModal.showModal();
      }
      
      editToggle.addEventListener('change', () => {
        calendarDays.forEach(day => {
          if (editToggle.checked) {
            day.addEventListener('click', openEditModal);
          } else {
            day.removeEventListener('click', openEditModal);
          }
        });
      });
      
      document.getElementById('edit-save-btn').addEventListener('click', async () => {
        const newUsage = parseFloat(document.getElementById('edit-consumption-input').value);
        if (isNaN(newUsage) || newUsage < 0) {
          alert('Please enter a valid consumption value');
          return;
        }
        
        try {
          const dailyUsageRef = ref(database, 'daily_usage/' + auth.currentUser.uid + '/' + selectedDate);
          await set(dailyUsageRef, { usage: newUsage, timestamp: Date.now() });
          
          const dayElement = document.querySelector('[data-date="' + selectedDate + '"]');
          if (dayElement) {
            dayElement.setAttribute('data-usage', newUsage);
            const intensity = Math.min(newUsage / 10, 1);
            const bgColor = 'rgba(59, 130, 246, ' + (0.2 + intensity * 0.6) + ')';
            dayElement.style.background = bgColor;
            dayElement.innerHTML = '<div>' + selectedDate.split('-')[2] + '</div><div style="font-size: 0.65rem; margin-top: 0.2rem;">' + newUsage.toFixed(1) + ' kWh</div>';
          }
          
          editModal.close();
          alert('Consumption updated successfully!');
        } catch (error) {
          console.error('Error updating consumption:', error);
          alert('Error updating consumption');
        }
      });
      
      document.getElementById('edit-cancel-btn').addEventListener('click', () => {
        editModal.close();
      });
      
      editModal.onclick = (e) => {
        if (e.target === editModal) {
          editModal.close();
        }
      };
      
      // Navigation buttons
      const prevBtn = document.getElementById('cal-prev-month');
      const nextBtn = document.getElementById('cal-next-month');
      
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          displayMonth--;
          if (displayMonth < 0) {
            displayMonth = 11;
            displayYear--;
          }
          updateCalendarMonth(displayYear, displayMonth);
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          displayMonth++;
          if (displayMonth > 11) {
            displayMonth = 0;
            displayYear++;
          }
          updateCalendarMonth(displayYear, displayMonth);
        });
      }
    }
    
    setupCalendarEvents();
    
    // Setup tab switching
    const tabBtns = dialog.querySelectorAll('.analytics-tab-btn');
    const tabContents = dialog.querySelectorAll('.analytics-tab-content');
    
    // Function to switch to a specific tab
    const switchToTab = (tabName) => {
      // Remove active from all
      tabBtns.forEach(b => {
        b.style.color = '#666';
        b.style.borderBottom = '3px solid transparent';
      });
      
      tabContents.forEach(c => c.style.display = 'none');
      
      // Add active to selected tab
      const selectedBtn = Array.from(tabBtns).find(b => b.getAttribute('data-tab') === tabName);
      if (selectedBtn) {
        selectedBtn.style.color = '#1e3c72';
        selectedBtn.style.borderBottom = '3px solid #3b82f6';
      }
      
      const selectedContent = document.getElementById('tab-' + tabName);
      if (selectedContent) {
        selectedContent.style.display = 'block';
      }
    };
    
    // Set up tab button listeners
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        switchToTab(tabName);
      });
    });
    
    // Activate the requested tab based on activeTab parameter
    switchToTab(activeTab);
        console.log('Analytics dialog initialized successfully with active tab:', activeTab);
    
  } catch (error) {
    console.error('Error initializing analytics:', error);
    console.error('Error stack:', error.stack);
    content.innerHTML = `<div style="padding: 2rem; text-align: center; color: #ef5350;"><strong>Error:</strong> ${error.message}</div>`;
  }
}

// Cleanup function
export function cleanupConsumptionListener() {
  if (consumptionListener) {
    consumptionListener();
    consumptionListener = null;
  }
  stopAutoRefresh();
}
