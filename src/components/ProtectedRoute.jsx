import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { determineRoleForAuth } from "../utils/authGuard";

export default function ProtectedRoute({ role, children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [actualRole, setActualRole] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setAuthorized(false);
        setActualRole(null);
        setLoading(false);
        return;
      }

      if (!role) {
        setAuthorized(true);
        setActualRole(null);
        setLoading(false);
        return;
      }

      try {
        const { detectedRole, status } = await determineRoleForAuth({
          db,
          uid: u.uid,
          userEmail: u.email,
          requiredRole: role,
        });

        if (detectedRole) {
          setActualRole(detectedRole);
          // If account is deactivated, treat as unauthorized.
          if (status && status !== "active") {
            setAuthorized(false);
          } else {
            setAuthorized(detectedRole === role);
          }
        } else {
          setActualRole(null);
          setAuthorized(false);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [role]);

  useEffect(() => {
    if (!loading && user && role && !authorized && !actualRole) {
      signOut(auth).catch(() => {});
    }
  }, [loading, user, role, authorized, actualRole]);

  if (loading) return null;

  if (!user) {
    const to = role ? `/${role}/login` : "/login";
    return (
      <Navigate
        to={to}
        replace
        state={{ error: "Please login for this role", from: location.pathname }}
      />
    );
  }

  if (role && !authorized) {
    if (actualRole) {
      return <Navigate to={`/${actualRole}`} replace />;
    }

    return (
      <Navigate
        to={`/${role}/login`}
        replace
        state={{ error: "Unauthorized access for this role", from: location.pathname }}
      />
    );
  }

  return children;
}
