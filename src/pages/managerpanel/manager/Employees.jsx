import React, { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { managerApi } from "../../../services/api";

const initials = (name) => {
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export default function Employees() {
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await managerApi.employees({ q: query });
        setEmployees(res.data?.employees || res.data?.data || []);
      } catch {
        setError("Failed to load employees");
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="w-full px-4 lg:px-6 py-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Employee Directory</h2>
          <p className="text-gray-600">View all assigned employees</p>
        </div>

        <div className="mt-3 md:mt-0 relative w-full md:w-72">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            className="w-full border rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-xl p-4 overflow-x-auto">
        <h3 className="text-md font-semibold text-gray-700 mb-3">All Employees</h3>
        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        {loading && <div className="text-sm text-gray-500 mb-3">Loading...</div>}

        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="text-left text-gray-600 text-sm border-b">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Assigned Location</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id || emp.email || emp.name} className="border-b text-sm text-gray-700">
                <td className="py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                    {initials(emp.name || emp.fullName || emp.email)}
                  </div>
                  <div>
                    <p className="font-semibold">{emp.name || emp.fullName || emp.email}</p>
                  </div>
                </td>
                <td>{emp.email || "--"}</td>
                <td>{emp.department || emp.dept || "-"}</td>
                <td>{emp.assignedLocation?.name || emp.assignedLocation?.label || "-"}</td>
              </tr>
            ))}
            {!loading && employees.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
