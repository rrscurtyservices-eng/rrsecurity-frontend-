import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { FaBars, FaChevronDown, FaSignOutAlt, FaUser } from "react-icons/fa";

import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

import Sidebar from "../../components/common/Sidebar";
import NotificationBell from "../../components/NotificationBell";

import Dashboard from "./manager/Dashboard";
import Attendance from "./manager/Attendance";
import Location from "./manager/Location";
import Employees from "./manager/Employees";
import Reports from "./manager/Reports";
import Announcements from "./manager/Announcements";
import Profile from "./manager/Profile";
import Activity from "./manager/Activity";
import PageNotFound from "../PageNotFound";

export default function ManagerPanel() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/manager/login");
    } catch {
      alert("Logout failed");
    }
  };

  useEffect(() => {
    const close = () => {
      setProfileOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const pageTitles = {
    "/manager": "Dashboard",
    "/manager/attendance": "Attendance",
    "/manager/location": "Location",
    "/manager/employees": "Employees",
    "/manager/reports": "Reports",
    "/manager/activity": "Activity",
    "/manager/announcements": "Announcements",
    "/manager/profile": "Profile",
  };

  const currentTitle = pageTitles[location.pathname] || "Dashboard";

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="manager" isCollapsed={!sidebarOpen} onToggle={setSidebarOpen} />

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-6 py-3 border-b bg-white">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <FaBars />
            </button>
            <div>
              <h1 className="text-2xl font-semibold">{currentTitle}</h1>
              <p className="text-sm text-gray-500">Welcome back, Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setProfileOpen((p) => !p)}
                className="flex items-center gap-2 border px-3 py-2 rounded-md"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold">
                  <FaUser />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Manager</p>
                  <p className="text-xs text-gray-500">Staff</p>
                </div>
                <FaChevronDown />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border shadow z-50">
                  <button
                    className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100"
                    onClick={() => navigate("/manager/profile")}
                    type="button"
                  >
                    My Profile
                  </button>
                  <hr />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/location" element={<Location />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
