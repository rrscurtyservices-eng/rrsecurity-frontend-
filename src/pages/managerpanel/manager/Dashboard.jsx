import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { managerApi } from "../../../services/api";

const formatDateTime = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [totals, setTotals] = useState({
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    halfDayToday: 0,
  });
  const [locationSummary, setLocationSummary] = useState({
    withinRange: 0,
    outOfRange: 0,
    notTracked: 0,
  });
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const quickActions = [
    { label: "Mark Attendance", path: "/manager/attendance" },
    { label: "Track Location", path: "/manager/location" },
    { label: "View Employees", path: "/manager/employees" },
    { label: "View Reports", path: "/manager/reports" },
  ];

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [dashboardRes, activityRes] = await Promise.all([
          managerApi.dashboard(),
          managerApi.activity({ limit: 5 }),
        ]);
        const dashboard = dashboardRes.data || {};
        setTotals((prev) => ({ ...prev, ...(dashboard.totals || {}) }));
        setLocationSummary((prev) => ({ ...prev, ...(dashboard.locationSummary || {}) }));
        setActivity(activityRes.data?.logs || []);
      } catch (e) {
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const recentActivity = useMemo(() => {
    return (activity || [])
      .filter((log) => log?.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [activity]);

  return (
    <div className="w-full">
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      {loading && <div className="mb-4 text-sm text-gray-500">Loading...</div>}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-500 text-white rounded-lg p-4 flex items-center gap-3">
          <div className="text-lg font-semibold">Present Today</div>
          <div className="ml-auto text-2xl font-bold">{totals.presentToday}</div>
        </div>
        <div className="bg-yellow-500 text-white rounded-lg p-4 flex items-center gap-3">
          <div className="text-lg font-semibold">Late Today</div>
          <div className="ml-auto text-2xl font-bold">{totals.lateToday}</div>
        </div>
        <div className="bg-red-500 text-white rounded-lg p-4 flex items-center gap-3">
          <div className="text-lg font-semibold">Absent Today</div>
          <div className="ml-auto text-2xl font-bold">{totals.absentToday}</div>
        </div>
        <div className="bg-blue-500 text-white rounded-lg p-4 flex items-center gap-3">
          <div className="text-lg font-semibold">Half Day</div>
          <div className="ml-auto text-2xl font-bold">{totals.halfDayToday}</div>
        </div>
      </div>

      <div className="bg-orange-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-600">Within Range</div>
            <div className="text-2xl font-bold text-green-600">{locationSummary.withinRange}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-600">Out of Range</div>
            <div className="text-2xl font-bold text-red-600">{locationSummary.outOfRange}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-600">Not Tracked</div>
            <div className="text-2xl font-bold text-gray-600">{locationSummary.notTracked}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.path}
              type="button"
              className="w-full px-6 py-3 rounded-lg border bg-white hover:bg-gray-50 text-base font-semibold"
              onClick={() => navigate(action.path)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
        {recentActivity.length === 0 && (
          <div className="text-sm text-gray-500">No recent activity.</div>
        )}
        <div className="space-y-3">
          {recentActivity.map((log, index) => (
            <div
              key={log.id || `${log.timestamp}-${index}`}
              className="border rounded-lg p-3 flex items-start justify-between gap-4"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {log.title || log.employeeName || "Activity"}
                </div>
                <div className="text-xs text-gray-500">
                  {log.subtitle || log.employeeEmail || "--"}
                </div>
                {log.detail || log.locationName || log.action ? (
                  <div className="text-sm text-gray-600 mt-1">
                    {log.detail || log.locationName || log.action}
                  </div>
                ) : null}
              </div>
              <div className="text-xs text-gray-500 whitespace-nowrap">
                {formatDateTime(log.timestamp)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
