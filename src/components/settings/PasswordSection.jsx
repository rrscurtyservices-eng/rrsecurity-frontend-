import React from "react";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

export default function PasswordSection({
  showCurrent,
  setShowCurrent,
  showNew,
  setShowNew,
  showConfirm,
  setShowConfirm,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  success,
  onSubmit,
  submitLoading,
  submitLabel = "Change Password",
  loadingLabel = "Changing Password...",
  containerClassName = "bg-white rounded-2xl p-6 shadow-sm border",
  inputClassName = "w-full pl-10 pr-12 py-3 border rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
}) {
  return (
    <div className={containerClassName}>
      <h3 className="text-lg font-semibold text-slate-800">Change Password</h3>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
          {success}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <div>
          <label className="text-sm font-medium text-slate-700">Current Password</label>
          <div className="relative mt-2">
            <FaLock className="absolute left-3 top-3 mt-1 text-slate-400" />
            <input
              type={showCurrent ? "text" : "password"}
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-3 text-slate-500 text-lg"
            >
              {showCurrent ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">New Password</label>
          <div className="relative mt-2">
            <FaLock className="absolute left-3 top-3 mt-1 text-slate-400" />
            <input
              type={showNew ? "text" : "password"}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-3 text-slate-500 text-lg"
            >
              {showNew ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">Password must be at least 6 characters long</p>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
          <div className="relative mt-2">
            <FaLock className="absolute left-3 top-3 mt-1 text-slate-400" />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-3 text-slate-500 text-lg"
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitLoading}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitLoading ? loadingLabel : submitLabel}
        </button>
      </form>
    </div>
  );
}
