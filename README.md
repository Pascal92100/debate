# Circles

Site de réseau social et de débats construit avec Next.js App Router, React, TypeScript et Neon Postgres.

## Démarrer en local

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without `DATABASE_URL`, the social network and debates use local JSON fixtures; changes remain in memory for the lifetime of the process.

## Activer la base Vercel

1. In Vercel, connect the project to the Neon Postgres database.
2. Set `DATABASE_URL` to the pooled connection string in Vercel Environment Variables. For local development, store it in `.env.local`.
3. Generate a random secret with `openssl rand -base64 48` and set it as `SESSION_SECRET` in Vercel and local `.env.local`. Never commit either secret.
4. Run (or rerun) `database/schema.sql` against the Neon database. It is idempotent and adds the account password/primary-account columns required by this release.
5. Redeploy. Neon is now read without inserting demo fixtures. If there are no accounts, `/setup` creates the first primary account only. No profile is created automatically. If the old runtime left its sole unclaimed `account-demo` fixture, setup removes that known demo account and its cascading profile/social rows first. Other account data is not automatically deleted. Subsequent visits require email/password sign-in at `/login`.

The initial account password is stored as a scrypt hash. A signed, HTTP-only, secure-in-production cookie protects application pages and APIs. Do not enable the connected database in production without a strong `SESSION_SECRET`.

Profiles are created separately from `/circle/profiles/new` or `/circle/meta-profiles/new`. Individual profile context is a fixed choice (Professional, Personal, Political, Dating); meta-profile type is Family, Couple, or Group. The account-level Descriptions page edits the account's private text and identity fields; profile descriptions are edited separately from each profile.

The unified schema in [database/schema.sql](database/schema.sql) covers accounts, individual and meta-profiles, profile preferences and descriptions, Circles and memberships, posts, reactions, comments, debates, reports, saved searches, private conversations, events, alerts, and retributions. Debate payloads retain their existing JSON format and include relational links to their author profile, Circle, and source post.

When `DATABASE_URL` is configured, the app reads and writes Neon data and does not import JSON fixtures. If the database is empty, `/setup` creates the first primary account but no profile. The first account is the only account-creation flow currently available; additional accounts, email verification, password reset, and account recovery still need implementation. `/login` authenticates the primary account, and `/circle` shows its account details. Pages and APIs require the signed HTTP-only session cookie.

Local development without `DATABASE_URL` remains in demo mode and uses `social.json` and `debates.json`; writes are in-memory only. A configured database connection failure is reported rather than silently switching to fake data.

Social routes include `GET/POST /api/social/posts`, `POST /api/social/posts/:id/debate`, `POST /api/social/posts/:id/reactions`, `GET/POST /api/social/circles`, and `GET/POST /api/social/profiles`. Debate routes include `GET/POST /api/debates`, `GET /api/debates/:id`, `POST /api/debates/:id/comments`, and `POST /api/debates/:id/reports`. Creating a debate from a post stores the relationship in both directions. Each paragraph in a debate argument is independently replyable and reportable; Classic is available and Graph remains a placeholder.

The original Circle prototype includes additional modules such as communities, forums, private messages, advanced search, and payments. Their database tables are present where applicable, but those features are not all implemented in the application yet.