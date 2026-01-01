ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS is_registering_for_someone_else boolean NOT NULL DEFAULT false;


