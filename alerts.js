import { database, auth } from "./firebase-config.js";
import { ref, set, get, update, remove } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// Create consumption threshold alert
export async function createConsumptionAlert(thresholdKwh) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  try {
    const alertRef = ref(database, `alerts/${user.uid}/consumption_threshold`);
    await set(alertRef, {
      threshold: parseFloat(thresholdKwh),
      created: new Date().toISOString(),
      active: true,
      type: "consumption_threshold"
    });

    return { success: true, message: `Alert set for ${thresholdKwh} kWh` };
  } catch (error) {
    console.error("Error creating consumption alert:", error);
    throw error;
  }
}

// Get consumption threshold alert
export async function getConsumptionAlert() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const alertRef = ref(database, `alerts/${user.uid}/consumption_threshold`);
    const snapshot = await get(alertRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error fetching consumption alert:", error);
    return null;
  }
}

// Remove consumption alert
export async function removeConsumptionAlert() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  try {
    const alertRef = ref(database, `alerts/${user.uid}/consumption_threshold`);
    await remove(alertRef);
    return { success: true, message: "Alert removed" };
  } catch (error) {
    console.error("Error removing consumption alert:", error);
    throw error;
  }
}

// Save alert to history (for persistent storage)
export async function saveAlertToHistory(alertData) {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const timestamp = Date.now();
    const alertHistoryRef = ref(database, `alert_history/${user.uid}/${alertData.type}/${timestamp}`);
    
    await set(alertHistoryRef, {
      ...alertData,
      savedAt: timestamp,
      cleared: false
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving alert to history:", error);
    return null;
  }
}

// Get alert history from database
export async function getAlertHistory() {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const historyRef = ref(database, `alert_history/${user.uid}`);
    const snapshot = await get(historyRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const alerts = [];

    // Flatten the nested structure and combine tampering and outage alerts
    for (const type in data) {
      for (const timestamp in data[type]) {
        const alert = data[type][timestamp];
        alerts.push({
          ...alert,
          savedAt: parseInt(timestamp)
        });
      }
    }

    // Sort by date descending
    return alerts.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  } catch (error) {
    console.error("Error fetching alert history:", error);
    return [];
  }
}

// Clear specific alert from history
export async function clearAlertFromHistory(alertType, timestamp) {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const alertRef = ref(database, `alert_history/${user.uid}/${alertType}/${timestamp}`);
    await set(alertRef, {
      cleared: true
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error("Error clearing alert:", error);
    return null;
  }
}

// Get tampering alerts from device data - same path as dashboard
export async function getTamperingAlerts() {
  const user = auth.currentUser;
  if (!user) {
    console.log('❌ No user authenticated');
    return [];
  }

  try {
    console.log('🔍 Fetching tampering alerts');
    
    // Get user's phone from profile (same as dashboard)
    const profileRef = ref(database, `users/${user.uid}/profile`);
    const profileSnapshot = await get(profileRef);
    
    if (!profileSnapshot.exists()) {
      console.log('❌ No profile found');
      return [];
    }
    
    const profileData = profileSnapshot.val();
    const userPhone = profileData.phone?.trim();
    
    if (!userPhone) {
      console.log('❌ No phone number in profile');
      return [];
    }
    
    console.log(`👤 User phone: ${userPhone}`);
    
    // Fetch devices from root path (same as dashboard)
    const devicesRef = ref(database, 'devices');
    const snapshot = await get(devicesRef);
    
    if (!snapshot.exists()) {
      console.log('❌ No devices found');
      return [];
    }

    const devices = snapshot.val();
    console.log('📱 All devices:', Object.keys(devices));
    
    const tampering = [];

    // Match user's device (same logic as dashboard)
    for (const deviceId in devices) {
      const device = devices[deviceId];
      const devicePhone = device["Contact Number"] || device.phone || device.contactNumber || deviceId;
      
      // Normalize phone numbers (same as dashboard)
      const normalizedDevicePhone = devicePhone ? devicePhone.toString().trim().replace(/^\+63/, '') : '';
      const normalizedUserPhone = userPhone.replace(/^\+63/, '');
      
      console.log(`\n🔎 Checking device ${deviceId}`);
      console.log(`   Device phone: "${normalizedDevicePhone}", User phone: "${normalizedUserPhone}"`);
      
      // Check if this is the user's device
      if (normalizedDevicePhone && normalizedDevicePhone === normalizedUserPhone) {
        console.log(`✅ Found user's device!`);
        console.log(`   Full device:`, device);
        
        const tamperingValue = device.tampering;
        console.log(`   tampering = "${tamperingValue}" (type: ${typeof tamperingValue})`);
        
        // Check if tampering is true
        const hasTampering = tamperingValue === 'true' || tamperingValue === true || tamperingValue == 1 || tamperingValue == '1';
        
        if (hasTampering) {
          console.log(`🚨 TAMPERING DETECTED!`);
          // Use device's timestamp (when tampering was detected/recorded)
          const detectionTime = device.timestamp ? new Date(device.timestamp).toISOString() : new Date().toISOString();
          const detectionDate = new Date(detectionTime).toISOString().split('T')[0];
          const alertData = {
            date: detectionDate,
            deviceSerial: device.Serial || deviceId,
            deviceName: device.Name || 'Unknown Device',
            type: 'tampering',
            timestamp: detectionTime,
            deviceId: deviceId
          };
          tampering.push(alertData);
          
          // Save to history
          await saveAlertToHistory(alertData);
        } else {
          console.log(`✓ No tampering on this device`);
        }
      }
    }

    console.log(`\n🎯 Total tampering alerts found: ${tampering.length}`);

    // Get alert history from database
    const alertHistory = await getAlertHistory();
    const tamperingHistory = alertHistory.filter(alert => alert.type === 'tampering' && !alert.cleared);

    // Aggregate current tampering by day
    const alertsByDay = {};
    tampering.forEach(alert => {
      const date = alert.date;
      if (!alertsByDay[date]) {
        alertsByDay[date] = {
          date: date,
          count: 0,
          timestamps: [],
          type: 'tampering',
          devices: []
        };
      }
      alertsByDay[date].count += 1;
      if (!alertsByDay[date].devices.includes(alert.deviceName)) {
        alertsByDay[date].devices.push(alert.deviceName);
      }
      alertsByDay[date].timestamps.push(alert.timestamp);
    });

    // Also aggregate history alerts by day
    const historyAggregated = {};
    tamperingHistory.forEach(alert => {
      const date = alert.date || new Date(alert.timestamp).toISOString().split('T')[0];
      if (!historyAggregated[date]) {
        historyAggregated[date] = {
          date: date,
          count: 0,
          timestamps: [],
          type: 'tampering',
          devices: []
        };
      }
      historyAggregated[date].count += 1;
      if (alert.deviceName && !historyAggregated[date].devices.includes(alert.deviceName)) {
        historyAggregated[date].devices.push(alert.deviceName);
      }
      historyAggregated[date].timestamps.push(alert.timestamp);
    });

    // Combine current alerts with history (avoid duplicates)
    const combined = { ...historyAggregated, ...alertsByDay };
    const result = Object.values(combined).sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log('✅ Final tampering alerts (including history):', result);
    return result;
  } catch (error) {
    console.error("❌ Error fetching tampering alerts:", error);
    return [];
  }
}

// Get outage alerts from device data - same path as dashboard
export async function getOutageAlerts() {
  const user = auth.currentUser;
  if (!user) {
    console.log('❌ No user authenticated');
    return [];
  }

  try {
    console.log('🔍 Fetching outage alerts');
    
    // Get user's phone from profile (same as dashboard)
    const profileRef = ref(database, `users/${user.uid}/profile`);
    const profileSnapshot = await get(profileRef);
    
    if (!profileSnapshot.exists()) {
      console.log('❌ No profile found');
      return [];
    }
    
    const profileData = profileSnapshot.val();
    const userPhone = profileData.phone?.trim();
    
    if (!userPhone) {
      console.log('❌ No phone number in profile');
      return [];
    }
    
    console.log(`👤 User phone: ${userPhone}`);
    
    // Fetch devices from root path (same as dashboard)
    const devicesRef = ref(database, 'devices');
    const snapshot = await get(devicesRef);
    
    if (!snapshot.exists()) {
      console.log('❌ No devices found');
      return [];
    }

    const devices = snapshot.val();
    console.log('📱 All devices:', Object.keys(devices));
    
    const outages = [];

    // Match user's device (same logic as dashboard)
    for (const deviceId in devices) {
      const device = devices[deviceId];
      const devicePhone = device["Contact Number"] || device.phone || device.contactNumber || deviceId;
      
      // Normalize phone numbers (same as dashboard)
      const normalizedDevicePhone = devicePhone ? devicePhone.toString().trim().replace(/^\+63/, '') : '';
      const normalizedUserPhone = userPhone.replace(/^\+63/, '');
      
      console.log(`\n🔎 Checking device ${deviceId}`);
      console.log(`   Device phone: "${normalizedDevicePhone}", User phone: "${normalizedUserPhone}"`);
      
      // Check if this is the user's device
      if (normalizedDevicePhone && normalizedDevicePhone === normalizedUserPhone) {
        console.log(`✅ Found user's device!`);
        console.log(`   Full device:`, device);
        
        const outageValue = device.outage || device.OUTAGE;
        console.log(`   outage = "${outageValue}" (type: ${typeof outageValue})`);
        
        // Check if outage is true
        const hasOutage = outageValue === 'true' || outageValue === true || outageValue == 1 || outageValue == '1';
        
        if (hasOutage) {
          console.log(`🔌 OUTAGE DETECTED!`);
          // Use device's timestamp (when outage was detected/recorded)
          const detectionTime = device.timestamp ? new Date(device.timestamp).toISOString() : new Date().toISOString();
          const detectionDate = new Date(detectionTime).toISOString().split('T')[0];
          const alertData = {
            date: detectionDate,
            deviceSerial: device.Serial || deviceId,
            deviceName: device.Name || 'Unknown Device',
            type: 'outage',
            timestamp: detectionTime,
            deviceId: deviceId
          };
          outages.push(alertData);
          
          // Save to history
          await saveAlertToHistory(alertData);
        } else {
          console.log(`✓ No outage on this device`);
        }
      }
    }

    console.log(`\n🎯 Total outage alerts found: ${outages.length}`);

    // Aggregate by day
    const alertsByDay = {};
    outages.forEach(alert => {
      const date = alert.date;
      if (!alertsByDay[date]) {
        alertsByDay[date] = {
          date: date,
          count: 0,
          timestamps: [],
          type: 'outage',
          devices: []
        };
      }
      alertsByDay[date].count += 1;
      if (!alertsByDay[date].devices.includes(alert.deviceName)) {
        alertsByDay[date].devices.push(alert.deviceName);
      }
      alertsByDay[date].timestamps.push(alert.timestamp);
    });

    // Also aggregate history alerts by day
    const alertHistory = await getAlertHistory();
    const outageHistory = alertHistory.filter(alert => alert.type === 'outage' && !alert.cleared);
    
    const historyAggregated = {};
    outageHistory.forEach(alert => {
      const date = alert.date || new Date(alert.timestamp).toISOString().split('T')[0];
      if (!historyAggregated[date]) {
        historyAggregated[date] = {
          date: date,
          count: 0,
          timestamps: [],
          type: 'outage',
          devices: []
        };
      }
      historyAggregated[date].count += 1;
      if (alert.deviceName && !historyAggregated[date].devices.includes(alert.deviceName)) {
        historyAggregated[date].devices.push(alert.deviceName);
      }
      historyAggregated[date].timestamps.push(alert.timestamp);
    });

    // Combine current alerts with history (avoid duplicates)
    const combined = { ...historyAggregated, ...alertsByDay };
    const result = Object.values(combined).sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log('✅ Final outage alerts (including history):', result);
    return result;
  } catch (error) {
    console.error("❌ Error fetching outage alerts:", error);
    return [];
  }
}

// Get all security alerts (tampering + outage) combined
export async function getSecurityAlerts() {
  const tampering = await getTamperingAlerts();
  const outage = await getOutageAlerts();
  
  // Combine and sort by date
  const combined = [...tampering, ...outage];
  return combined.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Check if consumption exceeds threshold
export async function checkConsumptionThreshold(currentConsumption, currentDay) {
  const alert = await getConsumptionAlert();
  
  if (!alert || !alert.active) {
    return { triggered: false, alert: null };
  }

  if (currentConsumption >= alert.threshold) {
    // Create notification record
    await logAlertNotification({
      type: "consumption_threshold",
      threshold: alert.threshold,
      actual: currentConsumption,
      date: new Date().toISOString()
    });

    return {
      triggered: true,
      alert: alert,
      message: `⚠️ Your consumption (${currentConsumption} kWh) has exceeded the alert threshold of ${alert.threshold} kWh!`
    };
  }

  return { triggered: false, alert: null };
}

// Create daily consumption summary
export async function createDailySummary(dailyUsage, monthlyUsage, averageMonthly) {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const today = new Date().toISOString().split('T')[0];
    const summaryRef = ref(database, `summaries/${user.uid}/${today}`);
    
    await set(summaryRef, {
      date: today,
      dailyUsage: parseFloat(dailyUsage.toFixed(2)),
      monthlyUsage: parseFloat(monthlyUsage.toFixed(2)),
      averageMonthly: parseFloat(averageMonthly.toFixed(2)),
      timestamp: Date.now(),
      notification_sent: false
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating daily summary:", error);
    return null;
  }
}

// Create payment reminder
export async function createPaymentReminder(daysUntilDue = 7) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  try {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysUntilDue);

    const reminderRef = ref(database, `reminders/${user.uid}/payment`);
    await set(reminderRef, {
      type: "payment",
      dueDate: dueDate.toISOString(),
      daysUntilDue: daysUntilDue,
      active: true,
      created: new Date().toISOString()
    });

    return { success: true, message: `Payment reminder set for ${daysUntilDue} days` };
  } catch (error) {
    console.error("Error creating payment reminder:", error);
    throw error;
  }
}

// Get payment reminder
export async function getPaymentReminder() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const reminderRef = ref(database, `reminders/${user.uid}/payment`);
    const snapshot = await get(reminderRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error fetching payment reminder:", error);
    return null;
  }
}

// Check if payment reminder should be triggered
export async function checkPaymentReminder() {
  const reminder = await getPaymentReminder();
  
  if (!reminder || !reminder.active) {
    return { triggered: false };
  }

  const dueDate = new Date(reminder.dueDate);
  const today = new Date();
  const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= reminder.daysUntilDue && daysRemaining > 0) {
    return {
      triggered: true,
      message: `💳 Your bill payment is due in ${daysRemaining} day(s)`,
      daysRemaining: daysRemaining
    };
  }

  if (daysRemaining <= 0) {
    return {
      triggered: true,
      message: `💳 Your bill payment is OVERDUE`,
      daysRemaining: 0
    };
  }

  return { triggered: false };
}

// Detect unusual consumption
export async function detectUnusualConsumption(dailyUsage, averageUsage) {
  const variance = Math.abs(dailyUsage - averageUsage) / averageUsage;

  let severity = "low";
  let triggered = false;

  if (variance > 0.5) { // 50% higher
    severity = "medium";
    triggered = true;
  }
  if (variance > 1) { // 100% higher (double)
    severity = "high";
    triggered = true;
  }

  if (triggered) {
    await logAlertNotification({
      type: "unusual_consumption",
      dailyUsage: dailyUsage,
      averageUsage: averageUsage,
      variance: parseFloat((variance * 100).toFixed(2)),
      severity: severity,
      date: new Date().toISOString()
    });

    return {
      triggered: true,
      severity: severity,
      message: `⚡ Unusual consumption detected! Today's usage (${dailyUsage} kWh) is ${(variance * 100).toFixed(0)}% higher than average.`,
      variance: parseFloat((variance * 100).toFixed(2))
    };
  }

  return { triggered: false };
}

// Log alert notification for history
export async function logAlertNotification(notificationData) {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const timestamp = Date.now();
    const notificationRef = ref(database, `notification_history/${user.uid}/${timestamp}`);
    
    await set(notificationRef, {
      ...notificationData,
      timestamp: timestamp,
      read: false
    });

    return { success: true };
  } catch (error) {
    console.error("Error logging notification:", error);
    return null;
  }
}

// Get notification history
export async function getNotificationHistory(limit = 10) {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const historyRef = ref(database, `notification_history/${user.uid}`);
    const snapshot = await get(historyRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const notifications = [];

    for (const id in data) {
      notifications.push({
        id: id,
        ...data[id]
      });
    }

    // Sort by timestamp descending and limit
    notifications.sort((a, b) => b.timestamp - a.timestamp);
    return notifications.slice(0, limit);
  } catch (error) {
    console.error("Error fetching notification history:", error);
    return [];
  }
}

// Create toast notification
export function showToastNotification(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Send browser push notification
export async function sendPushNotification(title, options = {}) {
  if (!('Notification' in window)) {
    console.log("This browser does not support notifications");
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: './icons/icon-192x192.png',
      badge: './icons/icon-192x192.png',
      ...options
    });
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, {
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-192x192.png',
        ...options
      });
    }
  }
}
