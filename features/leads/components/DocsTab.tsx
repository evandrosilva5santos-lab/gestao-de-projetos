"use client";

// Documentação viva do produto — versão mínima (Fase 1). Cobre o que a operação
// precisa entender: ordem obrigatória de processamento, modelo de status do funil
// e regras de destino. Fase 5 troca isto por um renderer de Markdown de docs/.

const PIPELINE = [
  { step: "Origem → Webhook", detail: "Meta / Google / API / Landing entram por um único endpoint." },
  { step: "Normalização", detail: "Nome, telefone (DDI 55) e e-mail padronizados. Fim das dezenas de regras do n8n." },
  { step: "Identificação", detail: "Workspace e formulário resolvidos pelo Form ID — sem regra manual." },
  { step: "Idempotência", detail: "Se o leadgen_id já foi processado, para aqui: nada é reexecutado." },
  { step: "Qualificação", detail: "Só leads que passam no critério do cliente entram na Rodada." },
  { step: "Rodada da Vez", detail: "Distribuição atômica por cliente, respeitando disponibilidade do vendedor." },
  { step: "Persistência", detail: "Lead salvo no banco — a fonte oficial, não a planilha." },
  { step: "Integrações", detail: "Kommo, Planilha e WhatsApp. Falha em opcional não bloqueia obrigatório." },
  { step: "Logs", detail: "Cada etapa registra sucesso/erro. Só a etapa que falhou é reprocessada." }
];

const STATUS = [
  { key: "new", label: "Novo", color: "#0ea5e9", desc: "Entrou, ainda não processado." },
  { key: "distributed", label: "Distribuído", color: "#4f46e5", desc: "Vendedor da vez definido e notificado." },
  { key: "not_qualified", label: "Não qualificado", color: "#d97706", desc: "Reprovado no critério — salvo, sem entrar na fila." },
  { key: "error", label: "Erro", color: "#e11d48", desc: "Falhou numa etapa; disponível para reprocessar." }
];

const DESTINOS = [
  { nome: "Planilha (Google Sheets)", regra: "Sempre — registro de toda entrada.", tipo: "Obrigatório" },
  { nome: "Grupo de WhatsApp", regra: "Sempre — alerta operacional da entrada.", tipo: "Obrigatório" },
  { nome: "Kommo (CRM)", regra: "Só se o cliente usa Kommo.", tipo: "Opcional" },
  { nome: "WhatsApp do vendedor", regra: "Decisão por config — mensagem no privado.", tipo: "Opcional" },
  { nome: "WhatsApp do cliente final", regra: "Decisão por config — sai do número do vendedor.", tipo: "Opcional" }
];

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "22px 24px"
};

const h2Style: React.CSSProperties = { margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--fg)" };
const subStyle: React.CSSProperties = { margin: "0 0 16px", fontSize: 13.5, color: "var(--muted)" };

export function DocsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Ordem de processamento */}
      <div style={cardStyle}>
        <h2 style={h2Style}>Ordem obrigatória de processamento</h2>
        <p style={subStyle}>Todo lead — de qualquer origem — passa por este fluxo único, nesta ordem.</p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {PIPELINE.map((p, i) => (
            <div key={p.step} style={{ display: "flex", gap: 14, padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--border2)" }}>
              <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 7, background: "var(--soft-bg)", color: "var(--soft-fg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-geist-mono, monospace)" }}>
                {i + 1}
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>{p.step}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 1 }}>{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modelo de status */}
      <div style={cardStyle}>
        <h2 style={h2Style}>Modelo de status do funil</h2>
        <p style={subStyle}>Os estados que um lead assume no banco (<span style={{ fontFamily: "var(--font-geist-mono, monospace)" }}>gestao_leads.status</span>).</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {STATUS.map((s) => (
            <div key={s.key} style={{ border: "1px solid var(--border2)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>{s.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)", color: "var(--faint)" }}>{s.key}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Regras de destino */}
      <div style={cardStyle}>
        <h2 style={h2Style}>Regras de destino do lead</h2>
        <p style={subStyle}>O que é sempre disparado e o que é decisão por configuração de cada cliente.</p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {DESTINOS.map((d, i) => (
            <div key={d.nome} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: i === 0 ? "none" : "1px solid var(--border2)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>{d.nome}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 1 }}>{d.regra}</div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 9px",
                  borderRadius: 9999,
                  whiteSpace: "nowrap",
                  background: d.tipo === "Obrigatório" ? "var(--em-bg)" : "var(--hover)",
                  color: d.tipo === "Obrigatório" ? "var(--em-fg)" : "var(--muted)"
                }}
              >
                {d.tipo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
