import React, { useEffect, useMemo, useState } from "react";
import * as FaIcons from "react-icons/fa";
import {
  UserGroupIcon,
  ClockIcon,
  ComputerDesktopIcon,
  CurrencyDollarIcon,
  BoltIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/solid";
import { FaLightbulb } from "react-icons/fa";
import { API_URL } from "../api/employee";

const iconList = [
  <UserGroupIcon className="w-10 h-10 text-yellow-400" />,
  <ClockIcon className="w-10 h-10 text-yellow-400" />,
  <ComputerDesktopIcon className="w-10 h-10 text-yellow-400" />,
  <CurrencyDollarIcon className="w-10 h-10 text-yellow-400" />,
  <BoltIcon className="w-10 h-10 text-yellow-400" />,
  <DocumentTextIcon className="w-10 h-10 text-yellow-400" />,
  <BriefcaseIcon className="w-10 h-10 text-yellow-400" />,
  <Cog6ToothIcon className="w-10 h-10 text-yellow-400" />,
];
const getReasonIcon = (iconName, index) => {
  const Icon = FaIcons[iconName];
  if (Icon) {
    return <Icon className="h-10 w-10 text-yellow-400" />;
  }

  return iconList[index % iconList.length] || <FaLightbulb className="h-10 w-10 text-yellow-400" />;
};

export default function WhyUs() {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/whyus/public`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to load reasons");
        }
        const data = await res.json();
        setReasons(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Load public reasons failed:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visible = useMemo(() => reasons, [reasons]);

  return (
    <section id="whyus-section" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Why Choose Rama & Rama?</h2>
        <div className="w-16 h-1 bg-yellow-400 mx-auto mb-4 rounded"></div>
        <p className="text-gray-600 max-w-2xl mx-auto mb-12">We stand out in the security industry with our commitment to excellence, cutting-edge technology, and unwavering dedication to client safety.</p>

        {loading && (
          <div className="text-gray-500 text-sm">Loading reasons...</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {visible.map((f, i) => (
            <div key={f.id} className="bg-white rounded-2xl shadow-md hover:shadow-lg p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-[#0b2b7a] rounded-full p-4">{getReasonIcon(f.icon, i)}</div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="w-full bg-gradient-to-r from-[#1a3b9c] to-[#1742e5] text-center py-16 px-4 rounded-2xl shadow-lg mt-16">
          <h2 className="text-white text-3xl md:text-4xl font-semibold mb-4">Ready to Experience Superior Security?</h2>
          <p className="text-blue-100 text-lg md:text-xl mb-8 max-w-2xl mx-auto">Join hundreds of satisfied clients who trust Rama & Rama for their security needs.</p>
          <a href="#contact" className="bg-[#f2b705] hover:bg-[#e0a800] text-black font-medium py-3 px-8 rounded-md text-lg inline-block">Get Your Free Security Consultation</a>
        </div>
      </div>
    </section>
  );
}
