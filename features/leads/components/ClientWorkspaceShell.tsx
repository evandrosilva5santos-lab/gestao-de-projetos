"use client";

import { useState } from "react";
import { OverviewTab } from "./OverviewTab";
import { SellersQueueTab } from "./SellersQueueTab";
import { ClientSourcesTab } from "./ClientSourcesTab";
import { ClientDestinationsTab } from "./ClientDestinationsTab";
import { AutomationSequenceTab } from "./AutomationSequenceTab";

type ClientTab = "visao" | "fontes" | "fila" | "destinos" | "automacao";

// Ordem = sequência lógica de configuração: fonte → fila → destinos → automação.
const TABS: { key: ClientTab; label: string }[] = [
  { key: "visao", label: "Visão Geral" },
  { key: "fontes", label: "Fontes de Entrada" },
  { key: "fila", label: "Fila da Vez" },
  { key: "destinos", label: "Destinos" },
  { key: "automacao", label: "Automação" }
];

export function ClientWorkspaceShell({
  workspaceId,
  workspaceName,
  onBack
}: {
  workspaceId: string;
  workspaceName: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<ClientTab>("visao");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button
          onClick={onBack}
          style={{ border: "none", background: "transparent", color: "var(--muted)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 8 }}
        >
          ← Clientes
        </button>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", color: "var(--fg)" }}>{workspaceName}</h1>
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border2)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "9px 14px",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
              color: tab === t.key ? "var(--accent)" : "var(--fg2)",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "visao" && <OverviewTab workspaceId={workspaceId} />}
      {tab === "fontes" && <ClientSourcesTab workspaceId={workspaceId} />}
      {tab === "fila" && <SellersQueueTab workspaceId={workspaceId} />}
      {tab === "destinos" && <ClientDestinationsTab workspaceId={workspaceId} />}
      {tab === "automacao" && <AutomationSequenceTab workspaceId={workspaceId} />}
    </div>
  );
}
