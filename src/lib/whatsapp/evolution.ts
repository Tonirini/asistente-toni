import { prisma } from "@/lib/db";
import type { Contact } from "@prisma/client";

export type EvolutionInstanceKey = "pruebas" | "gospa";

function instanceConfig(instance: EvolutionInstanceKey) {
  if (instance === "gospa") {
    return {
      name: process.env.EVOLUTION_GOSPA_INSTANCE ?? "Gospa",
      apiKey: process.env.EVOLUTION_GOSPA_API_KEY!,
    };
  }
  return {
    name: process.env.EVOLUTION_INSTANCE!,
    apiKey: process.env.EVOLUTION_API_KEY!,
  };
}

function apiUrl(path: string, instance: EvolutionInstanceKey) {
  const base = process.env.EVOLUTION_API_URL!.replace(/\/$/, "");
  return `${base}${path}/${instanceConfig(instance).name}`;
}

function headers(instance: EvolutionInstanceKey) {
  return {
    "Content-Type": "application/json",
    apikey: instanceConfig(instance).apiKey,
  };
}

export async function sendWhatsAppMessage(
  toJidOrPhone: string,
  text: string,
  instance: EvolutionInstanceKey = "pruebas"
) {
  const res = await fetch(apiUrl("/message/sendText", instance), {
    method: "POST",
    headers: headers(instance),
    body: JSON.stringify({ number: toJidOrPhone, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Evolution API sendText falló (${res.status}): ${body}`);
  }

  return res.json();
}

export async function transcribeAudioMessage(messageKey: unknown) {
  const res = await fetch(apiUrl("/chat/getBase64FromMediaMessage", "pruebas"), {
    method: "POST",
    headers: headers("pruebas"),
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
