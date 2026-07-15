"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, Share2, Filter } from "lucide-react";

export function RoutingRulesPanel({ workspaceId }: { workspaceId?: string }) {
  if (!workspaceId) {
    return (
      <div className="flex h-[400px] items-center justify-center border border-dashed rounded-lg bg-slate-50/50">
        <div className="text-center">
          <Settings2 className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-medium text-slate-800">Selecione um Cliente</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            Escolha um cliente para configurar as regras de roteamento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Regras de Roteamento</h2>
          <p className="text-slate-500 mt-1">
            Controle como os leads são distribuídos para a fila de vendedores deste cliente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-indigo-500" />
              <CardTitle>Fontes Conectadas</CardTitle>
            </div>
            <CardDescription>
              Origens de leads ativas para este workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-32 flex flex-col items-center justify-center border-t border-dashed bg-slate-50/50">
            <p className="text-sm text-slate-500 italic">Meta Ads / N8N</p>
            <p className="text-xs text-slate-400 mt-1">Acesso read-only nesta versão.</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-indigo-500" />
              <CardTitle>Filtros & Horários</CardTitle>
            </div>
            <CardDescription>
              Regras para pausa noturna e filtros por formulário.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-32 flex flex-col items-center justify-center border-t border-dashed bg-slate-50/50">
            <p className="text-sm text-slate-500 italic">Sem filtros configurados</p>
            <p className="text-xs text-slate-400 mt-1">Acesso read-only nesta versão.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
