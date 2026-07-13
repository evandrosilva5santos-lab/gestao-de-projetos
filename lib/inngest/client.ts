import { Inngest } from "inngest";

// Definição tipada dos eventos que nossa aplicação dispara
type Events = {
  "lead/received": {
    data: {
      workspaceId: string;
      source: string;
      rawPayload: any; // O payload bruto do Facebook/Landing Page
    };
  };
};

// Inicializando o cliente do Inngest
// A propriedade id ('agency-os') deve ser única e identifica nosso app no dashboard do Inngest
export const inngest = new Inngest({ 
  id: "agency-os"
});
