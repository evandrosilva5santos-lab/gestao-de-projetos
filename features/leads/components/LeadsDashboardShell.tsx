"use client";

import { useState } from "react";
import { agencyOsThemeVars } from "@/lib/themes/agency-os";
import {
  LogoIcon, MotorIcon, CentralIcon, DashboardIcon,
  ClientesIcon, GearIcon, LogsIcon, LogoutIcon, MenuIcon,
  SunIcon, MoonIcon, UserPlusIcon
} from "@/components/icons/agency-os-icons";
import { OverviewTab } from "./OverviewTab";
import { ClientsListScreen } from "./ClientsListScreen";
import { ClientWorkspaceShell } from "./ClientWorkspaceShell";
import { ComingSoonPanel } from "./ComingSoonPanel";
import { IntegrationHubTab } from "@/features/integration-hub/components/IntegrationHubTab";

// Porte pixel-exato de "Agency OS.dc.html" (protótipo de design do usuário),
// adaptado pra navegação CLIENT-CENTRIC (ver docs/PLANO-REORGANIZACAO-CLIENT-CENTRIC.md):
// "Clientes" é o eixo — Vendedores/Rodada, Fontes de Entrada e Destinos vivem
// DENTRO do cliente selecionado (ClientWorkspaceShell), não como itens de nav
// à parte. "CRM & Funil" foi removido daqui — é o StartCRM, produto separado.
type ScreenKey = "motor" | "central" | "dashboard" | "clientes" | "regras" | "logs" | "config";

const NAV_GROUPS: { label: string; items: { key: ScreenKey; label: string; Icon: typeof MotorIcon }[] }[] = [
  {
    label: "PRINCIPAL",
    items: [
      { key: "clientes", label: "Clientes (Workspaces)", Icon: ClientesIcon },
      { key: "dashboard", label: "Visão Geral (Agência)", Icon: DashboardIcon }
    ]
  },
  {
    label: "AGÊNCIA",
    items: [
      { key: "central", label: "Central de Integrações", Icon: CentralIcon },
      { key: "motor", label: "Motor de Processamento", Icon: MotorIcon }
    ]
  },
  {
    label: "OPERAÇÃO",
    items: [
      { key: "regras", label: "Regras de Roteamento", Icon: GearIcon },
      { key: "logs", label: "Logs & Automação", Icon: LogsIcon },
      { key: "config", label: "Configurações", Icon: GearIcon }
    ]
  }
];

const COMING_SOON: Partial<Record<ScreenKey, { title: string; description: string }>> = {
  motor: { title: "Motor de Processamento", description: "O coração da plataforma. Todo lead — de qualquer origem — passa por um único fluxo. Idempotente: cada Lead ID é processado uma vez só, mesmo com webhook repetido, timeout ou reinício." },
  regras: { title: "Regras de Roteamento", description: "Fontes de entrada, método de distribuição e regras por origem." },
  logs: { title: "Logs & Automação", description: "Stream de logs em tempo real, auto-correção e rotas de automação." },
  config: { title: "Configurações", description: "Documentação do produto e modelo de status do funil." }
};

export function LeadsDashboardShell() {
  const [screen, setScreen] = useState<ScreenKey>("clientes");
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<{ id: string; name: string } | null>(null);

  const vars = agencyOsThemeVars(dark);

  let content: React.ReactNode;
  if (screen === "clientes") {
    content = selectedWorkspace ? (
      <ClientWorkspaceShell
        workspaceId={selectedWorkspace.id}
        workspaceName={selectedWorkspace.name}
        onBack={() => setSelectedWorkspace(null)}
      />
    ) : (
      <ClientsListScreen onSelect={(id, name) => setSelectedWorkspace({ id, name })} />
    );
  } else if (screen === "dashboard") {
    content = <OverviewTab />;
  } else if (screen === "central") {
    content = <IntegrationHubTab />;
  } else {
    content = COMING_SOON[screen] && <ComingSoonPanel {...COMING_SOON[screen]!} />;
  }

  return (
    <div
      style={{
        ...vars,
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--fg)",
        fontFamily: "var(--font-geist-sans, 'Geist'), system-ui, sans-serif"
      }}
    >
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.45)", zIndex: 55 }}
            className="md:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          style={{
            width: 256,
            background: "var(--sidebar)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            position: sidebarOpen ? "fixed" : undefined,
            top: 0,
            bottom: 0,
            left: 0,
            zIndex: 60,
            transform: sidebarOpen ? "translateX(0)" : undefined,
            boxShadow: sidebarOpen ? "0 20px 60px rgba(0,0,0,.25)" : undefined
          }}
          className={sidebarOpen ? "flex" : "hidden md:flex"}
        >
          <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 22px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--accent)", fontWeight: 700, fontSize: 19, letterSpacing: "-.02em" }}>
              <LogoIcon size={23} />
              Agency OS
            </div>
          </div>
          <nav style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", color: "var(--faint)", padding: "8px 10px 4px" }}>
                  {group.label}
                </div>
                {group.items.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setScreen(key);
                      setSidebarOpen(false);
                      if (key === "clientes") setSelectedWorkspace(null);
                    }}
                    style={{
                      width: "100%",
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "0 10px",
                      border: "none",
                      borderRadius: 9,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      background: screen === key ? "var(--soft-bg)" : "transparent",
                      color: screen === key ? "var(--soft-fg)" : "var(--fg2)"
                    }}
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div style={{ padding: 14, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9999, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
              EA
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Admin</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Agência Mega</span>
            </div>
            <button
              title="Sair"
              style={{ width: 30, height: 30, border: "none", background: "transparent", color: "var(--muted)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <LogoutIcon size={16} />
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Topbar */}
          <header
            style={{
              height: 60,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 24px",
              borderBottom: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--bg) 78%, transparent)",
              backdropFilter: "blur(8px)",
              position: "sticky",
              top: 0,
              zIndex: 40
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden"
              style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 9, cursor: "pointer", color: "var(--fg)" }}
            >
              <MenuIcon size={18} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 9999, background: "var(--em-bg)", border: "1px solid var(--em-bd)", whiteSpace: "nowrap" }}>
              <span style={{ position: "relative", width: 7, height: 7 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--green)" }} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--em-fg)" }}>Motor ativo</span>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setDark((d) => !d)}
              title="Alternar tema"
              style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 9, cursor: "pointer", color: "var(--fg2)" }}
            >
              {dark ? <MoonIcon size={17} /> : <SunIcon size={17} />}
            </button>
            <button
              style={{ height: 36, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 13px", border: "none", background: "var(--accent)", color: "#fff", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
            >
              <UserPlusIcon size={16} />
              Novo Lead
            </button>
          </header>

          {/* Scroll area */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <main style={{ maxWidth: 1180, margin: "0 auto", padding: 30, display: "flex", flexDirection: "column", gap: 26, width: "100%" }}>
              {content}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
