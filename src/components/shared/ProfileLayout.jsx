import React from "react";
import { FaTimes, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

export default function ProfileLayout({
  title = "Profile",
  subtitle = "Manage your account settings and preferences",
  profile,
  loadingProfile = false,
  loadingLabel = "Loading...",
  roleFallback = "",
  idValue,
  photoError,
  uploadingPhoto,
  onPhotoClick,
  onPhotoChange,
  getInitials,
  onOpenPassword,
  fields,
  fileInputRef,
  passwordModal,
}) {
  return (
    <>
      <div className="w-full mx-auto space-y-10">
        <div className="bg-white border shadow-md rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
                <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600" type="button">
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="px-6 py-6 border-b flex items-center gap-4">
            <div className="relative">
              {profile.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt="Profile"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-700 text-white flex items-center justify-center rounded-full text-2xl font-semibold">
                  {getInitials(profile.name)}
                </div>
              )}
              <button
                type="button"
                onClick={onPhotoClick}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 bg-white shadow rounded-full p-1"
                title="Upload profile photo"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                  {uploadingPhoto ? "..." : "📷"}
                </div>
              </button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={onPhotoChange}
              />
            </div>

            <div className="flex-1">
              <div className="text-lg sm:text-xl font-semibold text-slate-800">
                {loadingProfile ? loadingLabel : profile.name}
              </div>
              <p className="text-sm text-slate-500">{profile.role || roleFallback}</p>
              {idValue ? <p className="text-xs text-slate-400 mt-1">{idValue}</p> : null}
              {photoError ? <div className="text-xs text-red-500 mt-2">{photoError}</div> : null}
            </div>

            <button
              type="button"
              onClick={onOpenPassword}
              className="ml-auto px-4 py-2 border rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              Change Password
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {fields.map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {row.map((field) => (
                    <div key={field.label}>
                      <label className="text-sm text-gray-600">{field.label}</label>
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 mt-1 bg-gray-100 text-gray-500"
                        value={field.value}
                        disabled
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {passwordModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className={`w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 ${passwordModal.translateClass || ""}`}>
            <div className="flex items-start justify-between px-6 py-5 border-b">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Change Password</h3>
                <p className="text-sm text-slate-500 mt-1">Update your account password</p>
              </div>
              <button
                type="button"
                onClick={passwordModal.onClose}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6">
              {passwordModal.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {passwordModal.error}
                </div>
              )}

              {passwordModal.success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                  {passwordModal.success}
                </div>
              )}

              <form onSubmit={passwordModal.onSubmit} className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700">Current Password</label>
                  <div className="relative mt-2">
                    <FaLock className="absolute left-3 top-3 mt-1 text-slate-400" />
                    <input
                      type={passwordModal.showCurrent ? "text" : "password"}
                      placeholder="Enter current password"
                      value={passwordModal.currentPassword}
                      onChange={(e) => passwordModal.setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => passwordModal.setShowCurrent(!passwordModal.showCurrent)}
                      className="absolute right-3 top-3 text-slate-500 text-lg"
                    >
                      {passwordModal.showCurrent ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">New Password</label>
                  <div className="relative mt-2">
                    <FaLock className="absolute left-3 top-3 mt-1 text-slate-400" />
                    <input
                      type={passwordModal.showNew ? "text" : "password"}
                      placeholder="Enter new password"
                      value={passwordModal.newPassword}
                      onChange={(e) => passwordModal.setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => passwordModal.setShowNew(!passwordModal.showNew)}
                      className="absolute right-3 top-3 text-slate-500 text-lg"
                    >
                      {passwordModal.showNew ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Password must be at least 6 characters long</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
                  <div className="relative mt-2">
                    <FaLock className="absolute left-3 top-3 mt-1 text-slate-400" />
                    <input
                      type={passwordModal.showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={passwordModal.confirmPassword}
                      onChange={(e) => passwordModal.setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => passwordModal.setShowConfirm(!passwordModal.showConfirm)}
                      className="absolute right-3 top-3 text-slate-500 text-lg"
                    >
                      {passwordModal.showConfirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={passwordModal.onClose}
                    className="px-5 py-3 rounded-xl text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordModal.loading}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordModal.loading ? "Changing Password..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
