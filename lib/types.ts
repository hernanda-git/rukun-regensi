export const BLOK_OPTIONS = ["K", "L", "M", "N", "O", "P"] as const;
export type BlokOption = (typeof BLOK_OPTIONS)[number];

export const ROLE_OPTIONS = ["RT", "RW"] as const;
export type RoleOption = (typeof ROLE_OPTIONS)[number];

export const GENDER_OPTIONS = ["Laki-laki", "Perempuan"] as const;
export type GenderOption = (typeof GENDER_OPTIONS)[number];

export const MARITAL_STATUS_OPTIONS = [
  "Belum Kawin",
  "Kawin",
  "Janda/Duda",
] as const;
export type MaritalStatusOption = (typeof MARITAL_STATUS_OPTIONS)[number];

export const JOB_STATUS_OPTIONS = [
  "Bekerja",
  "Tidak Bekerja",
  "Pelajar/Mahasiswa",
  "Belum Bekerja",
] as const;
export type JobStatusOption = (typeof JOB_STATUS_OPTIONS)[number];

export interface Candidate {
  id: string;
  name: string;
  nik: string;
  tanggal_lahir: string;
  status_perkawinan: MaritalStatusOption;
  gender: GenderOption;
  blok: BlokOption;
  role: RoleOption;
  status_pekerjaan: JobStatusOption;
  visi: string;
  misi: string;
  created_at: string | null;
}

export interface CandidateFormValues {
  id?: string;
  name: string;
  nik: string;
  tanggal_lahir: string;
  status_perkawinan: MaritalStatusOption;
  gender: GenderOption;
  blok: BlokOption;
  role: RoleOption;
  status_pekerjaan: JobStatusOption;
  visi: string;
  misi: string;
}

export interface Saran {
  id: string;
  author_name: string;
  content: string;
  created_at: string | null;
}

export interface SaranFormValues {
  author_name: string;
  content: string;
}

export const calculateAge = (bornAt: string) => {
  const birthDate = new Date(bornAt);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
};
