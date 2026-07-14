// Custom hooks para queries e mutations da feature de leads
// Usando TanStack Query (React Query) para gerenciamento de estado assíncrono

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Hooks podem ser adicionados conforme necessário:
// - useLeadsQuery()
// - useCreateLeadMutation()
// - useClientWorkspaceQuery()
// - useUpdateLeadMutation()
// - Etc.

// Atualmente os dados são buscados via Server Actions (actions.ts)
// Os hooks serão populados quando houver necessidade de refetch automático
