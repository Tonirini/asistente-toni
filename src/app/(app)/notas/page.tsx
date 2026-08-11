import { Header } from "@/components/layout/Header";
import { NotesClient } from "@/components/notes/NotesClient";
import { getNotes } from "@/lib/notes";

export default async function NotasPage() {
  const notes = await getNotes();

  return (
    <div>
      <Header title="Notas" />
      <NotesClient initialNotes={notes} />
    </div>
  );
}
