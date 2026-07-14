"use client";

import { useState, useEffect, useCallback } from "react";
import { FacebookIcon } from "./FacebookIcon";
import { PlusIcon } from "./icons/agency-os-icons";
import { ConnectionCard, NewIntegrationTile, type Connection } from "@/features/integration-hub/components/ConnectionCard";
import { NewIntegrationModal } from "@/features/integration-hub/components/NewIntegrationModal";
import { listMetaConnections } from "@/features/integration-hub/actions";

export function ClientSourcesTab({ workspaceId }: { workspaceId: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    listMetaConnections().then((res) => {
      if (!res.success) return;
      const filtered = res.connections.filter((c) => c.workspace_id === workspaceId);
      setConnections(
        filtered.map((c) => ({
          id: c.id,
          name: c.page_name || c.page_id,
          providerLabel: "Meta Business · Page Access Token",
          icon: <FacebookIcon className="w-[21px] h-[21px]" />,
          iconBg: "#0866FF",
          status: c.is_active ? "connected" : "expired",
          maskedToken: `${c.page_id.substring(0, 6)}••••••••••`,
          counts: [{ value: "1", label: "páginas" }],
          syncNote: `Atualizado em ${new Date(c.updated_at).toLocaleDateString()}`,
          actions: ["test", "sync", "disconnect"],
          type: "meta"
        }))
      );
    });
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--fg)" }}>Fontes de Entrada</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13.5, maxWidth: 640 }}>
            Páginas do Facebook conectadas para este cliente. O token da agência já está cadastrado — aqui você só escolhe qual página pertence a ele.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{ height: 36, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 14px", border: "none", background: "var(--accent)", color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <PlusIcon size={15} />
          Conectar página
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginTop: 18 }} className="!grid-cols-1 md:!grid-cols-2">
        {connections.map((connection) => (
          <ConnectionCard key={connection.id} connection={connection} />
        ))}
        <NewIntegrationTile onClick={() => setModalOpen(true)} />
      </div>

      {modalOpen && (
        <NewIntegrationModal
          onClose={() => setModalOpen(false)}
          onCreate={() => {
            setModalOpen(false);
            load();
          }}
          defaultWorkspaceId={workspaceId}
          defaultProviderId="meta"
        />
      )}
    </>
  );
}
