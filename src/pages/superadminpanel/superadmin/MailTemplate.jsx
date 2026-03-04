import React, { useCallback, useEffect, useState } from "react";
import { auth } from "../../../firebase";
import { API_URL } from "../../../api/employee";

const DEFAULT_SUBJECT = "Security Rama Rama - Login Credentials";
const DEFAULT_BODY_TEXT = `Hello,

Welcome to Security Rama Rama.

Username: {{username}}
Employee ID: {{employeeId}}
First login password: {{defaultPassword}}
Role: {{roleLabel}}

Please use this link to login:
{{loginUrl}}

Thank you.`;

export default function MailTemplate() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [initialSubject, setInitialSubject] = useState("");
  const [initialBodyText, setInitialBodyText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    setStatus({ type: "", text: "" });
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      const token = await user.getIdToken();

      const res = await fetch(`${API_URL}/api/mail-template/employee-welcome`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to load template");

      const nextSubject = body.subject || DEFAULT_SUBJECT;
      const nextBodyText = body.bodyText || DEFAULT_BODY_TEXT;
      setSubject(nextSubject);
      setBodyText(nextBodyText);
      setInitialSubject(nextSubject);
      setInitialBodyText(nextBodyText);
      setIsEditing(false);
    } catch (err) {
      setStatus({ type: "error", text: err.message || "Failed to load template" });
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: "", text: "" });
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      const token = await user.getIdToken();

      const res = await fetch(`${API_URL}/api/mail-template/employee-welcome`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: String(subject || "").trim(),
          bodyText: String(bodyText || "").trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to save template");
      setInitialSubject(String(subject || "").trim());
      setInitialBodyText(String(bodyText || "").trim());
      setIsEditing(false);
      setStatus({ type: "success", text: "Template saved successfully." });
    } catch (err) {
      setStatus({ type: "error", text: err.message || "Failed to save template" });
    } finally {
      setSaving(false);
    }
  };

  const handleUseDefault = () => {
    setSubject(DEFAULT_SUBJECT);
    setBodyText(DEFAULT_BODY_TEXT);
    setIsEditing(true);
    setStatus({ type: "", text: "" });
  };

  const handleCancel = () => {
    setSubject(initialSubject);
    setBodyText(initialBodyText);
    setIsEditing(false);
    setStatus({ type: "", text: "" });
  };

  const previewText = String(bodyText || "")
    .replaceAll("{{username}}", "employee@example.com")
    .replaceAll("{{employeeId}}", "SEC-0001")
    .replaceAll("{{defaultPassword}}", "Emp@123")
    .replaceAll("{{loginUrl}}", "https://your-app.com/employee")
    .replaceAll("{{roleLabel}}", "Employee");

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-600">Loading template...</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSave}>
            {status.text && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  status.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {status.text}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-slate-700">Subject</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setStatus({ type: "", text: "" });
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleUseDefault}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                readOnly={!isEditing}
                className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ${
                  isEditing ? "bg-white focus:border-blue-500" : "bg-slate-50 text-slate-700"
                }`}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Message Content</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={14}
                readOnly={!isEditing}
                className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ${
                  isEditing ? "bg-white focus:border-blue-500" : "bg-slate-50 text-slate-700"
                }`}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Preview</label>
              <div className="mt-1 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                {previewText}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={saving || !isEditing}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={!isEditing}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
