"use client";

import { useState } from "react";
import { FacebookIcon } from "@/features/leads/components/FacebookIcon";
import { SheetsFileIcon, LayersIcon, PlusIcon } from "@/features/leads/components/icons/agency-os-icons";
import { ConnectionCard, NewIntegrationTile, type Connection } from "./ConnectionCard";
import { NewIntegrationModal } from "./NewIntegrationModal";

// Porte pixel-exato da tela "Central de Integrações" de Agency OS.dc.html
// (linhas ~795-885). TODO (docs/PRD-FONTES-DE-ENTRADA.md): substituir dados
// mock por leitura de gestao_leads_sources via TanStack Query.
const INITIAL_CONNECTIONS: Connection[] = [
  {
    id: "1",
    name: "Meta Start Inc",
    providerLabel: "Meta Business · OAuth",
    icon: <FacebookIcon className="w-[21px] h-[21px]" />,
    iconBg: "#0866FF",
    status: "connected",
    maskedToken: "EAAB••••••••••••••P9D",
    counts: [
      { value: "12", label: "formulários" },
      { value: "3", label: "páginas" },
      { value: "4", label: "workspaces" }
    ],
    syncNote: "Última sincronização há 2h · último uso há 3 min",
    actions: ["test", "sync", "renew", "edit", "disconnect"]
  },
  {
    id: "2",
    name: "Sheets Agência",
    providerLabel: "Google Sheets · Service Account",
    icon: <SheetsFileIcon size={20} />,
    iconBg: "#0f9d58",
    status: "connected",
    maskedToken: "svc•••••••••@proj.iam",
    counts: [
      { value: "—", label: "formulários" },
      { value: "8", label: "planilhas" },
      { value: "6", label: "workspaces" }
    ],
    syncNote: "Última sincronização há 20 min · último uso há 1 min",
    actions: ["test", "sync", "edit", "disconnect"]
  },
  {
    id: "3",
    name: "Kommo Start",
    providerLabel: "Kommo CRM · OAuth",
    icon: <span style={{ fontWeight: 800, fontSize: 16 }}>k</span>,
    iconBg: "#00a6ff",
    status: "expired",
    statusReason: "invalid_grant: refresh token expirado (401)",
    counts: [
      { value: "—", label: "pipelines" },
      { value: "2", label: "contas" },
      { value: "2", label: "workspaces" }
    ],
    syncNote: "Última sincronização há 3 dias",
    actions: ["renew", "test", "disconnect"]
  }
];

export function IntegrationHubTab() {
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [modalOpen, setModalOpen] = useState(false);

  const handleCreate = (connection: Connection) => {
    setConnections((prev) => [...prev, connection]);
    setModalOpen(false);
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
          onClick={() => setModalOpen(true)}
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
          <ConnectionCard key={connection.id} connection={connection} />
        ))}
        <NewIntegrationTile onClick={() => setModalOpen(true)} />
      </div>

      {modalOpen && (
        <NewIntegrationModal onClose={() => setModalOpen(false)} onCreate={handleCreate} />
      )}
    </>
  );
}
