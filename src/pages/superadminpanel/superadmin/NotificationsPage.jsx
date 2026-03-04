import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { FaTimes, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../firebase";
import {
  deleteNotificationById,
  subscribeNotificationsForCurrentUser,
} from "../../../services/notifications";

function formatDate(createdAt) {
  const date =
    createdAt && typeof createdAt.toDate === "function"
      ? createdAt.toDate()
      : null;
  if (!date) return "Just now";
  return date.toLocaleString();
}

const role = "superadmin";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [error, setError] = useState("");
  const visibleItems = items.filter((item) => !dismissedIds.includes(item.id));

  useEffect(() => {
    let unsubNotifications = () => {};
    const unsub = onAuthStateChanged(auth, (user) => {
      unsubNotifications();
      unsubNotifications = () => {};

      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      if (!role) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setDismissedIds([]);
      unsubNotifications = subscribeNotificationsForCurrentUser({
        uid: user.uid,
        role,
        onChange: (rows) => {
          setItems(rows);
          setLoading(false);
        },
        onError: (err) => {
          setError(err?.message || "Failed to load notifications");
          setLoading(false);
        },
      });
    });

    return () => {
      unsubNotifications();
      unsub();
    };
  }, []);

  const handleDelete = async (id) => {
    const row = items.find((item) => item.id === id);
    if (!row?.deletable) {
      return;
    }
    try {
      await deleteNotificationById(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete notification");
    }
  };

  const handleDismiss = async (id) => {
    const row = items.find((item) => item.id === id);
    if (!row) return;

    if (row.deletable) {
      await handleDelete(id);
      return;
    }

    setDismissedIds((prev) => [...prev, id]);
  };

  const handleClosePage = () => {
    const rolePath = String(role || "").trim().toLowerCase();
    if (rolePath === "admin") navigate("/admin");
    else if (rolePath === "manager") navigate("/manager");
    else if (rolePath === "employee") navigate("/employee");
    else if (rolePath === "superadmin") navigate("/superadmin");
    else navigate(-1);
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">All Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">Recent alerts and announcement history in one place.</p>
        </div>
        <button
          type="button"
          onClick={handleClosePage}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close notifications page"
        >
          <FaTimes />
        </button>
      </div>

      {loading && <p className="px-5 py-4 text-sm text-gray-500">Loading notifications...</p>}

      {!loading && error && (
        <p className="px-5 py-4 text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && visibleItems.length === 0 && (
        <p className="px-5 py-4 text-sm text-gray-500">No notifications found.</p>
      )}

      {!loading && !error && visibleItems.length > 0 && (
        <div className="divide-y divide-slate-200">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-gray-800">
                    {item.title || "Notification"}
                  </p>
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    {item.sourceType === "announcement" ? "Announcement" : "Notification"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{item.message || ""}</p>
                <p className="mt-2 text-xs text-gray-400">{formatDate(item.createdAt)}</p>
              </div>

              <div className="flex items-center gap-2">
                {item.deletable && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <FaTrash />
                    Remove
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDismiss(item.id)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Dismiss item"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
