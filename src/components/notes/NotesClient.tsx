"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Note } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createNote, deleteNote } from "@/lib/actions/note-actions";

export function NotesClient({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    const text = content.trim();
    if (!text) return;

    startTransition(async () => {
      try {
        const note = await createNote(text);
        setNotes((prev) => [note, ...prev]);
        setContent("");
      } catch (err) {
        toast.error("No se pudo guardar la nota");
        console.error(err);
      }
    });
  }

  function handleDelete(id: number) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    deleteNote(id).catch(() => toast.error("No se pudo borrar la nota"));
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribí una nota..."
          rows={3}
        />
        <Button
          onClick={handleAdd}
          disabled={pending || !content.trim()}
          className="w-full"
        >
          Agregar nota
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No tenés notas todavía.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {note.content}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(note.createdAt, "d MMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Borrar nota"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
