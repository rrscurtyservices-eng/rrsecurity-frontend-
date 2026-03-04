import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaUserPlus, FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../../../firebase";
import { API_URL } from "../../../api/employee";

const BASE_ROLE_OPTIONS = ["Security", "Manager"];
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const DEFAULT_PASSWORDS = {
  Security: "Emp@123",
  Manager: "Mng@123",
  Admin: "Adm@123",
};

const emptyForm = {
  fullName: "",
  employeeId: "",
  age: "",
  gender: "Male",
  profileRole: "",
  phone: "",
  email: "",
  aadhaarNumber: "",
  aadhaarPhotoUrl: "",
  aadhaarPhotoFile: null,
  city: "",
  state: "",
  zone: "",
  assignedManagerUid: "",
  assignedAdminUid: "",
};

export default function Employees({ forcedRoleFilter = "", forcedCreateRole = "" }) {
  const location = useLocation();
  const isSuperAdminView = location.pathname.startsWith("/superadmin");
  const roleOptions = forcedCreateRole
    ? [forcedCreateRole]
    : isSuperAdminView
      ? [...BASE_ROLE_OPTIONS, "Admin"]
      : BASE_ROLE_OPTIONS;
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingType, setEditingType] = useState("employee");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  const roleSelected = Boolean(form.profileRole);
  const effectiveRoleFilter = forcedRoleFilter || roleFilter;
  const isSecurityOnlyView = forcedRoleFilter === "security";

  const getToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    return user.getIdToken();
  }, []);

  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const requests = [
        fetch(`${API_URL}/api/employees`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/managers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ];
      if (isSuperAdminView) {
        requests.push(
          fetch(`${API_URL}/api/admins`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        );
      }
      const [empRes, mgrRes, adminRes] = await Promise.all(requests);

      if (!empRes.ok) {
        const err = await empRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load employees");
      }
      if (!mgrRes.ok) {
        const err = await mgrRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load managers");
      }
      if (isSuperAdminView && adminRes && !adminRes.ok) {
        const err = await adminRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load admins");
      }
      setEmployees(await empRes.json());
      setManagers(await mgrRes.json());
      if (isSuperAdminView && adminRes) {
        setAdmins(await adminRes.json());
      } else {
        setAdmins([]);
      }
    } finally {
      setLoading(false);
    }
  }, [API_URL, getToken, isSuperAdminView]);

  const uploadAadhaarPhoto = async (file, targetType) => {
    const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const path = `aadhaar/${targetType}/${safeName}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  const withTimeout = (promise, ms, message) =>
    Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);

  const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
  const normalizeText = (value) => String(value || "").trim();

  const getEmpIdPrefix = (role) => {
    if (role === "Manager") return "MAN";
    if (role === "Admin") return "ADM";
    return "SEC";
  };

  const getNextEmpIdByRole = useCallback(
    (role) => {
      const users = [...employees, ...managers, ...admins];
      const prefix = getEmpIdPrefix(role);
      const maxNumber = users.reduce((max, user) => {
        const candidate = String(user.employeeId || "").trim().toUpperCase();
        const match = candidate.match(new RegExp(`^${prefix}-(\\d{4})$`));
        if (!match) return max;
        const num = Number(match[1]);
        return Number.isFinite(num) ? Math.max(max, num) : max;
      }, 0);
      return `${prefix}-${String(maxNumber + 1).padStart(4, "0")}`;
    },
    [employees, managers, admins]
  );

  const toCanonicalRole = (role) => {
    if (role === "Manager") return "Manager";
    if (role === "Admin") return "Admin";
    return "Security Guard";
  };

  const validateForm = () => {
    const errors = {};
    const mustHave = [
      ["fullName", "Full Name", form.fullName],
      ["age", "Age", form.age],
      ["gender", "Gender", form.gender],
      ["profileRole", "Role", form.profileRole],
      ["phone", "Phone Number", form.phone],
      ["email", "Email", form.email],
      ["aadhaarNumber", "Aadhaar Number", form.aadhaarNumber],
      ["city", "City", form.city],
      ["state", "State", form.state],
    ];

    if (!isSuperAdminView) {
      mustHave.push(["zone", "Zone", form.zone]);
    }

    mustHave.forEach(([key, label, value]) => {
      if (!normalizeText(value)) errors[key] = `${label} is required`;
    });

    if (!editingId && !normalizeText(form.employeeId)) {
      errors.employeeId = "Employee ID is required";
    }

    if (!editingId && form.profileRole === "Security" && !form.assignedManagerUid) {
      errors.assignedManagerUid = "Please select a manager";
    }
    if (
      !editingId &&
      form.profileRole === "Security" &&
      isSuperAdminView &&
      !normalizeText(form.assignedAdminUid)
    ) {
      errors.assignedAdminUid = "Please select an admin";
    }
    if (
      !editingId &&
      form.profileRole === "Manager" &&
      isSuperAdminView &&
      !normalizeText(form.assignedAdminUid)
    ) {
      errors.assignedAdminUid = "Please select an admin";
    }

    if (!editingId && !form.aadhaarPhotoFile && !form.aadhaarPhotoUrl) {
      errors.aadhaarPhotoFile = "Aadhaar Photo is required";
    }

    if (normalizeText(form.aadhaarNumber) && !/^\d{12}$/.test(form.aadhaarNumber)) {
      errors.aadhaarNumber = "Aadhaar number must be exactly 12 digits";
    }

    const normalizedPhone = normalizeText(form.phone);
    if (normalizedPhone && !/^\d{10}$/.test(normalizedPhone)) {
      errors.phone = "Phone number must be exactly 10 digits";
    }

    const normalizedEmail = normalizeEmail(form.email);
    if (
      normalizedEmail &&
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(normalizedEmail)
    ) {
      errors.email = "Enter a valid email address";
    }

    const currentUid = editingId || "";
    const existsOtherUser = (matcher) =>
      allUsers.some((u) => (u.uid || u.id) !== currentUid && matcher(u));

    if (
      normalizeText(form.employeeId) &&
      existsOtherUser(
        (u) =>
          String(u.employeeId || "").trim().toUpperCase() ===
          String(form.employeeId || "").trim().toUpperCase()
      )
    ) {
      errors.employeeId = "Employee ID already exists";
    }

    if (
      normalizedEmail &&
      existsOtherUser((u) => normalizeEmail(u.email) === normalizedEmail)
    ) {
      errors.email = "Email already exists";
    }

    if (
      normalizedPhone &&
      existsOtherUser((u) => normalizeText(u.phone) === normalizedPhone)
    ) {
      errors.phone = "Phone number already exists";
    }

    if (
      normalizeText(form.aadhaarNumber) &&
      existsOtherUser(
        (u) => normalizeText(u.aadhaarNumber) === normalizeText(form.aadhaarNumber)
      )
    ) {
      errors.aadhaarNumber = "Aadhaar number already exists";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toApiPayload = (input, photoUrlOverride) => {
    const parsedAge =
      input.age === "" || input.age === null || input.age === undefined
        ? null
        : Number(input.age);
    const resolvedPhoto = photoUrlOverride ?? input.aadhaarPhotoUrl ?? "";
    const fullName = input.fullName.trim();
    const profileRole = toCanonicalRole(input.profileRole);

    const selectedAdminId = normalizeText(input.assignedAdminUid);
    const selectedManagerId = normalizeText(input.assignedManagerUid);

    return {
      name: fullName,
      fullName,
      employeeId: normalizeText(input.employeeId),
      age: Number.isFinite(parsedAge) ? parsedAge : null,
      gender: input.gender,
      profileRole,
      jobRole: profileRole,
      phone: normalizeText(input.phone),
      email: normalizeEmail(input.email),
      aadhaarNumber: normalizeText(input.aadhaarNumber),
      aadhaarPhotoUrl: resolvedPhoto,
      city: input.city.trim(),
      state: input.state.trim(),
      zone: isSuperAdminView ? "" : input.zone.trim(),
      dept: isSuperAdminView ? "" : input.zone.trim(),
      assignedManagerUid: selectedManagerId,
      assignedManagerId: selectedManagerId,
      managerId: selectedManagerId,
      adminId: selectedAdminId,
    };
  };

  useEffect(() => {
    const syncCurrentUser = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return;
      const data = snap.data() || {};
      const role = String(data.role || "").toLowerCase();
      setCurrentUserRole(role);
      setCurrentUserId(user.uid);
      if (role === "admin") {
        setForm((prev) => ({ ...prev, assignedAdminUid: user.uid }));
      }
    };

    syncCurrentUser().catch(() => {});
  }, []);

  useEffect(() => {
    fetchAllUsers().catch((err) => {
      console.error(err);
      alert(err.message || "Failed to load users.");
    });
  }, [fetchAllUsers]);

  const allUsers = useMemo(() => {
    const rows = [
      ...employees.map((u) => ({ ...u, _type: "employee" })),
      ...managers.map((u) => ({ ...u, _type: "manager" })),
      ...admins.map((u) => ({ ...u, _type: "admin" })),
    ];
    const q = search.trim().toLowerCase();
    return rows.filter((u) => {
      const name = String(u.name || u.fullName || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      const roleLabel = String(u.jobRole || u.profileRole || u.role || "").toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q) || roleLabel.includes(q);
      const normalizedRole = roleLabel.includes("manager")
        ? "manager"
        : roleLabel.includes("admin")
          ? "admin"
          : "security";
      const matchesRole = effectiveRoleFilter === "all" || effectiveRoleFilter === normalizedRole;
      return matchesSearch && matchesRole;
    });
  }, [employees, managers, admins, search, effectiveRoleFilter]);

  useEffect(() => {
    if (forcedRoleFilter) {
      if (roleFilter !== forcedRoleFilter) {
        setRoleFilter(forcedRoleFilter);
      }
      return;
    }
    if (roleFilter !== "all") {
      setRoleFilter("all");
    }
  }, [forcedRoleFilter, roleFilter]);

  const effectiveAssignedAdminId = useMemo(() => {
    if (isSuperAdminView) return normalizeText(form.assignedAdminUid);
    if (currentUserRole === "admin") return currentUserId;
    return normalizeText(form.assignedAdminUid);
  }, [isSuperAdminView, form.assignedAdminUid, currentUserRole, currentUserId]);

  const managerOptions = useMemo(() => {
    if (!effectiveAssignedAdminId) return [];
    return managers.filter(
      (mgr) => String(mgr.adminId || "") === effectiveAssignedAdminId
    );
  }, [managers, effectiveAssignedAdminId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFieldErrors({});
    setSaving(true);
    try {
      if (!validateForm()) {
        setFormError("Please fix the highlighted form errors.");
        setSaving(false);
        return;
      }

      const token = await getToken();

      if (editingId) {
        let uploadedPhotoUrl = form.aadhaarPhotoUrl || "";
        if (form.aadhaarPhotoFile) {
          const targetType =
            form.profileRole === "Manager"
              ? "manager"
              : form.profileRole === "Admin"
                ? "admin"
                : "employee";
          uploadedPhotoUrl = await uploadAadhaarPhoto(form.aadhaarPhotoFile, targetType);
        }

        const isManager = editingType === "manager";
        const isAdmin = editingType === "admin";
        const endpoint = isManager
          ? `${API_URL}/api/managers/${editingId}`
          : isAdmin
            ? `${API_URL}/api/admins/${editingId}`
            : `${API_URL}/api/employees/${editingId}`;
        const payload = toApiPayload(form, uploadedPhotoUrl);

        const res = await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to update user");
        }
        setFormSuccess("User updated successfully.");
      } else {
        const isManager = form.profileRole === "Manager";
        const isAdmin = form.profileRole === "Admin";
        const defaultPassword =
          DEFAULT_PASSWORDS[form.profileRole] || DEFAULT_PASSWORDS.Security;
        const pendingPhotoFile = form.aadhaarPhotoFile || null;
        const endpoint = isManager
          ? `${API_URL}/api/managers`
          : isAdmin
            ? `${API_URL}/api/admins`
            : `${API_URL}/api/employees`;
        const payload = {
          ...toApiPayload(form, ""),
          ...(form.profileRole === "Security" && currentUserRole === "admin"
            ? { adminId: currentUserId }
            : {}),
          password: defaultPassword,
        };

        const res = await withTimeout(
          fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }),
          15000,
          "Request timed out while creating user"
        );

        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.message || "Failed to add user");
        }

        // Fast path: user is created first; photo sync continues in background.
        if (pendingPhotoFile && body?.uid) {
          const targetType =
            form.profileRole === "Manager"
              ? "manager"
              : form.profileRole === "Admin"
                ? "admin"
                : "employee";
          const updateEndpoint = isManager
            ? `${API_URL}/api/managers/${body.uid}`
            : isAdmin
              ? `${API_URL}/api/admins/${body.uid}`
              : `${API_URL}/api/employees/${body.uid}`;

          withTimeout(
            uploadAadhaarPhoto(pendingPhotoFile, targetType),
            20000,
            "Photo upload timed out"
          )
            .then((photoUrl) =>
              fetch(updateEndpoint, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ aadhaarPhotoUrl: photoUrl }),
              })
            )
            .catch((uploadErr) => {
              console.error("Background Aadhaar photo sync failed:", uploadErr);
            });
        }

        if (body.emailSent === false) {
          setFormError(body.emailReason || "User created, but welcome email was not sent.");
        } else {
          setFormSuccess("User created and welcome email sent.");
        }

      }

      setForm({
        ...emptyForm,
        assignedAdminUid: currentUserRole === "admin" ? currentUserId : "",
      });
      setEditingId(null);
      setEditingType("employee");
      setOpenModal(false);
      await fetchAllUsers();
    } catch (err) {
      console.error("Save user failed:", err);
      setFormError(err.message || "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    try {
      if (!confirm("Delete this user? This cannot be undone.")) return;
      const token = await getToken();
      const id = item.uid || item.id;
      const endpoint =
        item.role === "manager"
          ? `${API_URL}/api/managers/${id}`
          : item.role === "admin"
            ? `${API_URL}/api/admins/${id}`
            : `${API_URL}/api/employees/${id}`;
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete user");
      }

      await fetchAllUsers();
    } catch (err) {
      console.error("Delete user failed:", err);
      alert(err.message || "Failed to delete user.");
    }
  };

  const handleEdit = (item) => {
    const isManager = item.role === "manager";
    const isAdmin = item.role === "admin";
    const resolvedRole =
      item.profileRole === "Manager" || item.jobRole === "Manager"
        ? "Manager"
        : item.profileRole === "Admin" || item.jobRole === "Admin" || item.role === "admin"
          ? "Admin"
        : "Security";
    setForm({
      fullName: item.fullName || item.name || "",
      employeeId: item.employeeId || "",
      age: item.age === undefined || item.age === null ? "" : String(item.age),
      gender: item.gender || "Male",
      profileRole: resolvedRole,
      phone: item.phone || "",
      email: item.email || "",
      aadhaarNumber: item.aadhaarNumber || "",
      aadhaarPhotoUrl: item.aadhaarPhotoUrl || "",
      aadhaarPhotoFile: null,
      city: item.city || "",
      state: item.state || "",
      zone: item.zone || item.dept || "",
      assignedManagerUid: item.assignedManagerUid || item.assignedManagerId || "",
      assignedAdminUid: item.adminId || "",
    });
    setEditingId(item.uid || item.id);
    setEditingType(isManager ? "manager" : isAdmin ? "admin" : "employee");
    setFieldErrors({});
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setEditingId(null);
    setEditingType("employee");
    setFieldErrors({});
    setFormError("");
    setFormSuccess("");
    setForm({
      ...emptyForm,
      assignedAdminUid: currentUserRole === "admin" ? currentUserId : "",
    });
  };

  return (
    <div className="p-6 sm:p-10 w-full bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, role..."
          className="w-full sm:w-2/3 px-5 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {!forcedRoleFilter && (
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-48 px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="security">Security</option>
            <option value="manager">Manager</option>
            {isSuperAdminView && <option value="admin">Admin</option>}
          </select>
        )}
        <button
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-black text-white px-5 py-3 rounded-xl hover:opacity-80 transition"
          onClick={() => {
            setEditingId(null);
            setEditingType("employee");
            setFieldErrors({});
            setForm({
              ...emptyForm,
              profileRole: forcedCreateRole || "",
              employeeId: forcedCreateRole ? getNextEmpIdByRole(forcedCreateRole) : "",
              assignedAdminUid: currentUserRole === "admin" ? currentUserId : "",
            });
            setOpenModal(true);
          }}
        >
          <FaUserPlus size={18} /> {isSecurityOnlyView ? "Add Security Guard" : "Add Employee"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-blue-50 text-gray-700 font-semibold">
            <tr>
              {isSuperAdminView && <th className="py-4 px-4 text-center">Emp ID</th>}
              <th className="py-4 px-4 text-left">Name</th>
              <th className="py-4 px-4 text-left">Email</th>
              <th className="py-4 px-4 text-left">Role</th>
              <th className="py-4 px-4 text-center">Phone Number</th>
              <th className="py-4 px-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="text-gray-600 text-sm">
            {loading && (
              <tr>
                <td colSpan={isSuperAdminView ? 6 : 5} className="py-6 text-center text-gray-400">
                  Loading users...
                </td>
              </tr>
            )}
            {!loading && allUsers.length === 0 && (
              <tr>
                <td colSpan={isSuperAdminView ? 6 : 5} className="py-6 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            )}
            {allUsers.map((item) => {
              const displayRole = item.role === "admin" ? "Admin" : item.jobRole || "Security Guard";
              return (
                <tr key={item.uid || item.id} className="border-b hover:bg-gray-50 transition">
                  {isSuperAdminView && (
                    <td className="py-4 px-4 text-center">
                      <span className="px-4 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        {item.employeeId || "-"}
                      </span>
                    </td>
                  )}
                  <td className="py-4 px-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                      {(item.name || "U").charAt(0)}
                    </div>
                    <span className="font-medium text-gray-800">{item.name}</span>
                  </td>
                  <td className="py-4 px-4">{item.email}</td>
                  <td className="py-4 px-4">{displayRole}</td>
                  <td className="py-4 px-4 text-center">
                    <span>{item.phone || "-"}</span>
                  </td>
                  <td className="py-4 px-4 text-center flex justify-center gap-2">
                    <button
                      className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-100 flex items-center gap-1"
                      onClick={() => handleEdit(item)}
                    >
                      <FaEdit size={14} className="text-blue-600" /> Edit
                    </button>
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
                      onClick={() => handleDelete(item)}
                    >
                      <FaTrash size={14} /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-8 relative overflow-y-auto max-h-[90vh]">
            <button
              className="absolute right-6 top-6 text-gray-600 text-2xl"
              onClick={handleClose}
              aria-label="Close"
              type="button"
            >
              <FaTimes />
            </button>

            <h2 className="text-3xl font-bold text-blue-800 mb-6">
              {editingId ? "Edit User" : isSecurityOnlyView ? "Add Security Guard" : "Add User"}
            </h2>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {formSuccess}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSave}>
              <div>
                <div>
                  <label className="font-medium">Role *</label>
                  <select
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    value={form.profileRole}
                    onChange={(e) => {
                      if (editingId) return;
                      const role = e.target.value;
                      setForm((f) => ({
                        ...f,
                        profileRole: role,
                        employeeId: role ? getNextEmpIdByRole(role) : "",
                        assignedManagerUid: role === "Security" ? f.assignedManagerUid : "",
                        assignedAdminUid:
                          role === "Security" || role === "Manager"
                            ? isSuperAdminView
                              ? f.assignedAdminUid
                              : currentUserRole === "admin"
                                ? currentUserId
                                : f.assignedAdminUid
                            : f.assignedAdminUid,
                      }));
                      setFieldErrors((prev) => ({ ...prev, profileRole: "", employeeId: "" }));
                    }}
                    disabled={!!editingId || !!forcedCreateRole}
                  >
                    <option value="">-- Select Role --</option>
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.profileRole && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.profileRole}</p>
                  )}
                </div>
              </div>

              {(editingId || roleSelected) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium">Employee ID *</label>
                  <input
                    type="text"
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    value={form.employeeId}
                    disabled
                  />
                  {fieldErrors.employeeId && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.employeeId}</p>
                  )}
                </div>

                <div>
                  <label className="font-medium">Full Name *</label>
                  <input
                    type="text"
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    value={form.fullName}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, fullName: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, fullName: "" }));
                    }}
                  />
                  {fieldErrors.fullName && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="font-medium">Age *</label>
                  <input
                    type="number"
                    min="18"
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    value={form.age}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, age: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, age: "" }));
                    }}
                  />
                  {fieldErrors.age && <p className="mt-1 text-xs text-red-600">{fieldErrors.age}</p>}
                </div>

                <div>
                  <label className="font-medium">Gender *</label>
                  <select
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    value={form.gender}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, gender: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, gender: "" }));
                    }}
                  >
                    {GENDER_OPTIONS.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.gender && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.gender}</p>
                  )}
                </div>

                <div>
                  <label className="font-medium">Phone Number *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    value={form.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm((f) => ({ ...f, phone: digits }));
                      setFieldErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                  />
                  {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
                </div>

                <div>
                  <label className="font-medium">Email Address *</label>
                  <input
                    type="email"
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    value={form.email}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, email: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    disabled={!!editingId}
                  />
                  {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="font-medium">Aadhaar Number *</label>
                  <input
                    type="text"
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    value={form.aadhaarNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                      setForm((f) => ({ ...f, aadhaarNumber: digits }));
                      setFieldErrors((prev) => ({ ...prev, aadhaarNumber: "" }));
                    }}
                  />
                  {fieldErrors.aadhaarNumber && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.aadhaarNumber}</p>
                  )}
                </div>

                <div>
                  <label className="font-medium">Aadhaar Photo {editingId ? "" : "*"}</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    required={!editingId && !form.aadhaarPhotoUrl}
                    onChange={(e) =>
                      {
                        setForm((f) => ({
                          ...f,
                          aadhaarPhotoFile: e.target.files?.[0] || null,
                        }));
                        setFieldErrors((prev) => ({ ...prev, aadhaarPhotoFile: "" }));
                      }
                    }
                  />
                  {fieldErrors.aadhaarPhotoFile && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.aadhaarPhotoFile}</p>
                  )}
                  {form.aadhaarPhotoUrl && (
                    <a
                      href={form.aadhaarPhotoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-700 mt-1 inline-block"
                    >
                      View current Aadhaar photo
                    </a>
                  )}
                </div>

                <div>
                  <label className="font-medium">City *</label>
                  <input
                    type="text"
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    value={form.city}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, city: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, city: "" }));
                    }}
                  />
                  {fieldErrors.city && <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p>}
                </div>

                <div>
                  <label className="font-medium">State *</label>
                  <input
                    type="text"
                    className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                    value={form.state}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, state: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, state: "" }));
                    }}
                  />
                  {fieldErrors.state && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.state}</p>
                  )}
                </div>

                {!isSuperAdminView && (
                  <div>
                    <label className="font-medium">Zone *</label>
                    <input
                      type="text"
                      className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                      value={form.zone}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, zone: e.target.value }));
                        setFieldErrors((prev) => ({ ...prev, zone: "" }));
                      }}
                    />
                    {fieldErrors.zone && <p className="mt-1 text-xs text-red-600">{fieldErrors.zone}</p>}
                  </div>
                )}

                {form.profileRole === "Security" && (
                  <div>
                    {isSuperAdminView && (
                      <>
                        <label className="font-medium">Assign Admin *</label>
                        <select
                          className="w-full bg-gray-100 border rounded-lg p-3 mt-1 mb-3"
                          value={form.assignedAdminUid}
                          onChange={(e) => {
                            const nextAdminId = e.target.value;
                            setForm((f) => ({
                              ...f,
                              assignedAdminUid: nextAdminId,
                              assignedManagerUid: "",
                            }));
                          }}
                        >
                          <option value="">-- Select Admin --</option>
                          {admins.map((a) => (
                            <option key={a.uid || a.id} value={a.uid || a.id}>
                              {a.name || a.fullName || a.email}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.assignedAdminUid && (
                          <p className="mt-1 text-xs text-red-600">{fieldErrors.assignedAdminUid}</p>
                        )}
                      </>
                    )}
                    <label className="font-medium">Assign Manager *</label>
                    <select
                      className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                      value={form.assignedManagerUid}
                      onChange={(e) =>
                        {
                          setForm((f) => ({ ...f, assignedManagerUid: e.target.value }));
                          setFieldErrors((prev) => ({ ...prev, assignedManagerUid: "" }));
                        }
                      }
                    >
                      <option value="">-- Select Manager --</option>
                      {managerOptions.map((m) => (
                        <option key={m.uid || m.id} value={m.uid || m.id}>
                          {m.name || m.fullName || m.email}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.assignedManagerUid && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.assignedManagerUid}</p>
                    )}
                  </div>
                )}

                {form.profileRole === "Manager" && isSuperAdminView && (
                  <div>
                    <label className="font-medium">Assign Admin *</label>
                    <select
                      className="w-full bg-gray-100 border rounded-lg p-3 mt-1"
                      value={form.assignedAdminUid}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, assignedAdminUid: e.target.value }))
                      }
                    >
                      <option value="">-- Select Admin --</option>
                      {admins.map((a) => (
                        <option key={a.uid || a.id} value={a.uid || a.id}>
                          {a.name || a.fullName || a.email}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.assignedAdminUid && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.assignedAdminUid}</p>
                    )}
                  </div>
                )}
                </div>
              )}

              {editingId && (
                <div>
                  <p className="text-xs text-gray-500 mt-1">Email and role cannot be changed.</p>
                </div>
              )}

              {!editingId && roleSelected && (
                <div className="text-sm bg-blue-50 border border-blue-100 text-blue-700 rounded-lg p-3">
                  First login password for {form.profileRole}:{" "}
                  <strong>
                    {DEFAULT_PASSWORDS[form.profileRole] || DEFAULT_PASSWORDS.Security}
                  </strong>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 mt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-black text-white py-3 rounded-lg text-lg font-semibold"
                >
                  {saving ? "Saving..." : editingId ? "Update User" : "Add User"}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving}
                  className="flex-1 border py-3 rounded-lg text-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
