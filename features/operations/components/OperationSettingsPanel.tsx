"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, Webhook, MessageCircle } from "lucide-react";

export function OperationSettingsPanel({ workspaceId }: { workspaceId?: string }) {
  if (!workspaceId) {
    return (
      <div className="flex h-[400px] items-center justify-center border border-dashed rounded-lg bg-slate-50/50">
        <div className="text-center">
          <Settings2 className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-medium text-slate-800">Selecione um Cliente</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            Escolha um cliente para acessar as configurações de operação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Configurações Gerais</h2>
          <p className="text-slate-500 mt-1">
            Visualização das configurações ativas para a operação deste cliente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-sky-500" />
              <CardTitle>Destinos Ativos</CardTitle>
            </div>
            <CardDescription>
              Integrações configuradas para receber os leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-32 flex flex-col items-center justify-center border-t border-dashed bg-slate-50/50">
            <p className="text-sm text-slate-500 italic">Planilha, Kommo, WhatsApp</p>
            <p className="text-xs text-slate-400 mt-1">Acesso read-only nesta versão.</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-sky-500" />
              <CardTitle>Grupo de WhatsApp</CardTitle>
            </div>
            <CardDescription>
              Configuração de notificação na API Evolution.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-32 flex flex-col items-center justify-center border-t border-dashed bg-slate-50/50">
            <p className="text-sm text-slate-500 italic">Grupo Conectado</p>
            <p className="text-xs text-slate-400 mt-1">Acesso read-only nesta versão.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
