"use client";

import { useState } from "react";
import { FacebookIcon } from "@/features/leads/components/FacebookIcon";
import { SheetsFileIcon, XIcon, ChevronRightIcon, CheckIcon } from "@/features/leads/components/icons/agency-os-icons";
import type { Connection } from "./ConnectionCard";

// Porte pixel-exato do modal "Nova integração" de Agency OS.dc.html
// (linhas ~1395-1450). Fluxo real: clicar num provedor avança do passo 0
// para o 1; "Entrar com OAuth" ou "Validar token" avança do 1 para o 2;
// "Salvar integração" no passo 2 conclui. Não há botão genérico "Próximo".
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
  onCreate
}: {
  onClose: () => void;
  onCreate: (connection: Connection) => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [providerId, setProviderId] = useState<ProviderId | null>(null);
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set(MOCK_FORMS.slice(0, 3)));

  const provider = PROVIDERS.find((p) => p.id === providerId) ?? null;

  const toggleForm = (form: string) => {
    setSelectedForms((prev) => {
      const next = new Set(prev);
      if (next.has(form)) next.delete(form);
      else next.add(form);
      return next;
    });
  };

  const handleSave = () => {
    if (!provider) return;
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
            <div style={{ fontSize: 16, fontWeight: 700 }}>Nova integração</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Passo {step + 1} de 3 · nível do sistema</div>
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

          {step === 1 && provider && (
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

          {step === 2 && (
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
          {step === 2 && (
            <button
              onClick={handleSave}
              style={{ height: 38, padding: "0 18px", border: "none", background: "var(--accent)", color: "#fff", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
            >
              Salvar integração
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
