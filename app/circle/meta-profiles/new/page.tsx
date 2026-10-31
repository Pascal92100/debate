import Link from "next/link";
import { ProfileCreateForm } from "@/components/profile-create-form";
import { listCircles, listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function NewMetaProfilePage() {
  const [profiles, circles] = await Promise.all([listProfiles(), listCircles()]);
  return <main className="form-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">Circle · meta-profiles</p><h1>Create a meta-profile</h1></div><Link className="back-link" href="/circle/meta-profiles">← Meta-Profiles</Link></div>
    <ProfileCreateForm profiles={profiles} circles={circles} kind="meta" />
  </main>;
}
