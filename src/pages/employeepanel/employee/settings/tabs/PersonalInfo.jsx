// src/pages/employee/settings/PersonalInfo.jsx
import React, { useState, useEffect } from "react";
import { FaUserAlt, FaEnvelope, FaPhone, FaIdBadge, FaMapMarkerAlt } from "react-icons/fa";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../../../../firebase";

export default function PersonalInfo() {
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    position: "",
    city: "",
    state: "",
    employeeId: ""
  });

  // Load user data from Firestore on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoadingData(false);
          return;
        }

        // Get user document from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setFormData({
            fullName: data.fullName || user.displayName || "",
            email: user.email || "",
            phone: data.phone || "",
            position: data.position || "",
            city: data.city || "",
            state: data.state || "",
            employeeId: data.employeeId || ""
          });
        } else {
          // If no Firestore doc exists, create one with default values
          const defaultData = {
            fullName: user.displayName || "",
            email: user.email || "",
            phone: "",
            position: "",
            city: "",
            state: "",
            employeeId: "",
            role: "employee",
            createdAt: new Date(),
            lastLogin: new Date()
          };

          // Create the document using setDoc
          await setDoc(userDocRef, defaultData);

          setFormData({
            fullName: defaultData.fullName,
            email: defaultData.email,
            phone: defaultData.phone,
            position: defaultData.position,
            city: defaultData.city,
            state: defaultData.state,
            employeeId: defaultData.employeeId
          });
        }
      } catch (err) {
        console.error("Error loading user data:", err);
        // Don't show error, just use default values from auth
        const user = auth.currentUser;
        if (user) {
          setFormData({
            fullName: user.displayName || "",
            email: user.email || "",
            phone: "",
            position: "",
            city: "",
            state: "",
            employeeId: ""
          });
        }
      } finally {
        setLoadingData(false);
      }
    };

    loadUserData();
  }, []);

  if (loadingData) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card body */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">Full Name *</label>
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-2">
              <FaUserAlt className="text-slate-400" />
              <input
                className="bg-transparent outline-none text-slate-400 text-sm w-full"
                value={formData.fullName}
                disabled
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">Email Address *</label>
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-2">
              <FaEnvelope className="text-slate-400" />
              <input
                className="bg-transparent outline-none text-slate-400 text-sm w-full"
                value={formData.email}
                disabled
                title="Email cannot be changed"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">Phone Number *</label>
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-2">
              <FaPhone className="text-slate-400" />
              <input
                className="bg-transparent outline-none text-slate-400 text-sm w-full"
                value={formData.phone}
                disabled
              />
            </div>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">Position</label>
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-2">
              <FaIdBadge className="text-slate-400" />
              <input
                className="bg-transparent outline-none text-slate-400 text-sm w-full"
                value={formData.position}
                disabled
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">City</label>
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-2">
              <FaMapMarkerAlt className="text-slate-400" />
              <input
                className="bg-transparent outline-none text-slate-400 text-sm w-full"
                value={formData.city}
                disabled
              />
            </div>
          </div>

          {/* State */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">State</label>
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-2">
              <FaMapMarkerAlt className="text-slate-400" />
              <input
                className="bg-transparent outline-none text-slate-400 text-sm w-full"
                value={formData.state}
                disabled
              />
            </div>
          </div>

          {/* Employee ID */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">Employee ID</label>
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-2">
              <FaIdBadge className="text-slate-400" />
              <input
                className="bg-transparent outline-none text-slate-400 text-sm w-full"
                value={formData.employeeId}
                disabled
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
