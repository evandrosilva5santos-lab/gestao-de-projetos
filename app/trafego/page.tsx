import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, LinkIcon, LayoutDashboard, FileBarChart } from "lucide-react";

// Rota placeholder — scaffold da feature "Gestão de Tráfego" (backlog, última prioridade).
// A implementação real deve mover esta tela para o route group app/(protected).
// Contrato e roadmap: features/traffic/README.md e docs/BACKLOG-GESTAO-TRAFEGO.md.

const CAPACIDADES = [
  { icon: LinkIcon, title: "Conexão de contas de anúncio", desc: "Conectar Meta Ads / Google Ads por cliente." },
  { icon: Megaphone, title: "Gestão de campanhas", desc: "Orçamentos, objetivo e status por cliente." },
  { icon: LayoutDashboard, title: "Dashboard de métricas", desc: "Gasto, ROAS, CPC, CPM, CTR, conversões." },
  { icon: FileBarChart, title: "Relatório para o cliente", desc: "Página read-only por token público." },
];

export default function TrafegoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Tráfego</h1>
            <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
              Em breve
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Estrutura preparada. A implementação está no backlog como última prioridade.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {CAPACIDADES.map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardHeader className="pb-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base mt-2">{title}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">Planejado</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
