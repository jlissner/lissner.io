import { useState } from "react";
import { ApiError } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { runSql } from "../../api";

type SqlResult =
  | { type: "select"; columns: string[]; rows: Record<string, unknown>[] }
  | { type: "write"; changes: number; lastInsertRowid: number };

export function SqlExplorerTab() {
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM media LIMIT 10");
  const [sqlResult, setSqlResult] = useState<SqlResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);

  const handleRunSql = async () => {
    setSqlRunning(true);
    setSqlError(null);
    setSqlResult(null);
    try {
      setSqlResult(await runSql(sqlQuery));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Request failed";
      setSqlError(message);
    } finally {
      setSqlRunning(false);
    }
  };

  return (
    <div
      id="admin-panel-sql-explorer"
      role="tabpanel"
      aria-labelledby="admin-tab-sql-explorer"
      className="admin-page__panel"
    >
      <section className="admin-page__section">
        <h3>SQL Explorer</h3>
        <p className="admin-page__desc">
          Run SQL directly against the database. Only available locally with
          SQL_EXPLORER_ENABLED=true.
        </p>
        <div className="admin-page__sql">
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            className="admin-page__sql-input"
            rows={4}
            placeholder="SELECT * FROM media LIMIT 10"
            spellCheck={false}
          />
          <Button onClick={handleRunSql} disabled={sqlRunning}>
            {sqlRunning ? "Running…" : "Run"}
          </Button>
          {sqlError && (
            <Alert variant="danger" role="alert">
              <p>{sqlError}</p>
            </Alert>
          )}
          {sqlResult && (
            <div className="admin-page__sql-result">
              {sqlResult.type === "select" ? (
                <div className="admin-page__sql-table-wrap">
                  <table className="admin-page__sql-table">
                    <thead>
                      <tr>
                        {sqlResult.columns.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sqlResult.rows.map((row, i) => (
                        <tr key={i}>
                          {sqlResult.columns.map((c) => (
                            <td key={c}>
                              {row[c] == null ? "NULL" : String(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="admin-page__sql-meta">
                    {sqlResult.rows.length} row
                    {sqlResult.rows.length !== 1 ? "s" : ""}
                  </p>
                </div>
              ) : (
                <p className="admin-page__sql-meta">
                  {sqlResult.changes} row(s) affected
                  {sqlResult.lastInsertRowid > 0 &&
                    `, last insert id: ${sqlResult.lastInsertRowid}`}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
