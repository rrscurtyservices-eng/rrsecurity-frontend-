import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { SIDEBAR_CONFIG } from "../../config/sidebar.config";

export default function Sidebar({ role, isCollapsed, onToggle }) {
  const location = useLocation();
  const config = SIDEBAR_CONFIG[role];

  if (!config) return null;

  const normalizePath = (path) => {
    if (!path) return "/";
    const trimmed = path.replace(/\/+$/, "");
    return trimmed || "/";
  };

  const stripBase = (path) => {
    const p = normalizePath(path);
    if (p === config.base) return "/";
    if (p.startsWith(`${config.base}/`)) return p.slice(config.base.length) || "/";
    return p;
  };

  const currentAbs = normalizePath(location.pathname);
  const currentLocal = normalizePath(stripBase(currentAbs));

  const isPathActive = (toPath) => {
    const itemAbs = normalizePath(toPath);
    const itemLocal = normalizePath(stripBase(itemAbs));

    if (itemLocal === "/") {
      return config.dashboardMatch(currentLocal);
    }

    return currentLocal === itemLocal || currentLocal.startsWith(`${itemLocal}/`);
  };

  const overlayClass = role === "superadmin" ? "bg-black/40" : "bg-black bg-opacity-40";
  const isOpen = !isCollapsed;

  return (
    <>
      {isOpen && (
        <div
          className={`fixed inset-0 ${overlayClass} z-20 md:hidden`}
          onClick={() => onToggle(false)}
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full bg-blue-800 text-white ${
          config.widthClass
        } shadow-xl z-30 transform
        transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b-[3px] border-blue-700">
          <div>
            <h1 className="text-lg font-semibold">{config.header.title}</h1>
            {config.header.subtitle ? (
              <p className="text-xs opacity-75">{config.header.subtitle}</p>
            ) : null}
          </div>

          <button
            className="md:hidden text-white text-xl"
            onClick={() => onToggle(false)}
          >
            <FaTimes />
          </button>
        </div>

        <div className={config.menuContainerClass}>
          {config.menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={config.useEndForBase && item.path === config.base}
              className={({ isActive }) => {
                const active =
                  isPathActive(item.path) || (config.useIsActive && isActive);
                return config.navItemClass(active);
              }}
              onClick={() => {
                if (window.innerWidth < 768) onToggle(false);
              }}
            >
              {config.iconWrap(item.icon)}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}
