import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileAlerts } from "@/components/profile-alerts";
import { getSessionAccountId } from "@/lib/auth";
import { isPersistentStore } from "@/lib/debates";
import { listIncomingMetaProfileInvitations } from "@/lib/meta-profile-invitations";
import { listProfileAlerts } from "@/lib/profile-modules";
import { listProfiles } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function AccountAlertsPage() {
  const [profiles, persistent] = await Promise.all([listProfiles(), isPersistentStore()]);
  if (persistent && !await getSessionAccountId()) redirect("/login");
  const [alertsByProfile, invitationsByProfile] = await Promise.all([
    Promise.all(profiles.map((profile) => listProfileAlerts(profile.id))),
    Promise.all(profiles.map((profile) => listIncomingMetaProfileInvitations(profile.id)))
  ]);
  const alerts = alertsByProfile.flat().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const invitations = invitationsByProfile.flat().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const unreadCount = alerts.filter((alert) => !alert.readAt).length;

  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">Private account · all profiles</p><h1>Alerts{unreadCount > 0 ? ` · ${unreadCount} unread` : ""}</h1></div><Link className="back-link" href="/circle">← Account</Link></div>
    {!persistent && <p className="notice social-notice">Demo alerts are temporary.</p>}
    <ProfileAlerts initialAlerts={alerts} initialInvitations={invitations} profiles={profiles} showProfileNames />
  </main>;
}
