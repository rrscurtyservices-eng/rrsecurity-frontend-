import React, { useEffect, useMemo, useState } from "react";
import { managerApi } from "../../../services/api";

const formatTime = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const minutesBetween = (start, end) => {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const diff = Math.max(0, e - s);
  return Math.round(diff / 60000);
};

const timeStringToMinutes = (value) => {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  if (/am|pm/i.test(v)) {
    const parts = v.replace(/\s+/g, "").toLowerCase();
    const match = parts.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
    let h = Number(match[1]);
    const m = Number(match[2]);
    const period = match[3];
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (period === "pm" && h < 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    return h * 60 + m;
  }
  const parts = v.split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const formatMinutes = (mins) => {
  if (mins == null) return "--";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

const STORAGE_KEY = "manager.employee.shiftLocationEdits";

const loadEdits = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const getSchedule = (emp) => {
  return (
    emp.workSchedule ||
    emp.schedule ||
    emp.shift ||
    emp.shiftDetails ||
    emp.assignment?.workSchedule ||
    emp.assignment?.schedule ||
    null
  );
};

const parseHourValue = (value) => {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return Number(match[1]);
};

const getAllottedMinutes = (emp, schedule) => {
  const directMinutes =
    emp.allottedMinutes ||
    emp.allottedMins ||
    emp.assignedMinutes ||
    emp.shiftMinutes ||
    null;
  if (typeof directMinutes === "number") return directMinutes;

  const directHours =
    emp.allottedHours ||
    emp.assignedHours ||
    emp.shiftHours ||
    emp.workingHours ||
    null;
  const hoursValue = parseHourValue(directHours);
  if (hoursValue != null) return Math.round(hoursValue * 60);

  const startRaw =
    schedule?.startTime || schedule?.start || schedule?.from || schedule?.inTime || schedule?.in;
  const endRaw =
    schedule?.endTime || schedule?.end || schedule?.to || schedule?.outTime || schedule?.out;

  const startMins = timeStringToMinutes(startRaw);
  const endMins = timeStringToMinutes(endRaw);

  if (startMins != null && endMins != null) {
    return endMins >= startMins ? endMins - startMins : endMins + 1440 - startMins;
  }

  return null;
};

const normalizeStatus = (emp) => {
  const value =
    emp.attendanceStatus ||
    emp.status ||
    emp.attendance?.status ||
    emp.attendance?.state ||
    emp.attendanceState ||
    emp.state;
  if (value) {
    const text = String(value).trim().toLowerCase();
    if (text === "halfday" || text === "half_day") return "Half Day";
    if (text === "present") return "Present";
    if (text === "late") return "Late";
    if (text === "absent") return "Absent";
    return text ? text[0].toUpperCase() + text.slice(1) : "--";
  }
  if (emp.isPresent) return "Present";
  if (emp.isLate) return "Late";
  if (emp.isAbsent) return "Absent";
  if (emp.isHalfDay) return "Half Day";
  return "--";
};

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await managerApi.attendance(selectedDate);
        if (!isActive) return;
        const list = res.data?.employees || [];
        const overrides = loadEdits();
        const merged = list.map((emp) => {
          const key = emp.id || emp.email || emp.name;
          const override = overrides[key];
          if (!override) return emp;
          return {
            ...emp,
            workSchedule: override.workSchedule || emp.workSchedule,
          };
        });
        setEmployees(merged);
      } catch {
        if (!isActive) return;
        setError("Failed to load attendance");
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [selectedDate]);

  const counts = useMemo(() => {
    const all = employees.map((e) => normalizeStatus(e)).filter(Boolean);
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
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Select Date:</label>
            <input
              type="date"
              className="border px-3 py-2 rounded-lg shadow-sm focus:ring focus:ring-blue-200"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
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
              <th className="pb-2 text-left px-2">Punch In</th>
              <th className="pb-2 text-left px-2">Punch Out</th>
              <th className="pb-2 text-left px-2">Working Hours</th>
              <th className="pb-2 text-left px-2">Allotted Hours</th>
              <th className="pb-2 text-left px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && employees.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500">
                  No records found
                </td>
              </tr>
            )}
            {employees.map((emp) => {
              const punchIn =
                emp.punchInAt ||
                emp.punchInTime ||
                emp.punchIn ||
                emp.checkInAt ||
                emp.checkInTime ||
                emp.checkIn ||
                emp.attendanceInAt ||
                emp.attendanceTime ||
                emp.lastLoginAt;
              const punchOut =
                emp.punchOutAt ||
                emp.punchOutTime ||
                emp.punchOut ||
                emp.checkOutAt ||
                emp.checkOutTime ||
                emp.checkOut ||
                emp.attendanceOutAt ||
                emp.logoutAt ||
                emp.lastLoginAt;
              const workedMins = minutesBetween(punchIn, punchOut);
              const schedule = getSchedule(emp);
              const allottedMins = getAllottedMinutes(emp, schedule);
              const statusLabel = normalizeStatus(emp);
              return (
                <tr key={emp.id || emp.email || emp.name} className="border-b">
                  <td className="py-3 text-left px-2">{emp.name || emp.fullName || emp.email}</td>
                  <td className="py-3 text-left px-2">{formatTime(punchIn)}</td>
                  <td className="py-3 text-left px-2">{formatTime(punchOut)}</td>
                  <td className="py-3 text-left px-2">{formatMinutes(workedMins)}</td>
                  <td className="py-3 text-left px-2">{formatMinutes(allottedMins)}</td>
                  <td className="py-3 text-left px-2">{statusLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
