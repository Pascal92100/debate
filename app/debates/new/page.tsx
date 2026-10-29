import Link from "next/link";
import { DebateForm } from "@/components/debate-form";
import { listProfiles } from "@/lib/social";

export default async function NewDebatePage({ searchParams }: { searchParams: Promise<{ profileId?: string }> }) {
  const [{ profileId }, profiles] = await Promise.all([searchParams, listProfiles()]);
  return (
    <main className="form-shell">
      <Link href="/" className="back-link">← Tous les débats</Link>
      <p className="eyebrow">À vous d’ouvrir le sujet</p>
      <h1 className="serif">Lancer un débat</h1>
      <p className="form-lead">Choisissez le profil qui portera ce débat, puis posez le contexte et votre premier argument.</p>
      <DebateForm profiles={profiles} initialProfileId={profileId} />
    </main>
  );
}