import { useState, useEffect } from "react";
import type { Connection } from "@/features/_shared/integrations";
import { testMetaConnection } from "@/features/_shared/integrations/actions";
import { auditLeadForm } from "../actions";

type AuditRow = { leadgenId: string; createdTime: string; name: string; systemStatus: string | null };
type AuditResult = { totalInMeta: number; totalMissing: number; rows: AuditRow[] };

export function LeadAuditModal({ connection, onClose }: { connection: Connection, onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  useEffect(() => {
    async function loadForms() {
      setLoading(true);
      setError(null);
      const res = await testMetaConnection(connection.id);
      if (!res.success) {
        setError(res.error || "Erro ao buscar formulários.");
      } else {
        setForms(res.forms);
      }
      setLoading(false);
    }
    loadForms();
  }, [connection.id]);

  async function handleScan() {
    setScanning(true);
    setScanError(null);
    setResult(null);
    const res = await auditLeadForm(connection.id, selectedForm);
    if (!res.success) {
      setScanError(res.error);
    } else {
      setResult(res);
    }
    setScanning(false);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={onClose}
    >
      <div
        style={{ background: "white", borderRadius: 12, padding: 28, width: "90%", maxWidth: 800, maxHeight: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
            Auditoria de Leads - {connection.name}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#666" }}>
            ✕
          </button>
        </div>
        
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Buscando formulários no Facebook...</div>
        ) : error ? (
          <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 8, border: "1px solid #fecaca" }}>
            {error}
          </div>
        ) : forms.length === 0 ? (
          <div style={{ background: "#fffbeb", color: "#92400e", padding: 12, borderRadius: 8, border: "1px solid #fde68a" }}>
            Nenhum formulário encontrado nessa página.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>
              Selecione um formulário para auditar:
            </label>
            <select
              value={selectedForm}
              onChange={(e) => { setSelectedForm(e.target.value); setResult(null); setScanError(null); }}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14 }}
            >
              <option value="" disabled>Escolha um formulário</option>
              {forms.map(f => (
                <option key={f.id} value={f.id}>{f.name} (Status: {f.status})</option>
              ))}
            </select>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button
                disabled={!selectedForm || scanning}
                onClick={handleScan}
                style={{ background: "var(--accent)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, opacity: selectedForm && !scanning ? 1 : 0.5, cursor: selectedForm && !scanning ? "pointer" : "not-allowed" }}
              >
                {scanning ? "Varrendo…" : "Iniciar Varredura"}
              </button>
            </div>
          </div>
        )}

        {scanning && (
          <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
            Buscando os leads reais deste formulário na Meta e comparando com o sistema…
          </div>
        )}

        {scanError && (
          <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 8, border: "1px solid #fecaca" }}>
            {scanError}
          </div>
        )}

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, padding: 12, borderRadius: 8, background: "#f8fafc", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>Leads na Meta</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{result.totalInMeta}</div>
              </div>
              <div style={{ flex: 1, padding: 12, borderRadius: 8, background: result.totalMissing > 0 ? "#fef2f2" : "#f0fdf4", border: `1px solid ${result.totalMissing > 0 ? "#fecaca" : "#bbf7d0"}` }}>
                <div style={{ fontSize: 12, color: result.totalMissing > 0 ? "#b91c1c" : "#166534" }}>Faltando no sistema</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: result.totalMissing > 0 ? "#b91c1c" : "#166534" }}>{result.totalMissing}</div>
              </div>
            </div>

            <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>Nome</th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>Criado em</th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>No sistema?</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.leadgenId} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px" }}>{row.name}</td>
                      <td style={{ padding: "8px 12px", color: "#64748b" }}>{new Date(row.createdTime).toLocaleString("pt-BR")}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {row.systemStatus ? (
                          <span style={{ color: "#166534" }}>✓ {row.systemStatus}</span>
                        ) : (
                          <span style={{ color: "#b91c1c", fontWeight: 600 }}>✕ faltando</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {result.rows.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 16, textAlign: "center", color: "#94a3b8" }}>
                        Nenhum lead encontrado para este formulário na Meta.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
