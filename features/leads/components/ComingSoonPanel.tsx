export function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-.025em", color: "var(--fg)" }}>{title}</h1>
      <p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 15, maxWidth: 740 }}>{description}</p>
      <div
        style={{
          marginTop: 20,
          background: "var(--card)",
          borderRadius: 14,
          boxShadow: "0 0 0 1px var(--ring), var(--shadow)",
          padding: 40,
          textAlign: "center",
          color: "var(--muted)",
          fontSize: 13.5
        }}
      >
        Tela ainda não implementada nesta fase — ver docs/PLANO-EXECUCAO-MODULO-LEADS.md
      </div>
    </div>
  );
}
