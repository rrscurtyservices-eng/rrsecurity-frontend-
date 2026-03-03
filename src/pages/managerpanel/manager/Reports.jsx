import React, { useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [weeklyRes, monthlyRes] = await Promise.all([
          managerApi.reportsWeekly(),
          managerApi.reportsMonthly(),
        ]);
        setWeekly(weeklyRes.data || null);
        setMonthly(monthlyRes.data || null);
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
      totalRecords: summary.totalRecords || 0,
      present: summary.present || 0,
      late: summary.late || 0,
      absent: summary.absent || 0,
      halfDay: summary.halfDay || 0,
    };
  }, [monthly]);

  const weeklyTrend = weekly?.weeklyTrend || [];

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white p-5 rounded-xl shadow">
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-gray-600 mt-1">Attendance summary for the current period</p>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {loading && <div className="mt-3 text-sm text-gray-500">Loading reports...</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: "Total Records", value: monthlySummary.totalRecords },
          { label: "Present", value: monthlySummary.present },
          { label: "Late", value: monthlySummary.late },
          { label: "Absent", value: monthlySummary.absent },
          { label: "Half Day", value: monthlySummary.halfDay },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl shadow p-4">
            <h3 className="text-gray-600 text-sm">{item.label}</h3>
            <p className="text-2xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="font-semibold mb-3">Weekly Attendance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-600 border-b">
              <tr>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Present</th>
                <th className="py-2 text-left">Late</th>
                <th className="py-2 text-left">Absent</th>
                <th className="py-2 text-left">Half Day</th>
              </tr>
            </thead>
            <tbody>
              {weeklyTrend.map((d, i) => (
                <tr key={d.date || `row-${i}`} className="border-b">
                  <td className="py-2">{shortDate(d.date)}</td>
                  <td className="py-2">{d.present || 0}</td>
                  <td className="py-2">{d.late || 0}</td>
                  <td className="py-2">{d.absent || 0}</td>
                  <td className="py-2">{d["half-day"] || d.halfDay || 0}</td>
                </tr>
              ))}
              {!loading && weeklyTrend.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-sm text-gray-500 text-center">
                    No weekly data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
