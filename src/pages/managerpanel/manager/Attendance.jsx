import React, { useEffect, useMemo, useState } from "react";
import { managerApi } from "../../../services/api";

const formatTime = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await managerApi.attendance(selectedDate);
        setEmployees(res.data?.employees || []);
      } catch {
        setError("Failed to load attendance");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedDate]);

  const counts = useMemo(() => {
    const all = employees.map((e) => e.attendanceStatus || e.status).filter(Boolean);
    return {
      present: all.filter((s) => s === "Present").length,
      late: all.filter((s) => s === "Late").length,
      halfDay: all.filter((s) => s === "Half Day").length,
      absent: all.filter((s) => s === "Absent").length,
    };
  }, [employees]);

  return (
    <div className="w-full">
      <div className="bg-white p-4 rounded-lg shadow mb-6 border">
        <label className="text-sm font-medium text-gray-600">Select Date:</label>
        <div className="flex flex-wrap items-center mt-2 gap-4">
          <input
            type="date"
            className="border px-3 py-2 rounded-lg shadow-sm focus:ring focus:ring-blue-200"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <button type="button" className="px-4 py-2 bg-gray-900 text-white rounded-full text-sm">
              Present: {counts.present}
            </button>
            <button type="button" className="px-4 py-2 bg-red-600 text-white rounded-full text-sm">
              Late: {counts.late}
            </button>
            <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm">
              Absent: {counts.absent}
            </button>
            <button type="button" className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm">
              Half Day: {counts.halfDay}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border">
        <h2 className="text-lg font-semibold mb-4">Attendance Summary</h2>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        {loading && <div className="mb-3 text-sm text-gray-500">Loading...</div>}

        <table className="w-full text-sm">
          <thead className="border-b text-gray-600">
            <tr>
              <th className="pb-2 text-left px-2">Employee</th>
              <th className="pb-2 text-left px-2">Login</th>
              <th className="pb-2 text-left px-2">Marked</th>
              <th className="pb-2 text-left px-2">Status</th>
              <th className="pb-2 text-left px-2">Department</th>
            </tr>
          </thead>
          <tbody>
            {!loading && employees.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">
                  No records found
                </td>
              </tr>
            )}
            {employees.map((emp) => (
              <tr key={emp.id || emp.email || emp.name} className="border-b">
                <td className="py-3 text-left px-2">{emp.name || emp.fullName || emp.email}</td>
                <td className="py-3 text-left px-2">{formatTime(emp.lastLoginAt)}</td>
                <td className="py-3 text-left px-2">{formatTime(emp.attendanceTime)}</td>
                <td className="py-3 text-left px-2">{emp.attendanceStatus || emp.status || "--"}</td>
                <td className="py-3 text-left px-2">{emp.department || emp.dept || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
