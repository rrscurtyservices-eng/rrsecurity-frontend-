import React, { useEffect, useMemo, useState } from "react";
import * as FaIcons from "react-icons/fa";
import {
  BuildingOfficeIcon,
  HomeModernIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  TruckIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import { API_URL } from "../api/employee";

const iconMap = {
  corporate: <BuildingOfficeIcon className="w-12 h-12 text-[#0b2b7a]" />,
  residential: <HomeModernIcon className="w-12 h-12 text-[#0b2b7a]" />,
  event: <ShieldCheckIcon className="w-12 h-12 text-[#0b2b7a]" />,
  personal: <UserGroupIcon className="w-12 h-12 text-[#0b2b7a]" />,
  logistics: <TruckIcon className="w-12 h-12 text-[#0b2b7a]" />,
  institutional: <AcademicCapIcon className="w-12 h-12 text-[#0b2b7a]" />,
};
const LEGACY_SERVICE_ICONS = {
  userShield: "FaUserShield",
  shield: "FaShieldAlt",
  lock: "FaLock",
  briefcase: "FaBriefcase",
  building: "FaBuilding",
  bell: "FaBell",
  eye: "FaEye",
  fingerprint: "FaFingerprint",
  key: "FaKey",
  search: "FaSearch",
  tools: "FaTools",
  users: "FaUsers",
  video: "FaVideo",
  warehouse: "FaWarehouse",
};

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/services/public`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to load services");
        }
        const data = await res.json();
        setServices(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Load public services failed:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visible = useMemo(() => services, [services]);
  const getServiceIcon = (service) => {
    const iconName = LEGACY_SERVICE_ICONS[service.icon] || service.icon;
    if (iconName && FaIcons[iconName]) {
      const Icon = FaIcons[iconName];
      return <Icon className="h-12 w-12 text-[#0b2b7a]" />;
    }

    const key = (service.category || "").toLowerCase();
    return iconMap[key] || <ShieldCheckIcon className="w-12 h-12 text-[#0b2b7a]" />;
  };

  return (
    <section id="services" data-nav-section="services" className="bg-white py-16 px-6 md:px-12">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0b2b7a] mb-3">Our Security Services</h2>
        <div className="w-20 h-1 bg-yellow-400 mx-auto mb-6 rounded"></div>
        <p className="text-gray-600 max-w-2xl mx-auto mb-12">Comprehensive security solutions designed to protect your business, property, and peace of mind.</p>

        {loading && (
          <div className="text-gray-500 text-sm">Loading services...</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {visible.map((s) => {
            const icon = getServiceIcon(s);
            return (
              <div key={s.id} className="border border-gray-200 rounded-2xl p-8 text-center hover:shadow-lg transition">
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt={s.name || "Service"}
                    className="w-full h-44 object-cover rounded-xl mb-6"
                    loading="lazy"
                  />
                ) : (
                  <div className="bg-blue-50 p-5 rounded-full inline-block mb-6">{icon}</div>
                )}
                <h3 className="text-xl font-semibold text-[#0b2b7a] mb-3">{s.name}</h3>
                <p className="text-gray-600">{s.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
