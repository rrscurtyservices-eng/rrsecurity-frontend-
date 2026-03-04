import React, { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaSearch,
  FaClipboardCheck,
  FaUsers,
} from "react-icons/fa";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { auth, db } from "../../../firebase";
import { COLLECTIONS } from "../../../services/collections";
import { API_URL } from "../../../api/employee";

function getEpoch(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toDisplayDate(value) {
  const epoch = getEpoch(value);
  return epoch ? new Date(epoch).toLocaleString() : "-";
}

export default function SuperActivity() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not logged in");
        const token = await user.getIdToken();

        const [adminsRes, managersRes, employeesRes] = await Promise.all([
          fetch(`${API_URL}/api/admins`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/managers`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/employees`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const [servicesResult, attendanceResult, announcementsResult] = await Promise.allSettled([
          getDocs(query(collection(db, COLLECTIONS.SERVICES), orderBy("createdAt", "desc"), limit(40))),
          getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), orderBy("createdAt", "desc"), limit(60))),
          getDocs(query(collection(db, COLLECTIONS.ANNOUNCEMENTS), orderBy("createdAt", "desc"), limit(30))),
        ]);

        const [adminsBody, managersBody, employeesBody] = await Promise.all([
          adminsRes.json().catch(() => []),
          managersRes.json().catch(() => []),
          employeesRes.json().catch(() => []),
        ]);

        if (!adminsRes.ok) throw new Error(adminsBody?.message || "Failed to load admins");
        if (!managersRes.ok) throw new Error(managersBody?.message || "Failed to load managers");
        if (!employeesRes.ok) throw new Error(employeesBody?.message || "Failed to load employees");

        const records = [];
        const employeeIdSet = new Set(
          (Array.isArray(employeesBody) ? employeesBody : [])
            .flatMap((row) => [row?.uid, row?.id, row?.userId, row?.employeeId])
            .filter(Boolean)
            .map((v) => String(v))
        );

        (Array.isArray(adminsBody) ? adminsBody : []).forEach((row) => {
          records.push({
            id: `admin-${row.uid || row.id}`,
            type: "admin",
            title: `${row.fullName || row.name || row.email || "Admin"} profile`,
            subtitle: "Admin lifecycle",
            actor: "Super Admin",
            status: row.status === "Inactive" ? "warning" : "success",
            time: row.updatedAt || row.createdAt || null,
          });
        });

        (Array.isArray(managersBody) ? managersBody : []).forEach((row) => {
          records.push({
            id: `manager-${row.uid || row.id}`,
            type: "manager",
            title: `${row.fullName || row.name || row.email || "Manager"} profile`,
            subtitle: "Manager lifecycle",
            actor: "Admin/Super Admin",
            status: row.status === "Inactive" ? "warning" : "success",
            time: row.updatedAt || row.createdAt || null,
          });
        });

        (Array.isArray(employeesBody) ? employeesBody : []).forEach((row) => {
          records.push({
            id: `employee-${row.uid || row.id}`,
            type: "employee",
            title: `${row.fullName || row.name || row.email || "Employee"} profile`,
            subtitle: "Employee lifecycle",
            actor: "Admin/Manager",
            status: row.status === "Inactive" ? "warning" : "success",
            time: row.updatedAt || row.createdAt || null,
          });
        });

        if (servicesResult.status === "fulfilled") {
          servicesResult.value.docs.forEach((docSnap) => {
            const row = docSnap.data() || {};
            records.push({
              id: `service-${docSnap.id}`,
              type: "services",
              title: `${row.name || "Service"} updated`,
              subtitle: "Service catalog",
              actor: "Admin/Super Admin",
              status: "info",
              time: row.updatedAt || row.createdAt || null,
            });
          });
        }

        if (attendanceResult.status === "fulfilled") {
          attendanceResult.value.docs.forEach((docSnap) => {
            const row = docSnap.data() || {};
            const attendanceUserId = String(
              row.userId || row.uid || row.employeeUid || row.employeeId || ""
            );
            if (!attendanceUserId || !employeeIdSet.has(attendanceUserId)) return;
            records.push({
              id: `attendance-${docSnap.id}`,
              type: "attendance",
              title: `${row.employeeName || attendanceUserId} marked ${row.status || ""}`.trim(),
              subtitle: "Attendance record",
              actor: row.recordedBy || "System",
              status: "success",
              time: row.createdAt || row.updatedAt || null,
            });
          });
        }

        if (announcementsResult.status === "fulfilled") {
          announcementsResult.value.docs.forEach((docSnap) => {
            const row = docSnap.data() || {};
            records.push({
              id: `announcement-${docSnap.id}`,
              type: "announcement",
              title: row.title || "Announcement posted",
              subtitle: `Audience: ${row.audience || "all"}`,
              actor: "Admin/Super Admin",
              status: "info",
              time: row.updatedAt || row.createdAt || null,
            });
          });
        }

        records.sort((a, b) => getEpoch(b.time) - getEpoch(a.time));
        setTimeline(records);
      } catch (err) {
        setTimeline([]);
        setError(err?.message || "Failed to load activity");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [API_URL]);

  const filteredTimeline = useMemo(() => {
    const q = search.trim().toLowerCase();
    return timeline.filter((item) => {
      const hay = `${item.title} ${item.subtitle} ${item.actor}`.toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchDate =
        !selectedDate ||
        (item.time && !Number.isNaN(new Date(getEpoch(item.time)).getTime()) &&
          new Date(getEpoch(item.time)).toISOString().slice(0, 10) === selectedDate);
      return matchSearch && matchDate;
    });
  }, [timeline, search, selectedDate]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">
            <FaCalendarAlt className="text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-transparent outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">
            <FaSearch />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity by title, subtitle or actor"
              className="w-full bg-transparent outline-none"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto p-4">
          {loading && <p className="text-sm text-slate-700">Loading full activity...</p>}
          {!loading && error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && filteredTimeline.length === 0 && (
            <p className="text-sm text-slate-700">No activity found.</p>
          )}
          {!loading && !error && filteredTimeline.length > 0 && (
            <div className="space-y-3">
              {filteredTimeline.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-white p-2 text-slate-600">
                      <FaUsers />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-700">{item.subtitle}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-700">
                        <span className="rounded bg-slate-200 px-2 py-0.5 uppercase">{item.type}</span>
                        <span>{item.actor}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={item.status} />
                    <p className="mt-2 whitespace-nowrap text-xs text-slate-700">{toDisplayDate(item.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    success: "bg-emerald-100 text-emerald-700",
    info: "bg-sky-100 text-sky-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${map[status] || map.info}`}>
      {status}
    </span>
  );
}
