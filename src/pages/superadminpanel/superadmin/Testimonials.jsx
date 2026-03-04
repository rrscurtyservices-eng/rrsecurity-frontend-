import React, { useCallback, useEffect, useState } from "react";
import * as FaIcons from "react-icons/fa";
import { FaEdit, FaPlus, FaStar, FaTimes, FaTrash, FaUserCircle } from "react-icons/fa";
import { auth } from "../../../firebase";
import { API_URL } from "../../../api/employee";

const emptyForm = {
  name: "",
  rating: 5,
  review: "",
  icon: "FaUserCircle",
};
const MAX_TESTIMONIALS = 6;
const TESTIMONIAL_ICON_OPTIONS = Object.keys(FaIcons)
  .filter((iconName) => iconName.startsWith("Fa"))
  .sort((a, b) => a.localeCompare(b))
  .map((iconName) => ({
    value: iconName,
    label: iconName.replace(/^Fa/, "").replace(/([A-Z])/g, " $1").trim(),
  }));

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const getToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    return user.getIdToken();
  };

  const fetchTestimonials = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/testimonials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load testimonials");
      }
      const data = await res.json();
      setTestimonials(data);
    } catch (err) {
      console.error("Load testimonials failed:", err);
      alert(err.message || "Failed to load testimonials.");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingId && testimonials.length >= MAX_TESTIMONIALS) {
      alert(`Maximum ${MAX_TESTIMONIALS} testimonials only allowed.`);
      setOpenModal(false);
      setForm(emptyForm);
      return;
    }
    try {
      const token = await getToken();
      if (editingId) {
        const res = await fetch(`${API_URL}/api/testimonials/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: form.name,
            rating: Number(form.rating || 0),
            review: form.review,
            icon: form.icon,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to update testimonial");
        }
      } else {
        const res = await fetch(`${API_URL}/api/testimonials`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: form.name,
            rating: Number(form.rating || 0),
            review: form.review,
            icon: form.icon,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to add testimonial");
        }
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpenModal(false);
      await fetchTestimonials();
    } catch (err) {
      console.error("Add testimonial failed:", err);
      alert(err.message || "Failed to add testimonial.");
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/testimonials/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete testimonial");
      }
      await fetchTestimonials();
    } catch (err) {
      console.error("Delete testimonial failed:", err);
      alert(err.message || "Failed to delete testimonial.");
    }
  };

  const handleEdit = (t) => {
    setForm({
      name: t.name || "",
      rating: t.rating || 5,
      review: t.review || "",
      icon: t.icon || "FaUserCircle",
    });
    setEditingId(t.id);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const getTestimonialIcon = (iconName) => FaIcons[iconName] || FaUserCircle;

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6 md:p-10">
      <div className="flex justify-end items-center mb-4">
        <button
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-black text-white px-4 py-2 rounded-lg hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setOpenModal(true);
          }}
          disabled={testimonials.length >= MAX_TESTIMONIALS}
        >
          <FaPlus /> Add Testimonial
        </button>
      </div>

      <div className="mb-6 flex items-center rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-sm">
        <p className="text-sm font-semibold text-amber-900">
          Testimonial limit: maximum {MAX_TESTIMONIALS} items only. You cannot add more than{" "}
          {MAX_TESTIMONIALS} testimonials.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">Loading testimonials...</div>
      )}
      {!loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => {
            const TestimonialIcon = getTestimonialIcon(item.icon);
            return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 min-h-[260px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <TestimonialIcon size={22} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-slate-900">{item.name}</h3>
                    <div className="mt-1 flex text-yellow-500">
                      {[...Array(Number(item.rating || 0))].map((_, i) => (
                        <FaStar key={i} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 hover:bg-gray-100"
                    onClick={() => handleEdit(item)}
                    aria-label="Edit testimonial"
                  >
                    <FaEdit className="text-blue-600" />
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-xl bg-red-500 px-3 py-2 hover:bg-red-600"
                    onClick={() => handleDelete(item.id)}
                    aria-label="Delete testimonial"
                  >
                    <FaTrash className="text-white" />
                  </button>
                </div>
              </div>

              <div className="mt-6 max-h-28 overflow-y-auto pr-1">
                <p className="break-words text-base font-medium text-slate-900">
                  {item.review || "-"}
                </p>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Add Testimonial Modal */}
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
              {editingId ? "Edit Testimonial" : "Add Testimonial"}
            </h2>

            <form className="space-y-5" onSubmit={handleSave}>
              <div>
                <label className="font-medium">Name *</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="font-medium">Rating</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.rating}
                  onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                />
              </div>

              <div>
                <label className="font-medium">Icon</label>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    {React.createElement(getTestimonialIcon(form.icon), { size: 28 })}
                  </div>
                  <select
                    className="w-full rounded-lg border bg-gray-100 p-3"
                    value={form.icon}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  >
                    {TESTIMONIAL_ICON_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium">Review *</label>
                <textarea
                  rows="4"
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.review}
                  maxLength={300}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, review: e.target.value.slice(0, 300) }))
                  }
                  required
                />
                <p className="mt-1 text-xs text-gray-500">{form.review.length}/300</p>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={!editingId && testimonials.length >= MAX_TESTIMONIALS}
                  className="flex-1 rounded-lg bg-black py-3 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editingId ? "Update Testimonial" : "Add Testimonial"}
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

