import React, { useEffect, useMemo, useState } from "react";
import { managerApi } from "../../../services/api";

export default function Location() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await managerApi.location(date);
        setEmployees(res.data?.employees || []);
      } catch {
        setError("Failed to load location data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [date]);

  const counts = useMemo(() => {
    const withinRange = employees.filter((e) => e.status === "Within Range").length;
    const outOfRange = employees.filter((e) => e.status === "Out of Range").length;
    const notTracked = employees.filter((e) => e.status === "Not Tracked").length;
    return { withinRange, outOfRange, notTracked };
  }, [employees]);

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700">Location Tracking Summary</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Select Date:</label>
          <input
            type="date"
            className="border px-3 py-2 rounded-lg shadow-sm focus:ring focus:ring-blue-200"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {error && (
          <div className="mt-3 bg-red-50 border border-red-300 p-3 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-green-100 text-green-700 text-center shadow">
          <h3 className="font-semibold">Within Range</h3>
          <p className="text-3xl font-bold">{counts.withinRange}</p>
        </div>
        <div className="p-5 rounded-xl bg-red-100 text-red-700 text-center shadow">
          <h3 className="font-semibold">Out of Range</h3>
          <p className="text-3xl font-bold">{counts.outOfRange}</p>
        </div>
        <div className="p-5 rounded-xl bg-yellow-100 text-yellow-700 text-center shadow">
          <h3 className="font-semibold">Not Tracked</h3>
          <p className="text-3xl font-bold">{counts.notTracked}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Employee Status</h3>
        {loading && <div className="text-sm text-gray-500">Loading locations...</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-gray-600">
              <tr>
                <th className="pb-2 text-left px-2">Employee</th>
                <th className="pb-2 text-left px-2">Email</th>
                <th className="pb-2 text-left px-2">Assigned Location</th>
                <th className="pb-2 text-left px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && employees.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-gray-500">
                    No records found
                  </td>
                </tr>
              )}
              {employees.map((emp) => (
                <tr key={emp.id || emp.email || emp.name} className="border-b">
                  <td className="py-3 text-left px-2">{emp.name || emp.fullName || emp.email}</td>
                  <td className="py-3 text-left px-2">{emp.email || "--"}</td>
                  <td className="py-3 text-left px-2">
                    {emp.assignedLocation?.name || emp.assignedLocation?.label || "-"}
                  </td>
                  <td className="py-3 text-left px-2">{emp.status || "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
