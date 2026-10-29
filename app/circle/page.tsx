import Link from "next/link";
import { isPersistentStore, listDebates } from "@/lib/debates";
import { getDemoAccount, listCircles, listProfiles, listSocialPosts } from "@/lib/social";

export const dynamic = "force-dynamic";

const accountChoices = [
  { icon: "👤", title: "Profils", description: "Gérer vos identités individuelles", href: "/circle/profiles" },
  { icon: "🧩", title: "Méta-profils", description: "Famille, couple ou groupe", href: "/circle/meta-profiles" },
  { icon: "📝", title: "Descriptions", description: "Vos présentations par thème", href: "/circle/descriptions" },
  { icon: "⭕", title: "Cercles", description: "Vos espaces de confiance", href: "/social/circles" },
  { icon: "🏠", title: "Fil du réseau", description: "Publications et discussions de vos cercles", href: "/social" },
  { icon: "⚖️", title: "Débats par profil", description: "Choisir un profil puis voir ses débats", href: "/circle/profiles" },
  { icon: "🔍", title: "Recherches", description: "Préférences et recherches enregistrées", href: "/circle/searches" },
  { icon: "🔔", title: "Alertes", description: "Visites, réponses et mentions", href: "/circle/alerts" },
  { icon: "👨‍👩‍👧", title: "Comptes enfants", description: "Comptes supervisés et liés", href: "/circle/children" },
  { icon: "🔐", title: "Sécurité", description: "Mot de passe et paramètres privés", href: "/circle/security" },
  { icon: "💳", title: "Moyen de paiement", description: "Gérer vos options de paiement", href: "/circle/payment" },
  { icon: "📦", title: "Abonnement", description: "Offres et renouvellements", href: "/circle/subscription" },
  { icon: "👥", title: "Communautés", description: "Groupes et intérêts partagés", href: "/circle/communities" },
  { icon: "💬", title: "Forums", description: "Sujets suivis ou créés", href: "/circle/forums" },
  { icon: "📨", title: "Discussions privées", description: "Échanges directs", href: "/circle/private-discussions" },
  { icon: "📅", title: "Événements", description: "À venir et passés", href: "/circle/events" },
  { icon: "⭐", title: "Profils suivis", description: "Vos profils favoris", href: "/circle/following" },
  { icon: "🛒", title: "Boutique", description: "Services et outils", href: "/circle/shop" }
];

export default async function CircleAccountPage() {
  const [profiles, circles, posts, debates, persistent, account] = await Promise.all([
    listProfiles(), listCircles(), listSocialPosts(), listDebates(), isPersistentStore(), getDemoAccount()
  ]);
  const linkedDebates = debates.filter((debate) => debate.authorProfileId || debate.sourcePostId);

  return <main className="circle-account-shell">
    <header className="circle-account-header">
      <Link href="/circle" className="circle-wordmark"><span className="circle-brand-mark">◯</span><strong>Circle</strong></Link>
      <span className="account-private">Compte · privé</span>
    </header>
    {!persistent && <p className="notice social-notice">Compte et réseau de démonstration. Configurez DATABASE_URL pour conserver les changements entre redémarrages.</p>}
    <section className="account-identity">
      <span className="social-avatar account-avatar">JD</span>
      <div className="account-private-details"><p className="eyebrow">Compte principal · privé</p><h1>{account.displayName}</h1><p>Nationalité(s) : {account.nationalities.join(" · ")}</p><p>Né(e) le : {new Date(`${account.birthdate}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p><p>Adresse : {account.address}</p><p>Téléphone : {account.phone}</p><small>{profiles.length} profils · {circles.length} cercles</small></div>
      <span className="account-edit-note">Informations privées du compte</span>
    </section>

    <section className="account-choice-section">
      <div className="account-section-heading"><div><p className="eyebrow">Espace personnel</p><h2>Vos choix</h2></div><Link href="/circle/profiles">Gérer les profils →</Link></div>
      <div className="account-choice-grid">{accountChoices.map((choice) => <Link className="account-choice" href={choice.href} key={choice.title}><span className="account-choice-icon">{choice.icon}</span><span><strong>{choice.title}</strong><small>{choice.description}</small></span><span className="account-choice-arrow">→</span></Link>)}</div>
    </section>

    <section className="account-profiles-section">
      <div className="account-section-heading"><div><p className="eyebrow">Identités</p><h2>Profils individuels</h2></div><Link href="/circle/profiles">Tous les profils →</Link></div>
      <div className="account-profile-list">{profiles.filter((profile) => profile.kind === "individual").map((profile) => <article className="account-profile-row" key={profile.id}><span className="social-avatar">{profile.avatar}</span><div><strong>{profile.name}</strong><small>{profile.category} · {profile.visibility === "all" ? "Visible à tous" : "Visibilité restreinte"}</small></div><Link href={`/circle/profiles/${encodeURIComponent(profile.id)}`}>Ouvrir</Link><Link className="profile-debate-action" href={`/debates/new?profileId=${encodeURIComponent(profile.id)}`}>+ Débat</Link></article>)}</div>
    </section>

    <section className="account-profiles-section">
      <div className="account-section-heading"><div><p className="eyebrow">Groupes et identités communes</p><h2>Méta-profils</h2></div><Link href="/circle/meta-profiles">Tous les méta-profils →</Link></div>
      <div className="account-profile-list">{profiles.filter((profile) => profile.kind === "meta").map((profile) => <article className="account-profile-row" key={profile.id}><span className="social-avatar">{profile.avatar}</span><div><strong>{profile.name}</strong><small>{profile.category} (Méta-profil) · {profile.includesLabel ?? profile.members?.map((id) => profiles.find((member) => member.id === id)?.name).filter(Boolean).join(", ")}</small></div><Link href={`/circle/profiles/${encodeURIComponent(profile.id)}`}>Ouvrir</Link><Link className="profile-debate-action" href={`/debates/new?profileId=${encodeURIComponent(profile.id)}`}>+ Débat</Link></article>)}</div>
    </section>

    <section className="account-debates-section">
      <div className="account-section-heading"><div><p className="eyebrow">Une option parmi les activités du profil</p><h2>Débats liés aux profils</h2></div></div>
      {linkedDebates.length ? <div className="account-debate-list">{linkedDebates.map((debate) => <Link key={debate.id} href={`/debates/${encodeURIComponent(debate.id)}`}><span>⚖️</span><span><strong>{debate.title}</strong><small>{profiles.find((profile) => profile.id === debate.authorProfileId)?.name ?? "Profil"}</small></span><span>→</span></Link>)}</div> : <p className="account-empty">Aucun débat de profil pour le moment. Choisis un profil ci-dessus pour en lancer un.</p>}
      <p className="account-small-note">Le fil contient {posts.length} publications. Les cercles et publications restent accessibles depuis vos choix.</p>
    </section>
  </main>;
}
