import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../../../firebase";

function CountCard({ title, value, toneClass }) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm text-white ${toneClass || ""}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-white/80">{title}</p>
      <h3 className="mt-2 text-3xl font-bold text-white">{value}</h3>
    </div>
  );
}

export default function SuperDashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({
    employees: 0,
    securityGuards: 0,
    admins: 0,
    managers: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const quickActionStyles = [
    "border-blue-500 bg-gradient-to-r from-blue-600 to-blue-400",
    "border-indigo-500 bg-gradient-to-r from-indigo-600 to-purple-500",
    "border-cyan-500 bg-gradient-to-r from-cyan-600 to-sky-400",
    "border-amber-400 bg-gradient-to-r from-amber-500 to-orange-400",
    "border-emerald-500 bg-gradient-to-r from-emerald-600 to-teal-400",
    "border-violet-500 bg-gradient-to-r from-violet-600 to-fuchsia-500",
  ];

  useEffect(() => {
    const toMillis = (value) => {
      if (!value) return 0;
      if (typeof value.toMillis === "function") return value.toMillis();
      if (value instanceof Date) return value.getTime();
      return 0;
    };

    const normalizeActivities = (...groups) =>
      groups
        .flat()
        .sort((a, b) => b.timeMs - a.timeMs)
        .slice(0, 8);

    let userActivities = [];
    let serviceActivities = [];
    let announcementActivities = [];

    const syncActivities = () => {
      setRecentActivities(
        normalizeActivities(userActivities, serviceActivities, announcementActivities)
      );
    };

    const unsubEmployees = onSnapshot(
      query(collection(db, "users"), where("role", "==", "employee")),
      (snap) =>
        setCounts((prev) => ({
          ...prev,
          employees: snap.size,
          securityGuards: snap.size,
        }))
    );
    const unsubAdmins = onSnapshot(
      query(collection(db, "users"), where("role", "==", "admin")),
      (snap) => setCounts((prev) => ({ ...prev, admins: snap.size }))
    );
    const unsubManagers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "manager")),
      (snap) => setCounts((prev) => ({ ...prev, managers: snap.size }))
    );
    const unsubRecentUsers = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc"), limit(8)),
      (snap) => {
        userActivities = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() || {}) }))
          .filter((row) => ["admin", "manager", "employee"].includes(String(row.role || "").toLowerCase()))
          .map((data) => {
            const createdMs = toMillis(data.createdAt || null);
            const updatedMs = toMillis(data.updatedAt || null);
            const isAdded = createdMs > 0 && (!updatedMs || updatedMs <= createdMs);
            const timeRaw = data.updatedAt || data.createdAt || null;
            const roleLabel = String(data.role || "user").toLowerCase();
            return {
              id: `user-${data.id}`,
              title: `${data.fullName || data.name || data.email || "User"} ${isAdded ? "added" : "updated"}`,
              subtitle: `${roleLabel} profile`,
              timeMs: toMillis(timeRaw),
            };
          });
        syncActivities();
      }
    );

    const unsubRecentServices = onSnapshot(
      query(collection(db, "services"), orderBy("createdAt", "desc"), limit(5)),
      (snap) => {
        serviceActivities = snap.docs.map((d) => {
          const data = d.data();
          const timeRaw = data.updatedAt || data.createdAt || null;
          return {
            id: `service-${d.id}`,
            title: `${data.name || "Service"} updated`,
            subtitle: "Service catalog",
            timeMs: toMillis(timeRaw),
          };
        });
        syncActivities();
      }
    );

    const unsubRecentAnnouncements = onSnapshot(
      query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(5)),
      (snap) => {
        announcementActivities = snap.docs.map((d) => {
          const data = d.data();
          const timeRaw = data.updatedAt || data.createdAt || null;
          return {
            id: `announcement-${d.id}`,
            title: `${data.title || "Announcement"} updated`,
            subtitle: "Announcement board",
            timeMs: toMillis(timeRaw),
          };
        });
        syncActivities();
      }
    );

    return () => {
      unsubEmployees();
      unsubAdmins();
      unsubManagers();
      unsubRecentUsers();
      unsubRecentServices();
      unsubRecentAnnouncements();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CountCard
          title="Total Employees"
          value={counts.employees + counts.admins + counts.managers}
          toneClass="border-blue-400 bg-gradient-to-r from-blue-600 to-blue-400"
        />
        <CountCard
          title="Security Guards"
          value={counts.securityGuards}
          toneClass="border-cyan-400 bg-gradient-to-r from-cyan-600 to-teal-400"
        />
        <CountCard
          title="Admin"
          value={counts.admins}
          toneClass="border-amber-300 bg-gradient-to-r from-amber-500 to-yellow-400"
        />
        <CountCard
          title="Manager"
          value={counts.managers}
          toneClass="border-fuchsia-400 bg-gradient-to-r from-fuchsia-600 to-purple-500"
        />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Recent Activity</h3>
        {recentActivities.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity found.</p>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.subtitle}</p>
                </div>
                <p className="text-xs text-slate-400">
                  {item.timeMs ? new Date(item.timeMs).toLocaleString() : "-"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => navigate("/superadmin/admin")}
            className={`rounded-xl border px-4 py-3 text-left text-white shadow-sm transition hover:opacity-95 ${quickActionStyles[0]}`}
          >
            Manage Admins
          </button>
          <button
            type="button"
            onClick={() => navigate("/superadmin/manager")}
            className={`rounded-xl border px-4 py-3 text-left text-white shadow-sm transition hover:opacity-95 ${quickActionStyles[1]}`}
          >
            Manage Managers
          </button>
          <button
            type="button"
            onClick={() => navigate("/superadmin/employee")}
            className={`rounded-xl border px-4 py-3 text-left text-white shadow-sm transition hover:opacity-95 ${quickActionStyles[2]}`}
          >
            Manage Employees
          </button>
          <button
            type="button"
            onClick={() => navigate("/superadmin/announcement")}
            className={`rounded-xl border px-4 py-3 text-left text-white shadow-sm transition hover:opacity-95 ${quickActionStyles[3]}`}
          >
            Announcements
          </button>
          <button
            type="button"
            onClick={() => navigate("/superadmin/services")}
            className={`rounded-xl border px-4 py-3 text-left text-white shadow-sm transition hover:opacity-95 ${quickActionStyles[4]}`}
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => navigate("/superadmin/notifications")}
            className={`rounded-xl border px-4 py-3 text-left text-white shadow-sm transition hover:opacity-95 ${quickActionStyles[5]}`}
          >
            Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
