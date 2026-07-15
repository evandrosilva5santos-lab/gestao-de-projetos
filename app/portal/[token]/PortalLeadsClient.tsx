"use client";

import { useEffect, useMemo, useState } from "react";
import { getLeadsByClientToken, type PortalLead } from "@/features/client-portal/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CalendarClock, Inbox } from "lucide-react";

type StatusFilter = "all" | "distributed" | "waiting" | "error";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "distributed", label: "Distribuído" },
  { key: "waiting", label: "Aguardando" },
  { key: "error", label: "Erro" },
];

/** Agrupa os status brutos do banco nas categorias exibidas no filtro. */
function statusGroup(status: string): StatusFilter {
  if (status === "distributed") return "distributed";
  if (status === "error") return "error";
  return "waiting";
}

function statusBadge(status: string) {
  const group = statusGroup(status);
  if (group === "distributed")
    return <Badge className="bg-emerald-500 hover:bg-emerald-600">Distribuído</Badge>;
  if (group === "error")
    return (
      <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
        Erro
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
      Aguardando
    </Badge>
  );
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Agora mesmo";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function PortalLeadsClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [leads, setLeads] = useState<PortalLead[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let active = true;

    const load = (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      getLeadsByClientToken(token).then((res) => {
        if (!active) return;
        setLoading(false);
        if (!res.success) {
          setError(res.error);
          return;
        }
        setError(null);
        setWorkspaceName(res.workspaceName);
        setLeads(res.leads);
      });
    };

    load(true);
    // Auto-refresh a cada 30s — sem libs externas.
    const interval = setInterval(() => load(false), 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [token]);

  const totalToday = useMemo(() => leads.filter((l) => isToday(l.createdAt)).length, [leads]);
  const filteredLeads = useMemo(
    () => (filter === "all" ? leads : leads.filter((l) => statusGroup(l.status) === filter)),
    [leads, filter]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle>Ops!</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
        {/* Cabeçalho */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{workspaceName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Seus leads em tempo quase real</p>
        </header>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{leads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recebidos hoje</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalToday}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtro por status */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {leads.length === 0
                    ? "Nenhum lead recebido ainda."
                    : "Nenhum lead neste filtro."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="hidden sm:table-cell">Origem</TableHead>
                      <TableHead className="hidden sm:table-cell">Vendedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Recebido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium text-foreground">{lead.name}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.contact}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{lead.source}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {lead.sellerName || "—"}
                        </TableCell>
                        <TableCell>{statusBadge(lead.status)}</TableCell>
                        <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                          {relativeTime(lead.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Atualiza automaticamente a cada 30 segundos.
        </p>
      </div>
    </div>
  );
}
