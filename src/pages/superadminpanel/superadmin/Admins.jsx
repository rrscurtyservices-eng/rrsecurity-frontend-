import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaEdit,
  FaSearch,
  FaTimes,
  FaUserShield,
} from "react-icons/fa";
import { auth } from "../../../firebase";
import { API_URL } from "../../../api/employee";

function normalizeName(row, fallback) {
  const value = String(row?.name || row?.fullName || row?.email || "").trim();
  return value || fallback;
}

const emptyForm = {
  assignedManagerIds: [],
};

export default function SuperAdmins() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hierarchy, setHierarchy] = useState([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [managers, setManagers] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [managerSearch, setManagerSearch] = useState("");

  const getToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    return user.getIdToken();
  }, []);

  const loadHierarchy = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();

      const [adminsRes, managersRes, employeesRes] = await Promise.all([
        fetch(`${API_URL}/api/admins`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/managers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/employees`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [adminsBody, managersBody, employeesBody] = await Promise.all([
        adminsRes.json().catch(() => []),
        managersRes.json().catch(() => []),
        employeesRes.json().catch(() => []),
      ]);

      if (!adminsRes.ok) throw new Error(adminsBody?.message || "Failed to load admins");
      if (!managersRes.ok) throw new Error(managersBody?.message || "Failed to load managers");
      if (!employeesRes.ok) throw new Error(employeesBody?.message || "Failed to load employees");

      const adminRows = Array.isArray(adminsBody) ? adminsBody : [];
      const managerRows = Array.isArray(managersBody) ? managersBody : [];
      const employeeRows = Array.isArray(employeesBody) ? employeesBody : [];

      setManagers(managerRows);
      const managersByAdmin = new Map();
      managerRows.forEach((mgr) => {
        const adminId = String(mgr.adminId || mgr.createdBy || "").trim();
        if (!adminId) return;
        if (!managersByAdmin.has(adminId)) {
          managersByAdmin.set(adminId, []);
        }
        managersByAdmin.get(adminId).push(mgr);
      });

      const employeesByManager = new Map();
      employeeRows.forEach((emp) => {
        const managerId = String(
          emp.managerId || emp.assignedManagerId || emp.assignedManagerUid || ""
        ).trim();
        if (!managerId) return;
        if (!employeesByManager.has(managerId)) {
          employeesByManager.set(managerId, []);
        }
        employeesByManager.get(managerId).push(emp);
      });

      const nested = adminRows.map((adminRow) => {
        const adminId = String(adminRow.uid || adminRow.id || "").trim();
        const managers = (managersByAdmin.get(adminId) || [])
          .map((managerRow) => {
            const managerId = String(managerRow.uid || managerRow.id || "").trim();
            const linkedEmployees = employeesByManager.get(managerId) || [];
            const assignedEmployeeIds = Array.isArray(managerRow.assignedEmployeeIds)
              ? managerRow.assignedEmployeeIds.filter(Boolean)
              : [];
            const fallbackEmployees = assignedEmployeeIds
              .filter((empId) => !linkedEmployees.some((emp) => String(emp.uid || emp.id) === String(empId)))
              .map((empId) => ({
                id: empId,
                displayName: `Employee ${empId}`,
              }));

            const employees = [...linkedEmployees, ...fallbackEmployees]
              .map((emp) => ({
                ...emp,
                displayName: normalizeName(emp, emp.displayName || "Unnamed Employee"),
              }))
              .sort((a, b) => a.displayName.localeCompare(b.displayName));

            return {
              ...managerRow,
              id: managerId,
              displayName: normalizeName(managerRow, "Unnamed Manager"),
              employees,
            };
          })
          .sort((a, b) => a.displayName.localeCompare(b.displayName));

        return {
          ...adminRow,
          id: adminId,
          displayName: normalizeName(adminRow, "Unnamed Admin"),
          managers,
        };
      });

      setHierarchy(nested.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    } catch (err) {
      setError(err?.message || "Failed to load hierarchy");
      setHierarchy([]);
      setManagers([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL, getToken]);

  useEffect(() => {
    loadHierarchy();
  }, [loadHierarchy]);

  const handleEdit = (adminRow) => {
    setEditingId(adminRow.id);
    setForm({
      assignedManagerIds: adminRow.managers.map((managerRow) => managerRow.id),
    });
    setManagerSearch("");
    setOpenModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = await getToken();
      const current = hierarchy.find((row) => row.id === editingId);
      if (!current) throw new Error("Admin not found");

      const managerUpdates = managers
        .filter((managerRow) => {
          const managerId = String(managerRow.uid || managerRow.id || "").trim();
          const currentAdminId = String(managerRow.adminId || managerRow.createdBy || "").trim();
          const shouldAssign = form.assignedManagerIds.includes(managerId);
          return (shouldAssign && currentAdminId !== editingId) || (!shouldAssign && currentAdminId === editingId);
        })
        .map((managerRow) => {
          const managerId = String(managerRow.uid || managerRow.id || "").trim();
          const shouldAssign = form.assignedManagerIds.includes(managerId);
          return fetch(`${API_URL}/api/managers/${managerId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...managerRow,
              adminId: shouldAssign ? editingId : "",
            }),
          });
        });

      const reassignmentResponses = await Promise.all(managerUpdates);
      for (const response of reassignmentResponses) {
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "Failed to update assignments");
        }
      }

      setOpenModal(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadHierarchy();
    } catch (err) {
      console.error("Update admin failed:", err);
      alert(err.message || "Failed to update admin");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setOpenModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setManagerSearch("");
  };

  const selectableManagers = useMemo(() => {
    return managers
      .map((managerRow) => ({
        ...managerRow,
        id: String(managerRow.uid || managerRow.id || "").trim(),
        displayName: normalizeName(managerRow, "Unnamed Manager"),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [managers]);

  const hierarchyById = useMemo(() => {
    return new Map(hierarchy.map((adminRow) => [adminRow.id, adminRow]));
  }, [hierarchy]);

  const activeAdmin = useMemo(() => {
    return editingId ? hierarchyById.get(editingId) || null : null;
  }, [editingId, hierarchyById]);

  const assignedManagers = useMemo(() => {
    return selectableManagers.filter((managerRow) => form.assignedManagerIds.includes(managerRow.id));
  }, [selectableManagers, form.assignedManagerIds]);

  const filteredManagerResults = useMemo(() => {
    const query = managerSearch.trim().toLowerCase();
    return selectableManagers.filter((managerRow) => {
      if (!query) return true;
      const haystack = `${managerRow.displayName} ${managerRow.email || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [managerSearch, selectableManagers]);

  const availableManagers = useMemo(() => {
    const query = managerSearch.trim().toLowerCase();
    return filteredManagerResults.filter((managerRow) => {
      const currentAdminId = String(managerRow.adminId || managerRow.createdBy || "").trim();
      if (form.assignedManagerIds.includes(managerRow.id)) return false;
      if (!query) return !currentAdminId;
      return !currentAdminId || currentAdminId !== editingId;
    });
  }, [filteredManagerResults, form.assignedManagerIds, managerSearch, editingId]);

  const searchedAssignedManagers = useMemo(() => {
    const query = managerSearch.trim().toLowerCase();
    if (!query) return [];
    return filteredManagerResults.filter((managerRow) => {
      const currentAdminId = String(managerRow.adminId || managerRow.createdBy || "").trim();
      return currentAdminId && currentAdminId !== editingId && !form.assignedManagerIds.includes(managerRow.id);
    });
  }, [filteredManagerResults, form.assignedManagerIds, managerSearch, editingId]);

  const addManager = (managerId) => {
    setForm((prev) => ({
      ...prev,
      assignedManagerIds: prev.assignedManagerIds.includes(managerId)
        ? prev.assignedManagerIds
        : [...prev.assignedManagerIds, managerId],
    }));
  };

  const removeManager = (managerId) => {
    setForm((prev) => ({
      ...prev,
      assignedManagerIds: prev.assignedManagerIds.filter((id) => id !== managerId),
    }));
  };

  const filteredHierarchy = useMemo(() => {
    const query = adminSearch.trim().toLowerCase();
    if (!query) return hierarchy;
    return hierarchy.filter((adminRow) => {
      const haystack = `${adminRow.displayName} ${adminRow.email || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [hierarchy, adminSearch]);

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6 md:p-10 space-y-5">
      <div className="mb-8">
        <div className="flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 md:w-2/3">
          <FaSearch className="text-slate-400" />
          <input
            type="text"
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            placeholder="Search admins by name or email..."
            className="w-full bg-transparent outline-none"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading hierarchy...</p>}
      {!loading && error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && filteredHierarchy.length === 0 && (
        <p className="text-sm text-gray-500">No admin data found.</p>
      )}

      {!loading && !error && filteredHierarchy.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHierarchy.map((adminRow) => {
              return (
                <div
                  key={adminRow.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <FaUserShield size={24} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-slate-900">
                          {adminRow.displayName}
                        </h3>
                        <p className="mt-1 break-words text-sm text-slate-500">
                          {adminRow.email || "No email available"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(adminRow)}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100"
                      >
                        <FaEdit className="text-blue-600" />
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-gray-200 bg-white px-4 py-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Managers</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {adminRow.managers.length}
                      </p>
                  </div>

                </div>
              );
            })}
        </div>
      )}

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-8 shadow-xl">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-5 top-5 text-xl text-gray-500 hover:text-gray-800"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="mb-1 text-3xl font-bold text-purple-700">Edit Admin</h2>
            <p className="mb-8 text-sm text-slate-500">
              {activeAdmin?.displayName || "Selected Admin"} manager assignment
            </p>

            <form className="space-y-5" onSubmit={handleSave}>
              <div>
                <label className="text-2xl font-medium sr-only">Search Manager</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-900 bg-white px-4 py-4">
                  <FaSearch className="text-slate-400" />
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none"
                    value={managerSearch}
                    onChange={(e) => setManagerSearch(e.target.value)}
                    placeholder="Search manager by name or email"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="font-semibold">Assigned Manager List</label>
                  <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-xl border border-gray-900 bg-white p-3">
                    {assignedManagers.length === 0 && (
                      <p className="text-sm text-slate-500">No assigned managers.</p>
                    )}
                    {assignedManagers.map((managerRow) => (
                      <div
                        key={managerRow.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-900 bg-white px-4 py-3 text-sm"
                      >
                        <span>
                          {managerRow.displayName} ({managerRow.email || "No email"})
                        </span>
                        <button
                          type="button"
                          onClick={() => removeManager(managerRow.id)}
                          className="rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold">Not Assigned Manager List</label>
                  <div className="mt-2 max-h-52 space-y-3 overflow-y-auto rounded-xl border border-gray-900 bg-white p-3">
                    {availableManagers.length === 0 && searchedAssignedManagers.length === 0 && (
                      <p className="text-sm text-slate-500">No available managers.</p>
                    )}
                    {availableManagers.map((managerRow) => (
                      <div
                        key={managerRow.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-900 bg-white px-4 py-3 text-sm"
                      >
                        <span>
                          {managerRow.displayName} ({managerRow.email || "No email"})
                        </span>
                        <button
                          type="button"
                          onClick={() => addManager(managerRow.id)}
                          className="rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                    {searchedAssignedManagers.map((managerRow) => {
                      const ownerAdminId = String(managerRow.adminId || managerRow.createdBy || "").trim();
                      const ownerAdmin = hierarchyById.get(ownerAdminId);
                      return (
                        <div
                          key={managerRow.id}
                          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                        >
                          {managerRow.displayName} ({managerRow.email || "No email"}) assigned to{" "}
                          {ownerAdmin?.displayName || "another admin"}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gradient-to-b from-fuchsia-500 to-purple-700 py-4 text-lg font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Update Admin"}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-gray-900 py-4 text-lg"
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
