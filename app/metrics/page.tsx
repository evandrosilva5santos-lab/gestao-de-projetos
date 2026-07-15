import { MetricsDashboard } from "@/features/metrics/components/MetricsDashboard";

// Rota standalone (admin). Isolada de propósito — não depende do shell de
// navegação (que está em edição por outra IA). Pode ser plugada na nav depois.
export default function MetricsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <MetricsDashboard />
    </main>
  );
}
