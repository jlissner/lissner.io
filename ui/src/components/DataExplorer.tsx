import { useCallback, useEffect, useState } from "react";

interface Column {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

export function DataExplorer() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<Column[] | null>(null);
  const [count, setCount] = useState(0);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState<Record<string, string>>({});

  const fetchTables = useCallback(async () => {
    const res = await fetch("/api/admin/data-explorer/tables", { credentials: "include" });
    if (res.ok) setTables(await res.json());
  }, []);

  const fetchTableData = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    setError(null);
    try {
      const [schemaRes, rowsRes] = await Promise.all([
        fetch(`/api/admin/data-explorer/tables/${selectedTable}`, { credentials: "include" }),
        fetch(
          `/api/admin/data-explorer/tables/${selectedTable}/rows?limit=${limit}&offset=${offset}`,
          { credentials: "include" }
        ),
      ]);
      if (schemaRes.ok) {
        const { schema: s, count: c } = await schemaRes.json();
        setSchema(s);
        setCount(c);
      }
      if (rowsRes.ok) {
        setRows(await rowsRes.json());
      } else {
        const d = await rowsRes.json().catch(() => ({}));
        setError(d.error || "Failed to load");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [selectedTable, limit, offset]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (selectedTable) fetchTableData();
    else {
      setSchema(null);
      setRows([]);
      setCount(0);
    }
  }, [selectedTable, fetchTableData]);

  const handleAdd = useCallback(async () => {
    if (!selectedTable || !schema) return;
    const data: Record<string, unknown> = {};
    for (const col of schema) {
      const v = newRow[col.name];
      if (v !== undefined && v !== "") {
        data[col.name] = col.type.includes("INT") ? (v ? parseInt(v, 10) : null) : v;
      }
    }
    try {
      const res = await fetch(`/api/admin/data-explorer/tables/${selectedTable}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setAddingRow(false);
        setNewRow({});
        fetchTableData();
      } else {
        setError(d.error || "Insert failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Insert failed");
    }
  }, [selectedTable, schema, newRow, fetchTableData]);

  const handleUpdate = useCallback(
    async (row: Record<string, unknown>) => {
      if (!selectedTable || !schema) return;
      const pkCols = schema.filter((c) => c.pk).map((c) => c.name);
      const pk: Record<string, unknown> = {};
      for (const c of pkCols) pk[c] = row[c];
      const data: Record<string, unknown> = {};
      for (const col of schema.filter((c) => !c.pk)) {
        if (editingRow && col.name in editingRow) {
          const v = editingRow[col.name];
          data[col.name] = col.type.includes("INT") && v !== "" ? parseInt(String(v), 10) : v;
        }
      }
      try {
        const res = await fetch(`/api/admin/data-explorer/tables/${selectedTable}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pk, ...data }),
          credentials: "include",
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok) {
          setEditingRow(null);
          fetchTableData();
        } else {
          setError(d.error || "Update failed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    },
    [selectedTable, schema, editingRow, fetchTableData]
  );

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      if (!selectedTable || !schema || !confirm("Delete this row?")) return;
      const pkCols = schema.filter((c) => c.pk).map((c) => c.name);
      const pk: Record<string, unknown> = {};
      for (const c of pkCols) pk[c] = row[c];
      try {
        const res = await fetch(`/api/admin/data-explorer/tables/${selectedTable}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pk }),
          credentials: "include",
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok) {
          fetchTableData();
        } else {
          setError(d.error || "Delete failed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [selectedTable, schema, fetchTableData]
  );

  const pkCols = schema?.filter((c) => c.pk).map((c) => c.name) ?? [];

  return (
    <div className="data-explorer">
      <h3>Data Explorer</h3>
      <p className="data-explorer__desc">
        Browse and edit tables. Schema is discovered automatically.
      </p>

      <div className="data-explorer__toolbar">
        <select
          value={selectedTable ?? ""}
          onChange={(e) => {
            setSelectedTable(e.target.value || null);
            setOffset(0);
            setEditingRow(null);
            setAddingRow(false);
          }}
          className="form__select"
        >
          <option value="">Select a table…</option>
          {tables.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {selectedTable && (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              setAddingRow(true);
              setNewRow({});
            }}
          >
            Add row
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert--danger">
          <p>{error}</p>
        </div>
      )}

      {selectedTable && schema && (
        <>
          <p className="data-explorer__meta">
            {count} row{count !== 1 ? "s" : ""}
            {count > limit && ` (showing ${limit} per page)`}
          </p>

          {addingRow && (
            <div className="data-explorer__form">
              <h4>New row</h4>
              {schema.map((col) => (
                <label key={col.name} className="data-explorer__field">
                  <span>{col.name}</span>
                  <input
                    type={col.type.includes("INT") ? "number" : "text"}
                    value={newRow[col.name] ?? ""}
                    onChange={(e) => setNewRow((prev) => ({ ...prev, [col.name]: e.target.value }))}
                    className="form__input"
                    placeholder={col.pk ? "(optional for auto)" : ""}
                  />
                </label>
              ))}
              <div className="data-explorer__form-actions">
                <button type="button" className="btn btn--primary" onClick={handleAdd}>
                  Insert
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setAddingRow(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="empty">Loading…</p>
          ) : (
            <div className="data-explorer__table-wrap">
              <table className="data-explorer__table">
                <thead>
                  <tr>
                    {schema.map((c) => (
                      <th key={c.name}>
                        {c.name}
                        {c.pk ? " (PK)" : ""}
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      {editingRow && pkCols.every((pk) => row[pk] === editingRow[pk]) ? (
                        <>
                          {schema.map((col) => (
                            <td key={col.name}>
                              {col.pk ? (
                                String(row[col.name] ?? "NULL")
                              ) : (
                                <input
                                  type={col.type.includes("INT") ? "number" : "text"}
                                  value={String(editingRow[col.name] ?? "")}
                                  onChange={(e) =>
                                    setEditingRow((prev) => ({
                                      ...prev,
                                      [col.name]: e.target.value,
                                    }))
                                  }
                                  className="form__input form__input--sm"
                                />
                              )}
                            </td>
                          ))}
                          <td>
                            <button
                              type="button"
                              className="btn btn--primary btn--sm"
                              onClick={() => handleUpdate(row)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => setEditingRow(null)}
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          {schema.map((col) => (
                            <td key={col.name}>{String(row[col.name] ?? "NULL")}</td>
                          ))}
                          <td>
                            <button
                              type="button"
                              className="btn btn--secondary btn--sm"
                              onClick={() => setEditingRow({ ...row })}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn--danger btn--sm"
                              onClick={() => handleDelete(row)}
                            >
                              Delete
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {count > limit && (
            <div className="data-explorer__pagination">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
              >
                Previous
              </button>
              <span>
                {offset + 1}–{Math.min(offset + limit, count)} of {count}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={offset + limit >= count}
                onClick={() => setOffset((o) => o + limit)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
