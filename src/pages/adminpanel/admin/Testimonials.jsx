import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaPlus,
  FaRegCommentDots,
  FaStar,
  FaEdit,
  FaTrash,
  FaTimes,
} from "react-icons/fa";
import { auth } from "../../../firebase";
import { API_URL } from "../../../api/employee";

const emptyForm = {
  name: "",
  rating: 5,
  review: "",
};
const MAX_TESTIMONIALS = 6;

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

  const stats = useMemo(() => {
    const avg =
      testimonials.length === 0
        ? 0
        : (
          testimonials.reduce((acc, t) => acc + Number(t.rating || 0), 0) /
          testimonials.length
        ).toFixed(1);
    return { avg };
  }, [testimonials]);

  const handleSave = async (e) => {
    e.preventDefault();
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
    });
    setEditingId(t.id);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className="testimonials-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Testimonials Management</h2>
          <p className="text-green-600 text-sm mt-1">
            Showing {testimonials.length} testimonial(s) currently visible on homepage
          </p>
        </div>

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

      <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
        Testimonial limit: maximum {MAX_TESTIMONIALS} items only. You cannot add more than{" "}
        {MAX_TESTIMONIALS} testimonials.
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
        <div className="testimonials-stat total bg-blue-500 text-white p-5 rounded-xl flex items-center gap-4 shadow-md">
          <FaRegCommentDots size={35} />
          <div>
            <p className="text-sm">Total Testimonials</p>
            <h3 className="text-xl font-semibold">{testimonials.length}</h3>
          </div>
        </div>

        <div className="testimonials-stat rating bg-yellow-500 text-white p-5 rounded-xl flex items-center gap-4 shadow-md">
          <FaStar size={35} />
          <div>
            <p className="text-sm">Average Rating</p>
            <h3 className="text-xl font-semibold">{stats.avg || "0.0"}</h3>
          </div>
        </div>
      </div>

      {/* Testimonials Cards */}
      {loading && (
        <div className="text-sm text-gray-500">Loading testimonials...</div>
      )}
      {!loading && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="testimonials-item flex min-h-[270px] flex-col rounded-2xl border bg-white p-5 shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-base">
                    {(item.name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>

                  <div>
                    <h3 className="text-base font-semibold">{item.name}</h3>
                    <div className="flex text-yellow-500 mt-2">
                      {[...Array(Number(item.rating || 0))].map((_, i) => (
                        <FaStar key={i} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="bg-gray-200 hover:bg-gray-300 p-2 rounded-lg"
                    onClick={() => handleEdit(item)}
                  >
                    <FaEdit className="text-gray-700" />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 p-2 rounded-lg"
                    onClick={() => handleDelete(item.id)}
                  >
                    <FaTrash className="text-white" />
                  </button>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-gray-700">
                "{item.review}"
              </p>
            </div>
          ))}
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
                <label className="font-medium">Review *</label>
                <textarea
                  rows="4"
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.review}
                  onChange={(e) => setForm((f) => ({ ...f, review: e.target.value }))}
                  required
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button type="submit" className="flex-1 bg-black text-white py-3 rounded-lg text-lg font-semibold">
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

