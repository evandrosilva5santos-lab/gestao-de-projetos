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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbConnections: Connection[] = result.destinations.map((d: any) => {
          const wsName = Array.isArray(d.core_workspaces) ? d.core_workspaces[0]?.name : d.core_workspaces?.name;
          const baseMetadata = {
            workspaceId: d.workspace_id,
            workspaceName: wsName || "—"
          };

          if (d.type === "kommo") {
            return {
              ...baseMetadata,
              id: d.id,
              name: `Kommo (${d.config.subdomain})`,
              providerLabel: "Kommo CRM · API Token",
              icon: <span style={{ fontWeight: 800, fontSize: 16 }}>k</span>,
              iconBg: "#00a6ff",
              status: d.is_active ? "connected" : "expired" as const,
              maskedToken: d.config.token ? `${d.config.token.substring(0, 10)}••••••••••` : "",
              counts: [
                { value: "1", label: "pipelines" },
                { value: "1", label: "contas" },
                { value: "1", label: "workspaces" }
              ],
              syncNote: `Atualizado em ${new Date(d.updated_at).toLocaleDateString()}`,
              actions: ["renew", "test", "edit", "disconnect"],
              config: d.config,
              type: "kommo" as const
            };
          } else if (d.type === "google_sheets") {
            return {
              ...baseMetadata,
              id: d.id,
              name: "Google Sheets",
              providerLabel: "Google Sheets · Service Account",
              icon: <span style={{ fontWeight: 700, fontSize: 12 }}>GS</span>,
              iconBg: "#0f9d58",
              status: d.is_active ? "connected" : "expired" as const,
              maskedToken: d.config.clientEmail ? `${d.config.clientEmail.split('@')[0]}••••••••••` : "",
              counts: [{ value: "1", label: "planilhas" }],
              syncNote: `Atualizado em ${new Date(d.updated_at).toLocaleDateString()}`,
              actions: ["test", "edit", "disconnect"],
              config: d.config,
              type: "google_sheets" as const
            };
          } else if (d.type === "evolution") {
            return {
              ...baseMetadata,
              id: d.id,
              name: `WhatsApp (${d.config.instanceName || 'Evolution'})`,
              providerLabel: "Evolution API · Instance",
              icon: <span style={{ fontWeight: 700, fontSize: 11 }}>Ev</span>,
              iconBg: "#25d366",
              status: d.is_active ? "connected" : "expired" as const,
              maskedToken: d.config.url ? `${d.config.url.replace(/^https?:\/\//, '').substring(0, 15)}••••••••••` : "",
              counts: [{ value: "1", label: "instância" }],
              syncNote: `Atualizado em ${new Date(d.updated_at).toLocaleDateString()}`,
              actions: ["test", "edit", "disconnect"],
              config: d.config,
              type: "evolution" as const
            };
          }
          return null;
        }).filter(Boolean) as Connection[];

        allConnections.push(...dbConnections);
      }

      const metaResult = await listMetaConnections();
      if (metaResult.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metaConnections: Connection[] = metaResult.connections.map((c: any) => {
          const wsName = Array.isArray(c.core_workspaces) ? c.core_workspaces[0]?.name : c.core_workspaces?.name;
          return {
            workspaceId: c.workspace_id,
            workspaceName: wsName || "—",
            id: c.id,
            name: c.page_name || c.page_id,
            providerLabel: "Meta Business · Page Access Token",
            icon: <FacebookIcon className="w-[21px] h-[21px]" />,
            iconBg: "#0866FF",
            status: c.is_active ? "connected" : "expired" as const,
          maskedToken: `${c.page_id.substring(0, 6)}••••••••••`,
          counts: [
            { value: "1", label: "páginas" },
            { value: "1", label: "workspaces" }
          ],
          syncNote: `Atualizado em ${new Date(c.updated_at).toLocaleDateString()}`,
          actions: ["test", "sync", "edit", "disconnect"] as any[],
          type: "meta" as const
        };
        });

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

  // Organização por PROVEDOR (não mais por cliente): cada seção é um tipo de
  // conexão. Ver arquitetura do menu Configurações — conectar uma vez, vincular
  // ao cliente depois.
  const PROVIDERS: { type: Connection["type"]; label: string; sub: string; icon: string; iconBg: string }[] = [
    { type: "evolution", label: "WhatsApp · Evolution", sub: "Instância + grupos catalogados", icon: "Ev", iconBg: "#25d366" },
    { type: "kommo", label: "Kommo CRM", sub: "Conta + responsáveis", icon: "k", iconBg: "#00a6ff" },
    { type: "google_sheets", label: "Planilhas · Google Sheets", sub: "Service account + planilhas", icon: "GS", iconBg: "#0f9d58" },
    { type: "meta", label: "Meta · Business Manager", sub: "Páginas, formulários e contas de anúncio", icon: "f", iconBg: "#0866FF" },
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-.025em", color: "var(--fg)" }}>Integrações</h1>
          <p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 15, maxWidth: 740 }}>
            Cadastre a conexão uma vez, no nível da agência. Os clientes apenas consomem — sem duplicar token, sem cadastrar ID na mão.
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
        Conectar (agência) → catalogar (páginas, grupos, planilhas, responsáveis) → vincular ao cliente. O Motor consome o vínculo, sem regra manual.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
        {PROVIDERS.map((prov) => {
          const items = connections.filter((c) => c.type === prov.type);
          const distinctClients = new Set(items.map((c) => c.workspaceName || c.workspaceId)).size;
          return (
            <div key={prov.type} style={{ background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: prov.iconBg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {prov.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15.5, color: "var(--fg)" }}>{prov.label}</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{prov.sub}</div>
                </div>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500" style={{ whiteSpace: "nowrap" }}>
                  {items.length === 0 ? "Nenhuma conexão" : `${items.length} conexão(ões) · ${distinctClients} cliente(s)`}
                </span>
              </div>
              <div style={{ padding: 20, display: "grid", gap: 15 }} className="!grid-cols-1 md:!grid-cols-2 bg-slate-50/50 dark:bg-slate-900/50">
                {items.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <NewIntegrationTile onClick={() => { setEditingConnection(null); setModalOpen(true); }} />
                  </div>
                ) : (
                  items.map((connection) => (
                    <ConnectionCard key={connection.id} connection={connection} onAction={handleAction} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }} className="!grid-cols-1 md:!grid-cols-2">
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

