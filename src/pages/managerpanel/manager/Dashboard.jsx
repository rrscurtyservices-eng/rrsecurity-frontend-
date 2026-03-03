import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { managerApi } from "../../../services/api";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [location, setLocation] = useState([]);
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
        const date = todayISO();
        const [attendanceRes, locationRes] = await Promise.all([
          managerApi.attendance(date),
          managerApi.location(date),
        ]);
        setAttendance(attendanceRes.data?.employees || []);
        setLocation(locationRes.data?.employees || []);
      } catch (e) {
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totals = useMemo(() => {
    const statuses = attendance.map((e) => e.attendanceStatus || e.status).filter(Boolean);
    return {
      presentToday: statuses.filter((s) => s === "Present").length,
      lateToday: statuses.filter((s) => s === "Late").length,
      absentToday: statuses.filter((s) => s === "Absent").length,
      halfDayToday: statuses.filter((s) => s === "Half Day").length,
    };
  }, [attendance]);

  const locationSummary = useMemo(() => {
    const statuses = location.map((e) => e.status).filter(Boolean);
    return {
      withinRange: statuses.filter((s) => s === "Within Range").length,
      outOfRange: statuses.filter((s) => s === "Out of Range").length,
      notTracked: statuses.filter((s) => s === "Not Tracked").length,
    };
  }, [location]);

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

      <div className="flex gap-3 flex-wrap">
        {quickActions.map((action) => (
          <button
            key={action.path}
            type="button"
            className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm font-semibold"
            onClick={() => navigate(action.path)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
