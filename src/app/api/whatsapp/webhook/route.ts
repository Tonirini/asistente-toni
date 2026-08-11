import type { NextRequest } from "next/server";
import {
  resolveContact,
  isAntonio,
  sendWhatsAppMessage,
  transcribeAudioMessage,
} from "@/lib/whatsapp/evolution";
import { transcribeAudioBase64 } from "@/lib/whatsapp/transcribe";
import { handleIncomingMessage } from "@/lib/whatsapp/webhook-handlers";

type EvolutionMessageKey = {
  remoteJid: string;
  remoteJidAlt?: string;
  fromMe: boolean;
  id?: string;
};

type EvolutionPayload = {
  event?: string;
  data?: {
    key: EvolutionMessageKey;
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      audioMessage?: unknown;
    };
  };
};

function extractText(payload: EvolutionPayload): string | null {
  const message = payload.data?.message;
  return (
    message?.conversation ?? message?.extendedTextMessage?.text ?? null
  );
}

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.EVOLUTION_WEBHOOK_SECRET) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: EvolutionPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: true }); // payload inválido, no hay nada que procesar
  }

  if (payload.event !== "messages.upsert" || !payload.data) {
    return Response.json({ ok: true });
  }

  const { key, pushName, message } = payload.data;
  if (key.fromMe) return Response.json({ ok: true });
  if (key.remoteJid.endsWith("@g.us")) return Response.json({ ok: true }); // ignorar grupos

  try {
    const contact = await resolveContact(key.remoteJid, key.remoteJidAlt, pushName);
    const fromAntonio = isAntonio(contact.phoneE164);

    let text = extractText(payload);
    if (!text && message?.audioMessage) {
      const media = await transcribeAudioMessage(key);
      if (media.base64) {
        text = await transcribeAudioBase64(media.base64, media.mimetype);
      }
    }

    if (!text) return Response.json({ ok: true });

    const reply = await handleIncomingMessage(contact, text, fromAntonio, key.id);
    if (reply) {
      await sendWhatsAppMessage(key.remoteJid, reply);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Error procesando webhook de WhatsApp:", err);
    // Avisar en vez de dejar el mensaje sin respuesta (Paso 14 del blueprint).
    await sendWhatsAppMessage(
      key.remoteJid,
      "Tuve un error procesando tu mensaje. Probá de nuevo en un rato."
    ).catch(() => {});
    return Response.json({ ok: true });
  }
}
