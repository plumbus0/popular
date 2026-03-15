-- ============================================================
-- POPULAR — Column Migration Patch
-- Run this in Supabase SQL Editor if you get "column not found"
-- errors. Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================

-- societies: add any missing columns
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS cover_url      TEXT;
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS logo_url       TEXT;
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS description    TEXT;
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS type           TEXT CHECK (type IN ('Academic', 'Cultural', 'Hobbies', 'Sports', 'Professional'));
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS university     TEXT DEFAULT 'UNSW';
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS founded_year   INTEGER;
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS size           INTEGER DEFAULT 0;
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS instagram      TEXT;
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS facebook       TEXT;
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS linkedin       TEXT;
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS youtube        TEXT;

-- events: add any missing columns
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cover_url             TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description           TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS start_time            TIME;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time              TIME;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location              TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS arc_member_price      NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS non_arc_member_price  NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS capacity              INTEGER;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registered_count      INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ticket_sale_ends      TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category              TEXT CHECK (category IN ('Food','Camp','Academic','Gaming','Workshop','Cultural Exchange','Social','Sports'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_featured           BOOLEAN DEFAULT false;

-- profiles: add any missing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name              TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url             TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university             TEXT DEFAULT 'UNSW';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS degree                 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stage                  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday               DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender                 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_key               TEXT UNIQUE DEFAULT upper(encode(gen_random_bytes(8), 'hex'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role                   TEXT DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_events_to_friends BOOLEAN DEFAULT true;

-- team_members: add any missing columns
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#888888';

-- friendships table (create if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.friendships (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Recreate friendships policies (drop first to avoid duplicates)
DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;
DROP POLICY IF EXISTS "friendships_update" ON public.friendships;
DROP POLICY IF EXISTS "friendships_delete" ON public.friendships;

CREATE POLICY "friendships_select" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "friendships_insert" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "friendships_update" ON public.friendships FOR UPDATE USING (auth.uid() = addressee_id);
CREATE POLICY "friendships_delete" ON public.friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Ensure RLS + write policies exist on societies and events
-- (these are safe to re-run — DROP IF EXISTS first)
DROP POLICY IF EXISTS "societies_insert" ON public.societies;
DROP POLICY IF EXISTS "societies_update" ON public.societies;
DROP POLICY IF EXISTS "societies_delete" ON public.societies;
DROP POLICY IF EXISTS "events_insert"    ON public.events;
DROP POLICY IF EXISTS "events_update"    ON public.events;
DROP POLICY IF EXISTS "events_delete"    ON public.events;

CREATE POLICY "societies_insert" ON public.societies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "societies_update" ON public.societies FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "societies_delete" ON public.societies FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "events_delete" ON public.events FOR DELETE USING (auth.uid() IS NOT NULL);
