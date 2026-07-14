"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon } from "./icons/agency-os-icons";
import { ConnectionCard, NewIntegrationTile, type Connection } from "@/features/integration-hub/components/ConnectionCard";
import { NewIntegrationModal } from "@/features/integration-hub/components/NewIntegrationModal";
import { ClientMetaAdAccountsTab } from "./ClientMetaAdAccountsTab";
import { getDestinationsForWorkspace } from "@/features/integration-hub/actions";

export function ClientDestinationsTab({ workspaceId }: { workspaceId: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  const load = useCallback(() => {
    getDestinationsForWorkspace(workspaceId).then((res) => {
      if (!res.success) return;
      const mapped = res.destinations
        .map((d): Connection | null => {
          if (d.type === "kommo") {
            return {
              id: d.id,
              name: `Kommo (${d.config.subdomain})`,
              providerLabel: "Kommo CRM · API Token",
              icon: <span style={{ fontWeight: 800, fontSize: 16 }}>k</span>,
              iconBg: "#00a6ff",
              status: d.is_active ? "connected" : "expired",
              maskedToken: d.config.token ? `${d.config.token.substring(0, 10)}••••••••••` : "",
              counts: [{ value: "1", label: "pipeline" }],
              syncNote: `Atualizado em ${new Date(d.updated_at).toLocaleDateString()}`,
              actions: ["test", "edit", "disconnect"],
              config: d.config,
              type: "kommo"
            };
          }
          if (d.type === "google_sheets") {
            return {
              id: d.id,
              name: "Google Sheets",
              providerLabel: "Google Sheets · Service Account",
              icon: <span style={{ fontWeight: 700, fontSize: 12 }}>GS</span>,
              iconBg: "#0f9d58",
              status: d.is_active ? "connected" : "expired",
              maskedToken: d.config.clientEmail ? `${d.config.clientEmail.split("@")[0]}••••••••••` : "",
              counts: [{ value: "1", label: "planilha" }],
              syncNote: `Atualizado em ${new Date(d.updated_at).toLocaleDateString()}`,
              actions: ["test", "edit", "disconnect"],
              config: d.config,
              type: "google_sheets"
            };
          }
          if (d.type === "evolution") {
            return {
              id: d.id,
              name: `WhatsApp (${d.config.instanceName || "Evolution"})`,
              providerLabel: "Evolution API · Instance",
              icon: <span style={{ fontWeight: 700, fontSize: 11 }}>Ev</span>,
              iconBg: "#25d366",
              status: d.is_active ? "connected" : "expired",
              maskedToken: d.config.url ? `${d.config.url.replace(/^https?:\/\//, "").substring(0, 15)}••••••••••` : "",
              counts: [{ value: "1", label: "instância" }],
              syncNote: `Atualizado em ${new Date(d.updated_at).toLocaleDateString()}`,
              actions: ["test", "edit", "disconnect"],
              config: d.config,
              type: "evolution"
            };
          }
          return null;
        })
        .filter((c): c is Connection => c !== null);

      // Adiciona Meta Ad Accounts se houver
      if (res.metaAdAccounts && res.metaAdAccounts.length > 0) {
        const metaCard: Connection = {
          id: `meta-ad-accounts-${workspaceId}`,
          name: "Meta Business Manager",
          providerLabel: "Meta Business Manager · Ad Accounts",
          icon: <span style={{ fontWeight: 700, fontSize: 14, color: "#0866FF" }}>f</span>,
          iconBg: "#0866FF",
          status: "connected",
          maskedToken: `${res.metaAdAccounts.length} conta(s)`,
          counts: [{ value: String(res.metaAdAccounts.length), label: "contas de anúncio" }],
          syncNote: `Última atualização: ${new Date().toLocaleDateString()}`,
          actions: ["edit"],
          config: { accounts: res.metaAdAccounts },
          type: "meta_ad_accounts"
        };
        mapped.push(metaCard);
      }

      setConnections(mapped);
    });
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = (action: string, connection: Connection) => {
    if (action === "edit") {
      if (connection.type === "meta_ad_accounts") {
        setMetaModalOpen(true);
      } else {
        setEditingConnection(connection);
        setModalOpen(true);
      }
    }
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--fg)" }}>Destinos</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13.5, maxWidth: 640 }}>
            Kommo, Google Sheets e WhatsApp (grupo/vendedor) deste cliente — os destinos opcionais e obrigatórios do lead.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingConnection(null);
            setModalOpen(true);
          }}
          style={{ height: 36, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 14px", border: "none", background: "var(--accent)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <PlusIcon size={15} />
          Novo destino
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginTop: 18 }} className="!grid-cols-1 md:!grid-cols-2">
        {connections.map((connection) => (
          <ConnectionCard key={connection.id} connection={connection} onAction={handleAction} />
        ))}
        <NewIntegrationTile
          onClick={() => {
            setEditingConnection(null);
            setModalOpen(true);
          }}
        />
      </div>

      {modalOpen && (
        <NewIntegrationModal
          onClose={() => {
            setModalOpen(false);
            setEditingConnection(null);
          }}
          onCreate={() => {
            setModalOpen(false);
            setEditingConnection(null);
            load();
          }}
          editingConnection={editingConnection}
          defaultWorkspaceId={workspaceId}
        />
      )}

      {metaModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 12, padding: 30, maxWidth: 600, maxHeight: "80vh", overflowY: "auto", width: "90%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Meta Business Manager</h2>
              <button
                onClick={() => setMetaModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#666" }}
              >
                ✕
              </button>
            </div>
            <ClientMetaAdAccountsTab workspaceId={workspaceId} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 20, borderTop: "1px solid #eee" }}>
              <button
                onClick={() => setMetaModalOpen(false)}
                style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", background: "white" }}
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
