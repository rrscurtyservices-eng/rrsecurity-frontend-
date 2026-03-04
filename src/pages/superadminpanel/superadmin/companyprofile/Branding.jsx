import React, { useEffect, useState } from "react";
import { FiUploadCloud, FiInfo, FiImage } from "react-icons/fi";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { COLLECTIONS, SETTINGS_DOCS } from "../../../../services/collections";

export default function Branding() {
  const [form, setForm] = useState({
    primary: "#1f3a8a",
    secondary: "#f5b800",
    accent: "#22c55e",
    tagline: "Your Trusted Security Partner",
    logoUrl: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOCS.BRANDING));
      if (snap.exists()) {
        setForm((f) => ({ ...f, ...snap.data() }));
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read logo file."));
      reader.readAsDataURL(file);
    });

  const uploadIfNeeded = async (file) => {
    if (!file) return null;
    if (file.size > 700 * 1024) {
      throw new Error("Logo image must be smaller than 700KB.");
    }
    return fileToDataUrl(file);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const logoUrl = (await uploadIfNeeded(logoFile)) || form.logoUrl;

      await setDoc(
        doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOCS.BRANDING),
        {
          ...form,
          logoUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setForm((f) => ({ ...f, logoUrl }));
      setLogoFile(null);
      setLogoPreview("");
      setSuccess("Branding settings saved.");
    } catch (err) {
      console.error("Failed to save branding settings:", err);
      setError(err?.message || "Failed to save branding settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="text-slate-700 w-full">

      {/* Title Section */}
      <div className="flex items-center gap-3 mb-4">
        <FiImage className="text-indigo-600 text-2xl" />
        <h2 className="text-xl font-semibold">Branding & Appearance</h2>
      </div>

      <p className="text-gray-500 mb-6">
        Customize the look and feel of your application
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {success && <p className="mb-4 text-sm text-green-700">{success}</p>}

      {/* Info Box */}
      <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 mb-8 flex items-start gap-3">
        <FiInfo className="text-indigo-600 mt-1 text-xl" />
        <p className="text-sm text-indigo-700 leading-relaxed">
          <strong>Branding Guidelines</strong><br />
          Changes to branding settings will be reflected across all user interfaces.
          Make sure your brand colors meet accessibility standards (WCAG 2.1).
        </p>
      </div>

      {/* Color Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Primary */}
        <div>
          <label className="text-sm font-medium text-slate-700">Primary Color</label>
          <input
            type="color"
            value={form.primary}
            className="w-full h-12 rounded-md mt-2 cursor-pointer border border-gray-300"
            onChange={(e) => setForm((f) => ({ ...f, primary: e.target.value }))}
          />
        </div>

        {/* Secondary */}
        <div>
          <label className="text-sm font-medium text-slate-700">Secondary Color</label>
          <input
            type="color"
            value={form.secondary}
            className="w-full h-12 rounded-md mt-2 cursor-pointer border border-gray-300"
            onChange={(e) => setForm((f) => ({ ...f, secondary: e.target.value }))}
          />
        </div>

        {/* Accent */}
        <div>
          <label className="text-sm font-medium text-slate-700">Accent Color</label>
          <input
            type="color"
            value={form.accent}
            className="w-full h-12 rounded-md mt-2 cursor-pointer border border-gray-300"
            onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))}
          />
        </div>
      </div>

      {/* Company Tagline */}
      <div className="mt-8">
        <label className="text-sm font-medium text-slate-700">
          Company Tagline
        </label>
        <input
          type="text"
          className="w-full mt-2 px-4 py-3 rounded-md border border-gray-300 bg-gray-50 text-sm"
          value={form.tagline}
          onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
        />
      </div>

      <div className="mt-8">
        <label className="text-sm font-medium text-slate-700">
          Company Logo Link
        </label>
        <input
          type="url"
          className="w-full mt-2 px-4 py-3 rounded-md border border-gray-300 bg-gray-50 text-sm"
          placeholder="https://example.com/logo.png"
          value={form.logoUrl}
          onChange={(e) => {
            setError("");
            setSuccess("");
            setForm((f) => ({ ...f, logoUrl: e.target.value }));
            setLogoFile(null);
            setLogoPreview("");
          }}
        />
        <p className="mt-2 text-xs text-slate-500">
          Paste a direct image link and save.
        </p>
      </div>

      {/* Upload Sections */}
      <div className="grid grid-cols-1 gap-6 mt-8">

        {/* Company Logo */}
        <div className="border-2 border-dashed border-gray-300 bg-white rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <FiUploadCloud className="text-3xl text-gray-500 mb-2" />
          <p className="text-gray-500 text-sm mb-4">
            Upload your company logo or paste logo link above<br />
            <span className="text-xs">(PNG, JPG or SVG, max 700KB for upload)</span>
          </p>

          <label className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg cursor-pointer hover:bg-gray-800 transition">
            Choose File
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                setError("");
                setSuccess("");
                setLogoFile(e.target.files?.[0] || null);
              }}
            />
          </label>

          {logoFile && (
            <p className="mt-3 text-xs text-slate-500">{logoFile.name}</p>
          )}

          {(logoPreview || form.logoUrl) && (
            <img
              src={logoPreview || form.logoUrl}
              alt="logo"
              className="mt-4 h-12 object-contain"
            />
          )}
        </div>

      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-10">
        <button
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition"
          onClick={handleSave}
          disabled={saving}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {saving ? "Saving..." : "Save Branding Settings"}
        </button>
      </div>
    </div>
  );
}
