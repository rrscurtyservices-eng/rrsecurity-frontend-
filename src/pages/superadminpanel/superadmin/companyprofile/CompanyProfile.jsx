import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../../firebase";
import { COLLECTIONS } from "../../../../services/collections";
import CompanyInfo from "./CompanyInfo";
import Branding from "./Branding";
import Security from "./Security";

const tabs = [
  { key: "company", label: "Company Info" },
  { key: "branding", label: "Branding" },
];

export default function CompanyProfile() {
  const [activeTab, setActiveTab] = useState("company");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    roleLabel: "Super Admin",
    employeeId: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const snap = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
        if (!snap.exists()) {
          setProfile({
            fullName: user.displayName || user.email || "Super Admin",
            roleLabel: "Super Admin",
            employeeId: "",
          });
          return;
        }
        const data = snap.data() || {};
        setProfile({
          fullName: data.fullName || data.name || user.email || "Super Admin",
          roleLabel: data.profileRole || data.jobRole || "Super Admin",
          employeeId: data.employeeId || "",
        });
      } catch (err) {
        console.error("Failed to load superadmin profile header:", err);
      }
    };

    loadProfile();
  }, []);

  const initials = useMemo(() => {
    const name = String(profile.fullName || "").trim();
    if (!name) return "SA";
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }, [profile.fullName]);

  return (
    <>
      <style>{`
        @keyframes elasticBounce {
          0% { transform: scaleX(0); }
          60% { transform: scaleX(1.15); }
          80% { transform: scaleX(0.95); }
          100% { transform: scaleX(1); }
        }
        .animate-elastic {
          animation: elasticBounce 0.35s ease-out forwards;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">
            Company Profile
            <p className="text-xs sm:text-sm text-gray-400 mt-2 hidden sm:block">
              Manage company information, branding, and account security
            </p>
          </h1>

          <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white/80 shadow-xl backdrop-blur-lg">
            <div className="border-b px-6 py-5">
              <h2 className="text-xl font-semibold text-slate-800">Profile Settings</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage your account settings and preferences
              </p>
            </div>

            <div className="px-6 py-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-700 text-2xl font-semibold text-white">
                      {initials}
                    </div>
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-1 shadow">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                        +
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-2xl font-semibold text-slate-800">
                      {profile.fullName || "Super Admin"}
                    </div>
                    <p className="text-sm text-slate-500">{profile.roleLabel || "Super Admin"}</p>
                    <p className="mt-1 text-xs text-slate-400">{profile.employeeId || "-"}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Security
                    embedded
                    buttonOnly
                    forceOpen={showPasswordForm}
                    onOpen={() => setShowPasswordForm(true)}
                  />
                </div>
              </div>

              {showPasswordForm && (
                <div className="mt-5">
                  <Security
                    embedded
                    forceOpen={showPasswordForm}
                    onClose={() => setShowPasswordForm(false)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl overflow-hidden border border-gray-200">
            <div className="border-b px-4 sm:px-8 py-4">
              <div className="flex flex-wrap gap-3 sm:gap-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative pb-2 text-sm sm:text-base font-medium transition-all duration-300 ${
                      activeTab === tab.key
                        ? "text-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <span className="absolute left-0 bottom-0 w-full h-[3px] bg-indigo-600 rounded-full animate-elastic origin-left" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-8">
              {activeTab === "company" && <CompanyInfo />}
              {activeTab === "branding" && <Branding />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
