"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { IntegrationHubTab } from "@/features/integration-hub/components/IntegrationHubTab";
import { LogsTab } from "./LogsTab";
import { RoutingRulesTab } from "./RoutingRulesTab";
import { ConfiguracoesShell } from "./ConfiguracoesShell";
import { getWorkspaceById } from "../actions";

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
      { key: "dashboard", label: "Visão Geral (Agência)", Icon: DashboardIcon },
      { key: "clientes", label: "Clientes (Workspaces)", Icon: ClientesIcon }
    ]
  },
  {
    label: "AGÊNCIA",
    items: [
      { key: "motor", label: "Motor de Processamento", Icon: MotorIcon },
      { key: "regras", label: "Regras de Roteamento", Icon: GearIcon }
    ]
  },
  {
    label: "SISTEMA",
    items: [
      // Integrações (Central), Logs e Documentação agora vivem DENTRO de
      // Configurações (ver arquitetura do menu Configurações). Um só ponto de
      // entrada pra tudo que é de agência.
      { key: "config", label: "Configurações", Icon: CentralIcon }
    ]
  }
];

const COMING_SOON: Partial<Record<ScreenKey, { title: string; description: string }>> = {
  motor: { title: "Motor de Processamento", description: "O coração da plataforma. Todo lead — de qualquer origem — passa por um único fluxo. Idempotente: cada Lead ID é processado uma vez só, mesmo com webhook repetido, timeout ou reinício." },
  regras: { title: "Regras de Roteamento", description: "Fontes de entrada, método de distribuição e regras por origem." },
  logs: { title: "Logs & Automação", description: "Stream de logs em tempo real, auto-correção e rotas de automação." }
};

export function LeadsDashboardShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace");

  const [screen, setScreen] = useState<ScreenKey>("clientes");
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // para mobile
  const [isCollapsed, setIsCollapsed] = useState(false); // para desktop
  // Só o NOME fica em estado local — o id de verdade mora na URL (?workspace=id),
  // que é o que sobrevive a navegar pra outra tela e voltar, refresh e link
  // compartilhado. Ver memória "fix_workspace_context_persistence".
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  // Se a página carrega direto com ?workspace=id (refresh, link colado), o nome
  // não vem na URL — busca uma vez. Também cobre o caso do id mudar sem passar
  // por handleSelectWorkspace (ex.: back/forward do navegador).
  useEffect(() => {
    if (!workspaceId) {
      setWorkspaceName(null);
      return;
    }
    let cancelled = false;
    getWorkspaceById(workspaceId).then((res) => {
      if (!cancelled && res.success) setWorkspaceName(res.workspace.name);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const setWorkspaceParam = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("workspace", id);
    else params.delete("workspace");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleSelectWorkspace = (id: string, name: string) => {
    setWorkspaceName(name); // evita o "Carregando..." — o clique já sabe o nome
    setWorkspaceParam(id);
  };

  const vars = agencyOsThemeVars(dark);

  let content: React.ReactNode;
  if (screen === "clientes") {
    content = workspaceId ? (
      <ClientWorkspaceShell
        workspaceId={workspaceId}
        workspaceName={workspaceName ?? "Carregando..."}
        onBack={() => setWorkspaceParam(null)}
      />
    ) : (
      <ClientsListScreen onSelect={handleSelectWorkspace} />
    );
  } else if (screen === "dashboard") {
    content = <OverviewTab />;
  } else if (screen === "central") {
    content = <IntegrationHubTab />;
  } else if (screen === "regras") {
    content = <RoutingRulesTab workspaceId={workspaceId || undefined} />;
  } else if (screen === "logs") {
    content = <LogsTab workspaceId={workspaceId || undefined} />;
  } else if (screen === "config") {
    content = <ConfiguracoesShell workspaceId={workspaceId || undefined} />;
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
            width: isCollapsed ? 76 : 256,
            transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
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
          <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between", padding: isCollapsed ? "0" : "0 18px", borderBottom: "1px solid var(--border)", overflow: "hidden" }}>
            {!isCollapsed && (
              <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--accent)", fontWeight: 700, fontSize: 19, letterSpacing: "-.02em" }}>
                <LogoIcon size={23} />
                Agency OS
              </div>
            )}
            {isCollapsed && <LogoIcon size={23} style={{ color: "var(--accent)" }} />}
            
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex"
              style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: "var(--muted)", borderRadius: 6, cursor: "pointer", marginLeft: isCollapsed ? 0 : 8 }}
            >
              {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          <nav style={{ flex: 1, padding: isCollapsed ? "14px 10px" : "14px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto", overflowX: "hidden" }}>
            {NAV_GROUPS.map((group, groupIdx) => (
              <div key={group.label} style={{ marginTop: groupIdx > 0 ? 12 : 0 }}>
                {isCollapsed ? (
                  <div style={{ height: 1, background: "var(--border)", margin: "8px 10px" }} />
                ) : (
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", color: "var(--faint)", padding: "8px 10px 4px", whiteSpace: "nowrap" }}>
                    {group.label}
                  </div>
                )}
                {group.items.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setScreen(key);
                      setSidebarOpen(false);
                    }}
                    title={isCollapsed ? label : undefined}
                    style={{
                      width: "100%",
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isCollapsed ? "center" : "flex-start",
                      gap: isCollapsed ? 0 : 10,
                      padding: isCollapsed ? 0 : "0 10px",
                      border: "none",
                      borderRadius: 9,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      background: screen === key ? "var(--soft-bg)" : "transparent",
                      color: screen === key ? "var(--soft-fg)" : "var(--fg2)",
                      transition: "all 0.2s"
                    }}
                  >
                    <Icon size={17} style={{ minWidth: 17 }} />
                    {!isCollapsed && <span style={{ whiteSpace: "nowrap" }}>{label}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div style={{ padding: 14, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", gap: 11, overflow: "hidden" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9999, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              EA
            </div>
            {!isCollapsed && (
              <>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap" }}>Admin</span>
                  <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>Agência Mega</span>
                </div>
                <button
                  title="Sair"
                  style={{ width: 30, height: 30, flexShrink: 0, border: "none", background: "transparent", color: "var(--muted)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <LogoutIcon size={16} />
                </button>
              </>
            )}
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
