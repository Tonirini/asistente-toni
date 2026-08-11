import { prisma } from "@/lib/db";
import type { Contact } from "@prisma/client";

function apiUrl(path: string) {
  const base = process.env.EVOLUTION_API_URL!.replace(/\/$/, "");
  const instance = process.env.EVOLUTION_INSTANCE!;
  return `${base}${path}/${instance}`;
}

function headers() {
  return {
    "Content-Type": "application/json",
    apikey: process.env.EVOLUTION_API_KEY!,
  };
}

export async function sendWhatsAppMessage(toJidOrPhone: string, text: string) {
  const res = await fetch(apiUrl("/message/sendText"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ number: toJidOrPhone, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Evolution API sendText falló (${res.status}): ${body}`);
  }

  return res.json();
}

export async function transcribeAudioMessage(messageKey: unknown) {
  const res = await fetch(apiUrl("/chat/getBase64FromMediaMessage"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ message: { key: messageKey } }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Evolution API getBase64FromMediaMessage falló (${res.status}): ${body}`
    );
  }

  const data = (await res.json()) as { base64?: string; mimetype?: string };
  return data;
}

/**
 * Resuelve el contacto real detrás de un remoteJid, incluyendo el caso @lid
 * donde el número real viene en remoteJidAlt. Crea el Contact si no existe.
 */
export async function resolveContact(
  remoteJid: string,
  remoteJidAlt: string | undefined,
  pushName: string | undefined
): Promise<Contact> {
  const isLid = remoteJid.endsWith("@lid");
  const phoneSource = isLid ? remoteJidAlt : remoteJid;
  const phoneE164 = phoneSource
    ? `+${phoneSource.replace(/\D/g, "")}`
    : undefined;

  const existing = await prisma.contact.findFirst({
    where: {
      OR: [
        isLid ? { whatsappLid: remoteJid } : { whatsappJid: remoteJid },
        ...(phoneE164 ? [{ phoneE164 }] : []),
      ],
    },
  });

  if (existing) {
    if (isLid && !existing.remoteJidAlt && remoteJidAlt) {
      return prisma.contact.update({
        where: { id: existing.id },
        data: { remoteJidAlt },
      });
    }
    return existing;
  }

  return prisma.contact.create({
    data: {
      name: pushName || phoneE164 || remoteJid,
      whatsappJid: isLid ? null : remoteJid,
      whatsappLid: isLid ? remoteJid : null,
      remoteJidAlt: remoteJidAlt ?? null,
      phoneE164: phoneE164 ?? null,
    },
  });
}

export function isAntonio(phoneE164: string | null | undefined) {
  return phoneE164 === process.env.ANTONIO_CONTACT_PHONE;
}
