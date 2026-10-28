# Réflexions

Site de débats construit avec Next.js App Router, React, TypeScript et Neon Postgres.

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000. Sans `DATABASE_URL`, l'application lit les débats depuis `debates.json` et stocke les créations/réponses en mémoire pour la durée du processus.

## Activer la base Vercel

1. Dans le projet Vercel, ouvrir **Storage** et créer ou connecter une base Postgres Neon.
2. Ajouter la variable `DATABASE_URL` (URL pooled) aux variables d'environnement du projet. En local, la placer dans `.env.local`.
3. Redéployer ou redémarrer le serveur. Au premier accès, l'application crée les tables `debates` et `debate_comments` et importe le fixture JSON si la table des débats est vide.

Le schéma SQL lisible est également disponible dans `database/schema.sql`. Les tables sont `debates`, `debate_comments` et `debate_reports`. Les routes API sont `GET/POST /api/debates`, `GET /api/debates/:id`, `POST /api/debates/:id/comments` et `POST /api/debates/:id/reports`.

Dans un fil, chaque paragraphe est un argument indépendant : un clic ouvre sa réponse, chaque ligne peut être signalée, et les sous-réponses se replient avec le titre du message. Les actions de ligne apparaissent au survol sur desktop et restent visibles sur écran tactile. Les dix motifs de signalement et leurs smileys correspondent à l'ancien menu : 🚫 Interdit, 💨 Hors sujet, 🤣 Humour, 🔀 Déviation, 🔄🤯 Mauvais raisonnement, ❓ Invérifiable, ☢️ Manipulation, 🔞 Sexuel, ⚠️ Choquant et ❌ Agressif. Le formulaire de réponse contient également les cinq auto-évaluations historiques.

Les retours à la ligne dans une contribution deviennent des arguments séparés. Les métadonnées Starter, Theme, Mode, Confidence et Icon sont affichées au début du post, avant ses arguments. Les commandes historiques de filtrage sont visibles ; celles qui ne sont pas encore implémentées annoncent leur disponibilité future. La vue Classic est active et Graph est affichée comme bientôt disponible.

Sans base configurée, les fichiers JSON ne sont jamais modifiés et les changements en mémoire ne sont pas durables.