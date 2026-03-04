import React, { useEffect, useMemo, useState } from "react";
import { FaLightbulb, FaEdit, FaTrash, FaPlus, FaTimes } from "react-icons/fa";
import { auth } from "../../../firebase";
import { API_URL } from "../../../api/employee";

const emptyForm = {
  title: "",
  description: "",
  status: "Active",
};
const MAX_REASONS = 8;

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

  const activeCount = useMemo(
    () => reasons.filter((r) => r.status === "Active").length,
    [reasons]
  );

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = await getToken();
      if (editingId) {
        const res = await fetch(`${API_URL}/api/whyus/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...form }),
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
          body: JSON.stringify({ ...form }),
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
      status: reason.status || "Active",
    });
    setEditingId(reason.id);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Why Us Management</h2>
          <p className="text-gray-500 text-sm">
            Manage reasons displayed in "Why Choose Rama & Rama" section on the homepage
          </p>
          <p className="text-gray-500 text-xs">
            Showing {reasons.length} reason(s) currently visible on homepage
          </p>
        </div>
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

      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
        Why Us limit: maximum {MAX_REASONS} items only. You cannot add more than {MAX_REASONS}
        reasons.
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-blue-600 text-white rounded-lg p-6">
          <p className="text-sm opacity-90">Total Reasons</p>
          <h3 className="text-3xl font-semibold">{reasons.length}</h3>
          <FaLightbulb className="text-3xl float-right opacity-90" />
        </div>

        <div className="bg-green-600 text-white rounded-lg p-6">
          <p className="text-sm opacity-90">Active on Homepage</p>
          <h3 className="text-3xl font-semibold">{activeCount}</h3>
          <FaLightbulb className="text-3xl float-right opacity-90" />
        </div>
      </div>

      {/* Reasons List */}
      {loading && (
        <div className="text-sm text-gray-500">Loading reasons...</div>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {reasons.map((item) => (
          <div
            key={item.id}
            className="flex min-h-[250px] flex-col rounded-2xl border bg-white p-5 shadow-sm"
          >
            {/* Icon + Title */}
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-3 text-xl text-indigo-600">
                <FaLightbulb />
              </div>

              <div>
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                  {item.status}
                </span>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {item.description}
            </p>

            {/* Buttons */}
            <div className="mt-auto pt-5 flex gap-3">
              <button
                className="flex items-center gap-1 text-xs bg-gray-50 border text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
                onClick={() => handleEdit(item)}
              >
                <FaEdit /> Edit
              </button>

              <button
                className="flex items-center gap-1 text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                onClick={() => handleDelete(item.id)}
              >
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        ))}
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
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="font-medium">Status</label>
                <select
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>

              <div className="flex gap-4 mt-6">
                <button type="submit" className="flex-1 bg-black text-white py-3 rounded-lg text-lg font-semibold">
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

