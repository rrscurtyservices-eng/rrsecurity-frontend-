import React, { useEffect, useMemo, useState } from "react";
import { FaInfoCircle } from "react-icons/fa";
import { managerApi } from "../../../services/api";

const formatDateTime = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const normalizeType = (value) => {
  const v = String(value || "").toLowerCase();
  if (v.includes("error")) return "error";
  if (v.includes("warn")) return "warning";
  if (v.includes("success")) return "success";
  return "info";
};

const typeMeta = {
  success: {
    label: "Success",
    chip: "bg-gray-100 text-gray-700",
    card: "border-gray-200",
  },
  info: {
    label: "Info",
    chip: "bg-gray-100 text-gray-700",
    card: "border-gray-200",
  },
  warning: {
    label: "Warning",
    chip: "bg-gray-100 text-gray-700",
    card: "border-gray-200",
  },
  error: {
    label: "Errors",
    chip: "bg-gray-100 text-gray-700",
    card: "border-gray-200",
  },
};

export default function Activity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activityLogs, setActivityLogs] = useState([]);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await managerApi.activity();
        if (!isActive) return;
        setActivityLogs(res.data?.logs || []);
      } catch {
        if (!isActive) return;
        setError("Failed to load activity logs");
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
  }, []);

  const timelineItems = useMemo(() => {
    return (activityLogs || [])
      .map((log, index) => ({
        id: log.id || `${log.timestamp}-${log.employeeEmail || log.employeeName || index}`,
        title: log.title || log.employeeName || "Activity",
        subtitle: log.subtitle || log.employeeEmail || "--",
        detail: log.detail || log.locationName || log.action || "",
        meta:
          log.meta ||
          (Number.isFinite(Number(log.lat)) && Number.isFinite(Number(log.lng))
            ? `${Number(log.lat).toFixed(6)}°N, ${Number(log.lng).toFixed(6)}°E`
            : ""),
        type: normalizeType(log.type),
        tag: log.tag || "ACTIVITY",
        actor: log.actor || "System",
        timestamp: log.timestamp,
      }))
      .filter((item) => item.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activityLogs]);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Full Timeline</h3>
        </div>
        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        {loading && <div className="text-sm text-gray-500 mb-3">Loading activity...</div>}
        {timelineItems.length === 0 && (
          <div className="text-sm text-gray-500">No activity found.</div>
        )}
        <div className="space-y-3 max-h-[520px] overflow-auto pr-2">
          {timelineItems.map((item) => {
            const meta = typeMeta[item.type] || typeMeta.info;
            return (
              <div
                key={item.id}
                className="border rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-600">
                    <FaInfoCircle />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.subtitle}</div>
                    <div className="text-sm text-gray-600 mt-1">{item.detail}</div>
                    {item.meta && <div className="text-xs text-gray-500 mt-1">{item.meta}</div>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {item.tag}
                      </span>
                      <span>{item.actor}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${meta.chip}`}
                  >
                    {meta.label}
                  </span>
                  <div className="text-xs text-gray-500 mt-2">
                    {formatDateTime(item.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
