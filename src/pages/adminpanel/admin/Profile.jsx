import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";
import { COLLECTIONS } from "../../../services/collections";
import Security from "../../superadminpanel/superadmin/companyprofile/Security";

const EMPTY_FORM = {
  fullName: "",
  age: "",
  gender: "",
  profileRole: "Admin",
  phone: "",
  alternativePhone: "",
  email: "",
  aadhaarNumber: "",
  city: "",
  state: "",
};

export default function Profile() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user?.uid) {
          setLoading(false);
          return;
        }
        const snap = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
        if (!snap.exists()) {
          setForm((prev) => ({ ...prev, email: user.email || "" }));
          return;
        }
        const data = snap.data() || {};
        setForm({
          fullName: data.fullName || data.name || "",
          age: data.age === undefined || data.age === null ? "" : String(data.age),
          gender: data.gender || "",
          profileRole: data.profileRole || data.jobRole || "Admin",
          phone: data.phone || "",
          alternativePhone: data.alternativePhone || "",
          email: data.email || user.email || "",
          aadhaarNumber: data.aadhaarNumber || "",
          city: data.city || "",
          state: data.state || "",
        });
      } catch (err) {
        console.error("Failed to load admin personal info:", err);
        setError("Failed to load admin details.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const canSave = useMemo(() => {
    if (!String(form.fullName || "").trim()) return false;
    if (!String(form.gender || "").trim()) return false;
    if (!/^\d{10}$/.test(String(form.phone || ""))) return false;
    if (String(form.alternativePhone || "") && !/^\d{10}$/.test(String(form.alternativePhone))) {
      return false;
    }
    if (String(form.aadhaarNumber || "") && !/^\d{12}$/.test(String(form.aadhaarNumber))) {
      return false;
    }
    if (!String(form.city || "").trim()) return false;
    if (!String(form.state || "").trim()) return false;
    return true;
  }, [form]);

  const initials = useMemo(() => {
    const name = String(form.fullName || form.email || "").trim();
    if (!name) return "AD";
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }, [form.fullName, form.email]);

  const handleChange = (key, value) => {
    if (!isEditing) return;
    setError("");
    setSuccess("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user?.uid) {
      setError("Please login again.");
      return;
    }
    if (!canSave) {
      setError("Fill all required fields. Phone must be 10 digits.");
      return;
    }

    try {
      setSaving(true);
      await setDoc(
        doc(db, COLLECTIONS.USERS, user.uid),
        {
          name: form.fullName.trim(),
          fullName: form.fullName.trim(),
          age: form.age === "" ? null : Number(form.age),
          gender: form.gender.trim(),
          profileRole: "Admin",
          jobRole: "Admin",
          phone: String(form.phone || "").trim(),
          alternativePhone: String(form.alternativePhone || "").trim(),
          aadhaarNumber: String(form.aadhaarNumber || "").trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          profileCompleted: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSuccess("Admin personal details updated.");
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save admin personal info:", err);
      setError("Failed to save details.");
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "block text-sm font-medium text-slate-700 mb-1";
  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">
          Profile
          <p className="text-xs sm:text-sm text-gray-400 mt-2 hidden sm:block">
            View and update your admin profile details
          </p>
        </h1>

        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white/80 shadow-xl backdrop-blur-lg">
          <div className="border-b px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-800">Profile Settings</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="px-6 py-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-700 text-2xl font-semibold text-white">
                    {initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-1 shadow">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                      +
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-semibold text-slate-800">
                    {form.fullName || "Admin"}
                  </div>
                  <p className="text-sm text-slate-500">Administrator</p>
                  <p className="mt-1 text-xs text-slate-400">{form.email || "-"}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Security
                  embedded
                  buttonOnly
                  forceOpen={showPasswordForm}
                  onOpen={() => setShowPasswordForm(true)}
                />
              </div>
            </div>

            {showPasswordForm && (
              <div className="mt-5">
                <Security
                  embedded
                  forceOpen={showPasswordForm}
                  onClose={() => setShowPasswordForm(false)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl overflow-hidden border border-gray-200 p-4 sm:p-8">
          {loading ? (
            <div className="text-sm text-gray-500">Loading personal details...</div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Personal Information</h2>
                <p className="text-sm text-slate-500 mt-1">
                  View and update admin profile details.
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-700">{success}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input
                    className={inputClass}
                    value={form.fullName}
                    disabled={!isEditing}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>Age</label>
                  <input
                    type="number"
                    min="18"
                    className={inputClass}
                    value={form.age}
                    disabled={!isEditing}
                    onChange={(e) => handleChange("age", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>Gender *</label>
                  <select
                    className={inputClass}
                    value={form.gender}
                    disabled={!isEditing}
                    onChange={(e) => handleChange("gender", e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Role</label>
                  <input className={`${inputClass} bg-gray-100`} value="Admin" disabled />
                </div>

                <div>
                  <label className={labelClass}>Phone Number *</label>
                  <input
                    className={inputClass}
                    value={form.phone}
                    maxLength={10}
                    inputMode="numeric"
                    disabled={!isEditing}
                    onChange={(e) =>
                      handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Alternative Phone</label>
                  <input
                    className={inputClass}
                    value={form.alternativePhone}
                    maxLength={10}
                    inputMode="numeric"
                    disabled={!isEditing}
                    onChange={(e) =>
                      handleChange(
                        "alternativePhone",
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <input className={`${inputClass} bg-gray-100`} value={form.email} disabled />
                </div>

                <div>
                  <label className={labelClass}>Aadhaar Number</label>
                  <input
                    className={inputClass}
                    value={form.aadhaarNumber}
                    maxLength={12}
                    inputMode="numeric"
                    disabled={!isEditing}
                    onChange={(e) =>
                      handleChange("aadhaarNumber", e.target.value.replace(/\D/g, "").slice(0, 12))
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>City *</label>
                  <input
                    className={inputClass}
                    value={form.city}
                    disabled={!isEditing}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>State *</label>
                  <input
                    className={inputClass}
                    value={form.state}
                    disabled={!isEditing}
                    onChange={(e) => handleChange("state", e.target.value)}
                  />
                </div>
              </div>

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
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !isEditing}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Personal Info"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
