import React, { useMemo, useState } from "react";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

export default function FirstLoginSetup({ role, profile, onCompleted }) {
  const [step, setStep] = useState(profile?.mustChangePassword ? "password" : "profile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminForm, setAdminForm] = useState({
    fullName: profile?.fullName || profile?.name || "",
    age: profile?.age === undefined || profile?.age === null ? "" : String(profile.age),
    gender: profile?.gender || "",
    profileRole: profile?.profileRole || profile?.jobRole || "Admin",
    phone: profile?.phone || "",
    email: profile?.email || auth.currentUser?.email || "",
    aadhaarNumber: profile?.aadhaarNumber || "",
    city: profile?.city || "",
    state: profile?.state || "",
  });

  const roleLabel = useMemo(() => {
    if (role === "admin") return "Admin";
    if (role === "manager") return "Manager";
    return "Employee";
  }, [role]);

  const canSaveAdminProfile = useMemo(() => {
    const phone = String(adminForm.phone || "").trim();
    return (
      String(adminForm.fullName || "").trim() &&
      String(adminForm.gender || "").trim() &&
      /^\d{10,15}$/.test(phone) &&
      String(adminForm.city || "").trim() &&
      String(adminForm.state || "").trim()
    );
  }, [adminForm]);

  const handlePasswordSave = async () => {
    setError("");
    setSuccess("");
    if (!password || password.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and confirmation do not match.");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");

      await updatePassword(user, password);
      await updateDoc(doc(db, "users", user.uid), {
        mustChangePassword: false,
        updatedAt: new Date(),
      });

      setSuccess("Password updated successfully.");
      setStep("profile");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setError(
        err?.code === "auth/requires-recent-login"
          ? "Please login again and retry password change."
          : "Failed to update password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminProfileSave = async () => {
    setError("");
    setSuccess("");
    if (!canSaveAdminProfile) {
      setError("Fill required fields. Phone must be 10-15 digits.");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");

      await updateDoc(doc(db, "users", user.uid), {
        name: adminForm.fullName.trim(),
        fullName: adminForm.fullName.trim(),
        age: adminForm.age === "" ? null : Number(adminForm.age),
        gender: adminForm.gender.trim(),
        profileRole: adminForm.profileRole.trim() || "Admin",
        jobRole: adminForm.profileRole.trim() || "Admin",
        phone: String(adminForm.phone).trim(),
        email: String(adminForm.email).trim().toLowerCase(),
        aadhaarNumber: String(adminForm.aadhaarNumber).trim(),
        city: adminForm.city.trim(),
        state: adminForm.state.trim(),
        profileCompleted: true,
        updatedAt: new Date(),
      });

      setSuccess("Profile details saved.");
      onCompleted?.({
        ...profile,
        ...adminForm,
        name: adminForm.fullName.trim(),
        fullName: adminForm.fullName.trim(),
        mustChangePassword: false,
        profileCompleted: true,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to save profile details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow border p-6 space-y-5">
        <h1 className="text-2xl font-semibold">{roleLabel} First Login Setup</h1>
        <p className="text-sm text-gray-600">
          Complete password and personal information setup before accessing dashboard.
        </p>

        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
        {success && (
          <div className="text-sm text-green-700 bg-green-50 p-3 rounded">{success}</div>
        )}

        {step === "password" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">New Password</label>
              <input
                type="password"
                className="w-full mt-1 border rounded p-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Confirm Password</label>
              <input
                type="password"
                className="w-full mt-1 border rounded p-3"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="button"
              onClick={handlePasswordSave}
              disabled={loading}
              className="bg-black text-white px-4 py-2 rounded"
            >
              {loading ? "Saving..." : "Save Password"}
            </button>
          </div>
        )}

        {step === "profile" && role === "admin" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Full Name</label>
              <input
                type="text"
                className="w-full mt-1 border rounded p-3"
                value={adminForm.fullName}
                onChange={(e) => setAdminForm((f) => ({ ...f, fullName: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Age</label>
              <input
                type="number"
                min="18"
                className="w-full mt-1 border rounded p-3"
                value={adminForm.age}
                onChange={(e) => setAdminForm((f) => ({ ...f, age: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Gender</label>
              <select
                className="w-full mt-1 border rounded p-3"
                value={adminForm.gender}
                onChange={(e) => setAdminForm((f) => ({ ...f, gender: e.target.value }))}
                disabled={loading}
              >
                <option value="">-- Select Gender --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Role</label>
              <input
                type="text"
                className="w-full mt-1 border rounded p-3 bg-gray-100"
                value={adminForm.profileRole}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input
                type="text"
                className="w-full mt-1 border rounded p-3"
                value={adminForm.phone}
                onChange={(e) =>
                  setAdminForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))
                }
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                className="w-full mt-1 border rounded p-3 bg-gray-100"
                value={adminForm.email}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Aadhaar Number</label>
              <input
                type="text"
                className="w-full mt-1 border rounded p-3"
                value={adminForm.aadhaarNumber}
                onChange={(e) =>
                  setAdminForm((f) => ({
                    ...f,
                    aadhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12),
                  }))
                }
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">City</label>
              <input
                type="text"
                className="w-full mt-1 border rounded p-3"
                value={adminForm.city}
                onChange={(e) => setAdminForm((f) => ({ ...f, city: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">State</label>
              <input
                type="text"
                className="w-full mt-1 border rounded p-3"
                value={adminForm.state}
                onChange={(e) => setAdminForm((f) => ({ ...f, state: e.target.value }))}
                disabled={loading}
              />
            </div>
            <button
              type="button"
              onClick={handleAdminProfileSave}
              disabled={loading}
              className="bg-black text-white px-4 py-2 rounded"
            >
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}

        {step === "profile" && role !== "admin" && (
          <div className="text-sm text-gray-600">
            Profile setup for this role is not available in this build.
          </div>
        )}
      </div>
    </div>
  );
}
