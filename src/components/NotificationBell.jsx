import React, { useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";
import api from "../services/api";
import { auth } from "../firebase";

const ANNOUNCEMENT_READ_KEY = "rr_manager_announcement_reads_v1";

const loadAnnouncementReads = () => {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENT_READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.map(String));
  } catch (e) {
    // ignore
  }
  return new Set();
};

const saveAnnouncementReads = (set) => {
  try {
    localStorage.setItem(ANNOUNCEMENT_READ_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    // ignore
  }
};

const typeToColor = (type) => {
  const t = String(type || "info").toLowerCase();
  if (t === "success") return "text-green-700 bg-green-50 border-green-200";
  if (t === "warning") return "text-yellow-800 bg-yellow-50 border-yellow-200";
  if (t === "error") return "text-red-700 bg-red-50 border-red-200";
  return "text-blue-700 bg-blue-50 border-blue-200";
};

const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const formatTimestamp = (value) => {
  const d = toDate(value);
  if (!d) return "--";
  return d.toISOString().slice(0, 19).replace("T", " ");
};

const formatMessage = (item) => {
  if (item?.message) {
    if (typeof item.message === "string") return item.message;
    const msg = item.message;
    const text =
      msg.text || msg.detail || msg.description || msg.body || msg.action || msg.title;
    if (text) return String(text);
    try {
      return JSON.stringify(msg);
    } catch {
      return String(msg);
    }
  }
  if (item?.detail) return String(item.detail);
  if (item?.action) return String(item.action);
  return "";
};

const itemTime = (item) => {
  const d = toDate(item?.createdAt || item?.timestamp || item?.date);
  return d ? d.getTime() : 0;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [localReadIds, setLocalReadIds] = useState(() => new Set());
  const [announcementReadIds, setAnnouncementReadIds] = useState(() => loadAnnouncementReads());
  const [showAll, setShowAll] = useState(false);
  const ref = useRef(null);
  const uid = auth.currentUser?.uid;
  const load = async () => {
    try {
      setLoading(true);
      const [notificationsRes, announcementsRes] = await Promise.all([
        api.get("/notifications/me"),
        api.get("/manager/announcements").catch(() => null),
      ]);

      const notifications = Array.isArray(notificationsRes?.data?.notifications)
        ? notificationsRes.data.notifications
        : [];
      const announcements = Array.isArray(announcementsRes?.data?.announcements)
        ? announcementsRes.data.announcements
        : [];

      const normalizedNotifications = notifications.map((n) => ({
        ...n,
        _source: "notification",
      }));
      const normalizedAnnouncements = announcements.map((a, index) => ({
        id: `announcement:${a.id || index}`,
        title: a.title || "Announcement",
        message: a.message || a.body || a.detail || a.description || "",
        type: a.tone || a.type || "info",
        createdAt: a.createdAt || a.date || a.timestamp,
        _source: "announcement",
      }));

      const combined = [...normalizedNotifications, ...normalizedAnnouncements].sort(
        (a, b) => itemTime(b) - itemTime(a)
      );

      setItems(combined);
    } catch (e) {
      console.error("notifications load failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const markRead = async (item) => {
    if (item?._source === "announcement") {
      setAnnouncementReadIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        saveAnnouncementReads(next);
        return next;
      });
      setItems((prev) =>
        prev.map((itm) => (itm.id === item.id ? { ...itm, read: true } : itm))
      );
      return;
    }

    const id = item?.id;
    if (!id) return;

    setLocalReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (uid) {
      setItems((prev) =>
        prev.map((itm) =>
          itm.id === id
            ? {
                ...itm,
                read: true,
                readBy: { ...(itm.readBy || {}), [uid]: new Date().toISOString() },
              }
            : itm
        )
      );
    } else {
      setItems((prev) =>
        prev.map((itm) => (itm.id === id ? { ...itm, read: true } : itm))
      );
    }
    try {
      await api.post("/notifications/" + id + "/read");
      await load();
    } catch (e) {
      console.error("markRead failed", e);
      await load();
    }
  };

  const visibleItems = showAll ? items : items.slice(0, 4);
  const notificationItems = items.filter((item) => item._source !== "announcement");
  const announcementItems = items.filter((item) => item._source === "announcement");

  const isUnreadNotification = (item) => {
    if (item.read === false) return true;
    if (item.read === true) return false;
    if (localReadIds.has(item.id)) return false;
    if (uid) return !(item.readBy && item.readBy[uid]);
    return true;
  };

  const isUnreadAnnouncement = (item) => {
    if (item.read === false) return true;
    if (item.read === true) return false;
    return !announcementReadIds.has(item.id);
  };

  const unreadCount =
    notificationItems.filter(isUnreadNotification).length +
    announcementItems.filter(isUnreadAnnouncement).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="relative p-2 rounded-full border bg-white hover:bg-gray-50"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setShowAll(false);
          if (!open) load();
        }}
        aria-label="Notifications"
        title="Notifications"
      >
        <FaBell className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-gray-900">Notifications</div>
            <div className="text-xs text-gray-500">
              {loading ? "Loading..." : String(unreadCount) + " unread"}
            </div>
          </div>

          <div className="max-h-96 overflow-auto">
            {!visibleItems.length && (
              <div className="p-4 text-sm text-gray-500">No notifications.</div>
            )}

            {visibleItems.map((n) => (
              <button
                key={n.id}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                onClick={() => markRead(n)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={
                      "mt-0.5 px-2 py-1 text-xs rounded-md border " + typeToColor(n.type)
                    }
                  >
                    {String(n._source === "announcement" ? "announcement" : n.type || "info").toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{n.title}</div>
                    {formatMessage(n) && (
                      <div className="mt-0.5 text-sm text-gray-600 line-clamp-2">
                        {formatMessage(n)}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-400">
                      {formatTimestamp(n.createdAt || n.timestamp || n.date)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
            <span>Click a notification or announcement to mark it as read.</span>
            {items.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                {showAll ? "Show less" : "View all"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
