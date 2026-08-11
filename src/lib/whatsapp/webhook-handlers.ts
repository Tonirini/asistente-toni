import type { Contact } from "@prisma/client";
import { runAgent } from "@/lib/whatsapp/agent";

export async function handleIncomingMessage(
  contact: Contact,
  text: string,
  fromAntonio: boolean,
  whatsappMessageId?: string
): Promise<string | null> {
  if (!fromAntonio) {
    // V1: los mensajes de terceros no se procesan acá (ver Paso 17 del blueprint, V2).
    return null;
  }

  return runAgent(contact.id, text, whatsappMessageId);
}
