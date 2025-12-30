-- Enable RLS (usually enabled by default on Supabase)
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sarans ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean up old policies to avoid duplicates when re-running
DROP POLICY IF EXISTS "Allow anon read candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow anon insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow anon read sarans" ON public.sarans;
DROP POLICY IF EXISTS "Allow anon insert sarans" ON public.sarans;
DROP POLICY IF EXISTS "Allow anon read rukun regensi uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload rukun regensi uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read rukun regensi uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload rukun regensi uploads" ON storage.objects;

-- Allow anon (public key) to read and insert candidates
CREATE POLICY "Allow anon read candidates" ON public.candidates
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert candidates" ON public.candidates
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anon (public key) to read and insert sarans
CREATE POLICY "Allow anon read sarans" ON public.sarans
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert sarans" ON public.sarans
  FOR INSERT TO anon WITH CHECK (true);

-- Make sure storage bucket exists and is public (adjust bucket id if different)
UPDATE storage.buckets SET public = true WHERE id = 'rukun-regensi-uploads';

-- Allow anon and authenticated read/upload to the bucket
CREATE POLICY "Allow anon read rukun regensi uploads" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'rukun-regensi-uploads');

CREATE POLICY "Allow anon upload rukun regensi uploads" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'rukun-regensi-uploads' AND auth.role() = 'anon');

CREATE POLICY "Allow authenticated read rukun regensi uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'rukun-regensi-uploads');

CREATE POLICY "Allow authenticated upload rukun regensi uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rukun-regensi-uploads' AND auth.role() = 'authenticated');
