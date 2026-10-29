import Link from "next/link";
import { DebateForm } from "@/components/debate-form";
import { listProfiles } from "@/lib/social";

export default async function NewDebatePage({ searchParams }: { searchParams: Promise<{ profileId?: string }> }) {
  const [{ profileId }, profiles] = await Promise.all([searchParams, listProfiles()]);
  return (
    <main className="form-shell">
      <Link href="/debates" className="back-link">← All debates</Link>
      <p className="eyebrow">Open the conversation</p>
      <h1 className="serif">Start a debate</h1>
      <p className="form-lead">Choose the profile that will own this debate, then set the context and make your first argument.</p>
      <DebateForm profiles={profiles} initialProfileId={profileId} />
    </main>
  );
}