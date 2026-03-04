// import React from "react";

// export default function Security() {
//   return (
//     <div>
//       <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
//       <p className="text-gray-500 mb-4">
//         Configure password policies, 2FA, and access restrictions.
//       </p>

//       <div className="bg-gray-50 border rounded-lg p-6">
//         <p className="text-sm text-gray-600">
//           (Add security settings UI here… password rules, 2FA setup.)
//         </p>
//       </div>
//     </div>
//   );
// }


import React, { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../../../firebase";

export default function Security({
  embedded = false,
  buttonOnly = false,
  forceOpen = false,
  onOpen,
  onClose,
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(!embedded);
  const visible = embedded ? forceOpen : showForm;

  const openEmbedded = () => {
    if (embedded) {
      onOpen?.();
      return;
    }
    setShowForm(true);
  };

  const closeEmbedded = () => {
    if (embedded) {
      onClose?.();
      return;
    }
    setShowForm(false);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!currentPassword) {
      showToast("error", "Old password is required.");
      return;
    }

    if (newPassword.length < 6) {
      showToast("error", "New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("error", "Confirm password must match new password.");
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      showToast("error", "No authenticated user found.");
      return;
    }

    try {
      setSaving(true);
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      await setDoc(
        doc(db, "users", user.uid),
        {
          mustChangePassword: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("success", "Password updated successfully.");
    } catch (err) {
      console.error("Password update failed:", err);
      if (err?.code === "auth/requires-recent-login") {
        showToast("error", "Please log in again, then retry password update.");
      } else if (err?.code === "auth/weak-password") {
        showToast("error", "Password is too weak.");
      } else if (
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/invalid-credential"
      ) {
        showToast("error", "Old password is incorrect.");
      } else {
        showToast("error", "Failed to update password.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="text-slate-700">
      {toast && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      {!embedded && (
        <div className="flex items-start gap-3 mb-6">
          <div className="text-indigo-600 bg-indigo-100 p-2 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3l7 4v5c0 5-3.8 9.4-7 10-3.2-.6-7-5-7-10V7l7-4z"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">Security Settings</h2>
            <p className="text-gray-500 mt-1">
              Manage security and access control
            </p>
          </div>
        </div>
      )}

      {buttonOnly && embedded && !forceOpen && (
        <div className="flex justify-end lg:justify-start">
          <button
            type="button"
            onClick={openEmbedded}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700"
          >
            Change Password
          </button>
        </div>
      )}

      {visible && !buttonOnly && (
        <>
          <div
            className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${embedded ? "w-full" : "mb-8"}`}
          >
            <h3 className="mb-5 text-lg font-semibold text-slate-900">
              Change Password
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Old Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter old password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                  New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              {embedded && (
                <button
                  type="button"
                  onClick={() => {
                    closeEmbedded();
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setToast(null);
                  }}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
              <button
                className="flex items-center gap-2 rounded-xl bg-indigo-900 px-5 py-2.5 text-white shadow transition hover:opacity-95 disabled:opacity-60"
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
                  <path
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>

                {saving ? "Saving..." : "Save Password"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
