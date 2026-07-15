"use client";

import { useState, useEffect } from "react";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { XIcon, ChevronRightIcon, CheckIcon } from "@/components/icons/agency-os-icons";
import type { Connection } from "./ConnectionCard";
import {
  saveKommoDestination,
  saveGoogleSheetsDestination,
  saveEvolutionDestination,
  listWorkspaces,
  listSavedSources,
  saveMetaSource,
  getSourcePages,
  resyncSourcePages,
  getSourceForms,
  saveMetaConnection,
  addSellerToConnection,
  searchGoogleSpreadsheets,
  listGoogleSheetTabs,
} from "./actions";
import type { SavedSource, SourcePage, SourceForm } from "./actions";
import type { SpreadsheetOption } from "@/lib/leads/integrations/sheets";

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
  const [sheetsJsonRaw, setSheetsJsonRaw] = useState("");
  const [sheetsJsonError, setSheetsJsonError] = useState<string | null>(null);
  const [sheetsEmail, setSheetsEmail] = useState("");
  const [sheetsKey, setSheetsKey] = useState("");
  const [sheetsId, setSheetsId] = useState("");
  const [sheetsName, setSheetsName] = useState("");
  // Duas formas de escolher a planilha, ambas sempre disponíveis (pedido explícito):
  // buscar pelo nome (via Drive API da própria Service Account) ou colar o link/ID direto.
  const [sheetsMode, setSheetsMode] = useState<"search" | "manual">("search");
  const [sheetsSearchQuery, setSheetsSearchQuery] = useState("");
  const [sheetsSearchResults, setSheetsSearchResults] = useState<SpreadsheetOption[]>([]);
  const [sheetsSearching, setSheetsSearching] = useState(false);
  const [sheetsSearchError, setSheetsSearchError] = useState<string | null>(null);
  const [selectedSpreadsheetName, setSelectedSpreadsheetName] = useState<string | null>(null);
  const [sheetsTabs, setSheetsTabs] = useState<string[]>([]);
  const [sheetsTabsLoading, setSheetsTabsLoading] = useState(false);
  const [sheetsTabsError, setSheetsTabsError] = useState<string | null>(null);

  // Evolution state
  const [evoUrl, setEvoUrl] = useState("");
  const [evoToken, setEvoToken] = useState("");
  const [evoInstance, setEvoInstance] = useState("");
  const [evoGroup, setEvoGroup] = useState("");

  // Meta (Facebook) state — a conexão (token) é salva uma vez e reutilizada;
  // páginas e formulários vêm do cache no banco, não de um fetch a cada abertura.
  const [savedSources, setSavedSources] = useState<SavedSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [addingNewSource, setAddingNewSource] = useState(false);
  const [metaSourceName, setMetaSourceName] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [metaLoadingPages, setMetaLoadingPages] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [sourcePages, setSourcePages] = useState<SourcePage[]>([]);
  const [selectedSourcePageId, setSelectedSourcePageId] = useState<string | null>(null);
  const [sourceForms, setSourceForms] = useState<SourceForm[]>([]);
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());
  const [metaLoadingForms, setMetaLoadingForms] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [metaWorkspaceId, setMetaWorkspaceId] = useState<string>(defaultWorkspaceId || "");
  const [metaNewWorkspaceName, setMetaNewWorkspaceName] = useState("");
  const [metaSellers, setMetaSellers] = useState<{ name: string; phone: string }[]>([{ name: "", phone: "" }]);

  useEffect(() => {
    listWorkspaces().then((res) => {
      if (res.success) setWorkspaces(res.workspaces);
    });
    listSavedSources().then((res) => {
      if (res.success) setSavedSources(res.sources);
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

  /** Conexão já cadastrada: páginas vêm do cache, sem recolar token nem esperar a Graph API. */
  const handleUseSource = async (sourceId: string) => {
    setMetaError(null);
    setMetaLoadingPages(true);
    const res = await getSourcePages(sourceId);
    setMetaLoadingPages(false);

    if (!res.success) {
      setMetaError(res.error);
      return;
    }

    setSelectedSourceId(sourceId);
    setSourcePages(res.pages);
    setSelectedSourcePageId(res.pages[0]?.id ?? null);
    setStep(2);
  };

  /** Token novo: valida na Graph API, salva a conexão e cacheia as páginas. */
  const handleSaveNewSource = async () => {
    setMetaError(null);
    setMetaLoadingPages(true);
    const res = await saveMetaSource({ name: metaSourceName, token: metaToken });
    setMetaLoadingPages(false);

    if (!res.success) {
      setMetaError(res.error);
      return;
    }

    const refreshed = await listSavedSources();
    if (refreshed.success) setSavedSources(refreshed.sources);

    setMetaToken("");
    setAddingNewSource(false);
    await handleUseSource(res.sourceId);
  };

  /** Rebusca as páginas na Meta — para quando o cliente criou uma página nova. */
  const handleResyncPages = async () => {
    if (!selectedSourceId) return;
    setMetaError(null);
    setIsResyncing(true);
    const res = await resyncSourcePages(selectedSourceId);
    setIsResyncing(false);

    if (!res.success) {
      setMetaError(res.error);
      return;
    }
    setSourcePages(res.pages);
    if (!res.pages.some((p) => p.id === selectedSourcePageId)) {
      setSelectedSourcePageId(res.pages[0]?.id ?? null);
    }
  };

  const loadForms = async (sourcePageId: string, forceSync = false) => {
    setMetaLoadingForms(true);
    const res = await getSourceForms(sourcePageId, forceSync);
    setMetaLoadingForms(false);

    if (!res.success) {
      setSourceForms([]);
      setMetaError(res.error);
      return;
    }

    setSourceForms(res.forms);
    // Pré-marca o que já estava monitorado. Página nova entra sem nada marcado:
    // a escolha é explícita, nunca "todos por padrão".
    setSelectedFormIds(new Set(res.forms.filter((f) => f.isMonitored).map((f) => f.id)));
  };

  useEffect(() => {
    if (providerId === "meta" && step === 2 && selectedSourcePageId) {
      loadForms(selectedSourcePageId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSourcePageId, providerId, step]);

  const provider = PROVIDERS.find((p) => p.id === providerId) ?? null;

  /** Seleção real dos formulários Meta — é o que vira `is_monitored` no banco. */
  const toggleForm = (formId: string) => {
    setSelectedFormIds((prev) => {
      const next = new Set(prev);
      if (next.has(formId)) next.delete(formId);
      else next.add(formId);
      return next;
    });
  };

  /** Fluxo Google ainda é mock (ver docs/PRD-FONTES-DE-ENTRADA.md). */
  const toggleMockForm = (form: string) => {
    setSelectedForms((prev) => {
      const next = new Set(prev);
      if (next.has(form)) next.delete(form);
      else next.add(form);
      return next;
    });
  };

  /**
   * Cola o conteúdo do arquivo JSON da Service Account e extrai client_email +
   * private_key sozinho — evita copiar campo por campo do arquivo baixado no
   * Google Cloud Console.
   */
  const handleSheetsJsonPaste = (raw: string) => {
    setSheetsJsonRaw(raw);
    setSheetsJsonError(null);

    if (!raw.trim()) {
      setSheetsEmail("");
      setSheetsKey("");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string };
      if (!parsed.client_email || !parsed.private_key) {
        setSheetsJsonError("JSON válido, mas sem client_email/private_key — confira se é o arquivo certo (tipo 'service_account').");
        return;
      }
      setSheetsEmail(parsed.client_email);
      setSheetsKey(parsed.private_key);
      // Já lista as planilhas compartilhadas com esta service account — o usuário
      // só clica, não precisa nem digitar nada pra ver a lista inicial.
      handleSearchSheets("", parsed.client_email, parsed.private_key);
    } catch {
      setSheetsJsonError("Não consegui ler como JSON — cole o conteúdo completo do arquivo baixado no Google Cloud Console.");
    }
  };

  /** Aceita tanto o ID puro quanto a URL completa da planilha, extrai o ID sozinho. */
  const handleSheetsIdInput = (raw: string) => {
    const match = raw.match(/\/d\/([a-zA-Z0-9-_]+)/);
    setSheetsId(match ? match[1] : raw.trim());
    setSelectedSpreadsheetName(null);
  };

  /**
   * Busca planilhas que a Service Account enxerga (só as compartilhadas com ela).
   * Aceita email/key explícitos porque é chamada logo após o parse do JSON,
   * antes do setState de sheetsEmail/sheetsKey terminar de propagar.
   */
  const handleSearchSheets = async (query: string, email?: string, key?: string) => {
    const clientEmail = email ?? sheetsEmail;
    const privateKey = key ?? sheetsKey;
    if (!clientEmail || !privateKey) return;

    setSheetsSearching(true);
    setSheetsSearchError(null);
    const res = await searchGoogleSpreadsheets({ clientEmail, privateKey, search: query });
    setSheetsSearching(false);

    if (!res.success) {
      setSheetsSearchError(res.error);
      setSheetsSearchResults([]);
      return;
    }
    setSheetsSearchResults(res.spreadsheets);
  };

  const handleFetchTabs = async (spreadsheetId: string) => {
    setSheetsTabsLoading(true);
    setSheetsTabsError(null);
    setSheetsTabs([]);
    const res = await listGoogleSheetTabs({ clientEmail: sheetsEmail, privateKey: sheetsKey, spreadsheetId });
    setSheetsTabsLoading(false);

    if (!res.success) {
      setSheetsTabsError(res.error);
      return;
    }
    setSheetsTabs(res.tabs);
    // Só uma aba? Já seleciona — evita clique redundante quando não há ambiguidade.
    if (res.tabs.length === 1) setSheetsName(res.tabs[0]);
  };

  const handleSelectSpreadsheet = (option: SpreadsheetOption) => {
    setSheetsId(option.id);
    setSelectedSpreadsheetName(option.name);
    setSheetsName("");
    handleFetchTabs(option.id);
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
      if (!sheetsEmail.trim() || !sheetsKey.trim()) {
        alert("Cole o JSON da Service Account — não consegui identificar client_email/private_key.");
        setIsSaving(false);
        return;
      }
      if (!sheetsId.trim() || !sheetsName.trim()) {
        alert("Informe a planilha (ID ou link) e o nome da aba.");
        setIsSaving(false);
        return;
      }

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
      if (!evoUrl.trim() || !evoToken.trim() || !evoInstance.trim()) {
        alert("Preencha URL, API Key e nome da instância.");
        setIsSaving(false);
        return;
      }

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
      const selectedPage = sourcePages.find((p) => p.id === selectedSourcePageId);
      if (!selectedPage) {
        alert("Selecione uma página do Facebook.");
        setIsSaving(false);
        return;
      }
      if (selectedFormIds.size === 0) {
        alert("Selecione ao menos um formulário — os não selecionados são ignorados pelo Motor.");
        setIsSaving(false);
        return;
      }
      if (!metaWorkspaceId && !metaNewWorkspaceName.trim()) {
        alert("Selecione um cliente existente ou informe o nome de um novo cliente.");
        setIsSaving(false);
        return;
      }

      const res = await saveMetaConnection({
        sourcePageId: selectedPage.id,
        workspaceId: metaWorkspaceId || undefined,
        newWorkspaceName: metaWorkspaceId ? undefined : metaNewWorkspaceName,
        selectedFormIds: Array.from(selectedFormIds),
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

      const source = savedSources.find((s) => s.id === selectedSourceId);

      onCreate({
        id: res.connectionId,
        name: selectedPage.name,
        providerLabel: "Meta Business · Page Access Token",
        icon: provider.icon,
        iconBg: provider.iconBg,
        status: "connected",
        maskedToken: source?.maskedToken ?? "••••••••",
        counts: [
          { value: String(selectedFormIds.size), label: "formulários" },
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

          {step === 1 && provider && provider.id === "meta" && !addingNewSource && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg2)", marginBottom: 6 }}>Conexão · {provider.label}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
                Escolha uma conexão já cadastrada — o token e as páginas ficam salvos, não precisa colar de novo.
              </div>

              {metaError && (
                <div style={{ padding: "10px 12px", borderRadius: 9, background: "var(--em-bg)", border: "1px solid var(--em-bd)", color: "var(--em-fg)", fontSize: 12.5, fontWeight: 500, marginBottom: 12 }}>
                  {metaError}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, maxHeight: 200, overflowY: "auto" }}>
                {savedSources.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
                    Nenhuma conexão salva ainda. Cadastre a primeira abaixo — depois dela, é só reutilizar.
                  </div>
                ) : (
                  savedSources.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleUseSource(s.id)}
                      disabled={metaLoadingPages}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: "1px solid var(--border)", background: "var(--card)", borderRadius: 10, cursor: metaLoadingPages ? "wait" : "pointer", textAlign: "left", color: "var(--fg)" }}
                    >
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: provider.iconBg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {provider.icon}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{s.name}</span>
                        <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-geist-mono, monospace)" }}>
                          {s.maskedToken} · {s.pageCount} página(s)
                        </span>
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: s.status === "active" ? "var(--em-fg)" : "var(--muted)", flexShrink: 0 }}>
                        {s.status === "active" ? "Conectado" : s.status}
                      </span>
                      <ChevronRightIcon size={16} style={{ color: "var(--faint)", flexShrink: 0 }} />
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={() => {
                  setMetaError(null);
                  setAddingNewSource(true);
                }}
                style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}
              >
                + Nova conexão (colar token)
              </button>
            </>
          )}

          {step === 1 && provider && provider.id === "meta" && addingNewSource && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg2)", marginBottom: 6 }}>Nova conexão · {provider.label}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
                Cole um Access Token (recomendado: System User, gerado no Business Manager — não expira). Ele é salvo uma vez e reutilizado nas próximas integrações.
              </div>

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Nome da conexão</label>
              <input
                value={metaSourceName}
                onChange={(e) => setMetaSourceName(e.target.value)}
                placeholder="ex: BM Agência Start"
                style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none", marginBottom: 14 }}
              />

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

              <div style={{ display: "flex", gap: 8 }}>
                {savedSources.length > 0 && (
                  <button
                    onClick={() => {
                      setMetaError(null);
                      setAddingNewSource(false);
                    }}
                    style={{ height: 42, padding: "0 16px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--card)", color: "var(--fg)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={handleSaveNewSource}
                  disabled={metaLoadingPages || !metaToken.trim() || !metaSourceName.trim()}
                  style={{ flex: 1, height: 42, border: "none", borderRadius: 10, background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: metaLoadingPages ? "wait" : "pointer", opacity: metaLoadingPages || !metaToken.trim() || !metaSourceName.trim() ? 0.7 : 1 }}
                >
                  {metaLoadingPages ? "Validando e salvando..." : "Validar e salvar conexão"}
                </button>
              </div>
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

          {step === 1 && provider && provider.id === "sheets" && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg2)", marginBottom: 6 }}>Configuração · {provider.label}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
                Cole o conteúdo do arquivo JSON da Service Account (baixado no Google Cloud Console) — o e-mail e a chave são extraídos automaticamente.
              </div>

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>JSON da Service Account</label>
              <textarea
                value={sheetsJsonRaw}
                onChange={(e) => handleSheetsJsonPaste(e.target.value)}
                placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
                style={{ width: "100%", height: 90, padding: "12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 12, fontFamily: "var(--font-geist-mono, monospace)", outline: "none", marginBottom: 10, resize: "none" }}
              />

              {sheetsJsonError && (
                <div style={{ padding: "10px 12px", borderRadius: 9, background: "var(--em-bg)", border: "1px solid var(--em-bd)", color: "var(--em-fg)", fontSize: 12.5, fontWeight: 500, marginBottom: 14 }}>
                  {sheetsJsonError}
                </div>
              )}

              {sheetsEmail && !sheetsJsonError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, background: "var(--em-bg)", border: "1px solid var(--em-bd)", color: "var(--em-fg)", fontSize: 12.5, fontWeight: 500, marginBottom: 14 }}>
                  <CheckIcon size={15} />
                  Service account: {sheetsEmail}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg2)" }}>Planilha</label>
                <div style={{ display: "flex", gap: 4, background: "var(--panel)", borderRadius: 8, padding: 2 }}>
                  <button
                    onClick={() => setSheetsMode("search")}
                    style={{ height: 26, padding: "0 10px", border: "none", borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: sheetsMode === "search" ? "var(--card)" : "transparent", color: sheetsMode === "search" ? "var(--fg)" : "var(--muted)", boxShadow: sheetsMode === "search" ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}
                  >
                    Buscar
                  </button>
                  <button
                    onClick={() => setSheetsMode("manual")}
                    style={{ height: 26, padding: "0 10px", border: "none", borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: sheetsMode === "manual" ? "var(--card)" : "transparent", color: sheetsMode === "manual" ? "var(--fg)" : "var(--muted)", boxShadow: sheetsMode === "manual" ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}
                  >
                    Colar link
                  </button>
                </div>
              </div>

              {sheetsMode === "search" ? (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input
                      value={sheetsSearchQuery}
                      onChange={(e) => setSheetsSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchSheets(sheetsSearchQuery)}
                      placeholder="Digite o nome da planilha..."
                      style={{ flex: 1, height: 38, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 9, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none" }}
                    />
                    <button
                      onClick={() => handleSearchSheets(sheetsSearchQuery)}
                      disabled={sheetsSearching || !sheetsEmail}
                      style={{ height: 38, padding: "0 14px", border: "none", borderRadius: 9, background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: sheetsSearching ? "wait" : "pointer", opacity: sheetsSearching || !sheetsEmail ? 0.6 : 1 }}
                    >
                      {sheetsSearching ? "..." : "Buscar"}
                    </button>
                  </div>

                  {sheetsSearchError && (
                    <div style={{ padding: "10px 12px", borderRadius: 9, background: "var(--em-bg)", border: "1px solid var(--em-bd)", color: "var(--em-fg)", fontSize: 12.5, fontWeight: 500, marginBottom: 14 }}>
                      {sheetsSearchError}
                    </div>
                  )}

                  {!sheetsSearchError && sheetsEmail && sheetsSearchResults.length === 0 && !sheetsSearching && (
                    <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0", marginBottom: 10 }}>
                      Nenhuma planilha compartilhada com {sheetsEmail} ainda. Compartilhe a planilha com este e-mail (permissão de Editor) e busque de novo.
                    </div>
                  )}

                  {selectedSpreadsheetName && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderRadius: 8, background: "var(--em-bg)", border: "1px solid var(--em-bd)", color: "var(--em-fg)", fontSize: 12.5, fontWeight: 500, marginBottom: 10 }}>
                      <CheckIcon size={13} />
                      Selecionada: {selectedSpreadsheetName}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14, maxHeight: 150, overflowY: "auto" }}>
                    {sheetsSearchResults.map((option) => {
                      const selected = sheetsId === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleSelectSpreadsheet(option)}
                          style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", background: selected ? "var(--em-bg)" : "var(--panel)", border: selected ? "1px solid var(--em-bd)" : "1px solid transparent", borderRadius: 8, cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--fg)" }}
                        >
                          {selected && <CheckIcon size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{option.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <input
                    value={sheetsId}
                    onChange={(e) => handleSheetsIdInput(e.target.value)}
                    placeholder="Cole o link da planilha ou só o ID"
                    style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none", marginBottom: 8 }}
                  />
                  {sheetsId && (
                    <button
                      onClick={() => handleFetchTabs(sheetsId)}
                      disabled={sheetsTabsLoading}
                      style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 11.5, fontWeight: 600, cursor: sheetsTabsLoading ? "wait" : "pointer", padding: 0, marginBottom: 10 }}
                    >
                      {sheetsTabsLoading ? "Buscando abas..." : "Ver abas desta planilha"}
                    </button>
                  )}
                </>
              )}

              <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 16 }}>
                Lembre de compartilhar a planilha com o e-mail da service account acima (permissão de Editor).
              </div>

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Nome da aba</label>

              {sheetsTabsError && (
                <div style={{ padding: "10px 12px", borderRadius: 9, background: "var(--em-bg)", border: "1px solid var(--em-bd)", color: "var(--em-fg)", fontSize: 12.5, fontWeight: 500, marginBottom: 10 }}>
                  {sheetsTabsError}
                </div>
              )}

              {sheetsTabs.length > 1 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {sheetsTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSheetsName(tab)}
                      style={{ height: 28, padding: "0 10px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", background: sheetsName === tab ? "var(--accent)" : "var(--panel)", color: sheetsName === tab ? "#fff" : "var(--fg2)", border: "none" }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}

              <input
                value={sheetsName}
                onChange={(e) => setSheetsName(e.target.value)}
                placeholder="ex: Leads"
                style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none" }}
              />
            </>
          )}

          {step === 1 && provider && provider.id === "evolution" && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg2)", marginBottom: 16 }}>Configuração · {provider.label}</div>

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>URL da instância</label>
              <input
                value={evoUrl}
                onChange={(e) => setEvoUrl(e.target.value)}
                placeholder="https://sua-evolution.com"
                style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none", marginBottom: 16 }}
              />

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>API Key</label>
              <input
                value={evoToken}
                onChange={(e) => setEvoToken(e.target.value)}
                placeholder="sua apikey"
                style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, fontFamily: "var(--font-geist-mono, monospace)", outline: "none", marginBottom: 16 }}
              />

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Nome da instância</label>
              <input
                value={evoInstance}
                onChange={(e) => setEvoInstance(e.target.value)}
                placeholder="ex: Evan_Suporte"
                style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none", marginBottom: 16 }}
              />

              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>Grupo WhatsApp (opcional)</label>
              <input
                value={evoGroup}
                onChange={(e) => setEvoGroup(e.target.value)}
                placeholder="ex: 1203630...@g.us"
                style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--input)", color: "var(--fg)", fontSize: 13, outline: "none" }}
              />
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                Deixe em branco se este cliente não tem grupo — a notificação ao vendedor continua funcionando normalmente.
              </div>
            </>
          )}

          {step === 2 && provider && provider.id === "meta" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, background: "var(--em-bg)", border: "1px solid var(--em-bd)", color: "var(--em-fg)", fontSize: 12.5, fontWeight: 500, marginBottom: 16 }}>
                <CheckIcon size={15} />
                {sourcePages.length} página(s) nesta conexão
              </div>

              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg2)" }}>Página do Facebook</label>
                <button
                  onClick={handleResyncPages}
                  disabled={isResyncing}
                  style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 11.5, fontWeight: 600, cursor: isResyncing ? "wait" : "pointer", padding: 0 }}
                >
                  {isResyncing ? "Sincronizando..." : "Ressincronizar"}
                </button>
              </div>
              <select
                value={selectedSourcePageId ?? ""}
                onChange={(e) => setSelectedSourcePageId(e.target.value)}
                style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 9, background: "var(--input)", color: "var(--fg)", fontSize: 13.5, outline: "none", marginBottom: 14 }}
              >
                {sourcePages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg2)" }}>
                  Formulários a monitorar <span style={{ color: "var(--muted)", fontWeight: 400 }}>({selectedFormIds.size} de {sourceForms.length})</span>
                </label>
                <button
                  onClick={() => selectedSourcePageId && loadForms(selectedSourcePageId, true)}
                  disabled={metaLoadingForms || !selectedSourcePageId}
                  style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 11.5, fontWeight: 600, cursor: metaLoadingForms ? "wait" : "pointer", padding: 0 }}
                >
                  Buscar novos
                </button>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8 }}>
                Só os marcados geram lead. Os demais são ignorados pelo Motor.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14, maxHeight: 130, overflowY: "auto" }}>
                {metaLoadingForms ? (
                  <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>Carregando formulários...</div>
                ) : sourceForms.length > 0 ? (
                  sourceForms.map((form) => {
                    const checked = selectedFormIds.has(form.id);
                    return (
                      <label
                        key={form.id}
                        onClick={() => toggleForm(form.id)}
                        style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, padding: "8px 11px", background: "var(--panel)", borderRadius: 8, cursor: "pointer" }}
                      >
                        <span
                          style={{ width: 16, height: 16, borderRadius: 5, background: checked ? "var(--accent)" : "transparent", border: checked ? "none" : "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                        >
                          {checked && <CheckIcon size={10} style={{ color: "#fff" }} />}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {form.name}
                        </span>
                        {form.status && <span style={{ color: "var(--muted)", fontSize: 11, flexShrink: 0 }}>({form.status})</span>}
                      </label>
                    );
                  })
                ) : (
                  <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>Nenhum formulário encontrado nesta página.</div>
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
                          toggleMockForm(form);
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

