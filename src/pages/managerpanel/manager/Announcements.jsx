import React, { useEffect, useMemo, useState } from "react";
import { FaBell } from "react-icons/fa";
import { loadAnnouncements } from "../../../utils/announcementStore";

const toneStyles = {
  info: { bg: "bg-blue-50", icon: "text-blue-600" },
  success: { bg: "bg-green-50", icon: "text-green-600" },
  warning: { bg: "bg-yellow-50", icon: "text-yellow-600" },
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    setAnnouncements(loadAnnouncements());
  }, []);

  const sorted = useMemo(() => {
    return [...announcements].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [announcements]);

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Announcements</h2>
        <p className="text-sm text-slate-500">Latest updates for managers.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {sorted.length === 0 && (
          <div className="text-sm text-slate-500">No announcements yet.</div>
        )}
        <div className="space-y-4">
          {sorted.map((item) => {
            const tone = toneStyles[item.tone] || toneStyles.info;
            return (
              <div key={item.id} className={`${tone.bg} rounded-xl p-4 border flex flex-col gap-2`}>
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm ${tone.icon}`}
                  >
                    <FaBell />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 leading-tight">{item.title}</h4>
                    <p className="text-xs text-slate-500">{item.date || "--"}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700">{item.message}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
