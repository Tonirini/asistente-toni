import type { ChatCompletionTool, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getOpenAI } from "@/lib/openai";
import { prisma } from "@/lib/db";
import { cycleDateFor } from "@/lib/cycle";
import { getAvisos, getHoy, getMes, getSemana } from "@/lib/tasks";
import {
  createTask,
  findOrCreateContact,
  toggleOccurrenceDone,
  updateTaskStatus,
} from "@/lib/actions/task-actions";
import { createNote, deleteNote } from "@/lib/actions/note-actions";
import { getNotes } from "@/lib/notes";
import type { TaskStatus } from "@prisma/client";

const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 4;

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "crear_tarea",
      description:
        "Crea una tarea/recordatorio nuevo para Antonio. Usar cuando pide que le recuerden o anoten algo.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: ["string", "null"] },
          type: {
            type: "string",
            enum: ["diaria", "semanal", "mensual", "puntual"],
            description:
              "diaria: todos los días. semanal: un día fijo cada semana. mensual: un día fijo cada mes. puntual: una sola vez.",
          },
          dueDate: {
            type: ["string", "null"],
            description:
              "Fecha YYYY-MM-DD si type=puntual y Antonio dio o se puede inferir una fecha. Si es puntual pero sin fecha clara, dejar null (queda como pendiente sin fecha) en vez de preguntar por una fecha que no hace falta.",
          },
          recurrenceDay: {
            type: ["number", "null"],
            description: "1-7 (lunes=1) si semanal; 1-31 si mensual.",
          },
          reminderTime: { type: ["string", "null"], description: "Hora HH:mm del aviso." },
        },
        required: ["title", "description", "type", "dueDate", "recurrenceDay", "reminderTime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "completar_tarea",
      description: "Marca una tarea existente como hecha/completada.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          referencia: { type: "string", description: "Texto que identifica la tarea (parte del título)." },
        },
        required: ["referencia"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cambiar_estado",
      description:
        "Cambia el estado de una tarea (pendiente, en_proceso, depende_de_otro, abandonado).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          referencia: { type: "string" },
          nuevo_estado: {
            type: "string",
            enum: ["pendiente", "en_proceso", "depende_de_otro", "abandonado"],
          },
          contacto: {
            type: ["string", "null"],
            description: "Nombre del contacto si nuevo_estado=depende_de_otro.",
          },
        },
        required: ["referencia", "nuevo_estado", "contacto"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_tareas",
      description: "Devuelve el estado actual de las tareas de Antonio para responder preguntas.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          vista: { type: "string", enum: ["hoy", "semana", "mes", "avisos"] },
        },
        required: ["vista"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detalle_tarea",
      description:
        "Devuelve todos los datos de una tarea puntual (descripción, fecha, hora, link, monto, de quién depende, estado). Usar antes de contestar cualquier pregunta sobre el detalle de una tarea específica.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          referencia: { type: "string", description: "Texto que identifica la tarea (parte del título)." },
        },
        required: ["referencia"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crear_nota",
      description:
        "Guarda una nota suelta de texto libre — algo que Antonio quiere anotar pero que NO es una tarea ni un recordatorio (no tiene fecha ni acción pendiente).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          contenido: { type: "string" },
        },
        required: ["contenido"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_notas",
      description: "Devuelve las notas guardadas, para responder preguntas sobre ellas.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "borrar_nota",
      description: "Borra una nota guardada que coincida con la referencia.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          referencia: { type: "string", description: "Texto que identifica la nota (parte del contenido)." },
        },
        required: ["referencia"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirmar_recordatorio",
      description:
        'Usar cuando Antonio confirma que ya hizo algo que el bot le había recordado (ej. "listo", "ya pagué"), sin nombrar la tarea explícitamente.',
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          referencia: { type: ["string", "null"] },
        },
        required: ["referencia"],
      },
    },
  },
];

async function findTaskByReference(reference: string) {
  if (!reference.trim()) return null;
  return prisma.task.findFirst({
    where: {
      status: { notIn: ["completado", "abandonado"] },
      title: { contains: reference },
    },
    orderBy: { updatedAt: "desc" },
  });
}

function summarizeItems(items: { task: { title: string }; isDone: boolean }[]) {
  if (items.length === 0) return "(nada)";
  return items.map((i) => `${i.isDone ? "[hecho]" : "[pendiente]"} ${i.task.title}`).join("\n");
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "crear_tarea": {
      const type = args.type as "diaria" | "semanal" | "mensual" | "puntual";
      const task = await createTask({
        title: String(args.title),
        description: (args.description as string) ?? null,
        type,
        dueDate: args.dueDate ? new Date(`${args.dueDate}T00:00:00`) : null,
        recurrenceDay: (args.recurrenceDay as number) ?? null,
        reminderTime: (args.reminderTime as string) ?? null,
      });
      return `Creada la tarea #${task.id} "${task.title}" (${task.type}).`;
    }

    case "completar_tarea": {
      const task = await findTaskByReference(String(args.referencia));
      if (!task) return `No encontré ninguna tarea pendiente que coincida con "${args.referencia}".`;
      if (task.type === "puntual") {
        await updateTaskStatus(task.id, "completado");
      } else {
        await toggleOccurrenceDone(task.id, cycleDateFor(task.type), true);
      }
      return `Marcada como hecha: "${task.title}".`;
    }

    case "cambiar_estado": {
      const task = await findTaskByReference(String(args.referencia));
      if (!task) return `No encontré ninguna tarea pendiente que coincida con "${args.referencia}".`;

      let contactId: number | undefined;
      if (args.nuevo_estado === "depende_de_otro") {
        if (!args.contacto) return `Falta el nombre del contacto para mover "${task.title}" a depende_de_otro.`;
        const contact = await findOrCreateContact(String(args.contacto));
        contactId = contact.id;
      }

      await updateTaskStatus(task.id, args.nuevo_estado as TaskStatus, contactId);
      return `"${task.title}" ahora está en ${args.nuevo_estado}.`;
    }

    case "consultar_tareas": {
      switch (args.vista) {
        case "hoy": {
          const { items, progress } = await getHoy();
          return `Hoy (${progress.completed}/${progress.total}):\n${summarizeItems(items)}`;
        }
        case "semana": {
          const { items, progress } = await getSemana();
          return `Semana (${progress.completed}/${progress.total}):\n${summarizeItems(items)}`;
        }
        case "mes": {
          const { items, progress } = await getMes();
          return `Mes (${progress.completed}/${progress.total}):\n${summarizeItems(items)}`;
        }
        case "avisos": {
          const { proximosItems, vencidasCount } = await getAvisos();
          return `Avisos próximos (${vencidasCount} vencidos):\n${summarizeItems(
            proximosItems.map((i) => ({ task: i.task, isDone: false }))
          )}`;
        }
        default:
          return "Vista desconocida.";
      }
    }

    case "detalle_tarea": {
      const task = await prisma.task.findFirst({
        where: { title: { contains: String(args.referencia) } },
        include: { dependsOnContact: true },
        orderBy: { updatedAt: "desc" },
      });
      if (!task) return `No encontré ninguna tarea que coincida con "${args.referencia}".`;

      const usefulData = task.usefulData as { link?: string; monto?: number; cuenta?: string } | null;
      const lines = [
        `Título: ${task.title}`,
        `Descripción: ${task.description || "(sin descripción)"}`,
        `Tipo: ${task.type}`,
        `Estado: ${task.status}`,
      ];
      if (task.dueDate) lines.push(`Fecha: ${task.dueDate.toISOString().slice(0, 10)}`);
      if (task.reminderTime) lines.push(`Hora del aviso: ${task.reminderTime}`);
      if (task.recurrenceDay) lines.push(`Día del ciclo: ${task.recurrenceDay}`);
      if (usefulData?.link) lines.push(`Link: ${usefulData.link}`);
      if (usefulData?.monto != null) lines.push(`Monto: $${usefulData.monto}`);
      if (task.dependsOnContact) lines.push(`Depende de: ${task.dependsOnContact.name}`);
      return lines.join("\n");
    }

    case "crear_nota": {
      await createNote(String(args.contenido), "whatsapp");
      return "Nota guardada.";
    }

    case "listar_notas": {
      const notes = await getNotes();
      if (notes.length === 0) return "No hay notas guardadas.";
      return notes.map((n) => `- ${n.content}`).join("\n");
    }

    case "borrar_nota": {
      const note = await prisma.note.findFirst({
        where: { content: { contains: String(args.referencia) } },
        orderBy: { createdAt: "desc" },
      });
      if (!note) return `No encontré ninguna nota que coincida con "${args.referencia}".`;
      await deleteNote(note.id);
      return `Borrada: "${note.content}".`;
    }

    case "confirmar_recordatorio": {
      const referencia = args.referencia ? String(args.referencia) : null;
      const pendingLog = await prisma.reminderLog.findFirst({
        where: {
          respondedAt: null,
          ...(referencia ? { task: { title: { contains: referencia } } } : {}),
        },
        orderBy: { sentAt: "desc" },
        include: { task: true },
      });

      if (!pendingLog) return "No tengo ningún recordatorio pendiente de confirmar.";

      await prisma.reminderLog.update({
        where: { id: pendingLog.id },
        data: { respondedAt: new Date(), responseText: "confirmado por chat" },
      });

      if (pendingLog.task.type === "puntual") {
        await updateTaskStatus(pendingLog.taskId, "completado");
      } else {
        await toggleOccurrenceDone(pendingLog.taskId, cycleDateFor(pendingLog.task.type), true);
      }

      return `Di por hecho "${pendingLog.task.title}".`;
    }

    default:
      return `Herramienta desconocida: ${name}`;
  }
}

const SYSTEM_PROMPT = `Sos el asistente personal de Antonio (dueño de Gospa Panadería, Argentina), y hablás con él por WhatsApp.
Antonio tiene TDAH: el sistema existe para que nada se pierda y para que las conversaciones sean rápidas, cálidas y directas — nada de respuestas largas o formales.

Reglas:
- Contestá corto, como un mensaje de WhatsApp real (1-3 líneas), en español rioplatense informal, sin emojis de más.
- Para crear, completar, cambiar de estado o confirmar una tarea, SIEMPRE usá la herramienta correspondiente — nunca digas que hiciste algo sin haber llamado a la herramienta.
- Para responder preguntas sobre el estado de sus tareas, SIEMPRE consultá con la herramienta consultar_tareas antes de contestar — no inventes datos.
- Si Antonio pregunta si algo ya está anotado/guardado, o pide que confirmes/revises algo que le dijiste antes, consultá primero con listar_notas o consultar_tareas — NUNCA vuelvas a crear la nota o tarea "por las dudas", eso genera duplicados.
- Antes de crear una nota o tarea, fijate en la conversación reciente si ya la creaste — no repitas una creación por un mensaje repetido o una confirmación.
- Al anotar algo, usá las palabras del propio Antonio en vez de reformular.
- Crear una tarea NUNCA es lo mismo que completarla. Jamás marques algo como completado salvo que Antonio diga explícitamente que ya lo hizo en la vida real.
- Si en algún momento no estás seguro de si algo se ejecutó de verdad, decilo así ("no estoy seguro, dejame revisar") en vez de afirmar que se hizo — y después confirmá con la herramienta correspondiente antes de responder.
- Si el pedido es ambiguo (no está claro el tipo de tarea, la fecha, o a qué tarea se refiere), preguntá antes de actuar en vez de adivinar.
- Podés charlar un poco y seguir el hilo de la conversación, pero el objetivo siempre es no perder de vista tareas y recordatorios.
- Hoy es {TODAY} (América/Argentina/Córdoba).`;

export async function runAgent(
  contactId: number,
  userMessage: string,
  whatsappMessageId?: string
): Promise<string | null> {
  if (whatsappMessageId) {
    const existing = await prisma.chatMessage.findUnique({
      where: { whatsappMessageId },
    });
    if (existing) return null; // ya procesado — WhatsApp/Evolution reentregó el mismo mensaje
  }

  const history = await prisma.chatMessage.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY,
  });

  const today = new Date().toISOString().slice(0, 10);
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT.replace("{TODAY}", today) },
    ...history.reverse().map(
      (m): ChatCompletionMessageParam => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })
    ),
    { role: "user", content: userMessage },
  ];

  await prisma.chatMessage.create({
    data: { contactId, role: "user", content: userMessage, whatsappMessageId },
  });

  let finalReply = "";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: TOOLS,
    });

    const choice = completion.choices[0];
    const message = choice.message;

    if (!message.tool_calls || message.tool_calls.length === 0) {
      finalReply = message.content ?? "";
      break;
    }

    messages.push(message);

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        // ignora argumentos mal formados, la herramienta maneja los faltantes
      }
      const result = await executeTool(toolCall.function.name, args);
      messages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
    }
  }

  if (!finalReply) {
    finalReply = "Dale, listo. ¿Necesitás algo más?";
  }

  await prisma.chatMessage.create({
    data: { contactId, role: "assistant", content: finalReply },
  });

  return finalReply;
}
