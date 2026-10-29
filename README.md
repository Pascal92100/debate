# Réflexions

Site de réseau social et de débats construit avec Next.js App Router, React, TypeScript et Neon Postgres.

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000. Sans `DATABASE_URL`, le réseau et les débats utilisent leurs fixtures JSON et conservent les créations/réactions en mémoire pour la durée du processus.

## Activer la base Vercel

1. Dans le projet Vercel, ouvrir **Storage** et créer ou connecter une base Postgres Neon.
2. Ajouter la variable `DATABASE_URL` (URL pooled) aux variables d'environnement du projet. En local, la placer dans `.env.local`.
3. Exécuter `database/schema.sql` une fois dans l'éditeur SQL Neon pour créer le schéma complet réseau + débats.
4. Redéployer ou redémarrer le serveur. L'application crée au besoin les tables de base utilisées par le fil et importe les fixtures de démo à leur premier accès.

Le schéma unifié de [database/schema.sql](database/schema.sql) couvre les comptes, profils individuels et méta-profils, préférences et descriptions thématiques, cercles et membres, publications et médias, réactions, commentaires sociaux, débats et réponses, signalements, recherches enregistrées, conversations privées, événements, alertes et rétributions. Le schéma conserve le payload JSON des débats existants tout en ajoutant les clés relationnelles vers le profil, le cercle et la publication source.

Le réseau entre par `/circle`, qui affiche le compte et ses choix comme dans le prototype. Le fil reste disponible sur `/social`, avec les pages `/social/circles` et `/circle/profiles`. Le prototype Feed/Wall, les cercles, profils individuels/méta-profils, le sélecteur de profil auteur, la visibilité et les réactions sont repris dans ce parcours. Les routes incluent `GET/POST /api/social/posts`, `POST /api/social/posts/:id/debate`, `POST /api/social/posts/:id/reactions`, `GET/POST /api/social/circles` et `GET/POST /api/social/profiles`, ainsi que les routes de débats `GET/POST /api/debates`, `GET /api/debates/:id`, `POST /api/debates/:id/comments` et `POST /api/debates/:id/reports`. Un post de type débat crée un débat lié ; une publication normale peut aussi être transformée en débat depuis le fil.

Dans un fil, chaque paragraphe est un argument indépendant : un clic ouvre sa réponse, chaque ligne peut être signalée, et les sous-réponses se replient avec le titre du message. Les actions de ligne apparaissent au survol sur desktop et restent visibles sur écran tactile. Les dix motifs de signalement et leurs smileys correspondent à l'ancien menu : 🚫 Interdit, 💨 Hors sujet, 🤣 Humour, 🔀 Déviation, 🔄🤯 Mauvais raisonnement, ❓ Invérifiable, ☢️ Manipulation, 🔞 Sexuel, ⚠️ Choquant et ❌ Agressif. Le formulaire de réponse contient également les cinq auto-évaluations historiques.

Les retours à la ligne dans une contribution deviennent des arguments séparés. Les métadonnées Starter, Theme, Mode, Confidence et Icon sont affichées au début du post, avant ses arguments. Les commandes historiques de filtrage sont visibles ; celles qui ne sont pas encore implémentées annoncent leur disponibilité future. La vue Classic est active et Graph est affichée comme bientôt disponible.

Le prototype Circle est une maquette HTML statique : les anciens liens WordPress, exemples de médias, écrans de messagerie, recherche avancée et certaines préférences n'étaient pas reliés à un backend. Le premier parcours intégré rend le fil texte, les cercles, profils de démonstration, réactions et création de débats effectivement navigables. Les tables des autres modules sont prévues dans le schéma unifié pour leur raccordement progressif.

Sans base configurée, les fichiers JSON ne sont jamais modifiés et les changements en mémoire ne sont pas durables. Le compte/profil affiché est un profil de démonstration ; l'authentification réelle et les permissions multi-utilisateurs restent à connecter.