import { database, auth } from "./firebase-config.js";
import { ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// Get daily usage data
export async function getDailyUsageData(days = 7, phoneNumber = null) {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    let snapshot;
    
    // If phone number provided, try to load data for that phone number
    if (phoneNumber) {
      console.log('Fetching daily usage for phone:', phoneNumber);
      const phoneRef = ref(database, `daily_usage/${phoneNumber}`);
      snapshot = await get(phoneRef);
      
      console.log('Data exists for phone number:', snapshot.exists());
      
      // If no data found with phone number, try user.uid as fallback
      if (!snapshot.exists()) {
        console.log('No data found for phone number, trying user.uid as fallback');
        const uidRef = ref(database, `daily_usage/${user.uid}`);
        snapshot = await get(uidRef);
        console.log('Data exists for uid:', snapshot.exists());
      }
    } else {
      // No phone number provided, use user.uid
      console.log('No phone number provided, using user.uid');
      const dailyUsageRef = ref(database, `daily_usage/${user.uid}`);
      snapshot = await get(dailyUsageRef);
    }
    
    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const usageArray = [];
    
    for (const date in data) {
      usageArray.push({
        date: date,
        usage: parseFloat(data[date].usage || 0),
        timestamp: data[date].timestamp
      });
    }

    // Sort by date and get last N days
    usageArray.sort((a, b) => new Date(a.date) - new Date(b.date));
    return usageArray.slice(-days);
  } catch (error) {
    console.error("Error fetching daily usage data:", error);
    return [];
  }
}

// Calculate weekly consumption
export async function getWeeklyConsumption(phoneNumber = null) {
  const dailyData = await getDailyUsageData(30, phoneNumber);
  const weeklyData = {};

  dailyData.forEach(item => {
    const date = new Date(item.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = 0;
    }
    weeklyData[weekKey] += item.usage;
  });

  return Object.entries(weeklyData).map(([week, usage]) => ({
    week: week,
    usage: parseFloat(usage.toFixed(2))
  }));
}

// Calculate monthly consumption
export async function getMonthlyConsumption(phoneNumber = null) {
  const dailyData = await getDailyUsageData(365, phoneNumber);
  const monthlyData = {};

  dailyData.forEach(item => {
    const date = new Date(item.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0;
    }
    monthlyData[monthKey] += item.usage;
  });

  return Object.entries(monthlyData).map(([month, usage]) => ({
    month: month,
    usage: parseFloat(usage.toFixed(2))
  }));
}

// Find peak usage hours/days
export async function getPeakUsageAnalysis(phoneNumber = null) {
  const dailyData = await getDailyUsageData(30, phoneNumber);
  
  if (dailyData.length === 0) {
    return {
      peakDay: null,
      peakUsage: 0,
      averageDaily: 0,
      lowestDay: null,
      lowestUsage: 0
    };
  }

  const sorted = [...dailyData].sort((a, b) => b.usage - a.usage);
  const average = dailyData.reduce((sum, item) => sum + item.usage, 0) / dailyData.length;

  return {
    peakDay: sorted[0].date,
    peakUsage: parseFloat(sorted[0].usage.toFixed(2)),
    averageDaily: parseFloat(average.toFixed(2)),
    lowestDay: sorted[sorted.length - 1].date,
    lowestUsage: parseFloat(sorted[sorted.length - 1].usage.toFixed(2))
  };
}

// Calculate consumption trends (increasing, decreasing, stable)
export async function getConsumptionTrend(phoneNumber = null) {
  const dailyData = await getDailyUsageData(30, phoneNumber);
  
  if (dailyData.length < 2) {
    return { trend: "insufficient_data", percentage: 0 };
  }

  const firstWeek = dailyData.slice(0, Math.floor(dailyData.length / 2));
  const secondWeek = dailyData.slice(Math.floor(dailyData.length / 2));

  const firstWeekAvg = firstWeek.reduce((sum, item) => sum + item.usage, 0) / firstWeek.length;
  const secondWeekAvg = secondWeek.reduce((sum, item) => sum + item.usage, 0) / secondWeek.length;

  const percentageChange = ((secondWeekAvg - firstWeekAvg) / firstWeekAvg) * 100;

  let trend = "stable";
  if (percentageChange > 10) trend = "increasing";
  if (percentageChange < -10) trend = "decreasing";

  return {
    trend: trend,
    percentage: parseFloat(percentageChange.toFixed(2)),
    firstWeekAvg: parseFloat(firstWeekAvg.toFixed(2)),
    secondWeekAvg: parseFloat(secondWeekAvg.toFixed(2))
  };
}

// Estimate bill based on usage
export async function estimateBill(currentUsage, pastUsage, ratePerKwh) {
  const consumption = currentUsage - pastUsage;
  return parseFloat((consumption * ratePerKwh).toFixed(2));
}

// Project bill for next 30 days
export async function projectMonthlyBill(ratePerKwh, phoneNumber = null) {
  const dailyData = await getDailyUsageData(30, phoneNumber);
  
  if (dailyData.length === 0) {
    return { projectedBill: 0, projectedUsage: 0, daysAnalyzed: 0 };
  }

  const totalUsage = dailyData.reduce((sum, item) => sum + item.usage, 0);
  const averageDaily = totalUsage / dailyData.length;
  
  // Project for 30 days
  const projectedUsage = parseFloat((averageDaily * 30).toFixed(2));
  const projectedBill = parseFloat((projectedUsage * ratePerKwh).toFixed(2));

  return {
    projectedBill: projectedBill,
    projectedUsage: projectedUsage,
    daysAnalyzed: dailyData.length,
    averageDaily: parseFloat(averageDaily.toFixed(2))
  };
}

// Get energy saving recommendations
export async function getEnergySavingsRecommendations(phoneNumber = null) {
  const peakAnalysis = await getPeakUsageAnalysis(phoneNumber);
  const trendAnalysis = await getConsumptionTrend(phoneNumber);
  const recommendations = [];

  // Recommendation based on peak usage
  if (peakAnalysis.peakUsage > peakAnalysis.averageDaily * 1.5) {
    recommendations.push({
      id: "peak_usage",
      title: "High Peak Usage Detected",
      description: `Your peak day usage (${peakAnalysis.peakUsage} kWh) is 50% higher than average. Try to distribute your energy consumption more evenly throughout the month.`,
      impact: "medium",
      savings: "10-15%"
    });
  }

  // Recommendation based on trend
  if (trendAnalysis.trend === "increasing") {
    recommendations.push({
      id: "increasing_usage",
      title: "Consumption is Increasing",
      description: `Your consumption has increased by ${Math.abs(trendAnalysis.percentage)}% recently. Consider reducing unnecessary usage of high-power appliances.`,
      impact: "high",
      savings: "15-20%"
    });
  }

  // General recommendations
  recommendations.push({
    id: "general_efficiency",
    title: "Improve Energy Efficiency",
    description: "Use LED bulbs, turn off lights when not in use, set AC to 24-26°C, and unplug devices when not needed.",
    impact: "low",
    savings: "5-10%"
  });

  recommendations.push({
    id: "peak_shifting",
    title: "Shift Usage to Off-Peak Hours",
    description: "If available in your area, use high-power appliances (washing machine, water heater) during off-peak hours for lower rates.",
    impact: "medium",
    savings: "8-12%"
  });

  recommendations.push({
    id: "appliance_maintenance",
    title: "Regular Appliance Maintenance",
    description: "Dirty air filters and coils reduce efficiency. Clean or replace AC filters monthly and have appliances serviced regularly.",
    impact: "low",
    savings: "3-8%"
  });

  return recommendations;
}

// Detect anomalies in consumption
export async function detectAnomalies(phoneNumber = null) {
  const dailyData = await getDailyUsageData(30, phoneNumber);
  
  if (dailyData.length < 5) {
    return [];
  }

  const usages = dailyData.map(item => item.usage);
  const average = usages.reduce((sum, val) => sum + val, 0) / usages.length;
  const variance = usages.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / usages.length;
  const stdDev = Math.sqrt(variance);

  const anomalies = [];

  dailyData.forEach((item, index) => {
    // Flag if usage is more than 2 standard deviations away from mean
    if (Math.abs(item.usage - average) > 2 * stdDev) {
      anomalies.push({
        date: item.date,
        usage: parseFloat(item.usage.toFixed(2)),
        deviation: parseFloat(((item.usage - average) / average * 100).toFixed(2)),
        severity: Math.abs(item.usage - average) > 3 * stdDev ? "high" : "medium",
        timestamp: item.timestamp
      });
    }
  });

  return anomalies;
}
