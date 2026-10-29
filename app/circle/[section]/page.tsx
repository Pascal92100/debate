import Link from "next/link";
import { notFound } from "next/navigation";

const sections: Record<string, { title: string; icon: string; description: string }> = {
  searches: { title: "Recherches enregistrées", icon: "🔍", description: "Le prototype inclut des critères de thèmes, types de publication, distance, langues et visibilité. La recherche complète reste à implémenter." },
  alerts: { title: "Alertes", icon: "🔔", description: "Les alertes de visites, réponses et mentions sont prévues dans le modèle de données ; leur centre n’est pas encore implémenté." },
  children: { title: "Comptes enfants supervisés", icon: "👨‍👩‍👧", description: "Le prototype prévoit de créer ou relier des comptes supervisés. La gestion des responsables et autorisations reste à implémenter." },
  security: { title: "Sécurité", icon: "🔐", description: "La gestion du mot de passe, des sessions et des paramètres de sécurité dépendra du système d’authentification, qui reste à connecter." },
  payment: { title: "Moyen de paiement", icon: "💳", description: "Aucun paiement n’est activé. Les moyens de paiement devront être raccordés à un prestataire et ne seront jamais stockés en clair dans cette base." },
  subscription: { title: "Abonnement", icon: "📦", description: "Les offres et renouvellements sont prévus dans le prototype, mais aucun système d’abonnement n’est connecté." },
  communities: { title: "Communautés", icon: "👥", description: "Les cercles privés sont actifs. Les communautés ouvertes avec découverte et adhésion restent à construire." },
  forums: { title: "Forums", icon: "💬", description: "Les débats constituent le premier type de discussion structuré. Les forums thématiques restent à raccorder." },
  "private-discussions": { title: "Discussions privées", icon: "📨", description: "Le schéma prévoit les conversations privées, mais la messagerie et ses contrôles d’accès ne sont pas encore implémentés." },
  events: { title: "Événements", icon: "📅", description: "Le schéma prévoit événements, invitations et réponses. La création et la gestion des événements restent à implémenter." },
  following: { title: "Profils suivis", icon: "⭐", description: "Le prototype prévoit de suivre des profils. La gestion des abonnements et le fil personnalisé restent à implémenter." },
  shop: { title: "Boutique", icon: "🛒", description: "Aucun service de boutique n’est actif pour le moment." }
};

export default async function CircleAccountSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = sections[section];
  if (!item) notFound();
  return <main className="social-shell social-directory-shell"><Link className="back-link" href="/circle">← Compte</Link><section className="account-placeholder"><span>{item.icon}</span><p className="eyebrow">Compte · prochain module</p><h1>{item.title}</h1><p>{item.description}</p></section></main>;
}
