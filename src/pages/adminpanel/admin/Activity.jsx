import React, { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaUserTie,
  FaUserShield,
  FaClipboardCheck,
  FaBuilding,
} from "react-icons/fa";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { auth, db } from "../../../firebase";
import { COLLECTIONS } from "../../../services/collections";
import { API_URL } from "../../../api/employee";

export default function Activity() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const getToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    return user.getIdToken();
  };

  const getEpochSeconds = (value) => {
    if (!value) return null;
    if (typeof value === "number") return Math.floor(value / 1000);
    if (typeof value === "string") {
      const t = Date.parse(value);
      return Number.isNaN(t) ? null : Math.floor(t / 1000);
    }
    if (value.seconds) return value.seconds;
    if (value._seconds) return value._seconds;
    if (value.toDate) return Math.floor(value.toDate().getTime() / 1000);
    return null;
  };

  const formatDate = (value) => {
    const secs = getEpochSeconds(value);
    if (!secs) return "-";
    return new Date(secs * 1000).toLocaleString();
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

        const employees = empRes.ok ? await empRes.json() : [];
        const managers = mgrRes.ok ? await mgrRes.json() : [];
        const employeeIdSet = new Set(
          (Array.isArray(employees) ? employees : [])
            .flatMap((row) => [row?.uid, row?.id, row?.userId, row?.employeeId])
            .filter(Boolean)
            .map((v) => String(v))
        );

        const [servicesResult, attendanceResult] = await Promise.allSettled([
          getDocs(
            query(
              collection(db, COLLECTIONS.SERVICES),
              orderBy("createdAt", "desc"),
              limit(15)
            )
          ),
          getDocs(
            query(
              collection(db, COLLECTIONS.ATTENDANCE),
              orderBy("createdAt", "desc"),
              limit(20)
            )
          ),
        ]);

        const services =
          servicesResult.status === "fulfilled"
            ? servicesResult.value.docs.map((d) => ({ id: d.id, ...d.data() }))
            : [];
        const attendance =
          attendanceResult.status === "fulfilled"
            ? attendanceResult.value.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              }))
            : [];

        const items = [];

        employees.slice(0, 10).forEach((e, idx) => {
          const ts = getEpochSeconds(e.createdAt) ?? getEpochSeconds(e.updatedAt);
          items.push({
            icon: <FaUserTie className="text-green-600 text-2xl" />,
            tag: "employee",
            action: "Added",
            desc: `${e.name || "Employee"} added`,
            user: "Admin",
            date: formatDate(e.createdAt || e.updatedAt),
            status: e.status === "Inactive" ? "warning" : "success",
            ts,
            seq: idx,
          });
        });

        managers.slice(0, 10).forEach((m, idx) => {
          const ts = getEpochSeconds(m.createdAt) ?? getEpochSeconds(m.updatedAt);
          items.push({
            icon: <FaUserShield className="text-green-600 text-2xl" />,
            tag: "manager",
            action: "Added",
            desc: `${m.name || "Manager"} added`,
            user: "Admin",
            date: formatDate(m.createdAt || m.updatedAt),
            status: "success",
            ts,
            seq: 100 + idx,
          });
        });

        services.slice(0, 10).forEach((s, idx) => {
          const ts = getEpochSeconds(s.createdAt) ?? getEpochSeconds(s.updatedAt);
          items.push({
            icon: <FaBuilding className="text-blue-600 text-2xl" />,
            tag: "services",
            action: "Published",
            desc: `${s.name || "Service"} available`,
            user: "Admin",
            date: formatDate(s.createdAt || s.updatedAt),
            status: "info",
            ts,
            seq: 200 + idx,
          });
        });

        attendance.slice(0, 10).forEach((a, idx) => {
          const attendanceUserId = String(
            a.userId || a.uid || a.employeeUid || a.employeeId || ""
          );
          if (!attendanceUserId || !employeeIdSet.has(attendanceUserId)) return;
          const ts = getEpochSeconds(a.createdAt);
          items.push({
            icon: <FaClipboardCheck className="text-green-600 text-2xl" />,
            tag: "attendance",
            action: "Marked",
            desc: `${a.employeeName || attendanceUserId} marked ${a.status || "-"}`,
            user: a.recordedBy || "Manager",
            date: formatDate(a.createdAt),
            status: "success",
            ts,
            seq: 300 + idx,
          });
        });

        const hasAnyTs = items.some((i) => i.ts);
        if (hasAnyTs) {
          items.sort((a, b) => {
            const t = (b.ts || 0) - (a.ts || 0);
            if (t !== 0) return t;
            return (b.seq || 0) - (a.seq || 0);
          });
        }
        setTimeline(items.slice(0, 20));
      } catch (err) {
        console.error("Load activity failed:", err);
        setTimeline([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredTimeline =
    filter === "all"
      ? timeline
      : timeline.filter((item) => item.tag === filter);

  const stats = useMemo(() => {
    const counts = { success: 0, info: 0, warning: 0, error: 0 };
    timeline.forEach((t) => {
      if (counts[t.status] !== undefined) counts[t.status] += 1;
    });
    return [
      {
        label: "Success",
        value: counts.success,
        icon: <FaCheckCircle className="text-green-600 text-xl" />,
      },
      {
        label: "Info",
        value: counts.info,
        icon: <FaInfoCircle className="text-blue-600 text-xl" />,
      },
      {
        label: "Warning",
        value: counts.warning,
        icon: <FaExclamationTriangle className="text-yellow-500 text-xl" />,
      },
      {
        label: "Error",
        value: counts.error,
        icon: <FaTimesCircle className="text-red-600 text-xl" />,
      },
    ];
  }, [timeline]);

  const filterOptions = [
    { label: "All Activities", value: "all" },
    { label: "Employee", value: "employee" },
    { label: "Manager", value: "manager" },
    { label: "Services", value: "services" },
    { label: "Attendance", value: "attendance" },
  ];

  return (
    <div className="p-4 md:p-6 w-full">
      <h2 className="text-2xl font-semibold mb-2">Activity</h2>
      <p className="text-gray-500 mb-4">View system activity and logs.</p>

      {/* Stats Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-lg font-semibold">{item.label}</p>
              <p className="text-2xl font-bold">{item.value}</p>
            </div>
            {item.icon}
          </div>
        ))}
      </div>

      {/* Dropdown Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Filter By
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="block w-full sm:w-64 p-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl border shadow-sm p-4 md:p-6">
        <h3 className="text-xl font-semibold mb-4">Activity Timeline</h3>

        <div className="space-y-4">
          {loading && (
            <div className="text-sm text-gray-500">Loading activity...</div>
          )}
          {!loading && filteredTimeline.length === 0 && (
            <div className="text-sm text-gray-500">No activity found.</div>
          )}
          {filteredTimeline.map((item, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-start gap-4 bg-gray-50 p-4 rounded-lg border hover:bg-gray-100 transition"
            >
              <div>{item.icon}</div>

              <div className="flex-1">
                <span className="text-xs bg-gray-200 rounded px-2 py-1 mr-2">
                  {item.tag}
                </span>
                <span className="text-gray-700 font-semibold">
                  {item.action}
                </span>

                <p className="text-gray-600 mt-1">{item.desc}</p>

                <div className="text-sm text-gray-500 mt-1 flex flex-col sm:flex-row sm:gap-4">
                  <span>User: {item.user}</span>
                  <span>Time: {item.date}</span>
                </div>
              </div>

              <span
                className={`text-xs px-3 py-1 rounded-full capitalize mt-2 sm:mt-0 ${
                  item.status === "success"
                    ? "bg-green-100 text-green-700"
                    : item.status === "info"
                    ? "bg-blue-100 text-blue-700"
                    : item.status === "warning"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
