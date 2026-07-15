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

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function KommoCell({ lead }: { lead: ReconLead }) {
  if (lead.inKommo === "error")
    return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">⚠️ erro</Badge>;
  if (lead.inKommo === "no")
    return <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">🔴 não</Badge>;
  // yes
  if (lead.kommoOwnDeal === false)
    return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">🟡 só contato</Badge>;
  return <Badge className="bg-emerald-500 hover:bg-emerald-600">🟢 negócio</Badge>;
}

function SheetCell({ lead }: { lead: ReconLead }) {
  return lead.inSheetCRM ? (
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
  const [onlyMissingKommo, setOnlyMissingKommo] = useState(false);

  useEffect(() => {
    listWorkspaces().then((res) => {
      if (!res.success || !res.workspaces) return;
      setWorkspaces(res.workspaces);
      // começa pela Karol, se existir
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

  const isMissingKommo = (l: ReconLead) => l.inKommo === "no" || (l.inKommo === "yes" && l.kommoOwnDeal === false);

  const rows = useMemo(() => {
    if (!result?.success) return [];
    return onlyMissingKommo ? result.leads.filter(isMissingKommo) : result.leads;
  }, [result, onlyMissingKommo]);

  const summary = result?.success ? result.summary : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Conferência de Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verificação <strong>somente leitura</strong>: onde cada lead está (banco · Kommo · aba CRM da planilha).
            Nenhuma mensagem é disparada e nada é alterado.
          </p>
        </header>

        {/* Seletor de cliente */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {workspaces.map((w) => (
            <Button
              key={w.id}
              size="sm"
              variant={selected === w.id ? "default" : "outline"}
              onClick={() => setSelected(w.id)}
            >
              {w.name}
            </Button>
          ))}
          <Button size="sm" onClick={handleConferir} disabled={loading || !selected} className="ml-auto">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {loading ? "Conferindo..." : "Conferir"}
          </Button>
        </div>

        {/* Erros de fonte */}
        {summary && (summary.kommo_error || summary.sheet_error) && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {summary.kommo_error && "Houve erro ao consultar o Kommo (credenciais ou limite). "}
              {summary.sheet_error && "Não foi possível ler a aba CRM da planilha (credenciais/compartilhamento)."}
            </span>
          </div>
        )}

        {/* Cartões de resumo */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{summary.total}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Faltam no Kommo</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{summary.faltando_no_kommo}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Só contato (sem negócio)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.so_contato_sem_negocio}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Faltam na planilha</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{summary.faltando_na_planilha}</div></CardContent>
            </Card>
          </div>
        )}

        {/* Filtro */}
        {summary && (
          <div className="flex items-center gap-2 mb-3">
            <Button
              size="sm"
              variant={onlyMissingKommo ? "default" : "outline"}
              onClick={() => setOnlyMissingKommo((v) => !v)}
            >
              {onlyMissingKommo ? "Mostrando só os que faltam no Kommo" : "Mostrar só os que faltam no Kommo"}
            </Button>
            <span className="text-xs text-muted-foreground">{rows.length} lead(s)</span>
          </div>
        )}

        {/* Tabela */}
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
                    {onlyMissingKommo ? "Nenhum lead faltando no Kommo. 🎉" : "Nenhum lead encontrado."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead className="hidden md:table-cell">No banco</TableHead>
                        <TableHead>No Kommo</TableHead>
                        <TableHead>Aba CRM</TableHead>
                        <TableHead className="text-right">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((l, i) => (
                        <TableRow key={`${l.phone}-${i}`}>
                          <TableCell className="font-medium text-foreground">
                            {l.name}
                            {l.email && <div className="text-xs text-muted-foreground">{l.email}</div>}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{l.phone || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {l.inDb ? <Badge variant="outline">sim</Badge> : <Badge variant="outline" className="text-muted-foreground">não</Badge>}
                          </TableCell>
                          <TableCell><KommoCell lead={l} /></TableCell>
                          <TableCell><SheetCell lead={l} /></TableCell>
                          <TableCell className="text-right text-muted-foreground whitespace-nowrap">{fmtDate(l.createdAt)}</TableCell>
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
