import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { FaDownload } from "react-icons/fa";
import { managerApi } from "../../../services/api";

const shortDate = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};

export default function Reports() {
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [weeklyRes, monthlyRes, employeesRes] = await Promise.all([
          managerApi.reportsWeekly(),
          managerApi.reportsMonthly(),
          managerApi.employees(),
        ]);
        setWeekly(weeklyRes.data || null);
        setMonthly(monthlyRes.data || null);
        setEmployeeCount(employeesRes.data?.employees?.length || 0);
      } catch {
        setError("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const monthlySummary = useMemo(() => {
    const summary = monthly?.monthlySummary || {};
    return {
      totalEmployees: summary.totalEmployees || summary.employeeCount || employeeCount || 0,
      totalRecords: summary.totalRecords || 0,
      present: summary.present || 0,
      late: summary.late || 0,
      absent: summary.absent || 0,
      halfDay: summary.halfDay || 0,
    };
  }, [monthly, employeeCount]);

  const weeklyTrend = weekly?.weeklyTrend || [];

  const attendanceRate = useMemo(() => {
    const attended = monthlySummary.present + monthlySummary.late + monthlySummary.halfDay;
    return monthlySummary.totalRecords
      ? Math.round((attended / monthlySummary.totalRecords) * 1000) / 10
      : 0;
  }, [monthlySummary]);

  const weeklyChart = weeklyTrend.map((d, i) => ({
    name: shortDate(d.date || `Day ${i + 1}`),
    Present: d.present || 0,
    Late: d.late || 0,
    Absent: d.absent || 0,
    "Half Day": d["half-day"] || d.halfDay || 0,
  }));

  const distribution = [
    { name: "Present", value: monthlySummary.present },
    { name: "Absent", value: monthlySummary.absent },
    { name: "Late", value: monthlySummary.late },
    { name: "Half Day", value: monthlySummary.halfDay },
  ];

  const pieColors = ["#16a34a", "#ef4444", "#f59e0b", "#60a5fa"];

  const trendLine = weeklyTrend.map((d, i) => {
    const present = d.present || 0;
    const late = d.late || 0;
    const halfDay = d["half-day"] || d.halfDay || 0;
    const absent = d.absent || 0;
    const total = present + late + halfDay + absent;
    const rate = total ? Math.round(((present + late + halfDay) / total) * 1000) / 10 : 0;
    return {
      name: shortDate(d.date || `Day ${i + 1}`),
      value: rate,
    };
  });

  const topEmployeesRaw =
    monthly?.topPerformers ||
    monthly?.topEmployees ||
    weekly?.topPerformers ||
    weekly?.topEmployees ||
    [];

  const topEmployees = topEmployeesRaw.map((t, i) => ({
    ...t,
    rank: t.rank || i + 1,
    attendance: t.attendancePercent ?? t.attendance ?? t.rate ?? 0,
    name: t.name || t.fullName || t.email || "--",
  }));

  return (
    <div className="p-6 sm:p-10 bg-gray-50 min-h-screen w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 rounded-md border bg-white text-sm">
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Year</option>
          </select>
          <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition">
            <FaDownload /> Export Report
          </button>
        </div>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && <div className="text-sm text-gray-500">Loading reports...</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Overall Attendance", value: `${attendanceRate}%`, icon: "✓" },
          { label: "Total Employees", value: monthlySummary.totalEmployees || 0, icon: "👥" },
          { label: "Late Arrivals", value: monthlySummary.late || 0, icon: "⏰" },
          { label: "Absent Days", value: monthlySummary.absent || 0, icon: "⚠️" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg p-5 border shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-gray-50">
                  <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-slate-900 font-bold">
                    {item.icon}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{item.label}</div>
                  <div className="text-2xl font-semibold text-slate-900 mt-2">{item.value}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-5 border shadow-sm">
          <h3 className="text-md font-medium text-slate-900 mb-4">Weekly Attendance Trends</h3>
          {weeklyChart.length === 0 ? (
            <div className="text-sm text-gray-500">No weekly data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Present" fill="#16a34a" barSize={18} />
                <Bar dataKey="Late" fill="#f59e0b" barSize={18} />
                <Bar dataKey="Absent" fill="#ef4444" barSize={18} />
                <Bar dataKey="Half Day" fill="#60a5fa" barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg p-5 border shadow-sm">
          <h3 className="text-md font-medium text-slate-900 mb-4">Attendance Distribution</h3>
          {distribution.every((d) => d.value === 0) ? (
            <div className="text-sm text-gray-500">No distribution data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={120}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={pieColors[index]} />
                  ))}
                </Pie>
                <Legend verticalAlign="top" height={24} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-5 border shadow-sm">
          <h3 className="text-md font-medium text-slate-900 mb-4">Attendance Trend (Last 7 Days)</h3>
          {trendLine.length === 0 ? (
            <div className="text-sm text-gray-500">No trend data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendLine}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#1e40af" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-5 border shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-medium text-slate-900">Top Performing Employees</h3>
        </div>

        <table className="w-full min-w-max text-sm">
          <thead className="text-gray-700 bg-gray-50">
            <tr>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Employee Name</th>
              <th className="py-3 px-4">Attendance</th>
            </tr>
          </thead>

          <tbody className="text-gray-600">
            {topEmployees.map((t) => (
              <tr key={t.id || t.email || t.name || i} className="border-t">
                <td className="py-4 px-4">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-medium">
                    {t.rank}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      {(t.name || "E").charAt(0)}
                    </div>
                    <div className="font-medium text-gray-900">{t.name}</div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="w-48 bg-gray-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-green-500"
                      style={{ width: `${t.attendance}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{t.attendance}%</div>
                </td>
              </tr>
            ))}
            {!loading && topEmployees.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500">
                  No top performers available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
