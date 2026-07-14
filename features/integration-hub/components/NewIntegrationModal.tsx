"use client";

import { useState, useEffect } from "react";
import { FacebookIcon } from "@/features/leads/components/FacebookIcon";
import { XIcon, ChevronRightIcon, CheckIcon } from "@/features/leads/components/icons/agency-os-icons";
import type { Connection } from "./ConnectionCard";
import {
  saveKommoDestination,
  saveGoogleSheetsDestination,
  saveEvolutionDestination,
  listWorkspaces,
  listMetaPages,
  listMetaForms,
  saveMetaConnection,
  addSellerToConnection,
} from "../actions";
import type { MetaPage, MetaLeadForm } from "@/lib/leads/providers/meta";

// Porte pixel-exato do modal "Nova integração" de Agency OS.dc.html
type ProviderId = "meta" | "google" | "sheets" | "kommo" | "evolution";

const PROVIDERS: { id: ProviderId; label: string; iconBg: string; icon: React.ReactNode }[] = [
  { id: "meta", label: "Meta Business", iconBg: "#0866FF", icon: <FacebookIcon className="w-[17px] h-[17px]" /> },
  { id: "google", label: "Google Ads / Lead Forms", iconBg: "#EA4335", icon: <span style={{ fontWeight: 700, fontSize: 14 }}>G</span> },
  { id: "sheets", label: "Google Sheets", iconBg: "#0f9d58", icon: <span style={{ fontWeight: 700, fontSize: 12 }}>GS</span> },
  { id: "kommo", label: "Kommo CRM", iconBg: "#00a6ff", icon: <span style={{ fontWeight: 800, fontSize: 14 }}>k</span> },
  { id: "evolution", label: "Evolution API", iconBg: "#25d366", icon: <span style={{ fontWeight: 700, fontSize: 11 }}>Ev</span> }
];

const MOCK_FORMS = ["Avaliação", "Consórcio", "Orçamento"];

export function NewIntegrationModal({
  onClose,
  onCreate,
  editingConnection,
  defaultWorkspaceId,
  defaultProviderId
}: {
  onClose: () => void;
  onCreate: (connection: Connection) => void;
  editingConnection?: Connection | null;
  /** Pré-seleciona o cliente (usado quando o modal é aberto de dentro do contexto de um cliente específico). */
  defaultWorkspaceId?: string;
  /** Pula a etapa "escolher provedor" quando o contexto já sabe qual é (ex.: aba Fontes de Entrada). */
  defaultProviderId?: ProviderId;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(defaultProviderId ? 1 : 0);
  const [providerId, setProviderId] = useState<ProviderId | null>(defaultProviderId || null);
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set(MOCK_FORMS.slice(0, 3)));
  const [isSaving, setIsSaving] = useState(false);

  // Kommo state
  const [kommoSubdomain, setKommoSubdomain] = useState("");
  const [kommoToken, setKommoToken] = useState("");
  const [kommoPipeline, setKommoPipeline] = useState("");
  const [kommoStatus, setKommoStatus] = useState("");

  // Sheets state
  const [sheetsEmail, setSheetsEmail] = useState("");
  const [sheetsKey, setSheetsKey] = useState("");
  const [sheetsId, setSheetsId] = useState("");
  const [sheetsName, setSheetsName] = useState("");

  // Evolution state
  const [evoUrl, setEvoUrl] = useState("");
  const [evoToken, setEvoToken] = useState("");
  const [evoInstance, setEvoInstance] = useState("");
  const [evoGroup, setEvoGroup] = useState("");

  // Meta (Facebook) state
  const [metaToken, setMetaToken] = useState("");
  const [metaLoadingPages, setMetaLoadingPages] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaPages, setMetaPages] = useState<MetaPage[]>([]);
  const [metaSelectedPageId, setMetaSelectedPageId] = useState<string | null>(null);
  const [metaForms, setMetaForms] = useState<MetaLeadForm[]>([]);
  const [metaLoadingForms, setMetaLoadingForms] = useState(false);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [metaWorkspaceId, setMetaWorkspaceId] = useState<string>(defaultWorkspaceId || "");
  const [metaNewWorkspaceName, setMetaNewWorkspaceName] = useState("");
  const [metaSellers, setMetaSellers] = useState<{ name: string; phone: string }[]>([{ name: "", phone: "" }]);

  useEffect(() => {
    listWorkspaces().then((res) => {
      if (res.success) setWorkspaces(res.workspaces);
    });
  }, []);

  useEffect(() => {
    if (editingConnection) {
      if (editingConnection.type) {
        setProviderId(editingConnection.type as ProviderId);
        setStep(1); // or 2 for meta, but meta editing will need special handling
        
        if (editingConnection.type === "kommo" && editingConnection.config) {
          setKommoSubdomain(editingConnection.config.subdomain || "");
          setKommoToken(editingConnection.config.token || "");
          setKommoPipeline(editingConnection.config.pipelineId || "");
          setKommoStatus(editingConnection.config.statusId || "");
        } else if (editingConnection.type === "google_sheets" && editingConnection.config) {
          setSheetsEmail(editingConnection.config.clientEmail || "");
          setSheetsKey(editingConnection.config.privateKey || "");
          setSheetsId(editingConnection.config.spreadsheetId || "");
          setSheetsName(editingConnection.config.sheetName || "");
        } else if (editingConnection.type === "evolution" && editingConnection.config) {
          setEvoUrl(editingConnection.config.url || "");
          setEvoToken(editingConnection.config.token || "");
          setEvoInstance(editingConnection.config.instanceName || "");
          setEvoGroup(editingConnection.config.groupJid || "");
        }
      }
    }
  }, [editingConnection]);

  const handleFetchMetaPages = async () => {
    setMetaError(null);
    setMetaLoadingPages(true);
    const res = await listMetaPages(metaToken);
    setMetaLoadingPages(false);
    if (!res.success) {
      setMetaError(res.error);
      return;
    }
    if (res.pages.length === 0) {
      setMetaError("Nenhuma página encontrada para este token (verifique as permissões pages_show_list).");
      return;
    }
    setMetaPages(res.pages);
    setMetaSelectedPageId(res.pages[0].id);
    setStep(2);
  };

  useEffect(() => {
    if (providerId === "meta" && step === 2 && metaSelectedPageId) {
      const page = metaPages.find(p => p.id === metaSelectedPageId);
      if (page) {
        setMetaLoadingForms(true);
        listMetaForms(page.id, page.access_token).then(res => {
          if (res.success) {
            setMetaForms(res.forms);
          } else {
            setMetaForms([]);
          }
          setMetaLoadingForms(false);
        });
      }
    }
  }, [metaSelectedPageId, providerId, step, metaPages]);

  const provider = PROVIDERS.find((p) => p.id === providerId) ?? null;

  const toggleForm = (form: string) => {
    setSelectedForms((prev) => {
      const next = new Set(prev);
      if (next.has(form)) next.delete(form);
      else next.add(form);
      return next;
    });
  };

  const handleSave = async () => {
    if (!provider) return;
    
    setIsSaving(true);
    
    if (provider.id === "kommo") {
      const res = await saveKommoDestination({
        subdomain: kommoSubdomain,
        token: kommoToken,
        pipelineId: kommoPipeline,
        statusId: kommoStatus,
        workspaceId: defaultWorkspaceId
      });
      
      if (res.success) {
        onCreate({
          id: Date.now().toString(),
          name: `Kommo (${kommoSubdomain})`,
          providerLabel: "Kommo CRM · API Token",
          icon: provider.icon,
          iconBg: provider.iconBg,
          status: "connected",
          maskedToken: `${kommoToken.substring(0, 10)}••••••••••`,
          counts: [
            { value: "1", label: "pipelines" },
            { value: "1", label: "contas" },
            { value: "1", label: "workspaces" }
          ],
          syncNote: "Agora mesmo",
          actions: ["renew", "test", "edit", "disconnect"]
        });
      } else {
        alert("Erro ao salvar Kommo: " + res.error);
      }
    } else if (provider.id === "sheets") {
      const res = await saveGoogleSheetsDestination({
        clientEmail: sheetsEmail,
        privateKey: sheetsKey,
        spreadsheetId: sheetsId,
        sheetName: sheetsName,
        workspaceId: defaultWorkspaceId
      });
      
      if (res.success) {
        onCreate({
          id: Date.now().toString(),
          name: "Google Sheets",
          providerLabel: "Google Sheets · Service Account",
          icon: provider.icon,
          iconBg: provider.iconBg,
          status: "connected",
          maskedToken: `${sheetsEmail.split('@')[0]}••••••••••`,
          counts: [{ value: "1", label: "planilhas" }],
          syncNote: "Agora mesmo",
          actions: ["test", "edit", "disconnect"]
        });
      } else {
        alert("Erro ao salvar Sheets: " + res.error);
      }
    } else if (provider.id === "evolution") {
      const res = await saveEvolutionDestination({
        url: evoUrl,
        token: evoToken,
        instanceName: evoInstance,
        groupJid: evoGroup,
        workspaceId: defaultWorkspaceId
      });
      
      if (res.success) {
        onCreate({
          id: Date.now().toString(),
          name: `WhatsApp (${evoInstance})`,
          providerLabel: "Evolution API · Instance",
          icon: provider.icon,
          iconBg: provider.iconBg,
          status: "connected",
          maskedToken: `${evoUrl.replace(/^https?:\/\//, '').substring(0, 15)}••••••••••`,
          counts: [{ value: "1", label: "instância" }],
          syncNote: "Agora mesmo",
          actions: ["test", "edit", "disconnect"]
        });
      } else {
        alert("Erro ao salvar WhatsApp: " + res.error);
      }
    } else if (provider.id === "meta") {
      const selectedPage = metaPages.find((p) => p.id === metaSelectedPageId);
      if (!selectedPage) {
        alert("Selecione uma página do Facebook.");
        setIsSaving(false);
        return;
      }
      if (!metaWorkspaceId && !metaNewWorkspaceName.trim()) {
        alert("Selecione um cliente existente ou informe o nome de um novo cliente.");
        setIsSaving(false);
        return;
      }

      const res = await saveMetaConnection({
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        accessToken: selectedPage.access_token,
        workspaceId: metaWorkspaceId || undefined,
        newWorkspaceName: metaWorkspaceId ? undefined : metaNewWorkspaceName,
      });

      if (!res.success) {
        alert("Erro ao conectar página do Facebook: " + res.error);
        setIsSaving(false);
        return;
      }

      // Cadastra os vendedores informados e vincula ao rodízio desta página
      const sellersToAdd = metaSellers.filter((s) => s.name.trim());
      for (const seller of sellersToAdd) {
        await addSellerToConnection({
          workspaceId: res.workspaceId,
          connectionId: res.connectionId,
          name: seller.name.trim(),
          phone: seller.phone.trim() || undefined,
        });
      }

      onCreate({
        id: res.connectionId,
        name: selectedPage.name,
        providerLabel: "Meta Business · Page Access Token",
        icon: provider.icon,
        iconBg: provider.iconBg,
        status: "connected",
        maskedToken: `${selectedPage.access_token.substring(0, 8)}••••••••••`,
        counts: [
          { value: "1", label: "páginas" },
          { value: String(sellersToAdd.length), label: "vendedores" },
          { value: "1", label: "workspaces" }
        ],
        syncNote: "Agora mesmo",
        actions: ["test", "sync", "edit", "disconnect"]
      });
    } else {
      // Mock para Google Ads / Lead Forms (placeholder — ver docs/PRD-FONTES-DE-ENTRADA.md)
      onCreate({
        id: Date.now().toString(),
        name: provider.label,
        providerLabel: `${provider.label} · Access Token`,
        icon: provider.icon,
        iconBg: provider.iconBg,
        status: "connected",
        maskedToken: "EAAB9ZC••••••••••••••••••P9D",
        counts: [
          { value: String(selectedForms.size), label: "formulários" },
          { value: "1", label: "páginas" },
          { value: "0", label: "workspaces" }
        ],
        syncNote: "Agora mesmo",
        actions: ["test", "sync", "edit", "disconnect"]
      });
    }
    
    setIsSaving(false);
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 86, background: "rgba(2,6,23,.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: "var(--card)", color: "var(--fg)", borderRadius: 16, boxShadow: "0 24px 60px rgba(2,6,23,.35)", overflow: "hidden" }}
      >
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{editingConnection ? "Editar integração" : "Nova integração"}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Passo {step + 1} de {provider?.id === "kommo" || provider?.id === "evolution" || provider?.id === "sheets" ? "2" : "3"} · nível do sistema</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, border: "none", background: "var(--hover)", borderRadius: 8, cursor: "pointer", color: "var(--fg2)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <XIcon size={16} />
          </button>
        </div>

        <div style={{ padding: 20, minHeight: 230 }}>
          {step === 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg2)", marginBottom: 12 }}>Escolha o provedor</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProviderId(p.id);
                      setStep(1);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 10, cursor: "pointer", textAlign: "left", color: "var(--fg)" }}
                  >
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: p.iconBg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p.icon}
                    </span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.label}</span>
                    <ChevronRightIcon size={16} style={{ color: "var(--faint)" }} />
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && provider && provider.id === "meta" && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg2)", marginBottom: 6 }}>Autenticação · {provider.label}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
                Cole um Access Token (recomendado: System User, gerado no Business Manager — não expira). Vamos buscar as páginas de verdade na Graph API.
              </div>

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Access Token</label>
              <textarea
                value={metaToken}
                onChange={(e) => setMetaToken(e.target.value)}
                placeholder="EAAB9ZC..."
                style={{ width: "100%", height: 80, padding: "12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-geist-mono, monospace)", outline: "none", marginBottom: 10, resize: "none" }}
              />

              {metaError && (
                <div style={{ padding: "10px 12px", borderRadius: 9, background: "var(--em-bg)", border: "1px solid var(--em-bd)", color: "var(--em-fg)", fontSize: 12.5, fontWeight: 500, marginBottom: 14 }}>
                  {metaError}
                </div>
              )}

              <button
                onClick={handleFetchMetaPages}
                disabled={metaLoadingPages || !metaToken.trim()}
                style={{ width: "100%", height: 42, border: "none", borderRadius: 10, background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: metaLoadingPages ? "wait" : "pointer", opacity: metaLoadingPages || !metaToken.trim() ? 0.7 : 1 }}
              >
                {metaLoadingPages ? "Buscando páginas..." : "Buscar páginas do Facebook"}
              </button>
            </>
          )}

          {step === 1 && provider && provider.id === "google" && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg2)", marginBottom: 6 }}>Autenticação · {provider.label}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Dois métodos — escolha conforme quem administra a conta.</div>

              <button
                onClick={() => setStep(2)}
                style={{ width: "100%", height: 44, border: "none", borderRadius: 10, background: "#0866FF", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}
              >
                <FacebookIcon className="w-[17px] h-[17px]" />
                Entrar com {provider.label} (OAuth)
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted)", marginBottom: 14 }}>
                <span style={{ display: "inline-flex", alignItems: "center", height: 16, padding: "0 6px", borderRadius: 5, background: "var(--em-bg)", color: "var(--em-fg)", fontWeight: 600, fontSize: 10 }}>CLIENTE</span>
                1 clique, sem token nem ID — ideal para quem não é técnico.
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 14px", color: "var(--faint)", fontSize: 12 }}>
                <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
                ou token permanente
                <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>
                <span style={{ display: "inline-flex", alignItems: "center", height: 16, padding: "0 6px", borderRadius: 5, background: "var(--soft-bg)", color: "var(--soft-fg)", fontWeight: 600, fontSize: 10 }}>AGÊNCIA</span>
                System User — não expira, sem login/2FA recorrente. <b style={{ color: "var(--fg2)" }}>Recomendado para você.</b>
              </div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Access Token (System User)</label>
              <input
                defaultValue="EAAB9ZC…•••••••••••••••••••••••••••…P9D"
                style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-geist-mono, monospace)", outline: "none", marginBottom: 10 }}
              />
              <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, marginBottom: 16 }}>
                Ao salvar, validamos na Graph API: <b>validade</b>, <b>permissões</b> e <b>escopos</b>. Se falhar, mostramos o motivo exato (ex.: <span style={{ fontFamily: "var(--font-geist-mono, monospace)" }}>190 — token expirado</span>).
              </div>
              <button
                onClick={() => setStep(2)}
                style={{ width: "100%", height: 42, border: "none", borderRadius: 10, background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Validar token
              </button>
            </>
          )}

          {step === 1 && provider && provider.id === "kommo" && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg2)", marginBottom: 16 }}>Configuração · {provider.label}</div>
              
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Subdomínio Kommo</label>
              <input
                value={kommoSubdomain}
                onChange={(e) => setKommoSubdomain(e.target.value)}
                placeholder="ex: karolineschutz"
                style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none", marginBottom: 16 }}
              />
              
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Access Token (JWT)</label>
              <textarea
                value={kommoToken}
                onChange={(e) => setKommoToken(e.target.value)}
                placeholder="eyJ0eXAiOiJKV1QiLCJhbG..."
                style={{ width: "100%", height: 80, padding: "12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-geist-mono, monospace)", outline: "none", marginBottom: 16, resize: "none" }}
              />
              
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Pipeline ID (Opcional)</label>
                  <input
                    value={kommoPipeline}
                    onChange={(e) => setKommoPipeline(e.target.value)}
                    placeholder="ex: 13924251"
                    style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Status ID (Opcional)</label>


                  <input
                    value={kommoStatus}
                    onChange={(e) => setKommoStatus(e.target.value)}
                    placeholder="ex: 107449871"
                    style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && provider && provider.id === "meta" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, background: "var(--em-bg)", border: "1px solid var(--em-bd)", color: "var(--em-fg)", fontSize: 12.5, fontWeight: 500, marginBottom: 16 }}>
                <CheckIcon size={15} />
                {metaPages.length} página(s) encontrada(s) para este token
              </div>

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 5, color: "var(--fg2)" }}>Página do Facebook</label>
              <select
                value={metaSelectedPageId ?? ""}
                onChange={(e) => setMetaSelectedPageId(e.target.value)}
                style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 9, background: "var(--input)", color: "var(--fg)", fontSize: 13.5, outline: "none", marginBottom: 14 }}
              >
                {metaPages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 8, color: "var(--fg2)" }}>Formulários detectados nesta página</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14, maxHeight: 120, overflowY: "auto" }}>
                {metaLoadingForms ? (
                  <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>Carregando formulários...</div>
                ) : metaForms.length > 0 ? (
                  metaForms.map((form) => (
                    <div key={form.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, padding: "8px 11px", background: "var(--panel)", borderRadius: 8 }}>
                      <CheckIcon size={12} style={{ color: "var(--accent)" }} />
                      {form.name} <span style={{ color: "var(--muted)", fontSize: 11 }}>({form.status})</span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>Nenhum formulário ativo encontrado.</div>
                )}
              </div>

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 5, color: "var(--fg2)" }}>Cliente (Workspace)</label>
              <select
                value={metaWorkspaceId}
                onChange={(e) => setMetaWorkspaceId(e.target.value)}
                style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 9, background: "var(--input)", color: "var(--fg)", fontSize: 13.5, outline: "none", marginBottom: 10 }}
              >
                <option value="">+ Novo cliente...</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>

              {!metaWorkspaceId && (
                <input
                  value={metaNewWorkspaceName}
                  onChange={(e) => setMetaNewWorkspaceName(e.target.value)}
                  placeholder="Nome do novo cliente"
                  style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 9, background: "var(--input)", color: "var(--fg)", fontSize: 13.5, outline: "none", marginBottom: 14 }}
                />
              )}

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 8, color: "var(--fg2)" }}>Vendedores da fila (rodízio desta página)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                {metaSellers.map((seller, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8 }}>
                    <input
                      value={seller.name}
                      onChange={(e) => {
                        const next = [...metaSellers];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setMetaSellers(next);
                      }}
                      placeholder="Nome do vendedor"
                      style={{ flex: 2, height: 36, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                    />
                    <input
                      value={seller.phone}
                      onChange={(e) => {
                        const next = [...metaSellers];
                        next[idx] = { ...next[idx], phone: e.target.value };
                        setMetaSellers(next);
                      }}
                      placeholder="WhatsApp (opcional)"
                      style={{ flex: 1, height: 36, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setMetaSellers([...metaSellers, { name: "", phone: "" }])}
                style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}
              >
                + Adicionar vendedor
              </button>
            </>
          )}

          {step === 2 && provider && provider.id === "google" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, background: "var(--em-bg)", border: "1px solid var(--em-bd)", color: "var(--em-fg)", fontSize: 12.5, fontWeight: 500, marginBottom: 16 }}>
                <CheckIcon size={15} />
                Token válido · escopos: leads_retrieval, pages_show_list
              </div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 5, color: "var(--fg2)" }}>Business Manager</label>
              <select style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 9, background: "var(--input)", color: "var(--fg)", fontSize: 13.5, outline: "none", marginBottom: 12 }}>
                <option>Agência Start</option>
                <option>Clientes White-label</option>
              </select>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 5, color: "var(--fg2)" }}>Página</label>
              <select style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 9, background: "var(--input)", color: "var(--fg)", fontSize: 13.5, outline: "none", marginBottom: 12 }}>
                <option>Clínica Sorriso</option>
                <option>Construtora XYZ</option>
                <option>Estética Bela</option>
              </select>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 8, color: "var(--fg2)" }}>Formulários detectados</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {MOCK_FORMS.concat(["Black Friday"]).map((form) => {
                  const checked = selectedForms.has(form);
                  return (
                    <label key={form} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, padding: "8px 11px", background: "var(--panel)", borderRadius: 8, cursor: "pointer" }}>
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          toggleForm(form);
                        }}
                        style={{ width: 16, height: 16, borderRadius: 5, background: checked ? "var(--accent)" : "transparent", border: checked ? "none" : "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      >
                        {checked && <CheckIcon size={10} style={{ color: "#fff" }} />}
                      </span>
                      {form}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border2)", display: "flex", alignItems: "center", gap: 10, background: "var(--panel)" }}>
          {(step === 1 || step === 2) && (
            <button
              onClick={() => setStep((s) => (s - 1) as 0 | 1)}
              style={{ height: 38, padding: "0 16px", border: "1px solid var(--border)", background: "var(--card)", color: "var(--fg)", borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}
            >
              Voltar
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{ height: 38, padding: "0 14px", border: "none", background: "transparent", color: "var(--muted)", borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}
          >
            Cancelar
          </button>
          {(step === 2 || (step === 1 && provider && provider.id !== "meta" && provider.id !== "google")) && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{ height: 38, padding: "0 18px", border: "none", background: "var(--accent)", color: "#fff", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: isSaving ? "wait" : "pointer", opacity: isSaving ? 0.7 : 1 }}
            >
              {isSaving ? "Salvando..." : "Salvar integração"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

