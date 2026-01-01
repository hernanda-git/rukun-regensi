ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS nomor_whatsapp text,
  ADD COLUMN IF NOT EXISTS foto_profil_url text,
  ADD COLUMN IF NOT EXISTS ktp_url text,
  ADD COLUMN IF NOT EXISTS riwayat_organisasi text;

ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_status_pekerjaan_check;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_status_pekerjaan_check CHECK (
    status_pekerjaan IN (
      'Pelajar/Mahasiswa',
      'Wira Usaha',
      'Wira Swasta',
      'Ibu Rumah Tangga',
      'PNS',
      'Bapak Rumah Tangga',
      'Tidak Bekerja',
      'Belum Bekerja',
      'Lainnya'
    )
  );

ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_nomor_whatsapp_digits;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_nomor_whatsapp_digits CHECK (
    nomor_whatsapp IS NULL OR nomor_whatsapp ~ '^[0-9]+$'
  ); 
