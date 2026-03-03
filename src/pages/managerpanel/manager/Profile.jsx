import React, { useEffect, useRef, useState } from "react";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { auth, db } from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

const defaultProfile = {
  name: "Manager",
  role: "Manager",
  managerId: "",
  email: "",
  city: "",
  state: "",
  profilePhoto: "",
};

export default function Profile() {
  const [profile, setProfile] = useState(defaultProfile);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);
  const photoInputId = "manager-profile-photo-input";

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const getInitials = (value) => {
    if (!value) return "M";
    const parts = value.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoadingProfile(false);
          return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile({
            name: data.fullName || data.name || user.displayName || "Manager",
            role: data.position || data.role || "Manager",
            managerId: data.managerId || data.employeeId || "",
            email: user.email || "",
            city: data.city || "",
            state: data.state || "",
            profilePhoto: data.profilePhoto || user.photoURL || "",
          });
        } else {
          setProfile({
            name: user.displayName || "Manager",
            role: "Manager",
            managerId: "",
            email: user.email || "",
            city: "",
            state: "",
            profilePhoto: user.photoURL || "",
          });
        }
      } catch {
        const user = auth.currentUser;
        setProfile({
          name: user?.displayName || "Manager",
          role: "Manager",
          managerId: "",
          email: user?.email || "",
          city: "",
          state: "",
          profilePhoto: user?.photoURL || "",
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const handlePhotoClick = () => {
    setPhotoError("");
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file.");
      return;
    }

    if (file.size > 1024 * 1024 * 2) {
      setPhotoError("Image is too large. Max 2MB.");
      return;
    }

    setUploadingPhoto(true);
    setPhotoError("");

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });

      setProfile((prev) => ({ ...prev, profilePhoto: dataUrl }));
    } catch (err) {
      const msg = err?.message || "Failed to upload photo";
      setPhotoError(msg);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setPasswordLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        setPasswordError("No user logged in");
        setPasswordLoading(false);
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setPasswordSuccess("✅ Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 5000);
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPasswordError("Current password is incorrect");
      } else if (err.code === "auth/weak-password") {
        setPasswordError("New password is too weak");
      } else if (err.code === "auth/requires-recent-login") {
        setPasswordError("Please logout and login again before changing password");
      } else {
        setPasswordError("Failed to change password. Please try again.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes elasticBounce {
          0% { transform: scaleX(0); }
          60% { transform: scaleX(1.15); }
          80% { transform: scaleX(0.95); }
          100% { transform: scaleX(1); }
        }
        .animate-elastic { animation: elasticBounce 0.35s ease-out forwards; }
      `}</style>

      <div className="w-full mx-auto space-y-10">
        <div className="bg-white border shadow-md rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Profile</h2>
              <p className="text-sm text-slate-500 mt-1">
                Manage your account settings and preferences
              </p>
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
              <label
                htmlFor={photoInputId}
                className="absolute -bottom-1 -right-1 bg-white shadow rounded-full p-1 cursor-pointer"
                title="Upload profile photo"
                aria-disabled={uploadingPhoto}
              >
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                  {uploadingPhoto ? "..." : "📷"}
                </div>
              </label>
              <input
                ref={fileInputRef}
                id={photoInputId}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <div className="flex-1">
              <div className="text-lg sm:text-xl font-semibold text-slate-800">
                {loadingProfile ? "Loading..." : profile.name}
              </div>
              <p className="text-sm text-slate-500">{profile.role || "Manager"}</p>
              {profile.managerId ? (
                <p className="text-xs text-slate-400 mt-1">{profile.managerId}</p>
              ) : null}
              {photoError ? (
                <div className="text-xs text-red-500 mt-2">{photoError}</div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="ml-auto px-4 py-2 border rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              Change Password
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Full Name</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 mt-1 bg-gray-100 text-gray-500"
                    value={profile.name}
                    disabled
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <input
                    type="email"
                    className="w-full border rounded-lg px-3 py-2 mt-1 bg-gray-100 text-gray-500"
                    value={profile.email}
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Manager ID</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 mt-1 bg-gray-100 text-gray-500"
                    value={profile.managerId}
                    disabled
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Role</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 mt-1 bg-gray-100 text-gray-500"
                    value={profile.role}
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">City</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 mt-1 bg-gray-100 text-gray-500"
                    value={profile.city}
                    disabled
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">State</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 mt-1 bg-gray-100 text-gray-500"
                    value={profile.state}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-start justify-between px-6 py-5 border-b">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Change Password</h3>
                <p className="text-sm text-slate-500 mt-1">Update your account password</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {passwordError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                  {passwordSuccess}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-700">Current Password</label>
                  <div className="relative mt-2">
                    <FaLock className="absolute left-3 top-3 mt-1 text-slate-400" />
                    <input
                      type={showCurrent ? "text" : "password"}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-5 py-3 rounded-xl text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? "Changing Password..." : "Change Password"}
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
