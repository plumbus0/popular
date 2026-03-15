-- ============================================================
-- POPULAR — Registration Details Patch
-- Adds attendee form data columns to event_registrations
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.event_registrations 
  ADD COLUMN IF NOT EXISTS attendee_name     TEXT,
  ADD COLUMN IF NOT EXISTS student_id        TEXT,
  ADD COLUMN IF NOT EXISTS attendee_email    TEXT,
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS dietary           TEXT;
