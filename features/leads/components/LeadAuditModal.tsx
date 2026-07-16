import { useState, useEffect } from "react";
import type { Connection } from "@/features/_shared/integrations";
import { testMetaConnection } from "@/features/_shared/integrations/actions";

export function LeadAuditModal({ connection, onClose }: { connection: Connection, onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

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
              onChange={(e) => setSelectedForm(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14 }}
            >
              <option value="" disabled>Escolha um formulário</option>
              {forms.map(f => (
                <option key={f.id} value={f.id}>{f.name} (Status: {f.status})</option>
              ))}
            </select>
            
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button 
                disabled={!selectedForm}
                style={{ background: "var(--accent)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, opacity: selectedForm ? 1 : 0.5, cursor: selectedForm ? "pointer" : "not-allowed" }}
              >
                Iniciar Varredura
              </button>
            </div>
          </div>
        )}

        <div style={{ padding: 20, background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1", textAlign: "center", marginTop: 16 }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
            Tabela de resultados será renderizada aqui na próxima fase.
          </p>
        </div>

      </div>
    </div>
  );
}
