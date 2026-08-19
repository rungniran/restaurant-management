<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1><i class="fa-solid fa-chart-column"></i> Dashboard</h1>
      <div class="date-selector">
        <select v-model="selectedPeriod" class="period-select">
          <option value="today">วันนี้</option>
          <option value="this-month">เดือนนี้</option>
        </select>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading">
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-box">
      <p><i class="fa-solid fa-triangle-exclamation"></i> {{ error }}</p>
      <button @click="fetchDashboard" class="btn">ลองใหม่</button>
    </div>

    <!-- Dashboard content -->
    <div v-else class="dashboard-content">
      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card revenue-card">
          <div class="kpi-label">รายรับวันนี้</div>
          <div class="kpi-value">฿{{ formatNumber(data.today.revenue) }}</div>
          <div class="kpi-subtext">
            ชำระแล้ว: ฿{{ formatNumber(data.today.paidRevenue) }}
          </div>
        </div>

        <div class="kpi-card orders-card">
          <div class="kpi-label">จำนวนออเดอร์วันนี้</div>
          <div class="kpi-value">{{ data.today.orderCount }}</div>
          <div class="kpi-subtext">
            เฉลี่ย: ฿{{ formatNumber(data.today.avgOrderValue) }}/คำสั่ง
          </div>
        </div>

        <div class="kpi-card month-revenue-card">
          <div class="kpi-label">รายรับเดือนนี้</div>
          <div class="kpi-value">฿{{ formatNumber(data.month.revenue) }}</div>
          <div class="kpi-subtext">
            {{ data.month.orderCount }} คำสั่ง
          </div>
        </div>

        <div class="kpi-card month-avg-card">
          <div class="kpi-label">ค่าเฉลี่ยต่อคำสั่ง (เดือน)</div>
          <div class="kpi-value">฿{{ formatNumber(data.month.avgOrderValue) }}</div>
          <div class="kpi-subtext">
            รวม {{ data.month.orderCount }} คำสั่ง
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <!-- Peak Hours Chart -->
        <div class="chart-card">
          <h3><i class="fa-solid fa-clock"></i> ยอดนิยม (ออเดอร์ต่อชั่วโมง)</h3>
          <div class="chart-container">
            <div class="hourly-chart">
              <div
                v-for="hour in getHourlyDataWithAllHours()"
                :key="hour._id"
                class="hour-bar-wrapper"
              >
                <div
                  class="hour-bar"
                  :style="{ height: getBarHeight(hour.count) + '%' }"
                  :title="`${String(hour._id).padStart(2, '0')}:00 - ${hour.count} ออเดอร์`"
                ></div>
                <div class="hour-label">{{ String(hour._id).padStart(2, '0') }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Best Sellers Chart -->
        <div class="chart-card">
          <h3><i class="fa-solid fa-fire"></i> เมนูยอดนิยม (เดือนนี้)</h3>
          <div class="best-sellers-list">
            <div
              v-for="(item, index) in data.bestSellers"
              :key="item._id"
              class="seller-item"
            >
              <div class="seller-rank">{{ index + 1 }}</div>
              <div class="seller-info">
                <div class="seller-name">{{ item._id }}</div>
                <div class="seller-stats">
                  {{ item.qty }} ชิ้น • ฿{{ formatNumber(item.revenue) }}
                </div>
              </div>
              <div class="seller-bar">
                <div
                  class="seller-bar-fill"
                  :style="{ width: getSellerBarWidth(item.qty) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Section -->
      <div class="summary-section">
        <div class="summary-card">
          <h3><i class="fa-solid fa-chart-line"></i> สรุปช่วงเวลา</h3>
          <table class="summary-table">
            <tbody>
              <tr>
                <td>ออเดอร์วันนี้</td>
                <td class="text-right">{{ data.today.orderCount }} คำสั่ง</td>
              </tr>
              <tr>
                <td>ออเดอร์เดือนนี้</td>
                <td class="text-right">{{ data.month.orderCount }} คำสั่ง</td>
              </tr>
              <tr>
                <td>รายรับวันนี้ (ทั้งหมด)</td>
                <td class="text-right">฿{{ formatNumber(data.today.revenue) }}</td>
              </tr>
              <tr>
                <td>รายรับวันนี้ (ชำระแล้ว)</td>
                <td class="text-right">฿{{ formatNumber(data.today.paidRevenue) }}</td>
              </tr>
              <tr>
                <td>ค้างชำระวันนี้</td>
                <td class="text-right">
                  ฿{{ formatNumber(data.today.revenue - data.today.paidRevenue) }}
                </td>
              </tr>
              <tr class="summary-divider">
                <td colspan="2"></td>
              </tr>
              <tr>
                <td>รายรับเดือนนี้</td>
                <td class="text-right">฿{{ formatNumber(data.month.revenue) }}</td>
              </tr>
              <tr>
                <td>ค่าเฉลี่ยต่อคำสั่งเดือนนี้</td>
                <td class="text-right">฿{{ formatNumber(data.month.avgOrderValue) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useAuthStore } from "../stores/auth";
import axios from "axios";

const auth = useAuthStore();
const loading = ref(false);
const error = ref(null);
const selectedPeriod = ref("today");

const data = reactive({
  today: {
    orderCount: 0,
    revenue: 0,
    paidRevenue: 0,
    avgOrderValue: 0,
  },
  month: {
    orderCount: 0,
    revenue: 0,
    avgOrderValue: 0,
  },
  bestSellers: [],
  hourly: [],
});

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  headers: {
    Authorization: `Bearer ${auth.token}`,
  },
});

async function fetchDashboard() {
  loading.value = true;
  error.value = null;

  try {
    const response = await apiClient.get("/dashboard/summary");
    Object.assign(data, response.data);
  } catch (err) {
    error.value =
      err.response?.data?.error || "ไม่สามารถโหลดข้อมูล Dashboard ได้";
    console.error("Dashboard error:", err);
  } finally {
    loading.value = false;
  }
}

function formatNumber(num) {
  return parseFloat(num).toFixed(2);
}

function getHourlyDataWithAllHours() {
  // Create an array for all 24 hours (0-23)
  const allHours = Array.from({ length: 24 }, (_, i) => ({
    _id: i,
    count: 0,
  }));

  // Merge with actual data
  data.hourly.forEach((hour) => {
    const index = allHours.findIndex((h) => h._id === hour._id);
    if (index !== -1) {
      allHours[index] = hour;
    }
  });

  return allHours;
}

function getBarHeight(count) {
  const hourlyData = getHourlyDataWithAllHours();
  if (!hourlyData || hourlyData.length === 0) return 0;
  const maxCount = Math.max(...hourlyData.map((h) => h.count));
  if (maxCount === 0) return 0;
  return (count / maxCount) * 100;
}

function getSellerBarWidth(qty) {
  if (!data.bestSellers || data.bestSellers.length === 0) return 0;
  const maxQty = Math.max(...data.bestSellers.map((s) => s.qty));
  return (qty / maxQty) * 100;
}

onMounted(() => {
  fetchDashboard();
  // Auto-refresh every 30 seconds
  setInterval(fetchDashboard, 30000);
});
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
  background: var(--background);
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 28px;
  color: var(--text);
}

.date-selector {
  display: flex;
  gap: 8px;
}

.period-select {
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
}

.period-select:hover {
  border-color: var(--accent);
}

.loading,
.error-box {
  text-align: center;
  padding: 60px 24px;
  color: var(--muted);
  font-size: 16px;
}

.error-box {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  color: #c33;
}

.error-box .btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: #c33;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.error-box .btn:hover {
  background: #a22;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.kpi-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid var(--accent);
}

.kpi-card.revenue-card {
  border-left-color: #10b981;
}

.kpi-card.orders-card {
  border-left-color: #3b82f6;
}

.kpi-card.month-revenue-card {
  border-left-color: #f59e0b;
}

.kpi-card.month-avg-card {
  border-left-color: #8b5cf6;
}

.kpi-label {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.kpi-subtext {
  font-size: 12px;
  color: var(--muted);
}

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.chart-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
}

.chart-card h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text);
}

.chart-container {
  width: 100%;
  height: 200px;
}

.hourly-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 100%;
  gap: 2px;
  padding: 8px 0;
}

.hour-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  height: 100%;
}

.hour-bar {
  width: 100%;
  background: linear-gradient(180deg, var(--accent), var(--accent-dark, #0099ff));
  border-radius: 4px 4px 0 0;
  min-height: 2px;
  transition: opacity 0.2s;
  cursor: pointer;
}

.hour-bar:hover {
  opacity: 0.8;
}

.hour-label {
  font-size: 10px;
  color: var(--muted);
  white-space: nowrap;
}

.best-sellers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.seller-item {
  display: grid;
  grid-template-columns: 24px 1fr 120px;
  gap: 12px;
  align-items: center;
  padding: 8px;
  background: var(--panel-2);
  border-radius: 8px;
}

.seller-rank {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
  text-align: center;
}

.seller-info {
  min-width: 0;
}

.seller-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seller-stats {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.seller-bar {
  height: 6px;
  background: var(--line);
  border-radius: 3px;
  overflow: hidden;
}

.seller-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #10b981);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Summary Section */
.summary-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.summary-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
}

.summary-card h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text);
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.summary-table tr {
  border-bottom: 1px solid var(--line);
}

.summary-table tr:last-child {
  border-bottom: none;
}

.summary-table td {
  padding: 12px 0;
  color: var(--text);
}

.summary-table .text-right {
  text-align: right;
  font-weight: 600;
  color: var(--accent);
}

.summary-table .summary-divider {
  height: 8px;
  border-bottom: none;
}

.summary-table .summary-divider td {
  padding: 0;
  background: var(--line);
}

/* Responsive */
@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dashboard-container {
    padding: 16px;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .dashboard-header h1 {
    font-size: 22px;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .kpi-value {
    font-size: 24px;
  }

  .charts-section {
    grid-template-columns: 1fr;
  }

  .hourly-chart {
    gap: 1px;
  }

  .seller-item {
    grid-template-columns: 20px 1fr;
  }

  .seller-bar {
    display: none;
  }
}
</style>
