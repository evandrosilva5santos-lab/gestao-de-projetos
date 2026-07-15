# Módulo de Operações (Operations)

Este módulo isola as telas e lógicas de acompanhamento e configuração da Operação Visual (Logs & Automação, Regras de Roteamento, Configurações) para a plataforma Agency OS.

## Funcionalidades

- **OperationQueueBoard**: Tabela visual interativa para acompanhar o pipeline de entrega dos leads (App, Google Sheets, Kommo, WhatsApp), permitindo identificar gargalos na hora.
- **RoutingRulesPanel**: Visualização das fontes conectadas e regras de roteamento (filtros, horários de pausa).
- **OperationSettingsPanel**: Configurações gerais da operação (destinos ativos, grupo de WhatsApp).

## Componentes Exportados (via index.ts)

Apenas estes componentes devem ser importados por outras áreas da aplicação (ex: LeadsDashboardShell), que farão a orquestração e roteamento de abas.

- `OperationQueueBoard`
- `RoutingRulesPanel`
- `OperationSettingsPanel`

## Server Actions (`actions.ts`)

- `getOperationQueue`: Busca as últimas entregas de leads cruzando com os logs de auditoria para construir a fila visual.
