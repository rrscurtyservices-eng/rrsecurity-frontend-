import React, { useEffect, useMemo, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import api from "../../services/api";

const clean = (v) => String(v || "").trim();
const isEmailDuplicateError = (e) => {
  const code = String(e?.code || "").toLowerCase();
  const msg = String(e?.response?.data?.message || e?.message || "").toLowerCase();
  return (
    code.includes("email-already") ||
    msg.includes("email already") ||
    msg.includes("already in use") ||
    (msg.includes("duplicate") && msg.includes("email"))
  );
};
const hasEmail = (arr, email) =>
  (arr || []).some((u) => String(u?.email || "").toLowerCase() === String(email || "").toLowerCase());
const titleCase = (v) => {
  const s = clean(v).toLowerCase();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const ENTITY_CONFIGS = {
  admin: {
    title: "Admins",
    addTitle: "Add Admin",
    listEndpoint: "/superadmin/admins",
    createEndpoint: "/superadmin/admins",
    listKey: "users",
    searchPlaceholder: "Search by name/email",
    initialForm: { email: "", password: "", name: "" },
    buildCreatePayload: (form) => ({
      email: clean(form.email).toLowerCase(),
      password: String(form.password || ""),
      name: clean(form.name),
    }),
    validateCreate: ({ email, password }) => {
      if (!email || !password) throw new Error("Email and password are required");
    },
    filter: (u, needle) => {
      const email = String(u.email || "").toLowerCase();
      const name = String(u.name || "").toLowerCase();
      return email.includes(needle) || name.includes(needle);
    },
    columns: (actions) => [
      { key: "name", label: "Name", render: (u) => u.name || "-" },
      { key: "email", label: "Email", render: (u) => u.email || "-" },
      { key: "status", label: "Status", render: (u) => String(u.status || "active") },
      { key: "action", label: "Action", render: (u) => actions.admin(u) },
    ],
  },
  manager: {
    title: "Managers",
    addTitle: "Add Manager",
    listEndpoint: "/superadmin/managers",
    createEndpoint: "/superadmin/managers",
    listKey: "users",
    searchPlaceholder: "Search",
    initialForm: { email: "", password: "", name: "", city: "", zone: "" },
    buildCreatePayload: (form) => ({
      email: clean(form.email).toLowerCase(),
      password: String(form.password || ""),
      name: clean(form.name),
      city: clean(form.city),
      zone: clean(form.zone),
    }),
    validateCreate: ({ email, password, name }) => {
      if (!name) throw new Error("Name is required");
      if (!email || !password) throw new Error("Email and password are required");
    },
    postLoad: (users) => {
      const seen = new Map();
      const deduped = [];
      for (const u of users) {
        const email = String(u?.email || "").trim().toLowerCase();
        if (!email) {
          deduped.push(u);
          continue;
        }
        const next = (seen.get(email) || 0) + 1;
        seen.set(email, next);
        if (next > 1) continue;
        deduped.push(u);
      }
      return deduped;
    },
    filter: (u, needle) => {
      const email = String(u.email || "").toLowerCase();
      const name = String(u.name || "").toLowerCase();
      const city = String(u.city || "").toLowerCase();
      const zone = String(u.zone || "").toLowerCase();
      return (
        email.includes(needle) ||
        name.includes(needle) ||
        city.includes(needle) ||
        zone.includes(needle)
      );
    },
    columns: (actions) => [
      { key: "name", label: "Name", render: (u) => actions.managerName(u) },
      { key: "email", label: "Email", render: (u) => u.email || "-" },
      { key: "city", label: "City", render: (u) => u.city || "-" },
      { key: "zone", label: "Zone", render: (u) => u.zone || "-" },
      { key: "status", label: "Status", render: (u) => actions.managerStatus(u) },
      { key: "action", label: "Action", render: (u) => actions.managerActions(u) },
    ],
  },
  guard: {
    title: "Employees",
    addTitle: "Add Employee",
    listEndpoint: "/superadmin/employees",
    createEndpoint: "/superadmin/employees",
    listKey: "employees",
    searchPlaceholder: "Search by name/email/department",
    initialForm: {
      email: "",
      password: "",
      name: "",
      department: "",
      managerId: "",
      managerEmail: "",
    },
    extraLoads: ["/superadmin/managers"],
    buildCreatePayload: (form, extras) => {
      const managers = extras?.managers || [];
      const managerId = clean(form.managerId);
      const managerEmail =
        clean(form.managerEmail) ||
        (managerId ? clean(managers.find((m) => (m.id || m.uid) === managerId)?.email) : "");
      return {
        email: clean(form.email).toLowerCase(),
        tempPassword: String(form.password || ""),
        name: clean(form.name),
        department: clean(form.department),
        managerId,
        managerEmail,
      };
    },
    validateCreate: ({ email, password }) => {
      if (!email || !password) throw new Error("Email and password are required");
    },
    filter: (g, needle) => {
      const email = String(g.email || "").toLowerCase();
      const name = String(g.name || "").toLowerCase();
      const dept = String(g.department || "").toLowerCase();
      return email.includes(needle) || name.includes(needle) || dept.includes(needle);
    },
    columns: (actions) => [
      { key: "name", label: "Name", render: (g) => g.name || "-" },
      { key: "email", label: "Email", render: (g) => g.email || "-" },
      { key: "department", label: "Department", render: (g) => g.department || "-" },
      { key: "manager", label: "Manager", render: (g) => g.managerEmail || g.managerId || "-" },
      { key: "action", label: "Action", render: (g) => actions.guardActions(g) },
    ],
  },
};

export default function EntityPage({ entityType }) {
  const config = ENTITY_CONFIGS[entityType];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(config?.initialForm || {});
  const [extras, setExtras] = useState({});
  const [page, setPage] = useState(1);
  const pageSize = 10;

  if (!config) return null;

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      if (config.extraLoads?.length) {
        const [listRes, ...extrasRes] = await Promise.all([
          api.get(config.listEndpoint),
          ...config.extraLoads.map((u) => api.get(u)),
        ]);
        const main = listRes?.data?.[config.listKey] || [];
        const next = config.postLoad ? config.postLoad(main) : main;
        setList(next);
        const extrasMap = {};
        if (extrasRes[0]) extrasMap.managers = extrasRes[0]?.data?.users || [];
        setExtras(extrasMap);
      } else {
        const res = await api.get(config.listEndpoint);
        const main = res?.data?.[config.listKey] || [];
        const next = config.postLoad ? config.postLoad(main) : main;
        setList(next);
      }
    } catch (e) {
      console.error(e);
      setError(`Failed to load ${config.title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [entityType]);

  const filtered = useMemo(() => {
    const needle = clean(q).toLowerCase();
    if (!needle) return list;
    return list.filter((u) => config.filter(u, needle));
  }, [list, q, config]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const createEntity = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = config.buildCreatePayload(form, extras);
      config.validateCreate(payload);
      if (hasEmail(list, payload.email)) throw new Error("Email already exists");
      await api.post(config.createEndpoint, payload);
      setForm(config.initialForm);
      await load();
    } catch (e) {
      console.error(e);
      setError(
        isEmailDuplicateError(e)
          ? "Email already exists"
          : e?.response?.data?.message || e?.message || `Failed to create ${entityType}`
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (uid, next, label) => {
    try {
      await api.put(`/superadmin/users/${uid}`, { status: next });
      await load();
    } catch (e) {
      console.error(e);
      setError(`Failed to update ${label}`);
    }
  };

  const deleteUser = async (uid, email, label) => {
    if (!window.confirm(`Do you want to delete this ${label}?`)) return;
    try {
      setError("");
      await api.delete(`/superadmin/users/${uid}`);
      await load();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || `Failed to delete ${label}`);
    }
  };

  const guardDelete = async (row) => {
    const email = row?.email || "";
    const uid =
      row?.uid ||
      row?.firebaseUid ||
      row?.userId ||
      (String(row?.id || "").length >= 20 ? row.id : "");
    if (!uid) {
      setError("Cannot delete employee: missing uid");
      return;
    }
    await deleteUser(uid, email, email ? `employee (${email})` : "employee");
  };

  const actions = {
    admin: (u) => {
      const status = String(u.status || "active");
      const uid = u.id || u.uid;
      return (
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
            onClick={() =>
              toggleStatus(uid, status.toLowerCase() === "active" ? "blocked" : "active", "admin")
            }
            type="button"
          >
            {status.toLowerCase() === "active" ? "Block" : "Unblock"}
          </button>
          <button
            className="px-3 py-1.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50"
            onClick={() => deleteUser(uid, u.email, u.email ? `admin (${u.email})` : "admin")}
            type="button"
          >
            Delete
          </button>
        </div>
      );
    },
    managerName: (u) => (
      <div className="flex items-center gap-2">
        <span>{u.name || "Unnamed"}</span>
        <button
          type="button"
          onClick={async () => {
            const next = clean(window.prompt("Enter manager name", u.name || ""));
            if (!next) return;
            try {
              await api.put(`/superadmin/users/${u.id || u.uid}`, { name: next });
              await load();
            } catch (e) {
              console.error(e);
              setError("Failed to update manager");
            }
          }}
          className="p-1 rounded hover:bg-gray-100 text-blue-700"
          aria-label="Edit name"
          title="Edit name"
        >
          <FaEdit className="w-3.5 h-3.5" />
        </button>
      </div>
    ),
    managerStatus: (u) => {
      const statusKey = String(u.status || "active").toLowerCase();
      return titleCase(statusKey) || "Active";
    },
    managerActions: (u) => {
      const statusKey = String(u.status || "active").toLowerCase();
      const uid = u.id || u.uid;
      return (
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
            onClick={() =>
              toggleStatus(uid, statusKey === "active" ? "blocked" : "active", "manager")
            }
            type="button"
          >
            {statusKey === "active" ? "Block" : "Unblock"}
          </button>
          <button
            className="p-1.5 rounded hover:bg-red-50 text-red-700 border border-red-200"
            onClick={() => deleteUser(uid, u.email, u.email ? `manager (${u.email})` : "manager")}
            type="button"
            aria-label="Delete manager"
            title="Delete manager"
          >
            <FaTrash className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    },
    guardActions: (g) => (
      <button
        className="px-3 py-1.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50"
        type="button"
        onClick={() => guardDelete(g)}
      >
        Delete
      </button>
    ),
  };

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <div className="text-lg font-semibold text-gray-900">{config.addTitle}</div>
        <form
          onSubmit={createEntity}
          className={`mt-4 grid grid-cols-1 ${entityType === "admin" ? "md:grid-cols-4" : "md:grid-cols-6"} gap-3`}
        >
          {entityType !== "guard" && (
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required={entityType === "manager"}
            />
          )}
          {entityType === "guard" && (
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          )}
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required
          />
          {entityType === "manager" && (
            <>
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              />
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Zone"
                value={form.zone}
                onChange={(e) => setForm((p) => ({ ...p, zone: e.target.value }))}
              />
            </>
          )}
          {entityType === "guard" && (
            <>
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Department"
                value={form.department}
                onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
              />
              <select
                className="border rounded-lg px-3 py-2"
                value={form.managerId}
                onChange={(e) => setForm((p) => ({ ...p, managerId: e.target.value }))}
              >
                <option value="">Assign Manager</option>
                {(extras.managers || []).map((m) => (
                  <option key={m.id || m.uid} value={m.id || m.uid}>
                    {m.name || m.email}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Creating..." : config.addTitle.replace("Add ", "Create ")}
          </button>
        </form>
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-lg font-semibold text-gray-900">{config.title}</div>
          <input
            className="border rounded-lg px-3 py-2"
            placeholder={config.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                {config.columns(actions).map((c) => (
                  <th key={c.key} className="py-2 pr-4">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr key={row.id || row.uid} className="border-b last:border-b-0">
                  {config.columns(actions).map((c) => (
                    <td key={c.key} className="py-2 pr-4">{c.render(row)}</td>
                  ))}
                </tr>
              ))}
              {!paged.length && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={config.columns(actions).length}>
                    No {config.title.toLowerCase()} found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between text-sm">
            <button
              className="px-3 py-1.5 border rounded-lg disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <div>
              Page {page} of {pageCount}
            </div>
            <button
              className="px-3 py-1.5 border rounded-lg disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
