import React, { useEffect, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import { managerApi } from "../../../services/api";

const formatTime = (value) => {
  if (!value) return "--";
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const minutesBetween = (start, end) => {
  if (!start || !end) return null;
  const s = start?.toDate ? start.toDate() : new Date(start);
  const e = end?.toDate ? end.toDate() : new Date(end);
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
    if (!match) return null;
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

const getAssignedLocation = (emp) => {
  const loc = emp?.assignedLocation || {};
  const name = loc.name || loc.label || loc.address || "";
  const lat =
    loc.lat ??
    loc.latitude ??
    emp?.lat ??
    emp?.latitude ??
    emp?.location?.lat ??
    emp?.location?.latitude;
  const lng =
    loc.lng ??
    loc.longitude ??
    emp?.lng ??
    emp?.longitude ??
    emp?.location?.lng ??
    emp?.location?.longitude;
  return { name, lat, lng, address: loc.address };
};

const getMapUrl = (emp) => {
  if (emp?.mapsUrl) return emp.mapsUrl;
  if (emp?.mapUrl) return emp.mapUrl;
  const { lat, lng, name, address } = getAssignedLocation(emp);
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const query = name || address;
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return "";
};

const formatCoords = (lat, lng) => {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return "--";
  return `${Number(lat).toFixed(6)}°N, ${Number(lng).toFixed(6)}°E`;
};

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const distanceMeters = (from, to) => {
  const lat1 = Number(from.lat);
  const lon1 = Number(from.lng);
  const lat2 = Number(to.lat);
  const lon2 = Number(to.lng);
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a = sinLat * sinLat + Math.cos(rLat1) * Math.cos(rLat2) * sinLon * sinLon;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return 6371000 * c;
};

export default function Location() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackingState, setTrackingState] = useState({});

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

  const updateTrackingState = (key, patch) => {
    setTrackingState((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...patch },
    }));
  };

  const handleMarkTracked = (emp) => {
    const key = emp.id || emp.email || emp.name;
    if (!key) return;
    updateTrackingState(key, { loading: true, error: "" });

    const { lat, lng } = getAssignedLocation(emp);
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      updateTrackingState(key, {
        loading: false,
        error: "Assigned location is missing coordinates.",
      });
      return;
    }

    if (!navigator.geolocation) {
      updateTrackingState(key, {
        loading: false,
        error: "Geolocation is not supported in this browser.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const distance = distanceMeters(current, { lat, lng });
        const radius = Number(emp?.assignedLocation?.radiusMeters ?? 100);
        if (distance != null && distance <= radius) {
          managerApi
            .locationCheckin(emp.id)
            .then(() => managerApi.location(date))
            .then((res) => {
              setEmployees(res.data?.employees || []);
              updateTrackingState(key, { loading: false, error: "" });
            })
            .catch(() => {
              updateTrackingState(key, {
                loading: false,
                error: "Failed to mark tracked. Try again.",
              });
            });
          return;
        }
        updateTrackingState(key, {
          loading: false,
          error:
            distance == null
              ? "Unable to verify distance."
              : `Outside assigned location by ${Math.round(distance)}m.`,
        });
      },
      () => {
        updateTrackingState(key, {
          loading: false,
          error: "Unable to get current location. Please enable location access.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-end items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Select Date:</label>
          <input
            type="date"
            className="border px-3 py-2 rounded-lg shadow-sm focus:ring focus:ring-blue-200"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Employee Status</h3>
        {loading && <div className="text-sm text-gray-500">Loading locations...</div>}
        {!loading && employees.length === 0 && (
          <div className="text-center py-4 text-gray-500">No records found</div>
        )}
        <div className="space-y-4">
          {employees.map((emp) => {
            const punchIn =
              emp.punchInAt ||
              emp.punchInTime ||
              emp.punchIn ||
              emp.checkInAt ||
              emp.checkInTime ||
              emp.checkIn;
            const punchOut =
              emp.punchOutAt ||
              emp.punchOutTime ||
              emp.punchOut ||
              emp.checkOutAt ||
              emp.checkOutTime ||
              emp.checkOut;
            const workedMins = minutesBetween(punchIn, punchOut);
            const startMins = timeStringToMinutes(emp.workSchedule?.startTime);
            const endMins = timeStringToMinutes(emp.workSchedule?.endTime);
            const allottedMins =
              startMins != null && endMins != null
                ? (endMins >= startMins ? endMins - startMins : endMins + 1440 - startMins)
                : null;
            const status = emp.status || "Not Tracked";
            const displayStatus = status === "Within Range" ? "Tracked" : status;
            const { name: locName, lat, lng } = getAssignedLocation(emp);
            const mapsUrl = getMapUrl(emp);
            const empKey = emp.id || emp.email || emp.name;
            const tracking = trackingState[empKey] || {};

            return (
              <div
                key={emp.id || emp.email || emp.name}
                className="border rounded-2xl p-4 md:p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-4 md:gap-6"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                    <FaMapMarkerAlt />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {emp.name || emp.fullName || "Employee"}
                      </div>
                      <div className="text-sm text-gray-500">{emp.email || "--"}</div>
                    </div>

                    <div className="text-sm text-gray-600">
                      📌 <span className="font-semibold">Assigned Location:</span>{" "}
                      {locName || "Assigned Location"}
                    </div>
                    <div className="text-sm text-gray-500">{formatCoords(lat, lng)}</div>

                    <div className="text-sm text-gray-800">
                      <span className="font-semibold">Status:</span> {displayStatus}
                      {workedMins != null && (
                        <span className="text-gray-500"> • {formatMinutes(workedMins)}</span>
                      )}
                    </div>
                    {tracking.error && (
                      <div className="text-xs text-red-600">{tracking.error}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {status === "Not Tracked" || status === "Out of Range" ? (
                    <button
                      type="button"
                      className="px-4 py-2 rounded-full border text-sm font-medium hover:bg-gray-50"
                      onClick={() => handleMarkTracked(emp)}
                      disabled={tracking.loading}
                    >
                      {tracking.loading ? "Checking..." : "Mark Tracked"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="px-4 py-2 rounded-full border text-sm font-medium text-green-700 border-green-600 bg-green-50 cursor-default"
                      disabled
                    >
                      Tracked
                    </button>
                  )}

                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800"
                    onClick={() => mapsUrl && window.open(mapsUrl, "_blank")}
                  >
                    View on Map
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
