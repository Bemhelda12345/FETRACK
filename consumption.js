import { database, auth } from "./firebase-config.js";
import { ref, onValue, set, push, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { getUserProfile } from "./profile.js";

let consumptionListener = null;
let lastDailyConsumption = null;

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
              <div class="consumption-rate" id="consumption-rate">
                Rate: <span>--</span> ₱/kWh
              </div>
            </div>
            <div class="consumption-details">
              <div class="detail-item">
                <span class="label">Today's Usage:</span>
                <span class="value" id="today-usage">-- kWh</span>
              </div>
              <div class="detail-item">
                <span class="label">This Month:</span>
                <span class="value" id="month-usage">-- kWh</span>
              </div>
              <div class="detail-item">
                <span class="label">Last Updated:</span>
                <span class="value" id="last-updated">--</span>
              </div>
            </div>
          </div>
        </div>

<!-- Bill Summary Card -->
        <div class="bill-card card">
          <div class="card-header compact-header">
            <h3>Consumed Amount</h3>
          </div>
          <div class="card-content compact-content">
            <div class="bill-amount compact-amount">
              <span class="currency">₱</span>
              <span class="amount" id="bill-amount">0.00</span>
            </div>
            <div class="consumption-formula compact-formula" id="consumption-formula">
              <small>(kWh - Past Usage) × Price</small>
            </div>
            <button class="calculate-bill-btn" id="calculate-bill-btn">
              🧮 Bill Calculator
            </button>
          </div>
        </div>

        <!-- Usage History Card -->
        <div class="history-card card">
          <div class="card-header">
            <h3>Recent Usage History</h3>
          </div>
          <div class="card-content">
            <div class="history-list" id="usage-history">
              <div class="loading-history">Loading history...</div>
            </div>
          </div>
        </div>

        <!-- Quick Actions Card -->
        <div class="actions-card card">
          <div class="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div class="card-content">
            <div class="action-buttons">
              <button class="action-btn" id="export-data-btn">
                Export Data
              </button>
              <button class="action-btn" id="set-alert-btn">
                Set Usage Alert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add CSS for compact bill card
  const style = document.createElement('style');
  style.textContent = `
    .compact-header {
      padding: 8px 12px !important;
      margin-bottom: 0 !important;
    }
    .compact-content {
      padding: 8px 12px !important;
    }
    .compact-amount {
      margin: 5px 0 !important;
    }
    .compact-formula {
      margin-top: 2px !important;
    }
  `;
  document.head.appendChild(style);

  // Initialize dashboard functionality
  initializeDashboard();
}

// Initialize dashboard functionality
function initializeDashboard() {
  fetchUserDevice();
  setupEventListeners();
  loadUsageHistory();
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
async function updateDeviceData(deviceData, deviceId) {
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

  // Get past usage from device data
  const pastUsage = Number(deviceData.past_usage || deviceData["past usage"] || 0);

  // Calculate consumed amount: (current usage - past usage) × price
  const consumedAmount = Math.max(0, (consumption - pastUsage)) * rate;
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

// Calculate daily usage based on previous readings and show total meter reading for monthly usage
async function calculateDailyUsage(currentConsumption, deviceId) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Reset baseline and month start to 16 kWh if current reading is less than 16
    if (currentConsumption < 16) {
      const baselineRef = ref(database, `baseline/${user.uid}/${deviceId}`);
      await set(baselineRef, { consumption: 16, timestamp: Date.now() });
      
      const monthStartRef = ref(database, `month_readings/${user.uid}/${today.slice(0,7)}`);
      await set(monthStartRef, { reading: 16, timestamp: Date.now() });
      
      console.log("Baseline and month start reset to 16 kWh");
    }
    
    // Get yesterday's reading
    const yesterdayRef = ref(database, `meter_readings/${user.uid}/${yesterday}`);
    const yesterdaySnapshot = await get(yesterdayRef);
    
    let todayUsage = 0;
    
    if (yesterdaySnapshot.exists()) {
      // Calculate today's usage as difference from yesterday
      const yesterdayReading = yesterdaySnapshot.val().reading;
      todayUsage = Math.max(0, currentConsumption - yesterdayReading);
    } else {
      // First day - assume 0 kWh usage
      todayUsage = 0;
    }
    
    // Store today's reading for tomorrow's calculation
    const todayRef = ref(database, `meter_readings/${user.uid}/${today}`);
    await set(todayRef, { reading: currentConsumption, timestamp: Date.now() });
    
    // Store today's usage for trends
    const todayUsageRef = ref(database, `daily_usage/${user.uid}/${today}`);
    await set(todayUsageRef, { usage: todayUsage, timestamp: Date.now() });
    
    // Update display
    document.getElementById("today-usage").textContent = `${todayUsage % 1 === 0 ? todayUsage : todayUsage.toFixed(2)} kWh`;
    document.getElementById("month-usage").textContent = `${currentConsumption % 1 === 0 ? currentConsumption : currentConsumption.toFixed(2)} kWh`;
    document.getElementById("last-updated").textContent = new Date().toLocaleString();
    
    console.log(`Current reading: ${currentConsumption} kWh`);
    console.log(`Today's usage: ${todayUsage} kWh`);
    console.log(`Monthly total usage (total meter reading): ${currentConsumption} kWh`);
    
  } catch (error) {
    console.error("Error calculating daily usage:", error);
    document.getElementById("today-usage").textContent = "0.00 kWh";
    document.getElementById("month-usage").textContent = "0.00 kWh";
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
  
  document.getElementById("today-usage").textContent = "0.00 kWh";
  document.getElementById("month-usage").textContent = "0.00 kWh";
  document.getElementById("last-updated").textContent = "Error loading data";
}

// Set up event listeners
function setupEventListeners() {
  const exportBtn = document.getElementById("export-data-btn");
  const alertBtn = document.getElementById("set-alert-btn");
  const calcBtn = document.getElementById("calculate-bill-btn");
  
  if (exportBtn) {
    exportBtn.addEventListener("click", exportData);
  }
  
  if (alertBtn) {
    alertBtn.addEventListener("click", setUsageAlert);
  }
  
  if (calcBtn) {
    calcBtn.addEventListener("click", openBillCalculator);
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
      showQuickActionsDialog(
        'Invalid Input',
        'Please fill in all fields with valid numbers.',
        { confirmOnly: true, confirmText: 'OK' }
      );
      return;
    }
    
    if (currentReading < previousReading) {
      showQuickActionsDialog(
        'Invalid Input',
        'Current reading must be greater than or equal to previous reading.',
        { confirmOnly: true, confirmText: 'OK' }
      );
      return;
    }
    
    if (pricePerKwh <= 0) {
      showQuickActionsDialog(
        'Invalid Input',
        'Price per kWh must be greater than 0.',
        { confirmOnly: true, confirmText: 'OK' }
      );
      return;
    }
    
    // Calculate consumption and bill
    const consumption = currentReading - previousReading;
    const totalBill = consumption * pricePerKwh;
    
    // Display result
    document.getElementById('calc-result-amount').textContent = totalBill.toFixed(2);
    document.getElementById('calc-breakdown').textContent = 
      `Consumption: ${consumption.toFixed(2)} kWh × ₱${pricePerKwh.toFixed(2)} = ₱${totalBill.toFixed(2)}`;
    
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

// Load usage history with monthly calendar
async function loadUsageHistory() {
  const calendarContainer = document.getElementById("usage-calendar");

  try {
    // Get current month and year
    const now = new Date();
    let currentMonth = now.getMonth();
    let currentYear = now.getFullYear();

    // Add navigation controls to the calendar
    let calendarHTML = `
      <div class="calendar-controls">
        <button id="prev-month" class="calendar-nav-btn">&lt; Prev</button>
        <div class="calendar-title" id="calendar-title"></div>
        <button id="next-month" class="calendar-nav-btn">Next &gt;</button>
      </div>
      <div id="calendar-grid-container"></div>
    `;

    calendarContainer.innerHTML = calendarHTML;

    // Add CSS for the calendar
    const style = document.createElement('style');
    style.textContent = `
      .calendar-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      .calendar-nav-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.3s;
      }
      .calendar-nav-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .calendar-title {
        font-weight: bold;
        font-size: 1.1rem;
      }
      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
      }
      .calendar-day-header {
        text-align: center;
        font-weight: bold;
        padding: 5px;
        background: rgba(255, 255, 255, 0.1);
      }
      .calendar-day {
        padding: 5px;
        min-height: 60px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        position: relative;
      }
      .calendar-day.empty {
        background: transparent;
      }
      .calendar-day.today {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      .day-number {
        position: absolute;
        top: 2px;
        right: 5px;
        font-size: 0.8rem;
        opacity: 0.7;
      }
      .day-usage {
        margin-top: 15px;
        text-align: center;
        font-size: 0.9rem;
      }
      .high-usage {
        color: #ff7675;
      }
      .medium-usage {
        color: #fdcb6e;
      }
      .low-usage {
        color: #55efc4;
      }
      .no-data {
        opacity: 0.5;
      }
    `;
    document.head.appendChild(style);

    // Function to render calendar for a specific month
    async function renderCalendarMonth(month, year) {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Update calendar title
      document.getElementById("calendar-title").textContent = `${monthNames[month]} ${year}`;

      const gridContainer = document.getElementById("calendar-grid-container");
      gridContainer.innerHTML = '<div class="loading-calendar">Loading data...</div>';

      // Get user's daily usage data
      const user = auth.currentUser;
      if (!user) {
        gridContainer.innerHTML = '<div class="no-data-message">Please sign in to view usage history.</div>';
        return;
      }

      // Fetch daily usage data for the selected month
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const dailyUsageRef = ref(database, `daily_usage/${user.uid}`);
      const snapshot = await get(dailyUsageRef);

      let usageData = {};
      if (snapshot.exists()) {
        // Filter data for the selected month
        const allData = snapshot.val();
        for (const dateKey in allData) {
          if (dateKey.startsWith(monthStr)) {
            usageData[dateKey] = allData[dateKey];
          }
        }
      }

      let gridHTML = `
        <div class="calendar-grid">
          <div class="calendar-day-header">Sun</div>
          <div class="calendar-day-header">Mon</div>
          <div class="calendar-day-header">Tue</div>
          <div class="calendar-day-header">Wed</div>
          <div class="calendar-day-header">Thu</div>
          <div class="calendar-day-header">Fri</div>
          <div class="calendar-day-header">Sat</div>
      `;

      // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
      const firstDayOfMonth = new Date(year, month, 1).getDay();

      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDayOfMonth; i++) {
        gridHTML += '<div class="calendar-day empty"></div>';
      }

      // Add cells for each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = usageData[dateStr];

        let usageValue = '—';
        let usageClass = 'no-data';

        if (dayData && dayData.usage !== undefined) {
          const usage = parseFloat(dayData.usage);
          usageValue = usage % 1 === 0 ? usage : usage.toFixed(1);

          // Assign class based on usage amount for color coding
          if (usage > 5) usageClass = 'high-usage';
          else if (usage > 2) usageClass = 'medium-usage';
          else usageClass = 'low-usage';
        }

        // Highlight current day if viewing current month
        const isToday = (day === now.getDate() && month === now.getMonth() && year === now.getFullYear()) ? 'today' : '';

        gridHTML += `
          <div class="calendar-day ${isToday}">
            <div class="day-number">${day}</div>
            <div class="day-usage ${usageClass}">${usageValue} kWh</div>
          </div>
        `;
      }

      gridHTML += '</div>';
      gridContainer.innerHTML = gridHTML;

      // If no data for this month, show message
      if (Object.keys(usageData).length === 0) {
        const noDataMsg = document.createElement('div');
        noDataMsg.className = 'no-data-message';
        noDataMsg.textContent = 'No usage data available for this month.';
        noDataMsg.style.position = 'absolute';
        noDataMsg.style.top = '50%';
        noDataMsg.style.left = '50%';
        noDataMsg.style.transform = 'translate(-50%, -50%)';
        noDataMsg.style.opacity = '0.7';
        gridContainer.appendChild(noDataMsg);
      }
    }

    // Initial render of current month
    await renderCalendarMonth(currentMonth, currentYear);

    // Add event listeners for navigation
    document.getElementById("prev-month").addEventListener("click", async () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      await renderCalendarMonth(currentMonth, currentYear);
    });

    document.getElementById("next-month").addEventListener("click", async () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      await renderCalendarMonth(currentMonth, currentYear);
    });

  } catch (error) {
    console.error("Error loading usage calendar:", error);
    calendarContainer.innerHTML = '<div class="error">Failed to load usage calendar</div>';
  }
}

// Dialog helper functions
function showQuickActionsDialog(title, message, options = {}) {
  return new Promise((resolve) => {
    const dialog = document.getElementById('quick-actions-alert-dialog');
    const dialogTitle = document.getElementById('dialog-title');
    const dialogMessage = document.getElementById('dialog-message');
    const inputContainer = document.getElementById('dialog-input-container');
    const inputField = document.getElementById('alert-threshold-input');
    const closeBtn = document.getElementById('dialog-close-btn');
    const cancelBtn = document.getElementById('dialog-cancel-btn');
    const confirmBtn = document.getElementById('dialog-confirm-btn');

    if (!dialog) return resolve(null);

    // Set title and message
    dialogTitle.textContent = title;
    dialogMessage.innerHTML = message;
    
    // Apply message styling if it's a warning
    if (options.isWarning) {
      dialogMessage.classList.add('warning');
    } else {
      dialogMessage.classList.remove('warning');
    }

    // Show/hide input field
    if (options.showInput) {
      inputContainer.style.display = 'block';
      inputField.value = options.defaultValue || '';
      inputField.placeholder = options.placeholder || 'Enter value';
    } else {
      inputContainer.style.display = 'none';
    }

    // Setup button text
    confirmBtn.textContent = options.confirmText || 'Confirm';
    cancelBtn.textContent = options.cancelText || 'Cancel';

    // Show only confirm button if specified
    if (options.confirmOnly) {
      cancelBtn.style.display = 'none';
    } else {
      cancelBtn.style.display = 'block';
    }

    // Show dialog
    dialog.showModal();

    // Event handlers
    const handleClose = () => {
      dialog.close();
      resolve(null);
    };

    const handleConfirm = () => {
      if (options.showInput) {
        const value = inputField.value;
        dialog.close();
        resolve(value);
      } else {
        dialog.close();
        resolve(true);
      }
    };

    // Add event listeners
    closeBtn.onclick = handleClose;
    cancelBtn.onclick = handleClose;
    confirmBtn.onclick = handleConfirm;

    // Close on backdrop click
    dialog.onclick = (e) => {
      if (e.target === dialog) {
        handleClose();
      }
    };

    // Handle Enter key in input
    if (options.showInput) {
      inputField.onkeypress = (e) => {
        if (e.key === 'Enter') {
          handleConfirm();
        }
      };
      // Focus input field
      setTimeout(() => inputField.focus(), 100);
    }
  });
}

// Quick action functions
async function exportData() {
  const user = auth.currentUser;
  if (!user) {
    await showQuickActionsDialog(
      'Sign In Required',
      'Please sign in to export data',
      { confirmOnly: true, confirmText: 'OK' }
    );
    return;
  }
  
  const headers = ["Field", "Value"];
  const rows = [
    ["User Email", user.email],
    ["Export Date", new Date().toISOString()],
    ["Consumption (kWh)", document.getElementById("consumption-value").textContent],
    ["Bill Amount (₱)", document.getElementById("bill-amount").textContent],
    ["Today's Usage (kWh)", document.getElementById("today-usage").textContent],
    ["This Month's Usage (kWh)", document.getElementById("month-usage").textContent]
  ];
  
  let csvContent = headers.join(",") + "\n";
  rows.forEach(row => {
    csvContent += row.join(",") + "\n";
  });
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `ElectriTrack_Consumption_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  await showQuickActionsDialog(
    'Export Complete',
    `Data export completed for ${user.email}.`,
    { confirmOnly: true, confirmText: 'OK' }
  );
}

async function setUsageAlert() {
  const user = auth.currentUser;
  if (!user) {
    await showQuickActionsDialog(
      'Sign In Required',
      'Please sign in to set usage alerts',
      { confirmOnly: true, confirmText: 'OK' }
    );
    return;
  }
  
  // Show warning about threshold before prompting
  const warningMessage = `<strong>⚠️ WARNING:</strong><br><br>
    Setting a usage alert will notify you when your daily consumption exceeds the specified threshold. 
    This helps you manage your electricity usage and avoid unexpected high bills.`;
  
  const proceed = await showQuickActionsDialog(
    'Set Usage Alert',
    warningMessage,
    { 
      isWarning: true,
      confirmText: 'Continue',
      cancelText: 'Cancel'
    }
  );

  if (!proceed) return;
  
  // Prompt for threshold value
  const threshold = await showQuickActionsDialog(
    'Set Alert Threshold',
    'Enter the daily consumption threshold (in kWh) that will trigger an alert notification.',
    {
      showInput: true,
      placeholder: 'e.g., 10',
      confirmText: 'Set Alert',
      cancelText: 'Cancel'
    }
  );

  if (threshold && !isNaN(threshold) && parseFloat(threshold) > 0) {
    const thresholdValue = parseFloat(threshold);
    
    // Save alert to Firebase
    const alertsRef = ref(database, `alerts/${user.uid}`);
    set(alertsRef, {
      threshold: thresholdValue,
      timestamp: Date.now(),
      active: true
    }).then(async () => {
      console.log(`Setting usage alert for user ${user.email}: ${threshold} kWh`);
      
      await showQuickActionsDialog(
        'Alert Set Successfully',
        `Usage alert set for <strong>${threshold} kWh</strong>.<br><br>
         You'll be notified when your daily consumption exceeds this limit.`,
        { confirmOnly: true, confirmText: 'OK' }
      );
      
      // Update UI to show active alert if we're on the consumption dashboard
      updateAlertUI(thresholdValue);
    }).catch(async (error) => {
      console.error("Error saving alert:", error);
      await showQuickActionsDialog(
        'Error',
        'Failed to set alert. Please try again.',
        { confirmOnly: true, confirmText: 'OK' }
      );
    });
  } else if (threshold !== null && threshold !== '') {
    await showQuickActionsDialog(
      'Invalid Input',
      'Please enter a valid positive number for the threshold.',
      { confirmOnly: true, confirmText: 'OK' }
    );
  }
}

// Function to update UI with active alert
function updateAlertUI(threshold) {
  // Find the quick actions card
  const actionsCard = document.querySelector(".actions-card .card-content");
  if (!actionsCard) return;
  
  // Remove any existing alert display
  const existingAlert = document.getElementById("active-alert-display");
  if (existingAlert) {
    existingAlert.remove();
  }
  
  // Create alert display element
  const alertDisplay = document.createElement("div");
  alertDisplay.id = "active-alert-display";
  alertDisplay.className = "active-alert";
  alertDisplay.innerHTML = `
    <div class="alert-icon">⚠️</div>
    <div class="alert-info">
      <div class="alert-title">Active Alert</div>
      <div class="alert-threshold">Threshold: ${threshold} kWh</div>
    </div>
    <button class="alert-remove-btn" id="remove-alert-btn">×</button>
  `;
  
  // Add to DOM before the action buttons
  const actionButtons = actionsCard.querySelector(".action-buttons");
  actionsCard.insertBefore(alertDisplay, actionButtons);
  
  // Add event listener to remove button
  document.getElementById("remove-alert-btn").addEventListener("click", removeAlert);
}

// Function to remove alert
async function removeAlert() {
  const user = auth.currentUser;
  if (!user) return;
  
  const confirm = await showQuickActionsDialog(
    'Remove Alert',
    'Are you sure you want to remove this usage alert?',
    {
      confirmText: 'Remove',
      cancelText: 'Cancel'
    }
  );

  if (!confirm) return;
  
  const alertsRef = ref(database, `alerts/${user.uid}`);
  set(alertsRef, null)
    .then(async () => {
      console.log("Alert removed");
      const alertDisplay = document.getElementById("active-alert-display");
      if (alertDisplay) {
        alertDisplay.remove();
      }
      
      await showQuickActionsDialog(
        'Alert Removed',
        'Your usage alert has been successfully removed.',
        { confirmOnly: true, confirmText: 'OK' }
      );
    })
    .catch(async (error) => {
      console.error("Error removing alert:", error);
      await showQuickActionsDialog(
        'Error',
        'Failed to remove alert. Please try again.',
        { confirmOnly: true, confirmText: 'OK' }
      );
    });
}

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

// Manual reset baseline and monthly start reading
export async function manualResetBaseline(newBaseline = 16) {
  const user = auth.currentUser;
  if (!user) {
    console.warn("User not authenticated. Cannot reset baseline.");
    return;
  }
  
  try {
    // Reset baseline for all devices (or specify deviceId if needed)
    // For simplicity, reset for all devices under user
    const baselineRef = ref(database, `baseline/${user.uid}`);
    await set(baselineRef, { consumption: newBaseline, timestamp: Date.now() });
    
    // Reset monthly start reading
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthTotalRef = ref(database, `monthly_total/${user.uid}/${currentMonth}`);
    await set(monthTotalRef, { total: newBaseline, timestamp: Date.now() });
    
    console.log(`Baseline and monthly total reset to ${newBaseline} kWh`);
  } catch (error) {
    console.error("Error resetting baseline:", error);
  }
}

// Cleanup function
export function cleanupConsumptionListener() {
  if (consumptionListener) {
    consumptionListener();
    consumptionListener = null;
  }
}
