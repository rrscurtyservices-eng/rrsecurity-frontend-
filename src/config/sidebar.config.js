import React from "react";
import {
  FaTachometerAlt,
  FaUsers,
  FaUserTie,
  FaChartBar,
  FaHistory,
  FaShieldAlt,
  FaStar,
  FaCogs,
  FaUserClock,
  FaMapMarkerAlt,
  FaChartLine,
  FaBell,
  FaChartPie,
  FaUserShield,
  FaBuilding,
  FaGlobe,
  FaBullhorn,
  FaClipboardList,
} from "react-icons/fa";

const adminDashboardMatch = (currentLocal) =>
  currentLocal === "/" ||
  currentLocal === "/dashboard" ||
  currentLocal.startsWith("/dashboard/");

const defaultDashboardMatch = adminDashboardMatch;

const superAdminDashboardMatch = (currentLocal) =>
  currentLocal === "/" || currentLocal === "/dashboard";

export const SIDEBAR_CONFIG = {
  admin: {
    base: "/admin",
    widthClass: "w-64",
    header: {
      title: "Rama & Rama",
      subtitle: "Admin Panel",
    },
    menuContainerClass: "mt-4 space-y-1",
    navItemClass: (active) =>
      `flex items-center space-x-3 px-5 py-3 text-sm font-medium rounded-lg w-full ${
        active
          ? "bg-blue-600 border-l-4 border-white"
          : "hover:bg-blue-700/60 border-l-4 border-transparent"
      }`,
    useIsActive: true,
    useEndForBase: false,
    dashboardMatch: adminDashboardMatch,
    iconWrap: (icon) => icon,
    menuItems: [
      { name: "Dashboard", icon: React.createElement(FaTachometerAlt), path: "/admin" },
      { name: "Employees", icon: React.createElement(FaUsers), path: "/admin/employees" },
      { name: "Managers", icon: React.createElement(FaUserTie), path: "/admin/managers" },
      { name: "Reports", icon: React.createElement(FaChartBar), path: "/admin/reports" },
      { name: "Activity", icon: React.createElement(FaHistory), path: "/admin/activity" },
      { name: "Services", icon: React.createElement(FaShieldAlt), path: "/admin/services" },
      { name: "Testimonials", icon: React.createElement(FaStar), path: "/admin/testimonials" },
      { name: "Why Us", icon: React.createElement(FaStar), path: "/admin/whyus" },
      { name: "Settings", icon: React.createElement(FaCogs), path: "/admin/settings" },
    ],
  },
  manager: {
    base: "/manager",
    widthClass: "w-64",
    header: {
      title: "Rama & Rama",
    },
    menuContainerClass: "mt-4 space-y-1",
    navItemClass: (active) =>
      `flex items-center space-x-3 px-5 py-3 text-sm font-medium rounded-lg w-full ${
        active
          ? "bg-blue-600 border-l-4 border-white"
          : "hover:bg-blue-700/60 border-l-4 border-transparent"
      }`,
    useIsActive: false,
    useEndForBase: true,
    dashboardMatch: defaultDashboardMatch,
    iconWrap: (icon) => icon,
    menuItems: [
      { name: "Dashboard", icon: React.createElement(FaTachometerAlt), path: "/manager" },
      { name: "Attendance", icon: React.createElement(FaUserClock), path: "/manager/attendance" },
      { name: "Location", icon: React.createElement(FaMapMarkerAlt), path: "/manager/location" },
      { name: "Employees", icon: React.createElement(FaUsers), path: "/manager/employees" },
      { name: "Reports", icon: React.createElement(FaChartLine), path: "/manager/reports" },
      { name: "Activity", icon: React.createElement(FaHistory), path: "/manager/activity" },
      { name: "Announcements", icon: React.createElement(FaBell), path: "/manager/announcements" },
    ],
  },
  employee: {
    base: "/employee",
    widthClass: "w-64",
    header: {
      title: "Rama & Rama",
      subtitle: "Employee Panel",
    },
    menuContainerClass: "mt-4 space-y-1",
    navItemClass: (active) =>
      `flex items-center space-x-3 px-5 py-3 text-sm font-medium rounded-lg w-full ${
        active
          ? "bg-blue-600 border-l-4 border-white"
          : "hover:bg-blue-700/60 border-l-4 border-transparent"
      }`,
    useIsActive: false,
    useEndForBase: true,
    dashboardMatch: defaultDashboardMatch,
    iconWrap: (icon) => icon,
    menuItems: [
      { name: "Dashboard", icon: React.createElement(FaChartPie), path: "/employee" },
      { name: "My Attendance", icon: React.createElement(FaUserClock), path: "/employee/myattendance" },
    ],
  },
  superadmin: {
    base: "/superadmin",
    widthClass: "w-72",
    header: {
      title: "Rama & Rama",
      subtitle: "Super Admin",
    },
    menuContainerClass: "mt-4 space-y-1 px-2",
    navItemClass: (active) =>
      `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg ${
        active
          ? "bg-blue-600 border-l-4 border-white"
          : "hover:bg-blue-700/60 border-l-4 border-transparent"
      }`,
    useIsActive: false,
    useEndForBase: true,
    dashboardMatch: superAdminDashboardMatch,
    iconWrap: (icon) => React.createElement("span", { className: "text-base" }, icon),
    menuItems: [
      { name: "Dashboard", icon: React.createElement(FaTachometerAlt), path: "/superadmin" },
      { name: "Admins", icon: React.createElement(FaUserShield), path: "/superadmin/admins" },
      { name: "Managers", icon: React.createElement(FaUserTie), path: "/superadmin/managers" },
      { name: "Employees", icon: React.createElement(FaUsers), path: "/superadmin/guards" },
      { name: "Company Details", icon: React.createElement(FaBuilding), path: "/superadmin/company" },
      { name: "Website Content", icon: React.createElement(FaGlobe), path: "/superadmin/content" },
      { name: "Announcements", icon: React.createElement(FaBullhorn), path: "/superadmin/announcements" },
      { name: "Notifications", icon: React.createElement(FaBell), path: "/superadmin/notifications" },
      { name: "Reports", icon: React.createElement(FaChartBar), path: "/superadmin/reports" },
      { name: "Activity Logs", icon: React.createElement(FaClipboardList), path: "/superadmin/logs" },
    ],
  },
};
