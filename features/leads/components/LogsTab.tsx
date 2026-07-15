"use client";

import { useEffect, useState } from "react";
import { getLeadsOperationStatus, getLeadsWithFilters } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings2, AlertCircle, CheckCircle2, Clock, XCircle, X } from "lucide-react";


type OperationPipeline = Awaited<ReturnType<typeof getLeadsOperationStatus>>["pipeline"];
type LeadWithFilters = Awaited<ReturnType<typeof getLeadsWithFilters>>;

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case "pending": return <Clock className="h-5 w-5 text-slate-300" />;
    case "error": return <XCircle className="h-5 w-5 text-red-500" />;
    case "warning": return <AlertCircle className="h-5 w-5 text-amber-500" />;
    default: return <Clock className="h-5 w-5 text-slate-300" />;
  }
}

export function LogsTab({ workspaceId }: { workspaceId?: string }) {
  const [pipeline, setPipeline] = useState<OperationPipeline>([]);
  const [loading, setLoading] = useState(true);

  // Filtro state
  const [filters, setFilters] = useState({
    origins: [] as string[],
    statuses: [] as string[],
    sellerId: undefined as string | undefined,
    dateFrom: null as string | null,
    dateTo: null as string | null,
  });
  const [availableOrigins, setAvailableOrigins] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [availableSellers, setAvailableSellers] = useState<Array<{ id: string; name: string }>>([]);
  const [filteredLeads, setFilteredLeads] = useState<Array<any>>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [sellerSearch, setSellerSearch] = useState("");

  // Carrega leads históricos da Auditoria com Filtros
  useEffect(() => {
    if (!workspaceId) return;

    let mounted = true;
    async function loadFiltered() {
      setLoading(true);
      const res = await getLeadsWithFilters(workspaceId, filters);
      if (mounted && res.success) {
        setFilteredLeads(res.leads);
        setAvailableOrigins(res.availableOrigins);
        setAvailableStatuses(res.availableStatuses);
        setAvailableSellers(res.availableSellers);
      }
      if (mounted) setLoading(false);
    }
    loadFiltered();

    return () => { mounted = false; };
  }, [workspaceId, filters]);

  // Carrega Fila de Operação Visual (antigo pipeline)
  // Nota: Pipeline carrega sempre os últimos 20 leads (sem filtros aplicados)
  // para manter consistência com sua função de histórico de status, não auditoria filtrada
  useEffect(() => {
    if (!workspaceId) return;

    let mounted = true;
    async function load() {
      const res = await getLeadsOperationStatus(workspaceId as string);
      if (mounted && res.success) {
        setPipeline(res.pipeline);
      }
    }
    load();

    return () => { mounted = false; };
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="flex h-[400px] items-center justify-center border border-dashed rounded-lg bg-slate-50/50">
        <div className="text-center">
          <Settings2 className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-medium text-slate-800">Selecione um Cliente</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            Escolha um cliente no menu lateral para visualizar os logs de operação.
          </p>
        </div>
      </div>
    );
  }

  const filteredSellers = availableSellers.filter((s) =>
    s.name.toLowerCase().includes(sellerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Logs & Automação</h2>
        <p className="text-slate-500 mt-1">
          Acompanhe o percurso de cada lead na Fila de Operação Visual. Identifique gargalos e falhas de envio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auditoria de Leads em Tempo Real</CardTitle>
          <CardDescription>
            Filtros avançados: Origem → Status → Vendedor → Data. Limpe os filtros para ver todos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Origem */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Origem</label>
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === "origins" ? null : "origins")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm text-left hover:border-slate-400"
                  >
                    {filters.origins.length > 0 ? `${filters.origins.length} selecionado(s)` : "Todas"}
                  </button>
                  {openDropdown === "origins" && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-300 rounded-md shadow-lg z-10 mt-1">
                      {availableOrigins.map((origin) => (
                        <label
                          key={origin}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={filters.origins.includes(origin)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters({ ...filters, origins: [...filters.origins, origin] });
                              } else {
                                setFilters({ ...filters, origins: filters.origins.filter((o) => o !== origin) });
                              }
                            }}
                          />
                          {origin}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Status</label>
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === "statuses" ? null : "statuses")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm text-left hover:border-slate-400"
                  >
                    {filters.statuses.length > 0 ? `${filters.statuses.length} selecionado(s)` : "Todos"}
                  </button>
                  {openDropdown === "statuses" && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-300 rounded-md shadow-lg z-10 mt-1">
                      {availableStatuses.map((status) => (
                        <label
                          key={status}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={filters.statuses.includes(status)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters({ ...filters, statuses: [...filters.statuses, status] });
                              } else {
                                setFilters({ ...filters, statuses: filters.statuses.filter((s) => s !== status) });
                              }
                            }}
                          />
                          {status}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Vendedor */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Vendedor</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Procurar..."
                    value={sellerSearch}
                    onChange={(e) => setSellerSearch(e.target.value)}
                    onFocus={() => setOpenDropdown("sellers")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                  />
                  {openDropdown === "sellers" && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-300 rounded-md shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
                      {filteredSellers.map((seller) => (
                        <button
                          key={seller.id}
                          onClick={() => {
                            setFilters({ ...filters, sellerId: seller.id });
                            setSellerSearch("");
                            setOpenDropdown(null);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 text-sm border-b last:border-b-0"
                        >
                          {seller.name}
                          {filters.sellerId === seller.id && (
                            <span className="float-right text-emerald-600 font-medium">✓</span>
                          )}
                        </button>
                      ))}
                      {filteredSellers.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-500">Nenhum vendedor encontrado</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Data: De */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">De</label>
                <input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                />
              </div>

              {/* Data: Até */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">Até</label>
                <input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                />
              </div>
            </div>

            {/* Botão Limpar */}
            <button
              onClick={() =>
                setFilters({
                  origins: [],
                  statuses: [],
                  sellerId: undefined,
                  dateFrom: null,
                  dateTo: null,
                })
              }
              className="text-sm text-slate-600 hover:text-slate-900 underline flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Limpar Filtros
            </button>
          </div>

          {/* Tabela de Leads Filtrados */}
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Carregando auditoria...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Nenhum lead encontrado com estes filtros.</div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-slate-100/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Lead</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Origem</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Vendedor</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Data</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-b transition-colors hover:bg-slate-100/50">
                      <td className="p-4 align-middle">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-slate-500">{lead.phone || lead.email || "—"}</div>
                      </td>
                      <td className="p-4 align-middle text-sm text-slate-600">{lead.source}</td>
                      <td className="p-4 align-middle text-sm text-slate-600">{lead.sellerName}</td>
                      <td className="p-4 align-middle text-xs text-slate-500">
                        {(() => {
                          try {
                            const date = new Date(lead.createdAt);
                            if (isNaN(date.getTime())) return "—";
                            return new Intl.DateTimeFormat("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(date);
                          } catch {
                            return "—";
                          }
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fila de Operação Visual (antigo) */}
      <Card>
        <CardHeader>
          <CardTitle>Fila de Operação Visual</CardTitle>
          <CardDescription>
            Mostrando os últimos 20 leads e seus status de sincronização (App → Planilha → Kommo → WhatsApp).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Carregando Fila...</div>
          ) : pipeline?.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Nenhum lead encontrado para este cliente.</div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-slate-100/50 data-[state=selected]:bg-slate-100">
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Lead</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">App (Salvo)</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Planilha (Google)</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">CRM (Kommo)</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {pipeline?.map((lead) => (
                    <tr key={lead.id} className="border-b transition-colors hover:bg-slate-100/50">
                      <td className="p-4 align-middle">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-slate-500">{lead.phone || "—"}</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                            new Date(lead.createdAt)
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={lead.steps.app.status} />
                          <span className="text-xs text-slate-600 hidden sm:inline">{lead.steps.app.detail}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={lead.steps.sheet.status} />
                          <span className="text-xs text-slate-600 hidden sm:inline">{lead.steps.sheet.detail}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={lead.steps.kommo.status} />
                          <span className="text-xs text-slate-600 hidden sm:inline">{lead.steps.kommo.detail}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={lead.steps.wpp.status} />
                          <span className="text-xs text-slate-600 hidden sm:inline">{lead.steps.wpp.detail}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
