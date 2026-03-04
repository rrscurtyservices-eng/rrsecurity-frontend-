import React, { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { managerApi } from "../../../services/api";

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click: (event) => onPick(event.latlng),
  });
  return null;
}

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

const formatTime = (value) => {
  if (!value) return "--";
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function Employees() {
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [edits, setEdits] = useState({});
  const [mapOpen, setMapOpen] = useState(false);
  const [mapEmployee, setMapEmployee] = useState(null);
  const [mapDraft, setMapDraft] = useState({
    locationLabel: "",
    lat: null,
    lng: null,
    startTime: "",
    endTime: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [mapCenter, setMapCenter] = useState([13.0827, 80.2707]);
  const [mapZoom, setMapZoom] = useState(11);

  const storageKey = "manager.employee.shiftLocationEdits";

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await managerApi.employees({ q: query });
        const list = res.data?.employees || res.data?.data || [];
        const stored = loadEdits();
        setEdits(stored);
        const merged = list.map((emp) => {
          const key = emp.id || emp.email || emp.name;
          const override = stored[key];
          if (!override) return emp;
          return {
            ...emp,
            assignedLocation: override.assignedLocation || emp.assignedLocation,
            workSchedule: override.workSchedule || emp.workSchedule,
          };
        });
        setEmployees(merged);
      } catch {
        setError("Failed to load employees");
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [query]);

  const loadEdits = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveEdits = (next) => {
    setEdits(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const formatTime12 = (value) => {
    if (!value) return "--";
    const v = String(value).trim();
    if (/am|pm/i.test(v)) return v;
    const parts = v.split(":");
    if (parts.length < 2) return v;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return v;
    const period = h >= 12 ? "PM" : "AM";
    const hour = ((h + 11) % 12) + 1;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  };

  const formatShift = (emp) => {
    const start = emp.workSchedule?.startTime;
    const end = emp.workSchedule?.endTime;
    if (!start && !end) return "--";
    return `${formatTime12(start)} - ${formatTime12(end)}`;
  };

  const openMap = (emp) => {
    const key = emp.id || emp.email || emp.name;
    setMapEmployee({ key, emp });
    const loc = emp.assignedLocation || {};
    const lat = Number(loc.lat ?? loc.latitude);
    const lng = Number(loc.lng ?? loc.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setMapCenter([lat, lng]);
      setMapZoom(15);
    } else {
      setMapCenter([13.0827, 80.2707]);
      setMapZoom(11);
    }
    const label = loc.name || loc.label || loc.address || "";
    setSearchQuery(label);
    setSearchResults([]);
    setSearchError("");
    setMapDraft({
      locationLabel: label,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      startTime: emp.workSchedule?.startTime || "",
      endTime: emp.workSchedule?.endTime || "",
    });
    setMapOpen(true);
  };

  const closeMap = () => {
    setMapOpen(false);
    setMapEmployee(null);
  };

  const pickLocation = (lat, lng, label) => {
    setMapDraft((prev) => ({
      ...prev,
      lat,
      lng,
      locationLabel: label ?? prev.locationLabel,
    }));
  };

  const handleSearch = async () => {
    const queryText = searchQuery.trim();
    if (!queryText) return;
    setSearchLoading(true);
    setSearchError("");
    try {
      const params = new URLSearchParams({
        format: "json",
        q: queryText,
        limit: "5",
        addressdetails: "1",
        "accept-language": "en",
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { "Accept-Language": "en" },
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Nominatim error:", err);
      setSearchError("Search failed. Try another location.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSaveMap = () => {
    if (!mapEmployee) return;
    const { emp, key } = mapEmployee;
    const next = {
      assignedLocation: {
        ...(emp.assignedLocation || {}),
        name: mapDraft.locationLabel || "",
        lat: mapDraft.lat ?? emp.assignedLocation?.lat,
        lng: mapDraft.lng ?? emp.assignedLocation?.lng,
        radiusMeters: Number(emp.assignedLocation?.radiusMeters ?? emp.assignedLocation?.radius ?? 100),
      },
      workSchedule: {
        ...(emp.workSchedule || {}),
        startTime: mapDraft.startTime || "",
        endTime: mapDraft.endTime || "",
      },
    };
    const updated = { ...edits, [key]: next };
    saveEdits(updated);
    setEmployees((prev) =>
      prev.map((e) => {
        const k = e.id || e.email || e.name;
        if (k !== key) return e;
        return {
          ...e,
          assignedLocation: next.assignedLocation,
          workSchedule: next.workSchedule,
        };
      })
    );
    closeMap();
  };

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
              <th>Location</th>
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
                <td className="py-2 align-top">
                  <div className="flex items-start justify-between gap-3 min-w-[280px]">
                    <div className="text-sm text-gray-700">
                      <div className="font-medium">
                        {emp.assignedLocation?.name ||
                          emp.assignedLocation?.label ||
                          emp.assignedLocation?.address ||
                          "--"}
                      </div>
                      <div className="text-gray-500 mt-1">Shift: {formatShift(emp)}</div>
                    </div>
                    <button
                      type="button"
                      className="mt-1 px-2 py-1 rounded border text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      onClick={() => openMap(emp)}
                      aria-label="Edit location and shift"
                    >
                      <span className="text-xs font-semibold">Edit</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && employees.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mapOpen && mapEmployee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Assign Location & Shift</h3>
                <p className="text-sm text-slate-500">
                  {mapEmployee.emp.name || mapEmployee.emp.fullName || mapEmployee.emp.email}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMap}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Shift Start</label>
                <div className="relative mt-2">
                  <input
                    type="time"
                    className="w-full border rounded-lg px-3 py-2.5 text-sm"
                    value={mapDraft.startTime}
                    onChange={(e) => setMapDraft((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Shift End</label>
                <div className="relative mt-2">
                  <input
                    type="time"
                    className="w-full border rounded-lg px-3 py-2.5 text-sm"
                    value={mapDraft.endTime}
                    onChange={(e) => setMapDraft((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <label className="text-sm font-medium text-slate-700">Search Location</label>
            <div className="flex gap-3 mb-3 mt-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                placeholder="Search location"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </div>
            {searchError && <div className="text-xs text-red-600 mb-2">{searchError}</div>}
            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-36 overflow-auto mb-3">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => {
                      const lat = Number(result.lat);
                      const lng = Number(result.lon);
                      if (Number.isFinite(lat) && Number.isFinite(lng)) {
                        setMapCenter([lat, lng]);
                        setMapZoom(15);
                        pickLocation(lat, lng, result.display_name);
                        setMapDraft((prev) => ({
                          ...prev,
                          locationLabel: result.display_name,
                        }));
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}

            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom
              className="leaflet-container"
              style={{ height: 240 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={mapCenter} zoom={mapZoom} />
              <MapClickHandler
                onPick={(latlng) => {
                  setMapCenter([latlng.lat, latlng.lng]);
                  setMapZoom(15);
                  pickLocation(latlng.lat, latlng.lng, searchQuery);
                }}
              />
              <Marker
                position={mapCenter}
                draggable
                eventHandlers={{
                  dragend: (event) => {
                    const pos = event.target.getLatLng();
                    setMapCenter([pos.lat, pos.lng]);
                    setMapZoom(15);
                    pickLocation(pos.lat, pos.lng, searchQuery);
                  },
                }}
              />
            </MapContainer>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeMap}
                className="px-4 py-2 rounded-lg border text-slate-600 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMap}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
