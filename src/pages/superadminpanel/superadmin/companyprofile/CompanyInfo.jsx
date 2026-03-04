import React, { useEffect, useState } from "react";
import { FaSave } from "react-icons/fa";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import { COLLECTIONS, SETTINGS_DOCS } from "../../../../services/collections";

export default function CompanyInfo() {
  const [formData, setFormData] = useState({
    companyName: "",
    phoneNumber: "",
    alternativePhoneNumber: "",
    email: "",
    alternativeEmail: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(
          doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOCS.COMPANY_INFO)
        );
        if (snap.exists()) {
          setFormData((prev) => ({ ...prev, ...snap.data() }));
        }
      } catch (err) {
        console.error("Failed to load company settings:", err);
        setError("Failed to load company settings.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleChange = (e) => {
    if (!isEditing) return;
    const { name, value } = e.target;
    const isPhoneField =
      name === "phoneNumber" || name === "alternativePhoneNumber";
    const sanitizedValue = isPhoneField ? value.replace(/\D/g, "").slice(0, 10) : value;

    setError("");
    setSuccess("");
    setFormData({ ...formData, [name]: sanitizedValue });
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber)) {
      setError("Phone number must be exactly 10 digits (numbers only).");
      return;
    }

    if (
      formData.alternativePhoneNumber &&
      !/^\d{10}$/.test(formData.alternativePhoneNumber)
    ) {
      setError("Alternative phone number must be exactly 10 digits (numbers only).");
      return;
    }

    try {
      setSaving(true);
      await setDoc(
        doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOCS.COMPANY_INFO),
        {
          ...formData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSuccess("Company settings saved successfully.");
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save company settings:", err);
      setError("Failed to save company settings.");
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "block text-sm font-medium text-gray-700 mb-2";
  const inputClass = `w-full h-11 px-3 border border-gray-300 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
    isEditing
      ? "bg-white text-gray-800"
      : "bg-gray-100 text-gray-500"
  }`;
  const textAreaClass = `w-full px-3 py-3 border border-gray-300 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
    isEditing
      ? "bg-white text-gray-800"
      : "bg-gray-100 text-gray-500"
  }`;

  if (loading) {
    return <div className="text-sm text-gray-500">Loading company settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Company Information</h2>
        <p className="text-gray-500 text-sm mt-1">Basic information about your organization</p>
      </div>

      <div className="bg-white shadow-md rounded-xl p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Company Name *</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Rama & Rama"
              disabled={!isEditing}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Phone Number *</label>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="9876543210"
              inputMode="numeric"
              maxLength={10}
              disabled={!isEditing}
              className={inputClass}
            />
            <p className="text-xs text-gray-500 mt-1">Numbers only, exactly 10 digits</p>
          </div>

          <div>
            <label className={labelClass}>Alternative Phone Number</label>
            <input
              type="text"
              name="alternativePhoneNumber"
              value={formData.alternativePhoneNumber}
              onChange={handleChange}
              placeholder="9876543210"
              inputMode="numeric"
              maxLength={10}
              disabled={!isEditing}
              className={inputClass}
            />
            <p className="text-xs text-gray-500 mt-1">Numbers only, exactly 10 digits</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="contact@ramarama.com"
              disabled={!isEditing}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Alternative Email</label>
            <input
              type="email"
              name="alternativeEmail"
              value={formData.alternativeEmail}
              onChange={handleChange}
              placeholder="support@ramarama.com"
              disabled={!isEditing}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Street Address *</label>
          <input
            type="text"
            name="street"
            value={formData.street}
            onChange={handleChange}
            placeholder="123 Security Boulevard, Business District"
            disabled={!isEditing}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={labelClass}>City *</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Mumbai"
              disabled={!isEditing}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>State / Province *</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="Maharashtra"
              disabled={!isEditing}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>ZIP / Postal Code *</label>
            <input
              type="text"
              name="zip"
              value={formData.zip}
              onChange={handleChange}
              placeholder="400001"
              disabled={!isEditing}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Company Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            placeholder="Leading provider of corporate and residential security services"
            disabled={!isEditing}
            className={textAreaClass}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setIsEditing(true);
            }}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60"
            onClick={handleSave}
            disabled={saving || !isEditing}
          >
            <FaSave size={16} />
            {saving ? "Saving..." : "Save Company Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
