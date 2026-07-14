// API pública da camada compartilhada de Integrações.
// Qualquer feature (leads, integration-hub, futuras) consome DAQUI —
// nunca importa arquivos internos direto. Ver 00 - Regras/RULES.md (barreira de import).

export { ConnectionCard, NewIntegrationTile } from "./ConnectionCard";
export type { Connection, ConnectionStatus, ActionKey } from "./ConnectionCard";
export { NewIntegrationModal } from "./NewIntegrationModal";
export * from "./actions";
