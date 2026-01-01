# Supabase Schema

## Table: candidates
- `id` (uuid) – primary key, default `gen_random_uuid()`.
- `name` (text) – resident's full name.
- `nik` (text) – identity number.
- `tanggal_lahir` (date) – birth date for calculating age.
- `status_perkawinan` (text) – one of `Belum Kawin`, `Kawin`, `Janda/Duda`.
- `gender` (text) – one of `Laki-laki`, `Perempuan`.
- `status_pekerjaan` (text) – one of `Bekerja`, `Tidak Bekerja`, `Pelajar/Mahasiswa`, `Belum Bekerja`.
- `blok` (text) – block label limited to `K`-`P`.
- `role` (text) – `RT` or `RW`.
- `visi` (text) – candidate Vision statement.
- `misi` (text) – candidate Mission statement.
- `created_at` (timestamp) – default `now()`.
- `is_registering_for_someone_else` (boolean) – whether the nomination is submitted on someone else's behalf; defaults to `false`.

## Table: sarans
- `id` (uuid) – primary key, default `gen_random_uuid()`.
- `author_name` (text) – optional person name (could be `Anon`).
- `content` (text) – resident feedback.
- `created_at` (timestamp) – default `now()`.

## Notes
- Allow public RLS policies that permit authenticated anonymous client inserts/selects on both tables while preventing updates or deletes except from the trusted service role (or replicate logic client-side).
