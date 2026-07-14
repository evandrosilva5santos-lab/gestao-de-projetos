import type { ReactNode } from "react";
import { LockIcon, AlertCircleIcon, PlusIcon } from "@/components/icons/agency-os-icons";

export type ConnectionStatus = "connected" | "disconnected" | "expired";
export type ActionKey = "test" | "sync" | "renew" | "edit" | "disconnect" | "reconnect";

export type Connection = {
  id: string;
  name: string;
  providerLabel: string;
  icon: ReactNode;
  iconBg: string;
  status: ConnectionStatus;
  statusReason?: string;
  maskedToken?: string;
  counts: { value: string; label: string }[];
  syncNote?: string;
  actions: ActionKey[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any; // To hold original config data — shape varia por provedor (kommo/sheets/evolution)
  type?: "kommo" | "google_sheets" | "evolution" | "meta" | "meta_ad_accounts";
};

const btnBase: React.CSSProperties = {
  height: 30,
  padding: "0 11px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer"
};

const ACTION_LABEL: Record<ActionKey, string> = {
  test: "Testar",
  sync: "Sincronizar",
  renew: "Renovar token",
  edit: "Editar",
  disconnect: "Desconectar",
  reconnect: "Reconectar"
};

function ActionButton({ action, onClick }: { action: ActionKey, onClick?: () => void }) {
  if (action === "disconnect") {
    return (
      <button onClick={onClick} style={{ ...btnBase, border: "none", background: "transparent", color: "var(--des-fg)", fontWeight: 600 }}>
        {ACTION_LABEL[action]}
      </button>
    );
  }
  if (action === "renew" || action === "reconnect") {
    return (
      <button onClick={onClick} style={{ ...btnBase, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 600 }}>
        {ACTION_LABEL[action]}
      </button>
    );
  }
  return (
    <button onClick={onClick} style={{ ...btnBase, border: "1px solid var(--border)", background: "var(--card)", color: "var(--fg)" }}>
      {ACTION_LABEL[action]}
    </button>
  );
}

function StatusBadge({ status, reason }: { status: ConnectionStatus; reason?: string }) {
  if (status === "connected") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 10px", borderRadius: 9999, fontSize: 12, fontWeight: 500, color: "var(--em-fg)", background: "var(--em-bg)", border: "1px solid var(--em-bd)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
        Conectado
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 10px", borderRadius: 9999, fontSize: 12, fontWeight: 500, color: "var(--des-fg)", background: "var(--des-bg)" }} title={reason}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--rose)" }} />
        Token expirado
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 10px", borderRadius: 9999, fontSize: 12, fontWeight: 500, color: "var(--muted)", background: "var(--hover)" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--faint)" }} />
      Desconectado
    </span>
  );
}

export function ConnectionCard({ connection, onAction }: { connection: Connection, onAction?: (action: ActionKey, connection: Connection) => void }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 14, boxShadow: "0 0 0 1px var(--ring), var(--shadow)", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: connection.iconBg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {connection.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>{connection.name}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{connection.providerLabel}</div>
        </div>
        <StatusBadge status={connection.status} reason={connection.statusReason} />
      </div>

      {connection.status === "expired" && connection.statusReason ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0", fontSize: 12.5, color: "var(--des-fg)", background: "var(--des-bg)", borderRadius: 8, padding: "8px 10px", fontWeight: 500 }}>
          <AlertCircleIcon size={14} />
          {connection.statusReason}
        </div>
      ) : connection.maskedToken ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0", fontFamily: "var(--font-geist-mono, monospace)", fontSize: 12.5, color: "var(--muted)", background: "var(--panel)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 10px" }}>
          <LockIcon size={13} />
          {connection.maskedToken}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 18, padding: "12px 0", borderTop: "1px solid var(--border2)", borderBottom: "1px solid var(--border2)" }}>
        {connection.counts.map((c) => (
          <div key={c.label}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg)" }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {connection.syncNote && (
        <div style={{ fontSize: 11.5, color: "var(--muted)", margin: "10px 0 14px" }}>{connection.syncNote}</div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {connection.actions.map((action) => (
          <ActionButton key={action} action={action} onClick={() => onAction?.(action, connection)} />
        ))}
      </div>
    </div>
  );
}

export function NewIntegrationTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1.5px dashed var(--border)",
        background: "transparent",
        borderRadius: 14,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: "var(--muted)",
        cursor: "pointer",
        minHeight: 180
      }}
    >
      <PlusIcon size={24} />
      <span style={{ fontSize: 13.5, fontWeight: 500 }}>Nova integração</span>
      <span style={{ fontSize: 11.5 }}>Meta · Google · Kommo · Evolution…</span>
    </button>
  );
}
