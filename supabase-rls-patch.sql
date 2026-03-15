-- ============================================================
-- POPULAR — Migration patch (run if tables already exist)
-- Adds friendships table + show_events_to_friends column
-- ============================================================

-- Add new column to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_events_to_friends BOOLEAN DEFAULT true;

-- Create friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Drop old policies first
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname='public'
LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename); END LOOP; END $$;

-- Recreate all policies
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT  USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE  USING (auth.uid() = id);
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE  USING (auth.uid() = id);

CREATE POLICY "societies_select" ON public.societies FOR SELECT  USING (true);
CREATE POLICY "societies_insert" ON public.societies FOR INSERT  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "societies_update" ON public.societies FOR UPDATE  USING (auth.uid() IS NOT NULL);
CREATE POLICY "societies_delete" ON public.societies FOR DELETE  USING (auth.uid() IS NOT NULL);

CREATE POLICY "events_select" ON public.events FOR SELECT  USING (true);
CREATE POLICY "events_insert" ON public.events FOR INSERT  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "events_update" ON public.events FOR UPDATE  USING (auth.uid() IS NOT NULL);
CREATE POLICY "events_delete" ON public.events FOR DELETE  USING (auth.uid() IS NOT NULL);

CREATE POLICY "memberships_select" ON public.society_memberships FOR SELECT USING (true);
CREATE POLICY "memberships_insert" ON public.society_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "memberships_delete" ON public.society_memberships FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "registrations_select" ON public.event_registrations FOR SELECT USING (true);
CREATE POLICY "registrations_insert" ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "registrations_delete" ON public.event_registrations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "team_select" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "team_all"    ON public.team_members FOR ALL    USING (auth.uid() IS NOT NULL);

CREATE POLICY "friendships_select" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "friendships_insert" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "friendships_update" ON public.friendships FOR UPDATE USING (auth.uid() = addressee_id);
CREATE POLICY "friendships_delete" ON public.friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
