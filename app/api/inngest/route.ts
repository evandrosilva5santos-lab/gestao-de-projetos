import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { processNewLead } from "@/lib/inngest/functions";

// Configura o endpoint /api/inngest 
// O Inngest SDK usará este endpoint para descobrir nossas funções e orquestrar as filas
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processNewLead,
  ],
});
