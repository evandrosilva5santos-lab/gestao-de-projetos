"use client";

import { useEffect, useState, useCallback } from "react";
import { getAutomationReadiness } from "../actions";

type Readiness = Awaited<ReturnType<typeof getAutomationReadiness>>;

const OK = "#16a34a";
const OFF = "#94a3b8";
const WARN = "#d97706";

function StepDot({ n, active }: { n: number; active: boolean }) {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12.5,
        fontWeight: 700,
        color: active ? "#fff" : "var(--muted)",
        background: active ? "var(--accent)" : "var(--hover)",
        border: active ? "none" : "1px solid var(--border2)"
      }}
    >
      {n}
    </div>
  );
}

function DestPill({ label, state }: { label: string; state: "on" | "off" | "warn" }) {
  const color = state === "on" ? OK : state === "warn" ? WARN : OFF;
  const bg = state === "on" ? "rgba(22,163,74,.08)" : state === "warn" ? "rgba(217,119,6,.08)" : "var(--hover)";
  const mark = state === "on" ? "✓" : state === "warn" ? "!" : "—";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 9,
        background: bg,
        border: `1px solid ${state === "off" ? "var(--border2)" : color + "40"}`,
        fontSize: 13,
        fontWeight: 600,
        color: "var(--fg)"
      }}
    >
      <span style={{ color, fontWeight: 800 }}>{mark}</span>
      {label}
    </div>
  );
}

export function AutomationSequenceTab({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getAutomationReadiness(workspaceId).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>Carregando sequência…</div>;
  }
  if (!data.success) {
    return <div style={{ padding: 32, textAlign: "center", color: "#e11d48" }}>Erro ao carregar automação.</div>;
  }

  const { checks, blockers, ready } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--fg)" }}>Automação</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13.5, maxWidth: 640 }}>
            A sequência exata que roda quando um lead chega deste cliente. Complete os pré-requisitos para ativar.
          </p>
        </div>
        <button
          onClick={load}
          style={{ height: 34, padding: "0 14px", border: "1px solid var(--border)", background: "var(--card)", color: "var(--fg)", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Revalidar
        </button>
      </div>

      {/* Banner de prontidão */}
      <div
        style={{
          borderRadius: 12,
          padding: "16px 18px",
          background: ready ? "rgba(22,163,74,.08)" : "rgba(217,119,6,.08)",
          border: `1px solid ${ready ? OK + "40" : WARN + "40"}`
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{ready ? "🟢" : "🟡"}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>
              {ready ? "Automação pronta para rodar" : `Faltam ${blockers.length} item(ns) para ativar`}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {ready
                ? "Todos os pré-requisitos obrigatórios estão configurados."
                : "Enquanto houver bloqueadores, o lead não é distribuído automaticamente."}
            </div>
          </div>
        </div>
        {blockers.length > 0 && (
          <ul style={{ margin: "12px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 5 }}>
            {blockers.map((b) => (
              <li key={b} style={{ fontSize: 13, color: WARN, fontWeight: 500 }}>{b}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Sequência de execução */}
      <div style={{ background: "var(--card)", borderRadius: 14, boxShadow: "0 0 0 1px var(--ring), var(--shadow)", padding: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>
          Sequência quando um lead chega
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 18 }}>
          Ordem atômica processada pelo motor (Inngest) — os destinos rodam em paralelo no passo 4.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Step n={1} title="Fonte: lead do formulário Meta" active={checks.hasSource}
            desc={checks.hasSource ? "Página conectada em Fontes de Entrada." : "Conecte uma página Meta primeiro."} />
          <Step n={2} title="Normalizar + Deduplicar" active
            desc="Padroniza telefone/e-mail e ignora lead repetido (mesmo leadgen_id) e lead recorrente do mesmo vendedor." />
          <Step n={3} title="Atribuir vendedor (Rodada da Vez)" active={checks.hasSeller}
            desc={checks.hasSeller ? "Rodízio atômico entre os vendedores ativos da fila." : "Adicione um vendedor ativo na Fila da Vez."} />
          <Step n={4} title="Executar destinos (em paralelo)" active={checks.hasSheets || checks.hasWhatsapp}
            desc="Dispara os canais configurados abaixo simultaneamente.">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <DestPill label="Google Sheets (obrigatório)" state={checks.hasSheets ? "on" : "warn"} />
              <DestPill label="WhatsApp — vendedor" state={checks.hasWhatsapp ? "on" : "warn"} />
              <DestPill label="WhatsApp — grupo" state={checks.hasGroup ? "on" : checks.hasWhatsapp ? "warn" : "off"} />
              <DestPill label="Kommo (opcional)" state={checks.hasKommo ? "on" : "off"} />
            </div>
          </Step>
          <Step n={5} title="Registrar auditoria" active
            desc="Grava o resultado da distribuição em Logs & Automação para rastreabilidade." />
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  desc,
  active,
  children
}: {
  n: number;
  title: string;
  desc: string;
  active: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <StepDot n={n} active={active} />
        {n < 5 && <div style={{ width: 2, flex: 1, background: "var(--border2)", marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: n < 5 ? 6 : 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{desc}</div>
        {children}
      </div>
    </div>
  );
}
