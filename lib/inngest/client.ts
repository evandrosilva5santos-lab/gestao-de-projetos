import { Inngest } from "inngest";

// Inicializando o cliente do Inngest
// A propriedade id ('agency-os') deve ser única e identifica nosso app no dashboard do Inngest
export const inngest = new Inngest({ 
  id: "agency-os"
});
