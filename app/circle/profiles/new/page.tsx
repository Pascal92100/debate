import Link from "next/link";
import { ProfileCreateForm } from "@/components/profile-create-form";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function NewIndividualProfilePage() {
  const profiles = await listProfiles();
  return <main className="form-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">Circle · profiles</p><h1>Create an individual profile</h1></div><Link className="back-link" href="/circle/profiles">← Profiles</Link></div>
    <ProfileCreateForm profiles={profiles} kind="individual" />
  </main>;
}
