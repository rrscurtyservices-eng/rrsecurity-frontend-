import React, { useEffect, useMemo, useState } from "react";
import {
  FaUsers,
  FaUserTie,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../firebase";
import { API_URL } from "../../../api/employee";

export default function Dashboard() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  const quickActions = [
    { label: "Manage Employees", color: "bg-black text-white", path: "/admin/employees" },
    { label: "Manage Managers", color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white", path: "/admin/managers" },
    { label: "Add Employee", color: "bg-black text-white", path: "/admin/employees" },
    { label: "Add Service", color: "bg-black text-white", path: "/admin/services" },
  ];

  const getToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    return user.getIdToken();
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const [empRes, mgrRes] = await Promise.all([
          fetch(`${API_URL}/api/employees`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/managers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(empData);
        }

        if (mgrRes.ok) {
          const mgrData = await mgrRes.json();
          setManagers(mgrData);
        }
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const activeEmployees = employees.filter((e) => e.status === "Active");
    return {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      totalManagers: managers.length,
    };
  }, [employees, managers]);

  const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (value?.seconds) return value.seconds * 1000;
    const parsed = Date.parse(String(value));
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const recentActivities = useMemo(() => {
    const rows = [];

    employees.forEach((item) => {
      const createdMs = toMillis(item.createdAt);
      const timeRaw = item.updatedAt || item.createdAt || null;
      rows.push({
        id: `emp-${item.uid || item.employeeId || Math.random()}`,
        title: createdMs ? "Employee Added" : "Employee Updated",
        subtitle: item.name || item.fullName || item.email || "Employee",
        timeMs: toMillis(timeRaw),
      });
    });

    managers.forEach((item) => {
      const createdMs = toMillis(item.createdAt);
      const timeRaw = item.updatedAt || item.createdAt || null;
      rows.push({
        id: `mgr-${item.uid || item.employeeId || Math.random()}`,
        title: createdMs ? "Manager Added" : "Manager Updated",
        subtitle: item.name || item.fullName || item.email || "Manager",
        timeMs: toMillis(timeRaw),
      });
    });

    return rows.sort((a, b) => b.timeMs - a.timeMs).slice(0, 6);
  }, [employees, managers]);

  return (
    <div className="space-y-6">
      {/* summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="rounded-lg p-5 text-white bg-gradient-to-r from-blue-500 to-blue-400">
          <div className="flex justify-between">
            <div>
              <p className="text-sm">Total Employees</p>
              <p className="text-2xl font-semibold mt-2">
                {stats.totalEmployees} <br />
                <span className="text-sm opacity-80">
                  {stats.activeEmployees} active
                </span>
              </p>
            </div>
            <div className="text-3xl opacity-90"><FaUsers /></div>
          </div>
        </div>

        <div className="rounded-lg p-5 text-white bg-gradient-to-r from-purple-500 to-pink-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm">Total Managers</p>
              <p className="text-2xl font-semibold mt-2">
                {stats.totalManagers} <br />
                <span className="text-sm opacity-80">total</span>
              </p>
            </div>
            <div className="text-3xl opacity-90"><FaUserTie /></div>
          </div>
        </div>

      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {loading && <div className="text-sm text-gray-500">Loading activity...</div>}
          {!loading && recentActivities.length === 0 && (
            <div className="text-sm text-gray-500">No recent activity.</div>
          )}
          {!loading &&
            recentActivities.map((row) => (
              <div key={row.id} className="p-4 rounded-md bg-gray-50 border flex justify-between items-center">
                <div>
                  <p className="font-medium">{row.title}</p>
                  <p className="text-sm text-gray-600">{row.subtitle}</p>
                </div>
                <div className="text-xs text-gray-500">
                  {row.timeMs ? new Date(row.timeMs).toLocaleString() : "-"}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((q, i) => (
            <button
              key={i}
              className={`py-3 rounded-md ${q.color} hover:opacity-90 transition`}
              onClick={() => navigate(q.path)}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
