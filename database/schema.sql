-- Unified PostgreSQL schema for the Circle account, Circles social network, and debates.
-- Safe to apply more than once. Runtime currently provisions the MVP tables too;
-- this file is the complete deployment schema for the full social feature set.

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT NOT NULL,
  auth_subject TEXT UNIQUE,
  password_hash TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  nationalities JSONB NOT NULL DEFAULT '[]'::jsonb,
  birthdate DATE,
  address TEXT,
  phone TEXT,
  description_text TEXT NOT NULL DEFAULT '',
  description_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS auth_subject TEXT UNIQUE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS nationalities JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS description_text TEXT NOT NULL DEFAULT '';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS description_payload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS accounts_single_primary_idx ON accounts(is_primary) WHERE is_primary;
COMMENT ON COLUMN accounts.description_payload IS 'Private reusable account description library. Profile information is only copied from this library by an explicit user action.';

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'individual',
  category TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'all',
  social_distance INTEGER NOT NULL DEFAULT 0 CHECK (social_distance >= 0),
  anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS profiles_account_id_idx ON profiles(account_id);
CREATE INDEX IF NOT EXISTS profiles_visibility_idx ON profiles(visibility, social_distance);

CREATE TABLE IF NOT EXISTS meta_profile_members (
  meta_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (meta_profile_id, member_profile_id),
  CHECK (meta_profile_id <> member_profile_id)
);
CREATE INDEX IF NOT EXISTS meta_profile_members_member_idx ON meta_profile_members(member_profile_id);

CREATE TABLE IF NOT EXISTS profile_descriptions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  visibility TEXT NOT NULL DEFAULT 'all',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, theme, audience)
);
ALTER TABLE profile_descriptions ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS profile_descriptions_profile_idx ON profile_descriptions(profile_id, enabled, sort_order);
COMMENT ON COLUMN profile_descriptions.payload IS 'Complete profile description document, including identity/theme field states and activation durations/expiry timestamps.';

CREATE TABLE IF NOT EXISTS profile_preferences (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  anonymous_navigation BOOLEAN NOT NULL DEFAULT FALSE,
  content_filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  language_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
  location_label TEXT,
  dynamic_location_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  dynamic_location_circle_id TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS circles (
  id TEXT PRIMARY KEY,
  owner_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'general',
  location_mode TEXT NOT NULL DEFAULT 'Online',
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'private',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE circles ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE circles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS circles_owner_profile_idx ON circles(owner_profile_id);
CREATE INDEX IF NOT EXISTS circles_visibility_idx ON circles(visibility, kind);

CREATE TABLE IF NOT EXISTS circle_members (
  circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (circle_id, profile_id)
);
CREATE INDEX IF NOT EXISTS circle_members_profile_idx ON circle_members(profile_id, status);

CREATE TABLE IF NOT EXISTS profile_follows (
  follower_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_profile_id, followed_profile_id),
  CHECK (follower_profile_id <> followed_profile_id)
);

CREATE TABLE IF NOT EXISTS profile_spaces (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('communities', 'groups', 'forums')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS profile_spaces_owner_idx ON profile_spaces(profile_id, kind, created_at DESC);

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL,
  debate_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  subtext TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'publication',
  visibility TEXT NOT NULL DEFAULT 'circle',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS social_posts_feed_idx ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS social_posts_circle_feed_idx ON social_posts(circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_posts_profile_feed_idx ON social_posts(profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS social_post_media (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'reel', 'file')),
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS social_post_media_post_idx ON social_post_media(post_id, sort_order);

CREATE TABLE IF NOT EXISTS social_post_reactions (
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, profile_id)
);
CREATE INDEX IF NOT EXISTS social_post_reactions_post_idx ON social_post_reactions(post_id, reaction);

CREATE TABLE IF NOT EXISTS social_post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  parent_comment_id TEXT REFERENCES social_post_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE social_post_comments ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS social_post_comments_thread_idx ON social_post_comments(post_id, created_at);

-- Keep the existing debate payload format while adding normalized relationships
-- to accounts/profiles, circles, and the originating social publication.
CREATE TABLE IF NOT EXISTS debates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL,
  source_post_id TEXT UNIQUE REFERENCES social_posts(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'public',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE debates ADD COLUMN IF NOT EXISTS author_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE debates ADD COLUMN IF NOT EXISTS circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL;
ALTER TABLE debates ADD COLUMN IF NOT EXISTS source_post_id TEXT;
ALTER TABLE debates ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
CREATE INDEX IF NOT EXISTS debates_author_profile_idx ON debates(author_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS debates_circle_idx ON debates(circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS debates_source_post_idx ON debates(source_post_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_posts_debate_id_fkey') THEN
    ALTER TABLE social_posts ADD CONSTRAINT social_posts_debate_id_fkey FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS debate_comments (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  reply_to TEXT NOT NULL,
  author_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE debate_comments ADD COLUMN IF NOT EXISTS author_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS debate_comments_debate_id_idx ON debate_comments(debate_id, created_at);
CREATE INDEX IF NOT EXISTS debate_comments_reply_to_idx ON debate_comments(debate_id, reply_to);

CREATE TABLE IF NOT EXISTS debate_reports (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  reporter_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE debate_reports ADD COLUMN IF NOT EXISTS reporter_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS debate_reports_debate_id_idx ON debate_reports(debate_id, created_at);

CREATE TABLE IF NOT EXISTS simple_discussions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE simple_discussions ADD COLUMN IF NOT EXISTS circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS simple_discussions_profile_idx ON simple_discussions(profile_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS simple_discussion_messages (
  id TEXT PRIMARY KEY,
  discussion_id TEXT NOT NULL REFERENCES simple_discussions(id) ON DELETE CASCADE,
  author_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reply_to_id TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS simple_discussion_messages_thread_idx ON simple_discussion_messages(discussion_id, created_at, id);

CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS saved_searches_profile_idx ON saved_searches(profile_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS private_conversations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'direct',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS private_conversation_members (
  conversation_id TEXT NOT NULL REFERENCES private_conversations(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, profile_id)
);
CREATE TABLE IF NOT EXISTS private_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES private_conversations(id) ON DELETE CASCADE,
  sender_profile_id TEXT NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS private_messages_conversation_idx ON private_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS social_events (
  id TEXT PRIMARY KEY,
  created_by_profile_id TEXT NOT NULL REFERENCES profiles(id),
  circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  location JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'circle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS event_attendees (
  event_id TEXT NOT NULL REFERENCES social_events(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response TEXT NOT NULL DEFAULT 'invited',
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, profile_id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS alerts_inbox_idx ON alerts(profile_id, created_at DESC) WHERE read_at IS NULL;
COMMENT ON TABLE alerts IS 'Unread alert count for a profile is the number of rows where read_at IS NULL; the demo UI currently shows the prototype count of 7.';

CREATE TABLE IF NOT EXISTS retributions (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES social_posts(id) ON DELETE SET NULL,
  debate_id TEXT REFERENCES debates(id) ON DELETE SET NULL,
  sender_profile_id TEXT NOT NULL REFERENCES profiles(id),
  recipient_profile_id TEXT NOT NULL REFERENCES profiles(id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS retributions_recipient_idx ON retributions(recipient_profile_id, created_at DESC);
