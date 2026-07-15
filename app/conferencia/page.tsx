import { ReconciliationPanel } from "@/features/reconciliation";

// Rota admin standalone (read-only): confere onde cada lead está
// (banco · Kommo · aba CRM da planilha). Nada é disparado nem alterado.
export default function ConferenciaPage() {
  return <ReconciliationPanel />;
}
