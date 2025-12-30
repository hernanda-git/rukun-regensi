CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nik text NOT NULL,
  tanggal_lahir date NOT NULL,
  status_perkawinan text NOT NULL CHECK (
    status_perkawinan IN ('Belum Kawin', 'Kawin', 'Janda/Duda')
  ),
  gender text NOT NULL CHECK (
    gender IN ('Laki-laki', 'Perempuan')
  ),
  blok text NOT NULL CHECK (
    blok IN ('K', 'L', 'M', 'N', 'O', 'P')
  ),
  role text NOT NULL CHECK (
    role IN ('RT', 'RW')
  ),
  status_pekerjaan text NOT NULL CHECK (
    status_pekerjaan IN ('Bekerja', 'Tidak Bekerja', 'Pelajar/Mahasiswa', 'Belum Bekerja')
  ),
  visi text NOT NULL,
  misi text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sarans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL DEFAULT 'Warga',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
