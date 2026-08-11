"use client";

import { useState } from "react";
import type { Contact } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { findOrCreateContact } from "@/lib/actions/task-actions";

export function ContactPickerDialog({
  open,
  onOpenChange,
  contacts,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onConfirm: (contactId: number, contactName: string) => void;
  onCancel: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      if (newName.trim()) {
        const contact = await findOrCreateContact(newName.trim());
        onConfirm(contact.id, contact.name);
      } else if (selectedId) {
        const contact = contacts.find((c) => String(c.id) === selectedId);
        if (contact) onConfirm(contact.id, contact.name);
      }
      setSelectedId("");
      setNewName("");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿De quién depende?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {contacts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Contacto existente</Label>
              <Select
                value={selectedId}
                onValueChange={(v) => setSelectedId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegir..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>O uno nuevo</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del contacto"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={pending || (!newName.trim() && !selectedId)}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
