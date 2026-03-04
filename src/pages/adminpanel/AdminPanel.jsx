import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import SidebarAdmin from "./SidebarAdmin";
import FirstLoginSetup from "../../components/onboarding/FirstLoginSetup";
import NotificationBell from "../../components/notifications/NotificationBell";

import Dashboard from "../../pages/adminpanel/admin/Dashboard";
import Employees from "../../pages/adminpanel/admin/Employees";
import Managers from "../../pages/adminpanel/admin/Managers";
import Reports from "../../pages/adminpanel/admin/Reports";
import Activity from "../../pages/adminpanel/admin/Activity";
import Announcements from "../../pages/adminpanel/admin/Announcements";
import AdminProfile from "../../pages/adminpanel/admin/Profile";
import NotificationsPage from "./admin/NotificationsPage";

import {
  FaBars,
  FaUser,
  FaChevronDown,
  FaSignOutAlt,
  FaIdCard,
} from "react-icons/fa";

import PageNotFound from "../PageNotFound";

// OPTIONAL tutorial steps
const steps = [];

export default function AdminPanel() {
  const [stepIndex] = useState(steps.length);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // PAGE TITLE
  const titleMap = {
    "/admin": "Dashboard",
    "/admin/": "Dashboard",
    "/admin/dashboard": "Dashboard",
    "/admin/employees": "Employee",
    "/admin/security-guard": "Security Guard",
    "/admin/managers": "Managers",
    "/admin/reports": "Reports",
    "/admin/activity": "Activity",
    "/admin/announcements": "Announcements",
    "/admin/notifications": "Notifications",
    "/admin/profile": "Profile",
  };

  const title = titleMap[location.pathname] || "Dashboard";
  const adminDisplayName =
    profileData?.fullName || profileData?.name || auth.currentUser?.displayName || "Admin";

  // LOGOUT
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login"); // Back to shared login
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // CLOSE PROFILE DROPDOWN ON OUTSIDE CLICK
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          setShowSetup(true);
          setProfileData(null);
          return;
        }
        const data = snap.data();
        setProfileData(data);
        const mustSetup = Boolean(data?.mustChangePassword) || !data?.profileCompleted;
        setShowSetup(mustSetup);
      } catch (err) {
        console.error("Failed to load admin profile:", err);
        setShowSetup(false);
      } finally {
        setProfileLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // OPTIONAL TUTORIAL MODE
  if (stepIndex < steps.length) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <h2>Admin Tutorial Step {stepIndex + 1}</h2>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <h2>Loading...</h2>
      </div>
    );
  }

  if (showSetup) {
    return (
      <FirstLoginSetup
        role="admin"
        profile={profileData}
        onCompleted={(updated) => {
          setProfileData(updated);
          setShowSetup(false);
        }}
      />
    );
  }

  return (
    <div className="admin-panel-font flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <SidebarAdmin open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col">
        {/* HEADER */}
        <header className="flex items-center justify-between px-6 py-3 border-b bg-white">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-md text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars />
            </button>

            <div>
              <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
              <p className="text-gray-500 text-sm">Welcome back, {adminDisplayName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell role="admin" />

            {/* PROFILE MENU */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 shadow-sm hover:bg-gray-100"
              >
                <FaUser className="text-blue-700" />

                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-700">{adminDisplayName}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>

                <FaChevronDown className="text-gray-500 text-xs" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white shadow-lg z-50">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/admin/profile");
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    <FaIdCard />
                    Profile
                  </button>

                  <hr />

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <FaSignOutAlt />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/employees" element={<Employees />} />
            <Route
              path="/security-guard"
              element={<Employees forcedRoleFilter="security" forcedCreateRole="Security" />}
            />
            <Route path="/managers" element={<Managers />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/activity" element={<Activity />} />

            <Route path="/announcements" element={<Announcements actorRole="admin" />} />
            <Route
              path="/notifications"
              element={<NotificationsPage />}
            />
            <Route path="/profile" element={<AdminProfile />} />

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
