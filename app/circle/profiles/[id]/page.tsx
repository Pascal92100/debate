import Link from "next/link";
import { notFound } from "next/navigation";
import { isPersistentStore, listDebates } from "@/lib/debates";
import { listProfiles, listSocialPosts } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function CircleProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profiles, debates, posts, persistent] = await Promise.all([listProfiles(), listDebates(), listSocialPosts(), isPersistentStore()]);
  const profile = profiles.find((item) => item.id === id);
  if (!profile) notFound();
  const profileDebates = debates.filter((debate) => debate.authorProfileId === profile.id);
  const profilePosts = posts.filter((post) => post.profileId === profile.id);

  return <main className="social-shell social-directory-shell">
    <div className="social-page-heading"><div><p className="eyebrow">Compte · profil</p><h1>{profile.name}</h1></div><Link className="back-link" href="/circle">← Compte</Link></div>
    {!persistent && <p className="notice social-notice">Les contributions de ce profil sont temporaires sans DATABASE_URL.</p>}
    <section className="profile-detail-header"><span className="social-avatar social-avatar-large">{profile.avatar}</span><div><h2>{profile.name}</h2><p>{profile.kind === "individual" ? "Profil individuel" : `${profile.category} (Méta-profil)`}</p><p>{profile.bio}</p></div><div className="profile-detail-actions"><Link className="button-secondary" href={`/circle/profiles/${encodeURIComponent(profile.id)}/descriptions`}>Descriptions</Link><Link className="button-secondary" href={`/social?profileId=${encodeURIComponent(profile.id)}`}>Voir son fil</Link><Link className="button-primary" href={`/debates/new?profileId=${encodeURIComponent(profile.id)}`}>+ Lancer un débat sous ce profil</Link></div></section>
    {profile.members?.length ? <section className="profile-members"><div className="account-section-heading"><div><p className="eyebrow">Méta-profil</p><h2>{profile.category === "Family" ? "Family Members" : "Members"}</h2></div><span>{profile.members.length}</span></div><div className="account-profile-list">{profile.members.map((memberId) => { const member = profiles.find((item) => item.id === memberId); return member ? <Link className="account-profile-row" href={`/circle/profiles/${encodeURIComponent(member.id)}`} key={member.id}><span className="social-avatar">{member.avatar}</span><span><strong>{member.name}</strong><small>{member.category}</small></span><span className="profile-member-role">{profile.memberRoles?.[member.id] ?? member.category}</span></Link> : null; })}</div></section> : null}
    <div className="profile-activity-grid">
      <section><div className="account-section-heading"><div><p className="eyebrow">Activité sociale</p><h2>Publications</h2></div><span>{profilePosts.length}</span></div>{profilePosts.length ? profilePosts.map((post) => <article className="profile-activity-item" key={post.id}><strong>{post.title}</strong><p>{post.body}</p>{post.debateId && <Link href={`/debates/${encodeURIComponent(post.debateId)}`}>Ouvrir le débat lié →</Link>}</article>) : <p className="account-empty">Aucune publication pour ce profil.</p>}</section>
      <section><div className="account-section-heading"><div><p className="eyebrow">Discussions</p><h2>Débats</h2></div><span>{profileDebates.length}</span></div>{profileDebates.length ? profileDebates.map((debate) => <Link className="profile-activity-item profile-debate-item" key={debate.id} href={`/debates/${encodeURIComponent(debate.id)}`}><strong>{debate.title}</strong><small>{debate.content[0]}</small></Link>) : <p className="account-empty">Aucun débat lancé depuis ce profil.</p>}</section>
    </div>
  </main>;
}
