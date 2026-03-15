-- ============================================================
-- POPULAR — Complete Database Setup v2
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Profiles ──
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL DEFAULT '',
  full_name     TEXT,
  avatar_url    TEXT,
  university    TEXT DEFAULT 'UNSW',
  degree        TEXT,
  stage         TEXT,
  birthday      DATE,
  gender        TEXT,
  user_key      TEXT UNIQUE DEFAULT upper(encode(gen_random_bytes(8), 'hex')),
  role          TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin', 'society_admin')),
  show_events_to_friends BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Societies ──
CREATE TABLE IF NOT EXISTS public.societies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  short_name    TEXT NOT NULL,
  description   TEXT,
  type          TEXT CHECK (type IN ('Academic', 'Cultural', 'Hobbies', 'Sports', 'Professional')),
  university    TEXT DEFAULT 'UNSW',
  founded_year  INTEGER,
  size          INTEGER DEFAULT 0,
  logo_url      TEXT,
  cover_url     TEXT,
  instagram     TEXT,
  facebook      TEXT,
  linkedin      TEXT,
  youtube       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Events ──
CREATE TABLE IF NOT EXISTS public.events (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id            UUID REFERENCES public.societies(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  cover_url             TEXT,
  date                  DATE NOT NULL,
  start_time            TIME,
  end_time              TIME,
  location              TEXT,
  arc_member_price      NUMERIC(10,2) DEFAULT 0,
  non_arc_member_price  NUMERIC(10,2) DEFAULT 0,
  capacity              INTEGER,
  registered_count      INTEGER DEFAULT 0,
  ticket_sale_ends      TIMESTAMPTZ,
  category              TEXT CHECK (category IN ('Food','Camp','Academic','Gaming','Workshop','Cultural Exchange','Social','Sports')),
  is_featured           BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── Society Memberships ──
CREATE TABLE IF NOT EXISTS public.society_memberships (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  society_id  UUID REFERENCES public.societies(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, society_id)
);

-- ── Event Registrations ──
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id     UUID REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type  TEXT DEFAULT 'non_arc' CHECK (ticket_type IN ('arc','non_arc')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, event_id)
);

-- ── Team Members (society management) ──
CREATE TABLE IF NOT EXISTS public.team_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id    UUID REFERENCES public.societies(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL,
  avatar_color  TEXT DEFAULT '#888888',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Friends ──
CREATE TABLE IF NOT EXISTS public.friendships (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.societies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships         ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT  USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE  USING (auth.uid() = id);
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE  USING (auth.uid() = id);

-- societies
CREATE POLICY "societies_select" ON public.societies FOR SELECT  USING (true);
CREATE POLICY "societies_insert" ON public.societies FOR INSERT  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "societies_update" ON public.societies FOR UPDATE  USING (auth.uid() IS NOT NULL);
CREATE POLICY "societies_delete" ON public.societies FOR DELETE  USING (auth.uid() IS NOT NULL);

-- events
CREATE POLICY "events_select" ON public.events FOR SELECT  USING (true);
CREATE POLICY "events_insert" ON public.events FOR INSERT  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "events_update" ON public.events FOR UPDATE  USING (auth.uid() IS NOT NULL);
CREATE POLICY "events_delete" ON public.events FOR DELETE  USING (auth.uid() IS NOT NULL);

-- memberships
CREATE POLICY "memberships_select" ON public.society_memberships FOR SELECT USING (true);
CREATE POLICY "memberships_insert" ON public.society_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "memberships_delete" ON public.society_memberships FOR DELETE USING (auth.uid() = user_id);

-- event registrations
CREATE POLICY "registrations_select" ON public.event_registrations FOR SELECT USING (true);
CREATE POLICY "registrations_insert" ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "registrations_delete" ON public.event_registrations FOR DELETE USING (auth.uid() = user_id);

-- team members
CREATE POLICY "team_select" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "team_all"    ON public.team_members FOR ALL    USING (auth.uid() IS NOT NULL);

-- friendships
CREATE POLICY "friendships_select" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "friendships_insert" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "friendships_update" ON public.friendships FOR UPDATE USING (auth.uid() = addressee_id);
CREATE POLICY "friendships_delete" ON public.friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ============================================================
-- TRIGGER — auto-create profile on sign up
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.email,''), COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
