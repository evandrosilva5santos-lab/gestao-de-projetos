"use client";

import { useState } from "react";
import { Download, Plus, GitMerge, FileSpreadsheet, Share2 } from "lucide-react";

export function RoutingRulesTab({ workspaceId }: { workspaceId?: string }) {
  const [method, setMethod] = useState<"round-robin" | "peso" | "manual">("round-robin");

  const downloadCsv = () => {
    const csvContent = "nome,telefone,email,origem\nJoão Silva,11999999999,joao@email.com,Planilha";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Regras de Roteamento
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Conecte suas fontes de leads e defina como eles são distribuídos.
        </p>
      </div>

      {/* FONTES E DESTINOS ATIVOS */}
      <div>
        <div className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 mb-3 uppercase">
          FONTES E DESTINOS ATIVOS
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-[14px] shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 p-4 flex flex-col justify-between transition-transform hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-[34px] h-[34px] rounded-lg bg-[#0866FF] text-white flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </div>
                <div className="mt-3 text-[14px] font-semibold text-slate-900 dark:text-slate-100">Meta Ads</div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-2.5 py-0.5 rounded-full">
                Conectado
              </span>
            </div>
            <div className="mt-3 text-[12.5px] text-slate-500">2 páginas · 3 formulários</div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[14px] shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 p-4 flex flex-col justify-between transition-transform hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-[34px] h-[34px] rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="mt-3 text-[14px] font-semibold text-slate-900 dark:text-slate-100">Kommo CRM</div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-2.5 py-0.5 rounded-full">
                Ativo
              </span>
            </div>
            <div className="mt-3 text-[12.5px] text-slate-500">Sincronizando funil de vendas</div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[14px] shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 p-4 flex flex-col justify-between transition-transform hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-[34px] h-[34px] rounded-lg bg-[#0F9D58] text-white flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div className="mt-3 text-[14px] font-semibold text-slate-900 dark:text-slate-100">Planilha (CSV)</div>
              </div>
              <button
                onClick={downloadCsv}
                className="h-[26px] px-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-1.5 transition-colors"
              >
                <Download size={12} />
                Baixar modelo
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[12.5px] text-indigo-600 dark:text-indigo-400 font-semibold">
              <Share2 size={15} strokeWidth={2.4} />
              Sincronização de planilha ativa
            </div>
          </div>
        </div>
      </div>

      {/* MÉTODO DE DISTRIBUIÇÃO */}
      <div>
        <div className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 mb-3 uppercase">
          MÉTODO DE DISTRIBUIÇÃO
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setMethod("round-robin")}
            className={`rounded-[14px] p-4 cursor-pointer transition-all ${
              method === "round-robin"
                ? "bg-white dark:bg-slate-900 shadow-sm ring-2 ring-indigo-500"
                : "bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 hover:-translate-y-0.5"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">Round Robin</span>
              <span
                className={`w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                  method === "round-robin" ? "bg-indigo-500" : "border-2 border-slate-300 dark:border-slate-600"
                }`}
              >
                {method === "round-robin" && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] text-slate-500 leading-relaxed">
              Distribui igualmente entre os vendedores ativos.
            </p>
          </div>

          <div
            onClick={() => setMethod("peso")}
            className={`rounded-[14px] p-4 cursor-pointer transition-all ${
              method === "peso"
                ? "bg-white dark:bg-slate-900 shadow-sm ring-2 ring-indigo-500"
                : "bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 hover:-translate-y-0.5"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">Peso por performance</span>
              <span
                className={`w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                  method === "peso" ? "bg-indigo-500" : "border-2 border-slate-300 dark:border-slate-600"
                }`}
              >
                {method === "peso" && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] text-slate-500 leading-relaxed">
              Prioriza quem mais converte no período.
            </p>
          </div>

          <div
            onClick={() => setMethod("manual")}
            className={`rounded-[14px] p-4 cursor-pointer transition-all ${
              method === "manual"
                ? "bg-white dark:bg-slate-900 shadow-sm ring-2 ring-indigo-500"
                : "bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 hover:-translate-y-0.5"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">Manual</span>
              <span
                className={`w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                  method === "manual" ? "bg-indigo-500" : "border-2 border-slate-300 dark:border-slate-600"
                }`}
              >
                {method === "manual" && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] text-slate-500 leading-relaxed">
              O gestor atribui cada lead na mão.
            </p>
          </div>
        </div>
      </div>

      {/* REGRAS POR ORIGEM */}
      <div className="bg-white dark:bg-slate-900 rounded-[14px] shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="p-4 sm:px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Regras por origem</div>
            <div className="text-[12.5px] text-slate-500 mt-0.5">Encaminhe cada canal para o workspace certo.</div>
          </div>
          <button className="h-8 px-3 border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300 rounded-lg text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5">
            <Plus size={14} />
            Nova regra
          </button>
        </div>
        
        <div className="flex items-center gap-3.5 p-4 sm:px-5 border-b border-slate-200 dark:border-slate-800">
          <span className="inline-flex h-[22px] items-center px-2.5 rounded-full text-[12px] font-medium text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 ring-1 ring-blue-600/20 dark:ring-blue-500/30">
            Meta Ads
          </span>
          <GitMerge size={16} className="text-slate-400" />
          <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100">Clinica Sorriso</span>
          <span className="ml-auto text-[12.5px] text-slate-500">Round Robin · 4 vendedores</span>
        </div>

        <div className="flex items-center gap-3.5 p-4 sm:px-5 border-b border-slate-200 dark:border-slate-800">
          <span className="inline-flex h-[22px] items-center px-2.5 rounded-full text-[12px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 ring-1 ring-emerald-600/20 dark:ring-emerald-500/30">
            WhatsApp
          </span>
          <GitMerge size={16} className="text-slate-400" />
          <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100">Construtora XYZ</span>
          <span className="ml-auto text-[12.5px] text-slate-500">Peso por performance · 6</span>
        </div>

        <div className="flex items-center gap-3.5 p-4 sm:px-5">
          <span className="inline-flex h-[22px] items-center px-2.5 rounded-full text-[12px] font-medium text-orange-700 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400 ring-1 ring-orange-600/20 dark:ring-orange-500/30">
            Google Ads
          </span>
          <GitMerge size={16} className="text-slate-400" />
          <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100">Agência Própria</span>
          <span className="ml-auto text-[12.5px] text-slate-500">Manual · 2 vendedores</span>
        </div>
      </div>
    </div>
  );
}
