"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, Webhook, MessageCircle, RefreshCw, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { getNotificationConfig, getWhatsAppGroupsHistory, setActiveWhatsAppGroup } from "../actions";

type WpGroup = {
  group_id: string;
  group_name: string;
  group_jid: string;
  is_admin: boolean;
  fetched_at: string;
};

export function ConfigTab({ workspaceId }: { workspaceId?: string }) {
  const [config, setConfig] = useState<{ evolution_url?: string; evolution_token?: string; group_jid?: string } | null>(null);
  const [groups, setGroups] = useState<WpGroup[]>([]);
  
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [onlyAdmin, setOnlyAdmin] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!workspaceId) return;

    let mounted = true;
    async function load() {
      setLoadingConfig(true);
      
      const [confRes, groupsRes] = await Promise.all([
        getNotificationConfig(workspaceId as string),
        getWhatsAppGroupsHistory(workspaceId as string)
      ]);

      if (mounted) {
        if (confRes.success && confRes.config) {
          setConfig(confRes.config);
        }
        if (groupsRes.success && groupsRes.groups) {
          setGroups(groupsRes.groups);
        }
        setLoadingConfig(false);
      }
    }
    load();

    return () => { mounted = false; };
  }, [workspaceId]);

  const handleSyncGroups = async () => {
    if (!workspaceId || !config?.evolution_url || !config?.evolution_token) return;
    setSyncing(true);
    
    try {
      const res = await fetch("/api/whatsapp/sync-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          integration_url: config.evolution_url,
          integration_token: config.evolution_token
        })
      });

      const data = await res.json();
      if (data.ok) {
        // Refetch history from DB to ensure sync
        const groupsRes = await getWhatsAppGroupsHistory(workspaceId);
        if (groupsRes.success && groupsRes.groups) {
          setGroups(groupsRes.groups);
        }
        setToast({ message: "Grupos sincronizados com sucesso!", type: "success" });
      } else {
        setToast({ message: "Erro ao sincronizar grupos: " + (data.error || "Desconhecido"), type: "error" });
      }
    } catch (err: any) {
      setToast({ message: "Erro de rede: " + err.message, type: "error" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectGroup = async (groupJid: string) => {
    if (!workspaceId) return;
    setSaving(true);
    const res = await setActiveWhatsAppGroup(workspaceId, groupJid);
    if (res.success) {
      setConfig(prev => prev ? { ...prev, group_jid: groupJid } : { group_jid: groupJid });
      setToast({ message: "Grupo ativado com sucesso!", type: "success" });
    } else {
      setToast({ message: "Erro ao salvar grupo ativo.", type: "error" });
    }
    setSaving(false);
  };

  if (!workspaceId) {
    return (
      <div className="flex h-[400px] items-center justify-center border border-dashed rounded-lg bg-slate-50/50">
        <div className="text-center">
          <Settings2 className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-medium text-slate-800">Selecione um Cliente</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            Escolha um cliente no menu lateral para acessar as configurações.
          </p>
        </div>
      </div>
    );
  }

  const isConnected = !!config?.evolution_url && !!config?.evolution_token;
  
  const filteredGroups = groups.filter(g => {
    if (onlyAdmin && !g.is_admin) return false;
    if (searchFilter && !g.group_name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  const lastSyncDate = groups.length > 0 
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(groups[0].fetched_at))
    : "Nunca";

  return (
    <div className="space-y-6 relative">
      {/* Custom Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-md shadow-lg border transition-all animate-in fade-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
            <p className="font-medium text-sm">{toast.message}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Configurações Gerais</h2>
          <p className="text-slate-500 mt-1">
            Visualização das configurações ativas para a operação deste cliente.
          </p>
        </div>
        <Button disabled>Salvar Configurações</Button>
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
              <CardTitle>Painel do Cliente</CardTitle>
            </div>
            <CardDescription>
              Gere ou revogue acesso externo à fila da vez.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-32 flex flex-col items-center justify-center border-t border-dashed bg-slate-50/50">
            <p className="text-sm text-slate-500 italic">Módulo externo em desenvolvimento.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-500" />
                Grupos WhatsApp
              </CardTitle>
              <CardDescription>
                Selecione o grupo onde os alertas de novos leads serão enviados.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {loadingConfig ? (
                <Badge variant="outline" className="text-slate-500"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Verificando...</Badge>
              ) : isConnected ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200"><AlertCircle className="h-3 w-3 mr-1" /> Desconectado</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="text-sm text-amber-600 bg-amber-50 p-4 rounded-md border border-amber-100 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>A API do WhatsApp (Evolution) não está configurada para este cliente. Por favor, adicione os dados de conexão antes de buscar os grupos.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between bg-slate-50 p-4 rounded-md border">
                <div>
                  <p className="text-sm font-medium text-slate-800">Última sincronização: <span className="font-normal text-slate-500">{lastSyncDate}</span></p>
                </div>
                <Button 
                  onClick={handleSyncGroups} 
                  disabled={syncing}
                  variant="outline"
                  size="sm"
                  className="bg-white"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Buscando...' : 'Buscar Grupos'}
                </Button>
              </div>

              {groups.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Filtrar por nome..." 
                        className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 pl-9"
                        value={searchFilter}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchFilter(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                          checked={onlyAdmin}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOnlyAdmin(e.target.checked)}
                        />
                        Mostrar só grupos que sou admin
                      </label>
                    </div>
                  </div>

                  <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                    {syncing || loadingConfig ? (
                      // Skeleton Loading State
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 animate-pulse">
                          <div className="space-y-2">
                            <div className="h-4 w-48 bg-slate-200 rounded"></div>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-32 bg-slate-100 rounded"></div>
                            </div>
                          </div>
                          <div className="h-8 w-24 bg-slate-100 rounded"></div>
                        </div>
                      ))
                    ) : filteredGroups.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">Nenhum grupo encontrado com os filtros atuais.</div>
                    ) : (
                      filteredGroups.map(g => (
                        <div 
                          key={g.group_jid} 
                          className={`flex items-center justify-between p-3 hover:bg-slate-50 transition-colors ${config?.group_jid === g.group_jid ? 'bg-indigo-50/50' : ''}`}
                        >
                          <div>
                            <p className="font-medium text-slate-800 flex items-center gap-2">
                              {g.group_name}
                              {config?.group_jid === g.group_jid && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">Ativo</span>
                              )}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-slate-500 font-mono">{g.group_jid}</p>
                              {g.is_admin && <span className="text-[10px] text-amber-600 border border-amber-200 bg-amber-50 px-1.5 rounded">Admin</span>}
                            </div>
                          </div>
                          <Button 
                            variant={config?.group_jid === g.group_jid ? "default" : "outline"} 
                            size="sm"
                            disabled={saving || config?.group_jid === g.group_jid}
                            onClick={() => handleSelectGroup(g.group_jid)}
                          >
                            {config?.group_jid === g.group_jid ? 'Selecionado' : 'Selecionar'}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>{children}</span>
}
