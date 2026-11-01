import Link from "next/link";
import { MetaProfileInviteResponse } from "@/components/meta-profile-invite-response";
import { isPersistentStore } from "@/lib/debates";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function MetaProfileInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, profiles, persistent] = await Promise.all([params, listProfiles(), isPersistentStore()]);
  return <main className="form-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">Circles · shared identities</p><h1>Meta-profile invitation</h1></div><Link className="back-link" href="/circle">← Account</Link></div>
    {!persistent && <p className="notice social-notice">Demo invitations are temporary.</p>}
    <MetaProfileInviteResponse token={token} profiles={profiles} />
  </main>;
}