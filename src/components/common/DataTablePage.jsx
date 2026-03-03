import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

export default function DataTablePage({
  title,
  columns,
  apiEndpoint,
  role,
  allowCreate = false,
  allowDelete = false,
  renderCreateForm,
  renderRowActions,
  renderHeader,
  renderToolbar,
  mapResponse,
  requestParams,
  queryPlaceholder = "Search",
  containerClassName = "space-y-6",
  children,
}) {
  const [loading, setLoading] = useState(Boolean(apiEndpoint));
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");

  const load = async () => {
    if (!apiEndpoint) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.get(apiEndpoint, { params: requestParams || {} });
      const data = mapResponse ? mapResponse(res) : res?.data?.users || res?.data?.items || [];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [apiEndpoint]);

  const filtered = useMemo(() => {
    if (!query) return rows;
    const needle = String(query).toLowerCase();
    return rows.filter((row) => JSON.stringify(row || {}).toLowerCase().includes(needle));
  }, [rows, query]);

  if (children) {
    return <div className={containerClassName}>{children}</div>;
  }

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>;

  return (
    <div className={containerClassName}>
      {renderHeader ? renderHeader({ title, role }) : null}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      {allowCreate && renderCreateForm ? renderCreateForm({ reload: load }) : null}

      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
        {renderToolbar ? (
          renderToolbar({ query, setQuery })
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            <input
              className="border rounded-lg px-3 py-2"
              placeholder={queryPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                {(columns || []).map((col) => (
                  <th key={col.key} className="py-2 pr-4">{col.label}</th>
                ))}
                {renderRowActions ? <th className="py-2 pr-4">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={row.id || row.uid || idx} className="border-b last:border-b-0">
                  {(columns || []).map((col) => (
                    <td key={col.key} className="py-2 pr-4">
                      {col.render ? col.render(row) : row[col.key] ?? "-"}
                    </td>
                  ))}
                  {renderRowActions ? (
                    <td className="py-2 pr-4">{renderRowActions(row, { reload: load, allowDelete })}</td>
                  ) : null}
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    className="py-3 text-gray-500"
                    colSpan={(columns || []).length + (renderRowActions ? 1 : 0)}
                  >
                    No data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
