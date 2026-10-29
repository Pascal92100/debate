import Link from "next/link";
import { notFound } from "next/navigation";

const sections: Record<string, { title: string; icon: string; description: string }> = {
  searches: { title: "Saved searches", icon: "🔍", description: "The prototype includes theme, post type, distance, language, and visibility criteria. Full search is not implemented yet." },
  alerts: { title: "Alerts", icon: "🔔", description: "Visit, reply, and mention alerts are part of the data model; the alert center is not implemented yet." },
  children: { title: "Supervised child accounts", icon: "👨‍👩‍👧", description: "The prototype supports creating or linking supervised accounts. Guardian and permission management is not implemented yet." },
  security: { title: "Security", icon: "🔐", description: "Password, session, and security settings depend on the authentication system, which is not connected yet." },
  payment: { title: "Payment method", icon: "💳", description: "Payments are not enabled. Payment methods must be connected to a provider and will never be stored in plain text here." },
  subscription: { title: "Subscription", icon: "📦", description: "Plans and renewals are included in the prototype, but no subscription system is connected yet." },
  communities: { title: "Communities", icon: "👥", description: "Private Circles are active. Open communities with discovery and membership still need to be built." },
  forums: { title: "Forums", icon: "💬", description: "Debates are the first structured discussion type. Themed forums are not connected yet." },
  "private-discussions": { title: "Private discussions", icon: "📨", description: "The schema includes private conversations, but messaging and its access controls are not implemented yet." },
  events: { title: "Events", icon: "📅", description: "The schema includes events, invitations, and RSVPs. Event creation and management are not implemented yet." },
  following: { title: "Followed profiles", icon: "⭐", description: "The prototype includes profile following. Subscription management and a personalized feed are not implemented yet." },
  shop: { title: "Shop", icon: "🛒", description: "No shop services are active yet." }
};

export default async function CircleAccountSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = sections[section];
  if (!item) notFound();
  return <main className="social-shell social-directory-shell"><Link className="back-link" href="/circle">← Account</Link><section className="account-placeholder"><span>{item.icon}</span><p className="eyebrow">Circle · upcoming module</p><h1>{item.title}</h1><p>{item.description}</p></section></main>;
}
