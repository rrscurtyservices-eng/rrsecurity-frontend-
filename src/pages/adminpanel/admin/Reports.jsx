import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { FaDownload } from "react-icons/fa";
import { auth } from "../../../firebase";
import { API_URL } from "../../../api/employee";

const pieColors = ["#16a34a", "#f59e0b", "#60a5fa", "#ef4444"];

export default function Reports() {
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const getToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    return user.getIdToken();
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const [empRes, mgrRes] = await Promise.all([
          fetch(`${API_URL}/api/employees`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/managers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (empRes.ok) {
          setEmployees(await empRes.json());
        }
        if (mgrRes.ok) {
          setManagers(await mgrRes.json());
        }
      } catch (err) {
        console.error("Load reports failed:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const kpis = useMemo(() => {
    const activeEmployees = employees.filter((e) => e.status === "Active");
    const activeManagers = managers.filter((m) => m.status === "Active");
    return [
      {
        id: 1,
        title: "Total Employees",
        value: String(employees.length),
        change: `${activeEmployees.length} active`,
      },
      {
        id: 2,
        title: "Total Managers",
        value: String(managers.length),
        change: `${activeManagers.length} active`,
      },
      {
        id: 3,
        title: "Departments (Employees)",
        value: String(
          new Set(
            employees.map((e) => (e.dept || "").trim()).filter(Boolean)
          ).size
        ),
        change: "unique depts",
      },
      {
        id: 4,
        title: "Departments (Managers)",
        value: String(
          new Set(
            managers.map((m) => (m.dept || "").trim()).filter(Boolean)
          ).size
        ),
        change: "unique depts",
      },
    ];
  }, [employees, managers]);

  const deptData = useMemo(() => {
    const counts = new Map();
    employees.forEach((e) => {
      const key = (e.dept || "Unassigned").trim() || "Unassigned";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [employees]);

  const managerDeptData = useMemo(() => {
    const counts = new Map();
    managers.forEach((m) => {
      const key = (m.dept || "Unassigned").trim() || "Unassigned";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [managers]);

  const topEmployees = useMemo(() => {
    const rows = employees.map((e) => ({
      name: e.name || "-",
      dept: e.dept || "-",
      status: e.status || "Active",
    }));
    return rows.slice(0, 10);
  }, [employees]);

  const exportExcel = () => {
    const esc = (v) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const rows = [];
    rows.push(
      `<tr><th colspan="5">Employees Report</th></tr>`,
      `<tr><td>Generated At</td><td>${esc(
        new Date().toISOString()
      )}</td><td>Employees</td><td>${employees.length}</td><td>Managers</td><td>${managers.length}</td></tr>`,
      `<tr><td colspan="6"></td></tr>`,
      `<tr><th colspan="5">Employees</th></tr>`,
      `<tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Status</th></tr>`
    );

    employees.forEach((e) => {
      rows.push(
        `<tr><td>${esc(e.name)}</td><td>${esc(
          e.email
        )}</td><td>${esc(e.dept)}</td><td>${esc(
          e.jobRole || e.role
        )}</td><td>${esc(e.status)}</td></tr>`
      );
    });

    rows.push(
      `<tr><td colspan="6"></td></tr>`,
      `<tr><th colspan="5">Managers</th></tr>`,
      `<tr><th>Name</th><th>Email</th><th>Department</th><th>Status</th></tr>`
    );

    managers.forEach((m) => {
      rows.push(
        `<tr><td>${esc(m.name)}</td><td>${esc(
          m.email
        )}</td><td>${esc(m.dept)}</td><td>${esc(m.status)}</td></tr>`
      );
    });

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table border="1">${rows.join("")}</table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reports_${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 sm:p-10 bg-gray-50 min-h-screen w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500">
            Insights based on employees and managers data
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select className="px-4 py-2 rounded-md border bg-white text-sm">
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Year</option>
          </select>
          <button
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition"
            onClick={exportExcel}
            type="button"
          >
            <FaDownload /> Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading && (
          <div className="text-sm text-gray-500">Loading report data...</div>
        )}
        {kpis.map((k) => (
          <div key={k.id} className="bg-white rounded-lg p-5 border shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-50">
                  <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-green-600 font-bold">
                    ✓
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{k.title}</div>
                  <div className="text-2xl font-semibold text-slate-900 mt-2">
                    {k.value}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{k.change}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Employee Distribution by Department */}
        <div className="bg-white rounded-lg p-5 border shadow-sm">
          <h3 className="text-md font-medium text-slate-900 mb-4">
            Employees by Department
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={deptData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#1e40af" barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Manager Distribution by Department */}
        <div className="bg-white rounded-lg p-5 border shadow-sm">
          <h3 className="text-md font-medium text-slate-900 mb-4">
            Managers by Department
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={managerDeptData}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                innerRadius={50}
                label
              >
                {managerDeptData.map((entry, index) => (
                  <Cell key={index} fill={pieColors[index]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-5 border shadow-sm">
          <h3 className="text-md font-medium text-slate-900 mb-2">Notes</h3>
          <p className="text-sm text-gray-600">
            Attendance analytics are not connected yet. This report currently
            reflects employees and managers data only.
          </p>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg p-5 border shadow-sm mb-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-medium text-slate-900">Employees</h3>
          <select className="px-3 py-2 rounded-md border bg-white text-sm">
            <option>All Departments</option>
          </select>
        </div>

        <table className="w-full min-w-max text-sm">
          <thead className="text-gray-700 bg-gray-50">
            <tr>
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">Employee Name</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>

          <tbody className="text-gray-600">
            {topEmployees.map((t, idx) => (
              <tr key={`${t.name}-${idx}`} className="border-t">
                <td className="py-4 px-4">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-medium">
                    {idx + 1}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      {t.name.charAt(0)}
                    </div>
                    <div className="font-medium text-gray-900">{t.name}</div>
                  </div>
                </td>
                <td className="py-4 px-4">{t.dept}</td>
                <td className="py-4 px-4">
                  <span className="px-3 py-1 rounded-full text-xs bg-green-50 text-green-700">
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insights */}
      <div className="bg-white rounded-lg p-5 border shadow-sm space-y-4">
        <h3 className="text-md font-medium text-slate-900">Insights</h3>
        <InsightBox
          bg="bg-blue-50"
          border="border-blue-100"
          icon="i"
          title="Data Source"
          text="This report currently uses employees and managers data only."
          textColor="text-blue-800"
        />
      </div>
    </div>
  );
}

function InsightBox({ bg, border, icon, title, text, textColor }) {
  return (
    <div className={`p-4 rounded-md border ${bg} ${border}`}>
      <div className="flex items-start gap-3">
        <div className={`text-xl ${textColor}`}>{icon}</div>
        <div>
          <div className={`font-semibold ${textColor}`}>{title}</div>
          <div className="text-sm text-gray-700">{text}</div>
        </div>
      </div>
    </div>
  );
}
