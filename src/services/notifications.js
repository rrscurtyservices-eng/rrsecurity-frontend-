import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "./collections";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeRole(role) {
  return normalizeText(role).toLowerCase();
}

function toMillis(createdAt) {
  return typeof createdAt?.toMillis === "function" ? createdAt.toMillis() : 0;
}

function mergeNotificationRows({ normalizedRole, userTargetDocs = [], roleTargetDocs = [], announcementDocs = [] }) {
  const merged = new Map();

  userTargetDocs.forEach((docSnap) => {
    merged.set(docSnap.id, {
      id: docSnap.id,
      ...docSnap.data(),
      sourceType: "notification",
      deletable: true,
    });
  });

  roleTargetDocs.forEach((docSnap) => {
    merged.set(docSnap.id, {
      id: docSnap.id,
      ...docSnap.data(),
      sourceType: "notification",
      deletable: true,
    });
  });

  announcementDocs.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const audience = normalizeRole(data.audience) || "all";
    const visibleToRole =
      audience === "all" || audience === normalizedRole || normalizedRole === "superadmin";
    if (!visibleToRole) return;

    const id = `announcement:${docSnap.id}`;
    merged.set(id, {
      id,
      title: normalizeText(data.title) || "Announcement",
      message: normalizeText(data.message),
      createdAt: data.createdAt || data.updatedAt || null,
      isRead: false,
      sourceType: "announcement",
      deletable: false,
    });
  });

  return Array.from(merged.values()).sort((a, b) => toMillis(b?.createdAt) - toMillis(a?.createdAt));
}

export async function sendNotification({
  title,
  message,
  targetUserId,
  targetRole,
  createdBy,
  createdByRole,
}) {
  const payload = {
    title: normalizeText(title),
    message: normalizeText(message),
    targetUserId: normalizeText(targetUserId),
    targetRole: normalizeText(targetRole).toLowerCase(),
    createdBy: normalizeText(createdBy),
    createdByRole: normalizeText(createdByRole).toLowerCase(),
    createdAt: serverTimestamp(),
    isRead: false,
  };

  const missing = Object.entries(payload)
    .filter(([key, value]) => key !== "createdAt" && key !== "isRead" && !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing required notification fields: ${missing.join(", ")}`);
  }

  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), payload);
}

export async function fetchNotificationsForCurrentUser({ uid, role }) {
  const normalizedUid = normalizeText(uid);
  const normalizedRole = normalizeRole(role);

  if (!normalizedUid || !normalizedRole) {
    return [];
  }

  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  const [userTargetSnap, roleTargetSnap] = await Promise.all([
    getDocs(
      query(notificationsRef, where("targetUserId", "==", normalizedUid))
    ),
    getDocs(
      query(notificationsRef, where("targetRole", "==", normalizedRole))
    ),
  ]);

  const announcementsSnap = await getDocs(collection(db, COLLECTIONS.ANNOUNCEMENTS));

  return mergeNotificationRows({
    normalizedRole,
    userTargetDocs: userTargetSnap.docs,
    roleTargetDocs: roleTargetSnap.docs,
    announcementDocs: announcementsSnap.docs,
  });
}

export function subscribeNotificationsForCurrentUser({ uid, role, onChange, onError }) {
  const normalizedUid = normalizeText(uid);
  const normalizedRole = normalizeRole(role);

  if (!normalizedUid || !normalizedRole || typeof onChange !== "function") {
    return () => {};
  }

  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  const announcementsRef = collection(db, COLLECTIONS.ANNOUNCEMENTS);

  let userTargetDocs = [];
  let roleTargetDocs = [];
  let announcementDocs = [];

  const emit = () => {
    onChange(
      mergeNotificationRows({
        normalizedRole,
        userTargetDocs,
        roleTargetDocs,
        announcementDocs,
      })
    );
  };

  const unsubUser = onSnapshot(
    query(notificationsRef, where("targetUserId", "==", normalizedUid)),
    (snap) => {
      userTargetDocs = snap.docs;
      emit();
    },
    onError
  );

  const unsubRole = onSnapshot(
    query(notificationsRef, where("targetRole", "==", normalizedRole)),
    (snap) => {
      roleTargetDocs = snap.docs;
      emit();
    },
    onError
  );

  const unsubAnnouncements = onSnapshot(
    announcementsRef,
    (snap) => {
      announcementDocs = snap.docs;
      emit();
    },
    onError
  );

  return () => {
    unsubUser();
    unsubRole();
    unsubAnnouncements();
  };
}

export async function deleteNotificationById(notificationId) {
  const id = normalizeText(notificationId);
  if (!id) {
    throw new Error("notificationId is required");
  }
  await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id));
}

export async function markNotificationAsRead(notificationId) {
  const id = normalizeText(notificationId);
  if (!id) {
    throw new Error("notificationId is required");
  }
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id), { isRead: true });
}
