import React, { useEffect, useState } from "react";
import {
  FaBullhorn,
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
} from "react-icons/fa";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../../firebase";
import { COLLECTIONS } from "../../../services/collections";

const emptyForm = {
  title: "",
  type: "",
  message: "",
  audience: "all",
};
const ANNOUNCEMENT_TYPES = [
  "General Update",
  "Alert",
  "Holiday",
  "Meeting",
  "Event",
  "Emergency",
];

export default function Announcements({ actorRole = "admin" }) {
  const [announcements, setAnnouncements] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const normalizedActorRole = String(actorRole || "").trim().toLowerCase();

  const canManageAnnouncement = (item) => {
    if (normalizedActorRole === "superadmin") return true;
    if (normalizedActorRole !== "admin") return false;
    return String(item?.createdByRole || "").trim().toLowerCase() === "admin";
  };

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.ANNOUNCEMENTS),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleClose = () => {
    setOpenModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleEdit = (item) => {
    if (!canManageAnnouncement(item)) {
      alert("This announcement is read-only for admin.");
      return;
    }
    setError("");
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      type: item.type || "",
      message: item.message || "",
      audience: item.audience || "all",
    });
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    try {
      const item = announcements.find((row) => row.id === id);
      if (!canManageAnnouncement(item)) {
        alert("This announcement is read-only for admin.");
        return;
      }
      await deleteDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, id));
    } catch (err) {
      console.error("Delete announcement failed:", err);
      alert(err?.message || "Failed to delete announcement.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;

    try {
      setSaving(true);
      setError("");
      if (editingId) {
        const item = announcements.find((row) => row.id === editingId);
        if (!canManageAnnouncement(item)) {
          throw new Error("This announcement is read-only for admin.");
        }
        await updateDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, editingId), {
          title: form.title.trim(),
          type: form.type.trim(),
          message: form.message.trim(),
          audience: form.audience || "all",
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), {
          title: form.title.trim(),
          type: form.type.trim(),
          message: form.message.trim(),
          audience: form.audience || "all",
          createdBy: auth.currentUser?.uid || "",
          createdByRole: normalizedActorRole || "admin",
          createdAt: serverTimestamp(),
        });
      }
      handleClose();
    } catch (err) {
      console.error("Save announcement failed:", err);
      setError(err?.message || "Failed to save announcement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Announcements</h2>
          <p className="text-sm text-slate-500">
            Create announcements visible to admins, managers and employees.
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-black text-white px-4 py-2 rounded-lg hover:opacity-80"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setOpenModal(true);
          }}
        >
          <FaPlus /> New Announcement
        </button>
      </div>

      {announcements.length === 0 && (
        <div className="text-sm text-gray-500">No announcements yet.</div>
      )}

      <div className="space-y-4">
        {announcements.map((item) => (
          <div
            key={item.id}
            className="bg-white border rounded-xl shadow-sm p-5 flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <FaBullhorn />
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-800">
                    {item.title}
                  </h3>
                  {item.type && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                      {item.type}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 uppercase">
                    {item.audience || "all"}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{item.message}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {canManageAnnouncement(item) ? (
                <>
                  <button
                    className="bg-gray-200 hover:bg-gray-300 p-2 rounded-lg"
                    onClick={() => handleEdit(item)}
                    title="Edit"
                  >
                    <FaEdit className="text-gray-700" />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 p-2 rounded-lg"
                    onClick={() => handleDelete(item.id)}
                    title="Delete"
                  >
                    <FaTrash className="text-white" />
                  </button>
                </>
              ) : (
                <span className="text-xs font-medium text-slate-500">Read only</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-8 relative">
            <button
              className="absolute right-6 top-6 text-gray-600 text-2xl"
              onClick={handleClose}
              type="button"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="text-3xl font-bold text-blue-800 mb-6">
              {editingId ? "Edit Announcement" : "New Announcement"}
            </h2>

            <form className="space-y-5" onSubmit={handleSave}>
              {error && (
                <div className="bg-red-50 text-red-700 text-sm border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}
              <div>
                <label className="font-medium">Title *</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label className="font-medium">Message *</label>
                <textarea
                  rows="4"
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label className="font-medium">Announcement Type *</label>
                <select
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  required
                >
                  <option value="">-- Select Announcement Type --</option>
                  {form.type && !ANNOUNCEMENT_TYPES.includes(form.type) && (
                    <option value={form.type}>{form.type}</option>
                  )}
                  {ANNOUNCEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium">Audience *</label>
                <select
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.audience}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, audience: e.target.value }))
                  }
                >
                  <option value="all">All</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-3 rounded-lg text-lg font-semibold disabled:opacity-60"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Announcement"
                    : "Create Announcement"}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 border py-3 rounded-lg text-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
