import React from "react";

export default function ProfileSection({
  title = "Profile Settings",
  subtitle = "Manage your account settings and preferences",
  profile,
  loading,
  roleFallback,
  idValue,
  getInitials,
  uploadingPhoto,
  photoError,
  fileInputRef,
  onPhotoClick,
  onPhotoChange,
  closeButton,
}) {
  return (
    <>
      <div className="px-6 py-5 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>
          {closeButton ? closeButton : null}
        </div>
      </div>

      <div className="px-6 py-6 border-b flex items-center gap-4">
        <div className="relative">
          {profile?.profilePhoto ? (
            <img
              src={profile.profilePhoto}
              alt="Profile"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-700 text-white flex items-center justify-center rounded-full text-2xl font-semibold">
              {getInitials(profile?.name)}
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
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPhotoChange}
          />
        </div>

        <div>
          <div className="text-lg sm:text-xl font-semibold text-slate-800">
            {loading ? "Loading..." : profile?.name}
          </div>
          <p className="text-sm text-slate-500">{profile?.role || roleFallback}</p>
          {idValue ? (
            <p className="text-xs text-slate-400 mt-1">{idValue}</p>
          ) : null}
          {photoError ? <div className="text-xs text-red-500 mt-2">{photoError}</div> : null}
        </div>
      </div>
    </>
  );
}
