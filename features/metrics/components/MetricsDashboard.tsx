"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Inbox, CheckCircle2, Clock, AlertTriangle, Filter } from "lucide-react";
import { getAgencyMetrics } from "../actions";

type Metrics = Awaited<ReturnType<typeof getAgencyMetrics>>;

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "default"
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "bad"
          ? "text-rose-600 dark:text-rose-400"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
        <span className="text-muted-foreground">{icon}</span>
      </CardContent>
    </Card>
  );
}

export function MetricsDashboard() {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getAgencyMetrics().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <div className="py-16 text-center text-muted-foreground">Carregando métricas…</div>;
  }
  if (!data || !data.success) {
    return <div className="py-16 text-center text-rose-600">Erro ao carregar métricas.</div>;
  }

  const { kpis, byClient, bySource } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Métricas da Agência</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Visão consolidada de todos os clientes — volume de leads, distribuição e origens. Atualizado sob demanda.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* KPIs de hoje */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Recebidos hoje" value={kpis.receivedToday} hint={`${kpis.receivedTotal} no total`} icon={<Inbox className="h-5 w-5" />} />
        <KpiCard label="Distribuídos hoje" value={kpis.distributedToday} tone="good" icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard label="Aguardando vendedor" value={kpis.waitingSeller} tone="warn" hint="fila sem vendedor livre" icon={<Clock className="h-5 w-5" />} />
        <KpiCard label="Erros hoje" value={kpis.errorToday} tone={kpis.errorToday > 0 ? "bad" : "default"} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Taxa de sucesso hoje"
          value={kpis.successRate === null ? "—" : `${kpis.successRate}%`}
          hint="distribuídos ÷ tentativas"
          tone={kpis.successRate !== null && kpis.successRate >= 90 ? "good" : kpis.successRate !== null && kpis.successRate < 70 ? "bad" : "default"}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KpiCard
          label="Descartados hoje"
          value={kpis.discardsToday}
          hint="formulário não monitorado"
          tone={kpis.discardsToday > 0 ? "warn" : "default"}
          icon={<Filter className="h-5 w-5" />}
        />
      </div>

      {/* Por cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Por cliente</CardTitle>
          <CardDescription>Volume recente de leads por workspace (últimos 1.000 leads).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Recebidos</TableHead>
                <TableHead className="text-right">Distribuídos</TableHead>
                <TableHead className="text-right">Erros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byClient.map((c) => (
                <TableRow key={c.workspaceId}>
                  <TableCell className="font-medium text-foreground">{c.workspaceName}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.received}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{c.distributed}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.error > 0 ? <span className="text-rose-600 dark:text-rose-400">{c.error}</span> : "0"}
                  </TableCell>
                </TableRow>
              ))}
              {byClient.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum lead registrado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Por origem */}
      <Card>
        <CardHeader>
          <CardTitle>Por origem</CardTitle>
          <CardDescription>De onde os leads estão chegando.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {bySource.map((s) => (
              <div key={s.source} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Badge variant="outline">{s.source}</Badge>
                <span className="text-sm font-semibold tabular-nums text-foreground">{s.count}</span>
              </div>
            ))}
            {bySource.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">Sem origens ainda.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
