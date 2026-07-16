"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  listWorkspaces,
  reconcileWorkspace,
  type WorkspaceOption,
  type ReconResult,
  type ReconLead,
} from "../actions";

function StatusCell({ lead }: { lead: ReconLead }) {
  if (lead.status === "completo")
    return <Badge className="bg-emerald-500 hover:bg-emerald-600">🟢 Completo</Badge>;
  if (lead.status === "erro")
    return <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">🔴 Engasgou (erro)</Badge>;
  return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">🟡 Parado</Badge>;
}

function KommoCell({ lead }: { lead: ReconLead }) {
  if (lead.inKommo === "error")
    return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">⚠️ erro</Badge>;
  if (lead.inKommo === "no")
    return <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">🔴 não</Badge>;
  if (lead.kommoOwnDeal === false)
    return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">🟡 só contato</Badge>;
  return <Badge className="bg-emerald-500 hover:bg-emerald-600">🟢 negócio</Badge>;
}

function YesNo({ ok }: { ok: boolean }) {
  return ok ? (
    <Badge className="bg-emerald-500 hover:bg-emerald-600">🟢 sim</Badge>
  ) : (
    <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">🔴 não</Badge>
  );
}

export function ReconciliationPanel() {
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconResult | null>(null);
  const [filter, setFilter] = useState<"todos" | "parados" | "divergencias">("todos");

  useEffect(() => {
    listWorkspaces().then((res) => {
      if (!res.success || !res.workspaces) return;
      setWorkspaces(res.workspaces);
      const karol = res.workspaces.find((w) => /karol/i.test(w.name));
      setSelected(karol?.id || res.workspaces[0]?.id || "");
    });
  }, []);

  const handleConferir = async () => {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    const res = await reconcileWorkspace(selected);
    setResult(res);
    setLoading(false);
  };

  const rows = useMemo(() => {
    if (!result?.success) return [];
    if (filter === "parados") return result.leads.filter((l) => l.status !== "completo");
    if (filter === "divergencias") return result.leads.filter((l) => l.divergences.length > 0);
    return result.leads;
  }, [result, filter]);

  const summary = result?.success ? result.summary : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Conferência de Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fonte da verdade: a aba <strong>Banco de Dados</strong> (onde o Facebook despeja os leads).
            Para cada um, confiro se está na planilha <strong>CRM</strong>, no <strong>Kommo</strong> (com negócio próprio)
            e se a <strong>mensagem</strong> foi enviada. <strong>Somente leitura</strong> — nada é disparado nem alterado.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {workspaces.map((w) => (
            <Button key={w.id} size="sm" variant={selected === w.id ? "default" : "outline"} onClick={() => setSelected(w.id)}>
              {w.name}
            </Button>
          ))}
          <Button size="sm" onClick={handleConferir} disabled={loading || !selected} className="ml-auto">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {loading ? "Conferindo..." : "Conferir"}
          </Button>
        </div>

        {summary && (summary.kommo_error || summary.sheet_error || summary.banco_dados_error) && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {summary.banco_dados_error && "Não consegui ler a aba 'Banco de Dados' (nome/compartilhamento da planilha). "}
              {summary.kommo_error && "Houve erro ao consultar o Kommo (credenciais ou limite). "}
              {summary.sheet_error && "Não foi possível ler a aba CRM da planilha."}
            </span>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Leads (recentes)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{summary.total}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completos</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.completos}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Parados / engasgados</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.parados + summary.erros}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Divergências da planilha</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{summary.divergencias}</div></CardContent>
            </Card>
          </div>
        )}

        {summary && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Button size="sm" variant={filter === "todos" ? "default" : "outline"} onClick={() => setFilter("todos")}>Todos</Button>
            <Button size="sm" variant={filter === "parados" ? "default" : "outline"} onClick={() => setFilter("parados")}>Só parados / engasgados</Button>
            <Button size="sm" variant={filter === "divergencias" ? "default" : "outline"} onClick={() => setFilter("divergencias")}>Só divergências</Button>
            <span className="text-xs text-muted-foreground ml-auto">{rows.length} lead(s)</span>
          </div>
        )}

        {result && !result.success && (
          <Card><CardHeader><CardTitle>Erro</CardTitle><CardDescription>{result.error}</CardDescription></CardHeader></Card>
        )}

        {summary && (
          <Card>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">
                    {filter !== "todos" ? "Nada aqui com esse filtro. 🎉" : "Nenhum lead encontrado."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aba CRM</TableHead>
                        <TableHead>Kommo</TableHead>
                        <TableHead>Mensagem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((l, i) => (
                        <TableRow key={`${l.phone}-${l.leadgenId || i}`}>
                          <TableCell className="font-medium text-foreground">
                            {l.name}
                            {l.email && <div className="text-xs text-muted-foreground">{l.email}</div>}
                            {l.divergences.map((d) => (
                              <div key={d} className="mt-1 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                                <AlertTriangle className="h-3 w-3 shrink-0" /> {d}
                              </div>
                            ))}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{l.phone || "—"}</TableCell>
                          <TableCell><StatusCell lead={l} /></TableCell>
                          <TableCell><YesNo ok={l.inSheetCRM} /></TableCell>
                          <TableCell><KommoCell lead={l} /></TableCell>
                          <TableCell><YesNo ok={l.whatsSentByEngine || l.markedWhats} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!result && !loading && (
          <p className="text-sm text-muted-foreground">Selecione um cliente e clique em <strong>Conferir</strong>.</p>
        )}
      </div>
    </div>
  );
}
