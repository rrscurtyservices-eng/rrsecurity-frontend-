import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaUserTie, FaEdit, FaSearch, FaTimes } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import { auth } from "../../../firebase";
import { API_URL } from "../../../api/employee";

const emptyForm = {
  assignedEmployeeIds: [],
};

export default function Managers() {
  const location = useLocation();
  const isSuperAdminView = location.pathname.startsWith("/superadmin");
  const [managers, setManagers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [empSearch, setEmpSearch] = useState("");

  const getToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    return user.getIdToken();
  }, []);

  const fetchManagers = useCallback(async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/managers`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to load managers");
    }

    const data = await res.json();
    setManagers(data);
  }, [API_URL, getToken]);

  const fetchEmployees = useCallback(async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/employees`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to load employees");
    }

    const data = await res.json();
    const guardsOnly = data.filter((emp) => {
      const roleName = String(emp.jobRole || "").trim().toLowerCase();
      return roleName === "security guard" || roleName === "";
    });
    setEmployees(guardsOnly);
  }, [API_URL, getToken]);

  const fetchAdmins = useCallback(async () => {
    if (!isSuperAdminView) {
      setAdmins([]);
      return;
    }
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/admins`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to load admins");
    }
    const data = await res.json();
    setAdmins(Array.isArray(data) ? data : []);
  }, [API_URL, getToken, isSuperAdminView]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchManagers(), fetchEmployees(), fetchAdmins()])
      .catch((err) => {
        console.error(err);
        alert(err.message || "Failed to load data");
      })
      .finally(() => setLoading(false));
  }, [fetchManagers, fetchEmployees, fetchAdmins]);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    try {
      const token = await getToken();
      const assignedEmployeeIds = Array.isArray(form.assignedEmployeeIds)
        ? form.assignedEmployeeIds.filter(Boolean)
        : [];
      const employeesCount = assignedEmployeeIds.length;

      if (editingId) {
        const res = await fetch(`${API_URL}/api/managers/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employeesCount,
            assignedEmployeeIds,
          }),
        });
        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(body.message || "Failed to update manager");
        }
        setFormSuccess("Manager updated successfully.");
      } else {
        if (isSuperAdminView && !form.adminId) {
          throw new Error("Please select an admin");
        }
        const res = await fetch(`${API_URL}/api/managers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            name: form.name,
            dept: form.dept,
            ...(isSuperAdminView ? { adminId: form.adminId } : {}),
            employeesCount,
            assignedEmployeeIds,
          }),
        });
        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(body.message || "Failed to add manager");
        }

        if (body.emailSent === false) {
          setFormError(body.emailReason || "Manager created, but welcome email was not sent.");
        } else {
          setFormSuccess("Manager created and welcome email sent.");
        }
      }

      setForm(emptyForm);
      setEditingId(null);
      setOpenModal(false);
      await fetchManagers();
    } catch (err) {
      console.error("Save manager failed:", err);
      setFormError(err.message || "Failed to save manager");
    }
  };

  const handleEdit = (mgr) => {
    setFormError("");
    setFormSuccess("");
    const assignedEmployeeIds = Array.isArray(mgr.assignedEmployeeIds)
      ? mgr.assignedEmployeeIds
      : [];

    setForm({
      assignedEmployeeIds,
    });
    setEditingId(mgr.uid || mgr.id);
    setEmpSearch("");
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setFormSuccess("");
    setEmpSearch("");
  };

  const assignedNames = (manager) => {
    const ids = Array.isArray(manager.assignedEmployeeIds)
      ? manager.assignedEmployeeIds
      : [];
    if (ids.length === 0) return "-";
    const names = ids
      .map((id) => {
        const emp = employees.find((e) => e.uid === id || e.id === id);
        return emp?.name;
      })
      .filter(Boolean);
    return names.length ? names.join(", ") : "-";
  };

  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const name = String(e.name || "").toLowerCase();
      const email = String(e.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [employees, empSearch]);

  const managersById = useMemo(() => {
    return new Map(
      managers.map((manager) => [String(manager.uid || manager.id || "").trim(), manager])
    );
  }, [managers]);

  const activeManager = useMemo(() => {
    return managers.find((mgr) => String(mgr.uid || mgr.id || "").trim() === String(editingId || "").trim()) || null;
  }, [managers, editingId]);

  const assignedEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const id = String(emp.uid || emp.id || "").trim();
      return form.assignedEmployeeIds.includes(id);
    });
  }, [employees, form.assignedEmployeeIds]);

  const availableEmployees = useMemo(() => {
    const query = empSearch.trim().toLowerCase();
    return filteredEmployees.filter((emp) => {
      const id = String(emp.uid || emp.id || "").trim();
      const ownerManagerId = String(
        emp.managerId || emp.assignedManagerId || emp.assignedManagerUid || ""
      ).trim();
      if (form.assignedEmployeeIds.includes(id)) return false;
      if (!query) return !ownerManagerId;
      return !ownerManagerId || ownerManagerId === String(editingId || "").trim();
    });
  }, [filteredEmployees, form.assignedEmployeeIds, empSearch, editingId]);

  const searchedAssignedEmployees = useMemo(() => {
    const query = empSearch.trim().toLowerCase();
    if (!query) return [];
    return filteredEmployees.filter((emp) => {
      const id = String(emp.uid || emp.id || "").trim();
      const ownerManagerId = String(
        emp.managerId || emp.assignedManagerId || emp.assignedManagerUid || ""
      ).trim();
      return ownerManagerId && ownerManagerId !== String(editingId || "").trim() && !form.assignedEmployeeIds.includes(id);
    });
  }, [filteredEmployees, form.assignedEmployeeIds, empSearch, editingId]);

  const addEmployee = (employeeId) => {
    setForm((prev) => ({
      ...prev,
      assignedEmployeeIds: prev.assignedEmployeeIds.includes(employeeId)
        ? prev.assignedEmployeeIds
        : [...prev.assignedEmployeeIds, employeeId],
    }));
  };

  const removeEmployee = (employeeId) => {
    setForm((prev) => ({
      ...prev,
      assignedEmployeeIds: prev.assignedEmployeeIds.filter((id) => id !== employeeId),
    }));
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-gray-50 min-h-screen w-full">
      {formError && !openModal && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}
      {formSuccess && !openModal && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {formSuccess}
        </div>
      )}
      <div className="mb-8">
        <div className="flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 md:w-2/3">
          <FaSearch className="text-slate-400" />
          <input
            type="text"
            placeholder="Search managers by name, email, or department..."
            className="w-full bg-transparent outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && (
          <div className="col-span-full text-gray-500">Loading data...</div>
        )}
        {managers.map((manager) => (
          <div
            key={manager.uid || manager.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaUserTie size={28} className="text-blue-600" />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-gray-900">
                    {manager.name}
                  </h3>
                  <p className="mt-1 break-words text-sm text-gray-500">
                    {manager.email}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100"
                  onClick={() => handleEdit(manager)}
                >
                  <FaEdit size={14} className="text-blue-600" />
                  Edit
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 bg-white px-4 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Employees</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {Array.isArray(manager.assignedEmployeeIds)
                  ? manager.assignedEmployeeIds.length
                  : manager.employeesCount || manager.employees || 0}
              </p>
            </div>
          </div>
        ))}
      </div>

      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl p-8 relative my-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <button
              className="absolute right-6 top-6 text-gray-600 text-2xl hover:text-gray-900"
              onClick={handleClose}
              type="button"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="text-3xl font-bold text-purple-700 mb-1">Edit Manager</h2>
            <p className="mb-6 text-sm text-slate-500">
              {activeManager?.name || activeManager?.fullName || activeManager?.email || "Selected Manager"} employee assignment
            </p>

            <form className="space-y-5" onSubmit={handleSave}>
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {formSuccess}
                </div>
              )}
              <div>
                <label className="font-medium">Search Employee</label>
                <div className="mt-2 flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-3">
                  <FaSearch className="text-slate-400" />
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none"
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    placeholder="Search employee by name or email"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="font-medium">Assigned Employee List</label>
                  <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-lg border bg-gray-50 p-3">
                    {assignedEmployees.length === 0 && (
                      <p className="text-sm text-slate-500">No assigned employees.</p>
                    )}
                    {assignedEmployees.map((emp) => {
                      const id = String(emp.uid || emp.id || "").trim();
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm"
                        >
                          <span>
                            {emp.name || emp.fullName || "Unnamed Employee"} ({emp.email || "No email"})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeEmployee(id)}
                            className="rounded-md bg-red-600 px-2.5 py-1 text-xs text-white hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="font-medium">Not Assigned Employee List</label>
                  <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-lg border bg-gray-50 p-3">
                    {availableEmployees.length === 0 && searchedAssignedEmployees.length === 0 && (
                      <p className="text-sm text-slate-500">No available employees.</p>
                    )}
                    {availableEmployees.map((emp) => {
                      const id = String(emp.uid || emp.id || "").trim();
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm"
                        >
                          <span>
                            {emp.name || emp.fullName || "Unnamed Employee"} ({emp.email || "No email"})
                          </span>
                          <button
                            type="button"
                            onClick={() => addEmployee(id)}
                            className="rounded-md bg-green-600 px-2.5 py-1 text-xs text-white hover:bg-green-700"
                          >
                            Add
                          </button>
                        </div>
                      );
                    })}
                    {searchedAssignedEmployees.map((emp) => {
                      const ownerManagerId = String(
                        emp.managerId || emp.assignedManagerId || emp.assignedManagerUid || ""
                      ).trim();
                      const ownerManager = managersById.get(ownerManagerId);
                      return (
                        <div
                          key={String(emp.uid || emp.id || "").trim()}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                        >
                          {emp.name || emp.fullName || "Unnamed Employee"} ({emp.email || "No email"}) assigned to{" "}
                          {ownerManager?.name || ownerManager?.fullName || ownerManager?.email || "another manager"}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-purple-700 text-white py-3 rounded-lg text-lg font-semibold"
                >
                  Update Manager
                </button>
                <button
                  type="button"
                  onClick={handleClose}
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
