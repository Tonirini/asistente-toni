"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { TaskType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { createTask } from "@/lib/actions/task-actions";

const TYPE_LABELS: Record<TaskType, string> = {
  diaria: "Diaria",
  semanal: "Semanal",
  mensual: "Mensual",
  puntual: "Puntual",
};

export function TaskForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<TaskType>("puntual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurrenceDay, setRecurrenceDay] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [link, setLink] = useState("");
  const [monto, setMonto] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  function reset() {
    setType("puntual");
    setTitle("");
    setDescription("");
    setDueDate("");
    setRecurrenceDay("");
    setReminderTime("");
    setLink("");
    setMonto("");
    setIsUrgent(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Poné un título");
      return;
    }
    const usefulData =
      link || monto
        ? { ...(link && { link }), ...(monto && { monto: Number(monto) }) }
        : null;

    startTransition(async () => {
      try {
        await createTask({
          title: title.trim(),
          description: description.trim() || null,
          type,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : null,
          recurrenceDay: recurrenceDay ? Number(recurrenceDay) : null,
          reminderTime: reminderTime || null,
          usefulData,
          isUrgent,
        });
        toast.success("Tarea creada");
        reset();
        setOpen(false);
      } catch (err) {
        toast.error("No se pudo crear la tarea");
        console.error(err);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="icon"
            className="fixed bottom-20 right-4 z-40 size-14 rounded-full shadow-lg"
          />
        }
      >
        <Plus className="size-6" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Fecha (opcional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reminderTime">Hora del aviso</Label>
              <Input
                id="reminderTime"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
          </div>

          {(type === "semanal" || type === "mensual") && (
            <div className="space-y-1.5">
              <Label htmlFor="recurrenceDay">
                {type === "semanal"
                  ? "Día de la semana (1=lunes .. 7=domingo)"
                  : "Día del mes (1-31)"}
              </Label>
              <Input
                id="recurrenceDay"
                type="number"
                min={1}
                max={type === "semanal" ? 7 : 31}
                value={recurrenceDay}
                onChange={(e) => setRecurrenceDay(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="link">Link (opcional)</Label>
              <Input
                id="link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monto">Monto (opcional)</Label>
              <Input
                id="monto"
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isUrgent"
              checked={isUrgent}
              onCheckedChange={(v) => setIsUrgent(v === true)}
            />
            <Label htmlFor="isUrgent" className="text-destructive">
              Urgente (el bot va a insistir más seguido)
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creando..." : "Crear tarea"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
