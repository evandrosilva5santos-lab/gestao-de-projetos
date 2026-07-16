"use client";

import { useState } from "react";
import { IntegrationHubTab } from "@/features/integration-hub/components/IntegrationHubTab";
import { LogsTab } from "./LogsTab";
import { DocsTab } from "./DocsTab";

type ConfigTab = "integracoes" | "logs" | "documentacao";

// Abas de nível SISTEMA (agência) — conexões cadastradas uma vez, logs de todos
// os clientes e a documentação viva do produto. Segue o mesmo padrão de tabs do
// ClientWorkspaceShell (useState local + underline no ativo).
const TABS: { key: ConfigTab; label: string }[] = [
  { key: "integracoes", label: "Integrações" },
  { key: "logs", label: "Logs & Automação" },
  { key: "documentacao", label: "Documentação" }
];

export function ConfiguracoesShell({ workspaceId }: { workspaceId?: string }) {
  const [tab, setTab] = useState<ConfigTab>("integracoes");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", color: "var(--fg)" }}>
          Configurações
        </h1>
        <p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 14 }}>
          Conecte cada integração uma vez, no nível da agência — os clientes apenas consomem.
        </p>
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

      {tab === "integracoes" && <IntegrationHubTab />}
      {tab === "logs" && <LogsTab workspaceId={workspaceId} />}
      {tab === "documentacao" && <DocsTab />}
    </div>
  );
}
