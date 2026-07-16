"use client";

import { FacebookIcon } from "@/components/icons/FacebookIcon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
// Mantido local (não importado do NewIntegrationModal) para o picker compilar de
// forma independente. Deve espelhar o union ProviderId do NewIntegrationModal.
export type ProviderId = "meta" | "sheets" | "kommo" | "evolution";

type ProviderOption = {
  id: ProviderId;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
};

const PROVIDERS: ProviderOption[] = [
  { id: "meta", label: "Meta Business", description: "Facebook / Instagram Lead Ads", iconBg: "#0866FF", icon: <FacebookIcon className="w-5 h-5" /> },
  { id: "sheets", label: "Google Sheets", description: "Planilha de destino dos leads", iconBg: "#0f9d58", icon: <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>GS</span> },
  { id: "kommo", label: "Kommo CRM", description: "Enviar leads para o pipeline", iconBg: "#00a6ff", icon: <span style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>k</span> },
  { id: "evolution", label: "Evolution API", description: "WhatsApp (grupo / vendedor)", iconBg: "#25d366", icon: <span style={{ fontWeight: 700, fontSize: 12, color: "#fff" }}>Ev</span> }
];

/**
 * Passo 0 do fluxo de integração: o usuário escolhe a plataforma ANTES de cair
 * na tela de autenticação específica. Só depois de escolher é que abrimos o
 * NewIntegrationModal com o provedor pré-selecionado. Ver RULES.md #7 — vive em
 * _shared por ser reutilizado por Fontes e pela Central de Integrações.
 */
export function IntegrationPickerDialog({
  open,
  onOpenChange,
  onSelect
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (providerId: ProviderId) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova integração</DialogTitle>
          <DialogDescription>Escolha a plataforma que você quer conectar.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ background: p.iconBg }}
              >
                {p.icon}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.description}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
