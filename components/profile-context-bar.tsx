import Link from "next/link";
import type { SocialProfile } from "@/lib/social";

export function ProfileContextBar({ profile, profiles }: { profile: SocialProfile; profiles: SocialProfile[] }) {
  const own = profile.kind === "meta"
    ? (profile.ownMembers ?? []).map((id) => profiles.find((item) => item.id === id)).filter((item): item is SocialProfile => Boolean(item))
    : [];
  return <div className="profile-context-bar" aria-label="Current profile">
    <span>{profile.kind === "meta" ? "Meta-profile" : "Profile"}:</span>
    <strong>{profile.name}</strong>
    {own.length > 0 && <span>· your {own.length > 1 ? "profiles" : "profile"}: {own.map((member, index) => <span key={member.id}>{index > 0 && ", "}<Link href={`/circle/profiles/${encodeURIComponent(member.id)}`}><strong>{member.name}</strong></Link></span>)}</span>}
  </div>;
}
