import React, { useEffect, useMemo, useState } from "react";
import * as FaIcons from "react-icons/fa";
import { StarIcon } from "@heroicons/react/24/solid";
import { FaUserCircle } from "react-icons/fa";
import { API_URL } from "../api/employee";

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/testimonials/public`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to load testimonials");
        }
        const data = await res.json();
        setTestimonials(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Load public testimonials failed:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visible = useMemo(() => testimonials, [testimonials]);
  const getTestimonialIcon = (iconName) => {
    const Icon = FaIcons[iconName] || FaUserCircle;
    return <Icon className="h-6 w-6 text-white" />;
  };

  return (
    <section id="testimonials-section" className="bg-[#0b2b7a] text-white py-16 px-6 md:px-12">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-2">What Our Clients Say</h2>
        <div className="w-16 h-1 bg-yellow-400 mx-auto mb-10 rounded-full"></div>

        {loading && (
          <div className="text-gray-200 text-sm">Loading testimonials...</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((t) => (
            <div
              key={t.id}
              className="bg-[#163d9a] rounded-xl p-6 text-left flex flex-col justify-between hover:bg-[#1b47b8] transform hover:-translate-y-2 transition-all duration-300 shadow-lg hover:shadow-2xl"
            >
              <div className="flex mb-4">
                {[...Array(Number(t.rating || 0))].map((_, j) => (
                  <StarIcon key={j} className="w-5 h-5 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-100 italic mb-6 leading-relaxed">"{t.review}"</p>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-base">
                  {getTestimonialIcon(t.icon)}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm md:text-base">{t.name}</div>
                  <div className="text-gray-300 text-xs md:text-sm">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
