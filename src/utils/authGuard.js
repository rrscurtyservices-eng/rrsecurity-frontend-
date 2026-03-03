import { API_BASE_URL } from "../services/apiBase";
import { ROLE_EMAILS } from "../config/roles";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

const SUPERADMIN_EMAILS = ["rrsecurity@gmail.com"];

export const normalizeRole = (value) => {
  const role = String(value || "").toLowerCase().trim();
  if (["superadmin", "admin", "manager", "employee"].includes(role)) return role;
  if (role === "user") return "employee";
  return null;
};

export const roleFromStaticEmail = (emailValue) => {
  const normalized = String(emailValue || "").trim().toLowerCase();
  if (!normalized) return null;

  if (SUPERADMIN_EMAILS.includes(normalized)) return "superadmin";

  const entry = Object.entries(ROLE_EMAILS).find(([, allowedEmail]) => {
    return String(allowedEmail || "").trim().toLowerCase() === normalized;
  });

  return entry ? normalizeRole(entry[0]) : null;
};

export const resolveRoleByEmail = async (emailValue) => {
  const normalized = String(emailValue || "").trim().toLowerCase();
  if (!normalized) return null;

  try {
    const response = await fetch(
      `${API_BASE_URL}/employee/resolve-role?email=${encodeURIComponent(normalized)}`
    );

    if (!response.ok) return null;
    const data = await response.json();
    return normalizeRole(data?.role);
  } catch {
    return null;
  }
};

export const roleFromUsersDoc = async (db, uid) => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return normalizeRole(snap.data()?.role);
  } catch {
    return null;
  }
};

export const ensureEmployeeRoleDoc = async (db, uid, email) => {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        email,
        role: "employee",
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // ignore write failures
  }
};

export const determineRoleForLogin = async ({ db, uid, enteredEmail, userEmail }) => {
  return (
    (await resolveRoleByEmail(enteredEmail)) ||
    (await resolveRoleByEmail(userEmail)) ||
    (await roleFromUsersDoc(db, uid)) ||
    roleFromStaticEmail(enteredEmail) ||
    roleFromStaticEmail(userEmail) ||
    null
  );
};

export const determineRoleForAuth = async ({ db, uid, userEmail, requiredRole }) => {
  let detectedRole = null;
  let status = null;
  const userRef = doc(db, "users", uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      detectedRole = normalizeRole(snap.data().role);
      status = String(snap.data().status || "active").toLowerCase();
    }
  } catch {
    // ignore read failures
  }

  if (!detectedRole) {
    detectedRole = (await resolveRoleByEmail(userEmail)) || roleFromStaticEmail(userEmail) || null;
  }

  if (!detectedRole && requiredRole === "employee") {
    detectedRole = "employee";
    await ensureEmployeeRoleDoc(db, uid, userEmail);
  }

  return { detectedRole, status };
};
