"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScanSearch, AlertTriangle, PlugZap } from "lucide-react";
import { listWorkspaces, analyzeWorkspaceSchema, type WorkspaceOption, type AnalyzeResult, type FieldDiff } from "../actions";

const CATEGORY_LABEL: Record<string, string> = {
  contato: "Contato",
  formulario: "Formulário",
  rastreio: "Rastreio / Anúncio",
};

function StatusBadge({ f }: { f: FieldDiff }) {
  if (f.status === "coberto")
    return <Badge className="bg-emerald-500 hover:bg-emerald-600">coberto</Badge>;
  if (f.status === "critico")
    return <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">criar · crítico</Badge>;
  return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">criar</Badge>;
}

export function SchemaAnalyzerPanel() {
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  useEffect(() => {
    listWorkspaces().then((res) => {
      if (!res.success || !res.workspaces) return;
      setWorkspaces(res.workspaces);
      const karol = res.workspaces.find((w) => /karol/i.test(w.name));
      setSelected(karol?.id || res.workspaces[0]?.id || "");
    });
  }, []);

  const handleAnalyze = async () => {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    setResult(await analyzeWorkspaceSchema(selected));
    setLoading(false);
  };

  const data = result?.success ? result : null;
  const summary = data?.summary ?? null;
  const grouped = useMemo(() => {
    if (!data) return [];
    const order = ["contato", "formulario", "rastreio"];
    return order
      .map((cat) => ({ cat, items: data.fields.filter((f) => f.category === cat) }))
      .filter((g) => g.items.length > 0);
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Provisionamento do Kommo · Análise</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cruza os campos que chegam do formulário (Meta) com os campos que o Kommo já tem.
            <strong> Somente leitura</strong> — nada é criado. A criação virá depois, com sua confirmação.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {workspaces.map((w) => (
            <Button key={w.id} size="sm" variant={selected === w.id ? "default" : "outline"} onClick={() => setSelected(w.id)}>
              {w.name}
            </Button>
          ))}
          <Button size="sm" onClick={handleAnalyze} disabled={loading || !selected} className="ml-auto">
            <ScanSearch className={loading ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
            {loading ? "Analisando..." : "Analisar"}
          </Button>
        </div>

        {result && !result.success && (
          <Card><CardHeader><CardTitle>Erro</CardTitle><CardDescription>{result.error}</CardDescription></CardHeader></Card>
        )}

        {result?.success && !result.kommoConnected && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <PlugZap className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Este cliente ainda não tem o Kommo conectado. A análise mostra o que precisaria ser criado num Kommo novo.</span>
          </div>
        )}
        {result?.success && result.kommoError && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Não foi possível ler os campos do Kommo (credenciais ou limite). O que existe lá pode não estar refletido abaixo.</span>
          </div>
        )}

        {summary && data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Campos que chegam</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-foreground">{summary.total}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Já cobertos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.cobertos}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">A criar</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.faltando}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Críticos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{summary.criticos}</div></CardContent></Card>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Baseado em {data.leadsAnalisados} lead(s) recentes de <strong>{data.workspaceName}</strong>.
              O casamento é semântico: “Quando Deseja iniciar?” (Meta) reconhece “Qnd Começa:” (Kommo).
            </p>

            {grouped.map((g) => (
              <Card key={g.cat} className="mb-4">
                <CardHeader className="pb-2"><CardTitle className="text-base">{CATEGORY_LABEL[g.cat]}</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campo (conceito)</TableHead>
                          <TableHead>Vem da Meta como</TableHead>
                          <TableHead>No Kommo</TableHead>
                          <TableHead className="text-right">Situação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.items.map((f) => (
                          <TableRow key={f.concept}>
                            <TableCell className="font-medium text-foreground">{f.label}</TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">{f.metaLabels.join(", ") || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{f.kommoField || <span className="text-amber-600 dark:text-amber-400">— não existe —</span>}</TableCell>
                            <TableCell className="text-right"><StatusBadge f={f} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(summary.faltando > 0 || summary.criticos > 0) && (
              <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <strong className="text-foreground">Próximo passo (Fase 2):</strong> criar no Kommo os {summary.faltando + summary.criticos} campo(s)
                marcados — sempre com a sua confirmação (“Pode criar?”), de forma idempotente. Esta tela não cria nada.
              </div>
            )}
          </>
        )}

        {!result && !loading && (
          <p className="text-sm text-muted-foreground">Selecione um cliente e clique em <strong>Analisar</strong>.</p>
        )}
      </div>
    </div>
  );
}
