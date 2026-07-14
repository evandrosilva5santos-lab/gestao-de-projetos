"use client";

import { useState, useEffect, useCallback } from "react";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { PlusIcon } from "@/components/icons/agency-os-icons";
import {
  ConnectionCard,
  NewIntegrationTile,
  NewIntegrationModal,
  IntegrationPickerDialog,
  listMetaConnections,
  testMetaConnection,
  type Connection,
  type ActionKey,
  type ProviderId
} from "@/features/_shared/integrations";

type MetaForm = { id: string; name: string; status: string };
type CheckResult = {
  mode: "test" | "sync";
  pageName: string;
  ok: boolean;
  forms: MetaForm[];
  error?: string;
};

export function ClientSourcesTab({ workspaceId }: { workspaceId: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chosenProvider, setChosenProvider] = useState<ProviderId | null>(null);
  const [checking, setChecking] = useState<string | null>(null); // connectionId em verificação
  const [result, setResult] = useState<CheckResult | null>(null);

  const load = useCallback(() => {
    listMetaConnections().then((res) => {
      if (!res.success) return;
      const filtered = res.connections.filter((c) => c.workspace_id === workspaceId);
      setConnections(
        filtered.map((c) => ({
          id: c.id,
          name: c.page_name || c.page_id,
          providerLabel: "Meta Business · Page Access Token",
          icon: <FacebookIcon className="w-[21px] h-[21px]" />,
          iconBg: "#0866FF",
          status: c.is_active ? "connected" : "expired",
          maskedToken: `${c.page_id.substring(0, 6)}••••••••••`,
          counts: [{ value: "1", label: "páginas" }],
          syncNote: `Atualizado em ${new Date(c.updated_at).toLocaleDateString()}`,
          actions: ["test", "sync", "disconnect"],
          type: "meta"
        }))
      );
    });
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (action: ActionKey, connection: Connection) => {
    if (action !== "test" && action !== "sync") return;
    setChecking(connection.id);
    setResult(null);
    const res = await testMetaConnection(connection.id);
    setChecking(null);
    if (!res.success) {
      setResult({ mode: action, pageName: connection.name, ok: false, forms: [], error: res.error });
      return;
    }
    setResult({ mode: action, pageName: res.pageName, ok: true, forms: res.forms });
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--fg)" }}>Fontes de Entrada</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13.5, maxWidth: 640 }}>
            Páginas do Facebook conectadas para este cliente. O token da agência já está cadastrado — aqui você só escolhe qual página pertence a ele.
          </p>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          style={{ height: 36, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 14px", border: "none", background: "var(--accent)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <PlusIcon size={15} />
          Nova integração
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginTop: 18 }} className="!grid-cols-1 md:!grid-cols-2">
        {connections.map((connection) => (
          <div key={connection.id} style={{ position: "relative" }}>
            <ConnectionCard connection={connection} onAction={handleAction} />
            {checking === connection.id && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.65)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#4f46e5" }}>
                Verificando com a Meta…
              </div>
            )}
          </div>
        ))}
        <NewIntegrationTile onClick={() => setPickerOpen(true)} />
      </div>

      {/* Passo 0: escolher a plataforma antes de cair no fluxo específico. */}
      <IntegrationPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(providerId) => {
          setPickerOpen(false);
          setChosenProvider(providerId);
        }}
      />

      {chosenProvider && (
        <NewIntegrationModal
          onClose={() => setChosenProvider(null)}
          onCreate={() => {
            setChosenProvider(null);
            load();
          }}
          defaultWorkspaceId={workspaceId}
          defaultProviderId={chosenProvider}
        />
      )}

      {result && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => setResult(null)}
        >
          <div
            style={{ background: "white", borderRadius: 12, padding: 28, width: "90%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
                {result.ok ? (result.mode === "test" ? "Conexão válida ✓" : "Formulários sincronizados") : "Falha na conexão"}
              </h2>
              <button onClick={() => setResult(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#666" }}>
                ✕
              </button>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#64748b" }}>
              Página: <strong>{result.pageName}</strong>
            </p>

            {!result.ok ? (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 14px", fontSize: 13.5, color: "#b91c1c" }}>
                {result.error}
                <div style={{ marginTop: 8, fontSize: 12, color: "#7f1d1d" }}>
                  O token da página pode ter expirado. Reconecte a página para renovar o acesso.
                </div>
              </div>
            ) : result.forms.length === 0 ? (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 14px", fontSize: 13.5, color: "#92400e" }}>
                Token válido, mas esta página não tem nenhum formulário de lead publicado. Crie um formulário na Meta para começar a receber leads.
              </div>
            ) : (
              <>
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#334155" }}>
                  {result.forms.length} formulário(s) encontrado(s):
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.forms.map((f) => (
                    <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{f.name}</div>
                        <div style={{ fontSize: 11.5, color: "#94a3b8", fontFamily: "monospace" }}>{f.id}</div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 9px",
                          borderRadius: 9999,
                          background: f.status === "ACTIVE" ? "#dcfce7" : "#f1f5f9",
                          color: f.status === "ACTIVE" ? "#15803d" : "#64748b"
                        }}
                      >
                        {f.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button
                onClick={() => setResult(null)}
                style={{ padding: "9px 18px", border: "none", borderRadius: 8, cursor: "pointer", background: "var(--accent, #4f46e5)", color: "white", fontSize: 13, fontWeight: 600 }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
