import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import {
  FaTachometerAlt,
  FaUsers,
  FaUserShield,
  FaUserTie,
  FaShieldAlt,
  FaBullhorn,
  FaHistory,
  FaStar,
  FaEnvelope,
  FaTimes,
} from "react-icons/fa";
import { db } from "../../firebase";
import { COLLECTIONS, SETTINGS_DOCS } from "../../services/collections";

export default function SidebarSuperAdmin({ open, setOpen }) {
  const location = useLocation();
  const current = location.pathname;
  const [branding, setBranding] = useState({
    logoUrl: "",
    companyName: "Security Services",
    tagline: "Super Admin Console",
  });

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const [brandingSnap, companySnap] = await Promise.all([
          getDoc(doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOCS.BRANDING)),
          getDoc(doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOCS.COMPANY_INFO)),
        ]);

        setBranding({
          logoUrl: brandingSnap.exists() ? brandingSnap.data()?.logoUrl || "" : "",
          companyName:
            (companySnap.exists() ? companySnap.data()?.companyName : "") || "Security Services",
          tagline:
            (brandingSnap.exists() ? brandingSnap.data()?.tagline : "") || "Super Admin Console",
        });
      } catch (error) {
        console.error("Failed to load branding:", error);
      }
    };

    loadBranding();
  }, []);

  const menuItems = [
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/superadmin" },
    { name: "Employee", icon: <FaUsers />, path: "/superadmin/employee" },
    { name: "Admin", icon: <FaUserShield />, path: "/superadmin/admin" },
    { name: "Manager", icon: <FaUserTie />, path: "/superadmin/manager" },
    { name: "Services", icon: <FaShieldAlt />, path: "/superadmin/services" },
    { name: "Announcement", icon: <FaBullhorn />, path: "/superadmin/announcement" },
    { name: "Activity", icon: <FaHistory />, path: "/superadmin/activity" },
    { name: "Mail Template", icon: <FaEnvelope />, path: "/superadmin/mail-template" },
    { name: "Testimonials", icon: <FaStar />, path: "/superadmin/testimonials" },
    { name: "WhyUs", icon: <FaStar />, path: "/superadmin/whyus" },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full bg-blue-800 text-white w-64 shadow-xl z-30 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-blue-700">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-700">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt="Company logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-base font-semibold text-white">RR</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-white">
                {branding.companyName}
              </h1>
              <p className="truncate text-xs opacity-75">Super Admin Panel</p>
            </div>
          </div>
          <button className="md:hidden text-white text-xl" onClick={() => setOpen(false)}>
            <FaTimes />
          </button>
        </div>

        <div className="mt-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 px-5 py-3 text-sm font-medium rounded-lg ${
                current === item.path
                  ? "bg-blue-600"
                  : "hover:bg-blue-700/60"
              }`}
              onClick={() => {
                if (window.innerWidth < 768) setOpen(false);
              }}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
