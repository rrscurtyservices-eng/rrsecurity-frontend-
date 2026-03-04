import React, { useEffect, useState } from "react";
import * as FaIcons from "react-icons/fa";
import {
  FaEdit,
  FaPlus,
  FaTimes,
  FaTrash,
  FaUserShield,
} from "react-icons/fa";
import { auth } from "../../../firebase";
import { API_URL } from "../../../api/employee";

const emptyForm = {
  name: "",
  status: "Active",
  category: "",
  description: "",
  imageUrl: "",
  activeClients: 0,
  price: "",
  features: "",
  icon: "FaUserShield",
};
const MAX_SERVICES = 6;
const LEGACY_SERVICE_ICONS = {
  userShield: "FaUserShield",
  shield: "FaShieldAlt",
  lock: "FaLock",
  briefcase: "FaBriefcase",
  building: "FaBuilding",
  bell: "FaBell",
  eye: "FaEye",
  fingerprint: "FaFingerprint",
  key: "FaKey",
  search: "FaSearch",
  tools: "FaTools",
  users: "FaUsers",
  video: "FaVideo",
  warehouse: "FaWarehouse",
};
const SERVICE_ICON_OPTIONS = Object.keys(FaIcons)
  .filter((iconName) => iconName.startsWith("Fa"))
  .sort((a, b) => a.localeCompare(b))
  .map((iconName) => ({
    value: iconName,
    label: iconName.replace(/^Fa/, "").replace(/([A-Z])/g, " $1").trim(),
  }));

export default function Services() {
  const [services, setServices] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchServices();
  }, []);

  const getToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    return user.getIdToken();
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load services");
      }
      const data = await res.json();
      setServices(data);
    } catch (err) {
      console.error("Load services failed:", err);
      alert(err.message || "Failed to load services.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingId && services.length >= MAX_SERVICES) {
      alert(`Maximum ${MAX_SERVICES} services only allowed.`);
      setOpenModal(false);
      setForm(emptyForm);
      return;
    }
    const features = form.features
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      const token = await getToken();
      if (editingId) {
        const res = await fetch(`${API_URL}/api/services/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: form.name,
            status: form.status,
            category: form.category,
            description: form.description,
            imageUrl: form.imageUrl || "",
            activeClients: Number(form.activeClients || 0),
            price: form.price,
            features,
            icon: form.icon,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to update service");
        }
      } else {
        const res = await fetch(`${API_URL}/api/services`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: form.name,
            status: form.status,
            category: form.category,
            description: form.description,
            imageUrl: form.imageUrl || "",
            activeClients: Number(form.activeClients || 0),
            price: form.price,
            features,
            icon: form.icon,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to add service");
        }
      }

      setForm(emptyForm);
      setEditingId(null);
      setOpenModal(false);
      await fetchServices();
    } catch (err) {
      console.error("Add service failed:", err);
      alert(err.message || "Failed to add service.");
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete service");
      }
      await fetchServices();
    } catch (err) {
      console.error("Delete service failed:", err);
      alert(err.message || "Failed to delete service.");
    }
  };

  const handleEdit = (service) => {
    setForm({
      name: service.name || "",
      status: service.status || "Active",
      category: service.category || "",
      description: service.description || "",
      imageUrl: service.imageUrl || "",
      activeClients: service.activeClients || 0,
      price: service.price || "",
      features: Array.isArray(service.features) ? service.features.join(", ") : "",
      icon: LEGACY_SERVICE_ICONS[service.icon] || service.icon || "FaUserShield",
    });
    setEditingId(service.id);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const getServiceIcon = (iconName) => {
    const normalizedIcon = LEGACY_SERVICE_ICONS[iconName] || iconName || "FaUserShield";
    return FaIcons[normalizedIcon] || FaUserShield;
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 px-4 pb-4 pt-0 sm:px-6 sm:pb-6 sm:pt-0 md:px-10 md:pb-10 md:pt-0">
      <div className="flex justify-end items-center mb-4">
        <button
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-black text-white px-4 py-2 rounded-lg hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setOpenModal(true);
          }}
          disabled={services.length >= MAX_SERVICES}
        >
          <FaPlus /> Add New Service
        </button>
      </div>

      <div className="mb-6 flex items-center rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-sm">
        <p className="text-sm font-semibold text-amber-900">
          Service limit: maximum {MAX_SERVICES} items only. You cannot add more than {MAX_SERVICES} services.
        </p>
      </div>

      {/* Services List */}
      {loading && <div className="text-gray-500 mb-4">Loading services...</div>}
      {!loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const ServiceIcon = getServiceIcon(service.icon);
            return (
              <div
                key={service.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 min-h-[260px]"
              >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <ServiceIcon size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-slate-900">{service.name}</h3>
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {service.category || "No category"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 hover:bg-gray-100"
                    onClick={() => handleEdit(service)}
                    aria-label="Edit service"
                  >
                    <FaEdit className="text-blue-600" />
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-xl bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
                    onClick={() => handleDelete(service.id)}
                  >
                    <FaTrash className="text-white" />
                  </button>
                </div>
              </div>

              <div className="mt-6 max-h-28 overflow-y-auto pr-1">
                <p className="break-words text-base font-medium text-slate-900">
                  {service.description || "-"}
                </p>
              </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Add Service Modal */}
      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl p-8 relative overflow-y-auto max-h-[90vh]">
            <button
              className="absolute right-6 top-6 text-gray-600 text-2xl hover:text-gray-900"
              onClick={handleClose}
              type="button"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="text-3xl font-bold text-blue-800 mb-6">
              {editingId ? "Edit Service" : "Add New Service"}
            </h2>

            <form className="space-y-5" onSubmit={handleSave}>
              <div>
                <label className="font-medium">Service Name *</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid md:grid-cols-1 gap-4">
                <div>
                  <label className="font-medium">Category *</label>
                  <input
                    type="text"
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="font-medium">Icon</label>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      {React.createElement(getServiceIcon(form.icon), { size: 28 })}
                    </div>
                    <select
                      className="w-full rounded-lg border bg-gray-100 p-3"
                      value={form.icon}
                      onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                    >
                      {SERVICE_ICON_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-medium">Description</label>
                <textarea
                  rows="3"
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.description}
                  maxLength={500}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value.slice(0, 500) }))
                  }
                />
                <p className="mt-1 text-xs text-gray-500">{form.description.length}/500</p>
              </div>

              <div>
                <label className="font-medium">Image URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/service-image.jpg"
                  className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={!editingId && services.length >= MAX_SERVICES}
                  className="flex-1 rounded-lg bg-black py-3 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editingId ? "Update Service" : "Add Service"}
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
