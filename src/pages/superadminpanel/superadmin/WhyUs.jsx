import React, { useEffect, useState } from "react";
import * as FaIcons from "react-icons/fa";
import { FaEdit, FaLightbulb, FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import { auth } from "../../../firebase";
import { API_URL } from "../../../api/employee";

const emptyForm = {
  title: "",
  description: "",
  icon: "FaLightbulb",
};
const MAX_REASONS = 8;
const WHY_US_ICON_OPTIONS = Object.keys(FaIcons)
  .filter((iconName) => iconName.startsWith("Fa"))
  .sort((a, b) => a.localeCompare(b))
  .map((iconName) => ({
    value: iconName,
    label: iconName.replace(/^Fa/, "").replace(/([A-Z])/g, " $1").trim(),
  }));

export default function WhyUs() {
  const [reasons, setReasons] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchReasons();
  }, []);

  const getToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    return user.getIdToken();
  };

  const fetchReasons = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/whyus`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load reasons");
      }
      const data = await res.json();
      setReasons(data);
    } catch (err) {
      console.error("Load reasons failed:", err);
      alert(err.message || "Failed to load reasons.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingId && reasons.length >= MAX_REASONS) {
      alert(`Maximum ${MAX_REASONS} reasons only allowed.`);
      setOpenModal(false);
      setForm(emptyForm);
      return;
    }
    try {
      const token = await getToken();
      if (editingId) {
        const currentStatus =
          reasons.find((reason) => reason.id === editingId)?.status || "Active";
        const res = await fetch(`${API_URL}/api/whyus/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...form, status: currentStatus }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to update reason");
        }
      } else {
        const res = await fetch(`${API_URL}/api/whyus`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...form, status: "Active" }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to add reason");
        }
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpenModal(false);
      await fetchReasons();
    } catch (err) {
      console.error("Add reason failed:", err);
      alert(err.message || "Failed to add reason.");
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/whyus/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete reason");
      }
      await fetchReasons();
    } catch (err) {
      console.error("Delete reason failed:", err);
      alert(err.message || "Failed to delete reason.");
    }
  };

  const handleEdit = (reason) => {
    setForm({
      title: reason.title || "",
      description: reason.description || "",
      icon: reason.icon || "FaLightbulb",
    });
    setEditingId(reason.id);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const getReasonIcon = (iconName) => FaIcons[iconName] || FaLightbulb;

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6 md:p-10 space-y-6">
      <div className="flex items-center justify-end">
        <button
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-black text-white px-4 py-2 rounded-lg hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setOpenModal(true);
          }}
          disabled={reasons.length >= MAX_REASONS}
        >
          <FaPlus /> Add Reason
        </button>
      </div>

      <div className="mb-6 flex items-center rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-sm">
        <p className="text-sm font-semibold text-amber-900">
          Why Us limit: maximum {MAX_REASONS} items only. You cannot add more than {MAX_REASONS}
          reasons.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">Loading reasons...</div>
      )}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reasons.map((item) => {
          const ReasonIcon = getReasonIcon(item.icon);
          return (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 min-h-[260px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <ReasonIcon size={22} />
                </div>

                <div className="min-w-0">
                  <h4 className="truncate text-lg font-semibold text-slate-900">{item.title}</h4>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
              <button
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 hover:bg-gray-100"
                onClick={() => handleEdit(item)}
                  aria-label="Edit reason"
              >
                  <FaEdit className="text-blue-600" />
              </button>

              <button
                  className="inline-flex items-center justify-center rounded-xl bg-red-500 px-3 py-2 hover:bg-red-600"
                onClick={() => handleDelete(item.id)}
                  aria-label="Delete reason"
              >
                  <FaTrash className="text-white" />
              </button>
              </div>
            </div>

            <div className="mt-6 max-h-28 overflow-y-auto pr-1">
              <p className="break-words text-base font-medium text-slate-900">
                {item.description || "-"}
              </p>
            </div>
          </div>
        );
        })}
      </div>

      {/* Add Reason Modal */}
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
              {editingId ? "Edit Reason" : "Add New Reason"}
            </h2>

            <form className="space-y-5" onSubmit={handleSave}>
              <div>
                <label className="font-medium">Title *</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="font-medium">Description *</label>
                <textarea
                  rows="4"
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.description}
                  maxLength={300}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value.slice(0, 300) }))
                  }
                  required
                />
                <p className="mt-1 text-xs text-gray-500">{form.description.length}/300</p>
              </div>

              <div>
                <label className="font-medium">Icon</label>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    {React.createElement(getReasonIcon(form.icon), { size: 28 })}
                  </div>
                  <select
                    className="w-full rounded-lg border bg-gray-100 p-3"
                    value={form.icon}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  >
                    {WHY_US_ICON_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={!editingId && reasons.length >= MAX_REASONS}
                  className="flex-1 rounded-lg bg-black py-3 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editingId ? "Update Reason" : "Add Reason"}
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

