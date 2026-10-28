import Link from "next/link";
import { DebateForm } from "@/components/debate-form";

export default function NewDebatePage() {
  return (
    <main className="form-shell">
      <Link href="/" className="back-link">← Tous les débats</Link>
      <p className="eyebrow">À vous d’ouvrir le sujet</p>
      <h1 className="serif">Lancer un débat</h1>
      <p className="form-lead">Posez le contexte et partagez un premier argument. Les autres pourront répondre au fil de la discussion.</p>
      <DebateForm />
    </main>
  );
}