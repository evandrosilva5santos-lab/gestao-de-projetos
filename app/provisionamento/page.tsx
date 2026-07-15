import { SchemaAnalyzerPanel } from "@/features/kommo-provisioning";

// Rota admin standalone (read-only): analisa quais campos do formulário (Meta)
// já existem no Kommo e quais faltariam criar. Não cria nada — Fase 1.
export default function ProvisionamentoPage() {
  return <SchemaAnalyzerPanel />;
}
