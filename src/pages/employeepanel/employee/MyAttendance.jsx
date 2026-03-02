import React, { useEffect, useMemo, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import {
  checkLocationPermission,
  getUserLocation,
  validateLocation
} from "../../../authSync";
import { employeeApi } from "../../../api/employeeApi";

import { auth } from "../../../firebase";
import { db } from "../../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  getDocs,
  limit,
  doc
} from "firebase/firestore";
import { writeActivityLog } from "../../../utils/activityLog";
const DEBUG = import.meta.env.VITE_DEBUG_LOGS === "true";
const log = (...args) => {
  if (DEBUG) console.log(...args);
};

const STATUS_STYLES = {
  present: "bg-green-600 text-white",
  absent: "bg-red-600 text-white",
  "half day": "bg-yellow-400 text-gray-900",
  holiday: "bg-cyan-300 text-gray-900",
  "on leave": "bg-purple-300 text-gray-900",
  late: "bg-amber-400 text-gray-900",
};

const formatDuration = (totalSeconds) => {
  if (totalSeconds == null) return "00:00:00";
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function MyAttendance() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [locationCache, setLocationCache] = useState({});
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        let docSnap = await getDoc(doc(db, "employees", user.uid));
        let data = docSnap.exists() ? docSnap.data() : null;

        if (!data) {
          let q = query(collection(db, "employees"), where("firebaseUid", "==", user.uid), limit(1));
          let qs = await getDocs(q);
          if (qs.empty) {
            q = query(collection(db, "employees"), where("uid", "==", user.uid), limit(1));
            qs = await getDocs(q);
          }
          if (qs.empty && user.email) {
            q = query(collection(db, "employees"), where("email", "==", user.email), limit(1));
            qs = await getDocs(q);
          }
          if (!qs.empty) {
            data = qs.docs[0].data();
          }
        }

        setEmployeeName(String(data?.name || "").trim());
      } catch (err) {
        console.error("[UI] Failed to load employee profile:", err);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    log("[ATTENDANCE UI] Setting up real-time listener...");

    const user = auth.currentUser;

    if (!user) {
      log("[ATTENDANCE UI] No user logged in, skipping listener setup");
      return;
    }

    log("[ATTENDANCE UI] User logged in:", user.uid);

    const q = query(
      collection(db, "attendance"),
      where("uid", "==", user.uid)
    );

    log("[ATTENDANCE UI] Query created for UID:", user.uid);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        log("[ATTENDANCE UI] Snapshot received");
        log("[ATTENDANCE UI] Number of documents:", snapshot.docs.length);

        const records = snapshot.docs.map((doc) => {
          log("[ATTENDANCE UI] Document:", doc.id, doc.data());
          return {
            id: doc.id,
            ...doc.data(),
          };
        });

        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        log("[ATTENDANCE UI] Setting attendance data:", records);
        setAttendanceData(records);
      },
      (error) => {
        console.error("[ATTENDANCE UI] Snapshot error:", error);
        console.error("[ATTENDANCE UI] Error code:", error.code);
        console.error("[ATTENDANCE UI] Error message:", error.message);
      }
    );

    return () => {
      log("[ATTENDANCE UI] Cleaning up listener");
      unsubscribe();
    };
  }, []);

  const formatTime = (value) => {
    if (!value) return "--";
    if (typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return value;
    }
    if (value?.toDate) {
      return value.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (value instanceof Date) {
      return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return "--";
  };

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  const getTodayAttendance = () => {
    const key = getTodayKey();
    return attendanceByDate[key] || null;
  };

  const handlePunch = async (type) => {
    if (loading) return;

    try {
      setLoading(true);

      log("[UI] ========================================");
      log("[UI] Starting attendance marking process...");
      log("[UI] ========================================");

      log("[UI] STEP 1: Checking location permission...");

      try {
        await checkLocationPermission();
        log("[UI] Location permission OK");
      } catch (err) {
        throw new Error(`Location Permission: ${err.message}`);
      }

      log("[UI] STEP 2: Getting user location...");

      let location;
      try {
        location = await getUserLocation({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
        log("[UI] Location obtained:", location);
      } catch (err) {
        throw new Error(`Location Access: ${err.message}`);
      }

      if (location?.accuracy && location.accuracy > 100 && navigator.geolocation) {
        log("[UI] Low accuracy detected, requesting a live location fix...");
        const refined = await new Promise((resolve) => {
          let best = null;
          const startedAt = Date.now();
          const watchId = navigator.geolocation.watchPosition(
            (pos) => {
              const fix = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              };
              if (!best || fix.accuracy < best.accuracy) best = fix;
              if (fix.accuracy <= 50 || Date.now() - startedAt > 8000) {
                navigator.geolocation.clearWatch(watchId);
                resolve(best || fix);
              }
            },
            () => {
              navigator.geolocation.clearWatch(watchId);
              resolve(null);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
          );
        });
        if (refined) {
          location = refined;
          log("[UI] Live location fix obtained:", location);
        }
      }

      log("[UI] STEP 3: Validating location against assigned radius...");

      let distance;
      try {
        const assignmentRes = await employeeApi.myAssignment();
        const assignedLocation = assignmentRes?.data?.assignedLocation || null;
        const lat = assignedLocation?.lat ?? assignedLocation?.latitude;
        const lng = assignedLocation?.lng ?? assignedLocation?.longitude;

        if (lat == null || lng == null) {
          throw new Error("Assigned location not set. Please contact your manager.");
        }

        const validation = await validateLocation(location, assignedLocation);
        distance = validation.distance;
        log("[UI] Location validated. Distance:", distance, "meters");
      } catch (err) {
        const assignmentRes = await employeeApi.myAssignment().catch(() => null);
        const assignedLocation = assignmentRes?.data?.assignedLocation || null;
        const aLat = assignedLocation?.lat ?? assignedLocation?.latitude;
        const aLng = assignedLocation?.lng ?? assignedLocation?.longitude;
        const details = `Your location: ${location?.lat?.toFixed?.(6)}, ${location?.lng?.toFixed?.(6)} (accuracy ${Math.round(location?.accuracy || 0)}m). Assigned: ${aLat}, ${aLng}.`;
        throw new Error(`${err.message} ${details}`);
      }

      log("[UI] STEP 4: Saving punch to backend...");

      try {
        const payload = { location: { ...location } };
        if (type === "in") {
          await employeeApi.punchIn(payload);
        } else {
          await employeeApi.punchOut(payload);
        }
        log("[UI] Punch saved successfully");
      } catch (err) {
        const message = err?.response?.data?.message || err.message || "Punch failed";
        throw new Error(message);
      }

      await writeActivityLog({
        scope: "employee",
        action: type === "in" ? "attendance.punch-in" : "attendance.punch-out",
        meta: { uid: auth.currentUser?.uid, email: auth.currentUser?.email, name: employeeName, distance },
      });

      log("[UI] ========================================");
      log("[UI] Attendance marked successfully");
      log("[UI] ========================================");

      alert(type === "in" ? "Punch in successful!" : "Punch out successful!");
    } catch (err) {
      console.error("[UI] ========================================");
      console.error("[UI] Attendance marking failed");
      console.error("[UI] Error:", err.message);
      console.error("[UI] ========================================");

      alert(`${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchAddress = async (lat, lng) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`
        );
        const data = await res.json();
        return data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      } catch {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    };

    const run = async () => {
      const updates = {};
      for (const row of attendanceData) {
        const loc = row.location || {};
        const lat = loc.lat ?? loc.latitude;
        const lng = loc.lng ?? loc.longitude;
        if (lat == null || lng == null) continue;
        const key = `${lat},${lng}`;
        if (locationCache[key]) continue;
        const addr = await fetchAddress(lat, lng);
        updates[key] = addr;
      }
      if (!cancelled && Object.keys(updates).length) {
        setLocationCache((prev) => ({ ...prev, ...updates }));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [attendanceData, locationCache]);

  const getLocationLabel = (row) => {
    const loc = row.location || {};
    const lat = loc.lat ?? loc.latitude;
    const lng = loc.lng ?? loc.longitude;
    if (lat != null && lng != null) {
      const key = `${lat},${lng}`;
      return locationCache[key] || `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
    }
    if (loc.label || loc.name || loc.address) return loc.label || loc.name || loc.address;
    return "--";
  };

  const attendanceByDate = useMemo(() => {
    const map = {};
    for (const row of attendanceData) {
      const dateKey = String(row.date || "").slice(0, 10);
      if (!dateKey) continue;
      map[dateKey] = row;
    }
    return map;
  }, [attendanceData]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < startWeekday; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, key });
    }

    return cells;
  }, [calendarMonth]);

  const changeMonth = (delta) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const todayRecord = getTodayAttendance();
  const punchInAt = todayRecord?.punchInAt || null;
  const punchOutAt = todayRecord?.punchOutAt || null;
  const workedSeconds = todayRecord?.workedSeconds ?? null;
  const statusLabel = todayRecord?.status || "Not Marked";

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-4 rounded-full">
              <FaMapMarkerAlt className="text-emerald-600 text-3xl" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Mark Today's Attendance</h2>
              <p className="text-gray-500 text-sm">
                Attendance will be marked only if you are within your assigned location range.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Status: <span className="font-semibold">{statusLabel}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handlePunch("in")}
              disabled={loading || !!punchInAt}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg shadow hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Checking location..." : punchInAt ? "Punched In" : "Punch In"}
            </button>
            <button
              onClick={() => handlePunch("out")}
              disabled={loading || !punchInAt || !!punchOutAt}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Checking location..." : punchOutAt ? "Punched Out" : "Punch Out"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold">Today's Attendance</h2>
        <p className="text-gray-500 text-sm mb-4">Punch in/out and view your working hours</p>

        <div className="border rounded-2xl p-4">
          <div className="mb-4 rounded-xl bg-slate-900 text-white p-4 sm:p-6">
            <div className="text-center text-sm uppercase tracking-wide text-slate-300">Working Hours</div>
            <div className="mt-3 flex items-center justify-center gap-2 sm:gap-4 text-3xl sm:text-4xl font-semibold">
              <span className="bg-slate-800 rounded-lg px-4 py-2">{formatDuration(workedSeconds).slice(0, 2)}</span>
              <span>:</span>
              <span className="bg-slate-800 rounded-lg px-4 py-2">{formatDuration(workedSeconds).slice(3, 5)}</span>
              <span>:</span>
              <span className="bg-slate-800 rounded-lg px-4 py-2">{formatDuration(workedSeconds).slice(6, 8)}</span>
            </div>
            <div className="mt-2 text-center text-xs text-slate-400">Hour&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Min&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sec</div>
          </div>

          <div className="mb-6 rounded-xl border bg-white px-4 py-3 text-sm text-gray-600">
            Punch In: <span className="font-semibold">{formatTime(punchInAt)}</span> &nbsp;•&nbsp; Punch Out:{" "}
            <span className="font-semibold">{formatTime(punchOutAt)}</span>
          </div>

          <div className="rounded-xl border bg-white px-4 py-3 text-sm text-gray-600">
            Total Worked: <span className="font-semibold">{formatDuration(workedSeconds)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold">Attendance History</h2>
        <p className="text-gray-500 text-sm mb-4">View your complete attendance records</p>

        <div className="border rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => changeMonth(-1)}
              className="h-9 w-9 rounded-full border text-gray-600 hover:bg-gray-100"
              aria-label="Previous month"
            >
              {"<"}
            </button>
            <div className="text-lg font-semibold">
              {calendarMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
            </div>
            <button
              onClick={() => changeMonth(1)}
              className="h-9 w-9 rounded-full border text-gray-600 hover:bg-gray-100"
              aria-label="Next month"
            >
              {">"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-10" />;
              }
              const row = attendanceByDate[cell.key];
              const status = String(row?.status || "").toLowerCase();
              const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-700";
              return (
                <div
                  key={cell.key}
                  className={`h-10 rounded-lg flex items-center justify-center text-sm font-semibold ${style}`}
                  title={row ? `${row.status || "Unknown"} • ${getLocationLabel(row)} • ${formatTime(row.time)}` : "No record"}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
            {[
              ["On leave", STATUS_STYLES["on leave"]],
              ["Present", STATUS_STYLES.present],
              ["Absent", STATUS_STYLES.absent],
              ["Half Day", STATUS_STYLES["half day"]],
              ["Holiday", STATUS_STYLES.holiday],
            ].map(([label, cls]) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${cls}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
