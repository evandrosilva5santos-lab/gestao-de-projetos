"use client";

import { useState, useEffect } from "react";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { LayersIcon, PlusIcon } from "@/components/icons/agency-os-icons";
import {
  ConnectionCard,
  NewIntegrationTile,
  NewIntegrationModal,
  getDestinations,
  listMetaConnections,
  type Connection
} from "@/features/_shared/integrations";

// Porte pixel-exato da tela "Central de Integrações" de Agency OS.dc.html
// (linhas ~795-885). TODO (docs/PRD-FONTES-DE-ENTRADA.md): substituir dados
// mock por leitura de gestao_leads_sources via TanStack Query.
const INITIAL_CONNECTIONS: Connection[] = [];

export function IntegrationHubTab() {
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  useEffect(() => {
    async function loadDestinations() {
      const allConnections: Connection[] = [];

      const result = await getDestinations();
      if (result.success && result.destinations) {
        const dbConnections: Connection[] = result.destinations.map((d) => {
          if (d.type === "kommo") {
            return {
              id: d.id,
              name: `Kommo (${d.config.subdomain})`,
              providerLabel: "Kommo CRM · API Token",
              icon: <span style={{ fontWeight: 800, fontSize: 16 }}>k</span>,
              iconBg: "#00a6ff",
              status: d.is_active ? "connected" : "expired",
              maskedToken: d.config.token ? `${d.config.token.substring(0, 10)}••••••••••` : "",
              counts: [
                { value: "1", label: "pipelines" },
                { value: "1", label: "contas" },
                { value: "1", label: "workspaces" }
              ],
              syncNote: `Atualizado em ${new Date(d.updated_at).toLocaleDateString()}`,
              actions: ["renew", "test", "edit", "disconnect"],
              config: d.config,
              type: "kommo"
            };
          } else if (d.type === "google_sheets") {
            return {
              id: d.id,
              name: "Google Sheets",
              providerLabel: "Google Sheets · Service Account",
              icon: <span style={{ fontWeight: 700, fontSize: 12 }}>GS</span>,
              iconBg: "#0f9d58",
              status: d.is_active ? "connected" : "expired",
              maskedToken: d.config.clientEmail ? `${d.config.clientEmail.split('@')[0]}••••••••••` : "",
              counts: [{ value: "1", label: "planilhas" }],
              syncNote: `Atualizado em ${new Date(d.updated_at).toLocaleDateString()}`,
              actions: ["test", "edit", "disconnect"],
              config: d.config,
              type: "google_sheets"
            };
          } else if (d.type === "evolution") {
            return {
              id: d.id,
              name: `WhatsApp (${d.config.instanceName || 'Evolution'})`,
              providerLabel: "Evolution API · Instance",
              icon: <span style={{ fontWeight: 700, fontSize: 11 }}>Ev</span>,
              iconBg: "#25d366",
              status: d.is_active ? "connected" : "expired",
              maskedToken: d.config.url ? `${d.config.url.replace(/^https?:\/\//, '').substring(0, 15)}••••••••••` : "",
              counts: [{ value: "1", label: "instância" }],
              syncNote: `Atualizado em ${new Date(d.updated_at).toLocaleDateString()}`,
              actions: ["test", "edit", "disconnect"],
              config: d.config,
              type: "evolution"
            };
          }
          return null;
        }).filter(Boolean) as Connection[];

        allConnections.push(...dbConnections);
      }

      const metaResult = await listMetaConnections();
      if (metaResult.success) {
        const metaConnections: Connection[] = metaResult.connections.map((c) => ({
          id: c.id,
          name: c.page_name || c.page_id,
          providerLabel: "Meta Business · Page Access Token",
          icon: <FacebookIcon className="w-[21px] h-[21px]" />,
          iconBg: "#0866FF",
          status: c.is_active ? "connected" : "expired",
          maskedToken: `${c.page_id.substring(0, 6)}••••••••••`,
          counts: [
            { value: "1", label: "páginas" },
            { value: "1", label: "workspaces" }
          ],
          syncNote: `Atualizado em ${new Date(c.updated_at).toLocaleDateString()}`,
          actions: ["test", "sync", "edit", "disconnect"],
          type: "meta"
        }));

        allConnections.push(...metaConnections);
      }

      setConnections(allConnections);
    }

    loadDestinations();
  }, []);

  const handleCreate = (connection: Connection) => {
    // If it's an edit, we might want to reload or replace, but for now just reload list
    window.location.reload();
  };

  const handleAction = (action: string, connection: Connection) => {
    if (action === "edit") {
      setEditingConnection(connection);
      setModalOpen(true);
    }
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-.025em", color: "var(--fg)" }}>Central de Integrações</h1>
          <p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 15, maxWidth: 740 }}>
            Cadastre a conexão uma vez, no nível do sistema. Os workspaces apenas consomem — sem duplicar token, sem cadastrar ID na mão.
          </p>
        </div>
        <button
          onClick={() => { setEditingConnection(null); setModalOpen(true); }}
          style={{ height: 38, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 14px", border: "none", background: "var(--accent)", color: "#fff", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
        >
          <PlusIcon size={16} />
          Nova integração
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 15px", borderRadius: 11, background: "var(--soft-bg)", color: "var(--soft-fg)", fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, marginTop: 20 }}>
        <LayersIcon size={16} style={{ flexShrink: 0 }} />
        Agency OS → Central de Integrações (token) → N páginas/formulários → cada formulário mapeado a 1 Workspace. O Motor roteia pelo Form ID, sem regra manual.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginTop: 20 }} className="!grid-cols-1 md:!grid-cols-2">
        {connections.map((connection) => (
          <ConnectionCard key={connection.id} connection={connection} onAction={handleAction} />
        ))}
        <NewIntegrationTile onClick={() => { setEditingConnection(null); setModalOpen(true); }} />
      </div>

      {modalOpen && (
        <NewIntegrationModal 
          onClose={() => { setModalOpen(false); setEditingConnection(null); }} 
          onCreate={handleCreate} 
          editingConnection={editingConnection}
        />
      )}
    </>
  );
}

