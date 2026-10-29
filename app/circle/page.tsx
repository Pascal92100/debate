import Link from "next/link";
import { isPersistentStore } from "@/lib/debates";
import { getDemoAccount } from "@/lib/social";

export const dynamic = "force-dynamic";

const accountChoices = [
  { icon: "👤", title: "Profiles", description: "Manage all your profiles", href: "/circle/profiles" },
  { icon: "🧩", title: "Meta-Profiles", description: "Family, couple, group profiles", href: "/circle/meta-profiles" },
  { icon: "📝", title: "Descriptions", description: "Your personal descriptions", href: "/circle/descriptions" },
  { icon: "🔔", title: "Alerts", description: "Visits, replies, mentions", href: "/circle/alerts", badge: 7 },
  { icon: "👨‍👩‍👧", title: "Supervised Child Accounts", description: "Create or link a child account", href: "/circle/children" },
  { icon: "🔐", title: "Security", description: "Passwords and privacy settings", href: "/circle/security" },
  { icon: "💳", title: "Payment Method", description: "Manage your payment options", href: "/circle/payment" },
  { icon: "📦", title: "Subscription", description: "Plans and renewals", href: "/circle/subscription" }
];

export default async function CircleAccountPage() {
  const [persistent, account] = await Promise.all([
    isPersistentStore(), getDemoAccount()
  ]);

  return <main className="circle-account-shell">
    <header className="circle-account-header">
      <Link href="/circle" className="circle-wordmark"><span className="circle-brand-mark">◯</span><strong>Circle</strong></Link>
      <span className="account-private">Private · Only you</span>
    </header>
    {!persistent && <p className="notice social-notice">Demo account and network. Set DATABASE_URL to keep changes after a restart.</p>}
    <section className="account-identity">
      <span className="social-avatar account-avatar">JD</span>
      <div className="account-private-details"><p className="eyebrow">Private account</p><h1>{account.displayName}</h1><p>Nationalities: {account.nationalities.join(" · ")}</p><p>Birth date: {new Date(`${account.birthdate}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</p><p>Address: {account.address}</p><p>Phone: {account.phone}</p></div>
      <span className="account-edit-note">Private account information</span>
    </section>

    <section className="account-choice-section">
      <div className="account-section-heading"><div><p className="eyebrow">Account</p><h2>Your choices</h2></div></div>
      <div className="account-choice-grid">{accountChoices.map((choice) => <Link className="account-choice" href={choice.href} key={choice.title}><span className="account-choice-icon">{choice.icon}{"badge" in choice && <span className="account-alert-badge" aria-label={`${choice.badge} alerts`}>{choice.badge}</span>}</span><span><strong>{choice.title}</strong><small>{choice.description}</small></span><span className="account-choice-arrow">→</span></Link>)}</div>
    </section>
  </main>;
}
