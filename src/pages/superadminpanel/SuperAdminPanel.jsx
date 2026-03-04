import React, { useEffect, useRef, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import SidebarSuperAdmin from "./SidebarSuperAdmin";
import NotificationBell from "../../components/notifications/NotificationBell";
import SuperDashboard from "./superadmin/Dashboard";
import SuperAdmins from "./superadmin/Admins";
import Employees from "./superadmin/Employees";
import Managers from "./superadmin/Managers";
import Services from "./superadmin/Services";
import Announcements from "./superadmin/Announcements";
import Activity from "./superadmin/Activity";
import MailTemplate from "./superadmin/MailTemplate";
import Testimonials from "./superadmin/Testimonials";
import WhyUs from "./superadmin/WhyUs";
import CompanyProfile from "./superadmin/companyprofile/CompanyProfile";
import NotificationsPage from "./superadmin/NotificationsPage";

import { FaBars, FaChevronDown, FaIdCard, FaSignOutAlt, FaUser } from "react-icons/fa";
import PageNotFound from "../PageNotFound";

export default function SuperAdminPanel() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const titleMap = {
    "/superadmin": "Dashboard",
    "/superadmin/": "Dashboard",
    "/superadmin/dashboard": "Dashboard",
    "/superadmin/employee": "Employee",
    "/superadmin/security-guard": "Security Guard",
    "/superadmin/admin": "Admin",
    "/superadmin/manager": "Manager",
    "/superadmin/services": "Services",
    "/superadmin/announcement": "Announcement",
    "/superadmin/activity": "Activity",
    "/superadmin/notifications": "Notifications",
    "/superadmin/mail-template": "Mail Template",
    "/superadmin/testimonials": "Testimonials",
    "/superadmin/whyus": "WhyUs",
    "/superadmin/profile": "Company Profile",
    "/superadmin/company-profile": "Company Profile",
  };
  const title = titleMap[location.pathname] || "Dashboard";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="admin-panel-font flex h-screen bg-gray-50">
      <SidebarSuperAdmin open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col">
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
              <p className="text-gray-500 text-sm">Welcome back, Super Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell role="superadmin" />

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 shadow-sm hover:bg-gray-100"
              >
                <FaUser className="text-blue-700" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-700">Super Admin</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <FaChevronDown className="text-gray-500 text-xs" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white shadow-lg z-50">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/superadmin/company-profile");
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

        <main className="p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<SuperDashboard />} />
            <Route path="/dashboard" element={<SuperDashboard />} />
            <Route path="/employee" element={<Employees />} />
            <Route
              path="/security-guard"
              element={<Employees forcedRoleFilter="security" forcedCreateRole="Security" />}
            />
            <Route path="/admin" element={<SuperAdmins />} />
            <Route path="/manager" element={<Managers />} />
            <Route path="/services" element={<Services />} />
            <Route path="/announcement" element={<Announcements actorRole="superadmin" />} />
            <Route path="/activity" element={<Activity />} />
            <Route
              path="/notifications"
              element={<NotificationsPage />}
            />
            <Route path="/mail-template" element={<MailTemplate />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/whyus" element={<WhyUs />} />
            <Route path="/profile" element={<CompanyProfile />} />
            <Route path="/company-profile" element={<CompanyProfile />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
