import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, useLocation, Link, useNavigate } from "react-router-dom";


import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

import Sidebar from "../../components/employeepanel/Sidebar";

import MyAttendance from "./employee/MyAttendance";
import Settings from "./employee/settings/Setttings";
import Dashboard from "./employee/Dashboard";
import PageNotFound from "../PageNotFound";
import { loadAnnouncements } from "../../utils/announcementStore";

// icons
import {
  FaBars,
  FaBell,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

export default function EmployeePanel() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const location = useLocation();

  // 🔐 LOGOUT FUNCTION
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/employee/login");
    } catch (err) {
      alert("Logout failed");
      console.error(err);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function onDoc(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const load = () => setAnnouncements(loadAnnouncements());
    load();
    const handler = () => load();
    window.addEventListener("announcements:update", handler);
    return () => window.removeEventListener("announcements:update", handler);
  }, []);

  // Header title map
  const titleMap = {
    "/employee": "Dashboard",
    "/employee/": "Dashboard",
    "/employee/dashboard": "Dashboard",
    "/employee/myattendance": "My Attendance",
    "/employee/settings": "Settings",
  };
  const title = titleMap[location.pathname] || "Dashboard";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 rounded-md text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars />
            </button>

            <div>
              <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
              <p className="text-sm text-gray-500">Welcome back, Employee</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div ref={notificationRef} className="relative">
              <button
                onClick={() => setNotificationOpen((p) => !p)}
                className="relative p-2 rounded-full border bg-white text-gray-700 hover:bg-gray-50"
                aria-label="Notifications"
              >
                <FaBell />
                {announcements.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-4 h-4 min-w-[16px] px-1 rounded-full text-center">
                    {announcements.length}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border rounded-md shadow z-50">
                  <div className="px-4 py-2 border-b text-sm font-semibold">Notifications</div>
                  <div className="max-h-80 overflow-auto">
                    {announcements.length === 0 && (
                      <div className="px-4 py-6 text-sm text-gray-500">No announcements</div>
                    )}
                    {announcements.map((item) => (
                      <div key={item.id} className="px-4 py-3 border-b last:border-b-0">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-800">{item.title}</div>
                          <div className="text-xs text-gray-400">{item.date}</div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{item.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((p) => !p)}
                className="flex items-center gap-2 px-3 py-2 bg-white border rounded-full"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  E
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold">Employee</p>
                  <p className="text-xs text-gray-500">Staff</p>
                </div>
                {profileOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow z-50">
                  <Link
                    to="/employee/settings"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    Settings
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/myattendance" element={<MyAttendance />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
