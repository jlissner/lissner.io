import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  deleteDataExplorerRow,
  getDataExplorerRows,
  getDataExplorerSchema,
  insertDataExplorerRow,
  listDataExplorerTables,
  type DataExplorerColumn as Column,
  updateDataExplorerRow,
} from "../api";

function parseColumnValueForWrite(col: Column, raw: string | undefined): unknown {
  if (raw === undefined || raw === "") return undefined;
  const isIntColumn = col.type.includes("INT");
  if (!isIntColumn) return raw;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatSearchMeta(count: number, query: string): string {
  const trimmed = query.trim();
  if (trimmed !== "") {
    const suffix = count === 1 ? "" : "es";
    return `${count} match${suffix} for "${trimmed}"`;
  }
  const rowSuffix = count === 1 ? "" : "s";
  return `${count} row${rowSuffix}`;
}

export function DataExplorer() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<Column[] | null>(null);
  const [count, setCount] = useState(0);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState<Record<string, string>>({});

  const fetchTables = useCallback(async () => {
    setTables(await listDataExplorerTables());
  }, []);

  const fetchTableData = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    setError(null);
    try {
      const query = debouncedSearch.trim();
      const [schemaData, rowData] = await Promise.all([
        getDataExplorerSchema(selectedTable, query),
        getDataExplorerRows(selectedTable, { limit, offset, q: query }),
      ]);
      setSchema(schemaData.schema);
      setCount(schemaData.count);
      setRows(rowData);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, limit, offset, debouncedSearch]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput, selectedTable]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch]);

  useEffect(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setOffset(0);
  }, [selectedTable]);

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
      const value = parseColumnValueForWrite(col, newRow[col.name]);
      if (value === undefined) continue;
      data[col.name] = value;
    }
    try {
      await insertDataExplorerRow(selectedTable, data);
      setAddingRow(false);
      setNewRow({});
      fetchTableData();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Insert failed";
      setError(message);
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
        await updateDataExplorerRow(selectedTable, { pk, ...data });
        setEditingRow(null);
        fetchTableData();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Update failed";
        setError(message);
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
        await deleteDataExplorerRow(selectedTable, { pk });
        fetchTableData();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Delete failed";
        setError(message);
      }
    },
    [selectedTable, schema, fetchTableData]
  );

  const pkCols = schema?.filter((c) => c.pk).map((c) => c.name) ?? [];

  return (
    <div className="data-explorer">
      <h3>Data Explorer</h3>
      <p className="data-explorer__desc">
        Browse and edit tables. Search matches a substring in any column. Schema is discovered
        automatically.
      </p>

      <div className="data-explorer__toolbar">
        <select
          value={selectedTable ?? ""}
          onChange={(e) => {
            setSelectedTable(e.target.value || null);
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
          <>
            <label className="data-explorer__search">
              <span className="u-sr-only">Search table</span>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search all columns…"
                className="form__input"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            {searchInput.trim() !== "" && (
              <Button size="sm" variant="ghost" type="button" onClick={() => setSearchInput("")}>
                Clear search
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setAddingRow(true);
                setNewRow({});
              }}
            >
              Add row
            </Button>
          </>
        )}
      </div>

      {error && (
        <Alert variant="danger" role="alert">
          <p>{error}</p>
        </Alert>
      )}

      {selectedTable && schema && (
        <>
          <p className="data-explorer__meta">
            {formatSearchMeta(count, debouncedSearch)}
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
                <Button onClick={handleAdd}>Insert</Button>
                <Button variant="ghost" onClick={() => setAddingRow(false)}>
                  Cancel
                </Button>
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
                    <tr
                      key={
                        pkCols.length > 0
                          ? pkCols.map((pk) => String(row[pk] ?? "")).join("|")
                          : `row-${i}`
                      }
                    >
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
                            <Button size="sm" onClick={() => handleUpdate(row)}>
                              Save
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingRow(null)}>
                              Cancel
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          {schema.map((col) => (
                            <td key={col.name}>{String(row[col.name] ?? "NULL")}</td>
                          ))}
                          <td>
                            <Button variant="secondary" size="sm" onClick={() => setEditingRow({ ...row })}>
                              Edit
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(row)}>
                              Delete
                            </Button>
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
              <Button
                variant="ghost"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
              >
                Previous
              </Button>
              <span>
                {offset + 1}–{Math.min(offset + limit, count)} of {count}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={offset + limit >= count}
                onClick={() => setOffset((o) => o + limit)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
