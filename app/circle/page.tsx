import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { SignOutButton } from "@/components/sign-out-button";
import { isPersistentStore } from "@/lib/debates";
import { getAccount, getSessionAccountId, getUnreadAlertCount } from "@/lib/social";

export const dynamic = "force-dynamic";

const accountChoices = [
  { icon: "👤", title: "Profiles", description: "Manage all your profiles", href: "/circle/profiles" },
  { icon: "🧩", title: "Meta-Profiles", description: "Family, couple, group profiles", href: "/circle/meta-profiles" },
  { icon: "📝", title: "Descriptions", description: "Your personal descriptions", href: "/circle/descriptions" },
  { icon: "🔔", title: "Alerts", description: "Visits, replies, mentions", href: "/circle/alerts" },
  { icon: "👨‍👩‍👧", title: "Supervised Child Accounts", description: "Create or link a child account", href: "/circle/children" },
  { icon: "🔐", title: "Security", description: "Passwords and privacy settings", href: "/circle/security" },
  { icon: "💳", title: "Payment Method", description: "Manage your payment options", href: "/circle/payment" },
  { icon: "📦", title: "Subscription", description: "Plans and renewals", href: "/circle/subscription" }
];

export default async function CircleAccountPage() {
  const persistent = await isPersistentStore();
  const accountId = persistent ? await getSessionAccountId() : undefined;
  if (persistent && !accountId) redirect("/login");
  const [account, unreadAlerts] = await Promise.all([getAccount(accountId ?? undefined), getUnreadAlertCount(accountId ?? undefined)]);
  if (!account) redirect("/setup");

  return <main className="circle-account-shell">
    <header className="circle-account-header">
      <Link href="/circle" className="circle-wordmark"><span className="circle-brand-mark">C</span><strong>Circles</strong></Link>
      <div className="account-header-actions"><span className="account-private">Private · Only you</span>{persistent && <SignOutButton />}</div>
    </header>
    {!persistent && <p className="notice social-notice">Demo account and network. Set DATABASE_URL to keep changes after a restart.</p>}
    <section className="account-identity">
      <span className="social-avatar account-avatar">{account.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")}</span>
      <div className="account-private-details"><p className="eyebrow">Private account</p><h1>{account.displayName}</h1>{account.nationalities.length > 0 && <p>Nationalities: {account.nationalities.join(" · ")}</p>}{account.birthdate && <p>Birth date: {new Date(`${account.birthdate}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</p>}{account.address && <p>Address: {account.address}</p>}{account.phone && <p>Phone: {account.phone}</p>}</div>
      <span className="account-edit-note">Private account information</span>
    </section>

    <section className="account-choice-section">
      <div className="account-section-heading"><div><p className="eyebrow">Account</p><h2>Your choices</h2></div></div>
      <div className="account-choice-grid">{accountChoices.map((choice) => <Link className="account-choice" href={choice.href} key={choice.title}><span className="account-choice-icon">{choice.icon}{choice.title === "Alerts" && unreadAlerts > 0 && <span className="account-alert-badge" aria-label={`${unreadAlerts} alerts`}>{unreadAlerts}</span>}</span><span><strong>{choice.title}</strong><small>{choice.description}</small></span><span className="account-choice-arrow">→</span></Link>)}</div>
    </section>
    {persistent && <section className="danger-zone"><p className="eyebrow">Account ownership</p><h2>Delete account</h2><p>This permanently deletes your account, profiles, and associated content.</p><DeleteEntityButton endpoint="/api/account" label="Delete my account" confirmation="Permanently delete your account and all of its profiles and content? This cannot be undone." redirectTo="/" /></section>}
  </main>;
}
