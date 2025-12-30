"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  BLOK_OPTIONS,
  Candidate,
  CandidateFormValues,
  GENDER_OPTIONS,
  JOB_STATUS_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  ROLE_OPTIONS,
  Saran,
  SaranFormValues,
  calculateAge,
} from "@/lib/types";

const STORAGE_BUCKET = "rukun-regensi-uploads";

const initialCandidateForm: CandidateFormValues = {
  name: "",
  nik: "",
  nomor_whatsapp: "",
  tanggal_lahir: new Date().toISOString().split("T")[0],
  status_perkawinan: MARITAL_STATUS_OPTIONS[0],
  gender: GENDER_OPTIONS[0],
  blok: BLOK_OPTIONS[0],
  role: ROLE_OPTIONS[0],
  status_pekerjaan: JOB_STATUS_OPTIONS[0],
  visi: "",
  misi: "",
  foto_profil_url: "",
  ktp_url: "",
  riwayat_organisasi: "",
};

const initialSaranForm: SaranFormValues = {
  author_name: "",
  content: "",
};

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sarans, setSarans] = useState<Saran[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"kandidat" | "saran">("kandidat");
  const [blokFilter, setBlokFilter] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [saranModalOpen, setSaranModalOpen] = useState(false);
  const [saranFormValues, setSaranFormValues] = useState(initialSaranForm);
  const [saranSubmitting, setSaranSubmitting] = useState(false);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [candidateFormValues, setCandidateFormValues] = useState(initialCandidateForm);
  const [candidateSubmitting, setCandidateSubmitting] = useState(false);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const uploadImageToBucket = async (file: File, folder: string) => {
    const extension = file.name.split(".").pop();
    const uniqueId =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const filePath = `${folder}/${uniqueId}.${extension ?? "jpg"}`;

    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const refreshData = async () => {
    setLoading(true);
    const [{ data: candidatesData, error: candidateError }, { data: saransData, error: saranError }] =
      await Promise.all([
        supabase.from("candidates").select("*").order("created_at", { ascending: false }),
        supabase.from("sarans").select("*").order("created_at", { ascending: false }),
      ]);

    if (candidateError) {
      console.error("Error loading candidates", candidateError);
      setCandidates([]);
    } else {
      setCandidates((candidatesData || []) as Candidate[]);
    }

    if (saranError) {
      console.error("Error loading sarans", saranError);
      setSarans([]);
    } else {
      setSarans((saransData || []) as Saran[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openCandidateModal = () => {
    setCandidateFormValues(initialCandidateForm);
    setProfileFile(null);
    setKtpFile(null);
    setCandidateModalOpen(true);
  };

  const closeCandidateModal = () => {
    setCandidateModalOpen(false);
    setCandidateFormValues(initialCandidateForm);
    setProfileFile(null);
    setKtpFile(null);
  };

  const closeCandidateDetail = () => {
    setSelectedCandidate(null);
  };

  const closeSaranModal = () => {
    setSaranModalOpen(false);
    setSaranFormValues(initialSaranForm);
  };

  const handleSaranSubmit = async () => {
    if (!saranFormValues.content.trim()) return;
    setSaranSubmitting(true);
    try {
      const { error } = await supabase.from("sarans").insert([
        {
          author_name: saranFormValues.author_name || "Warga",
          content: saranFormValues.content,
        },
      ]);
      if (error) {
        console.error("Failed to submit saran", error);
        return;
      }

      await refreshData();
      closeSaranModal();
    } finally {
      setSaranSubmitting(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const blokMatch = blokFilter ? candidate.blok === blokFilter : true;
      const genderMatch = genderFilter ? candidate.gender === genderFilter : true;
      return blokMatch && genderMatch;
    });
  }, [blokFilter, genderFilter, candidates]);

  const ageValues = candidates.map((candidate) => calculateAge(candidate.tanggal_lahir)).filter((age) => age > -1);
  const averageAge = ageValues.length
    ? Math.round(ageValues.reduce((sum, age) => sum + age, 0) / ageValues.length)
    : 0;

  const candidatesPerBlok = useMemo(() => {
    return BLOK_OPTIONS.reduce<Record<string, number>>((acc, blok) => {
      acc[blok] = candidates.filter((candidate) => candidate.blok === blok).length;
      return acc;
    }, {});
  }, [candidates]);

  const openCandidateDetail = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleSaranChange = <K extends keyof SaranFormValues>(field: K, value: SaranFormValues[K]) => {
    setSaranFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCandidateChange = <K extends keyof CandidateFormValues>(field: K, value: CandidateFormValues[K]) => {
    setCandidateFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCandidateSubmit = async () => {
    setCandidateSubmitting(true);
    try {
      const normalizedWhatsapp = candidateFormValues.nomor_whatsapp.replace(/\D/g, "");

      let fotoProfilUrl = candidateFormValues.foto_profil_url || null;
      let ktpUrl = candidateFormValues.ktp_url || null;

      if (profileFile) {
        try {
          fotoProfilUrl = await uploadImageToBucket(profileFile, "foto-profil");
        } catch (error) {
          console.error("Failed to upload foto profil", error);
          return;
        }
      }

      if (ktpFile) {
        try {
          ktpUrl = await uploadImageToBucket(ktpFile, "ktp");
        } catch (error) {
          console.error("Failed to upload KTP", error);
          return;
        }
      }

      const payload = {
        name: candidateFormValues.name,
        nik: candidateFormValues.nik,
        nomor_whatsapp: normalizedWhatsapp,
        tanggal_lahir: candidateFormValues.tanggal_lahir,
        status_perkawinan: candidateFormValues.status_perkawinan,
        gender: candidateFormValues.gender,
        blok: candidateFormValues.blok,
        role: candidateFormValues.role,
        status_pekerjaan: candidateFormValues.status_pekerjaan,
        visi: candidateFormValues.visi,
        misi: candidateFormValues.misi,
        foto_profil_url: fotoProfilUrl,
        ktp_url: ktpUrl,
        riwayat_organisasi: candidateFormValues.riwayat_organisasi,
      };

      const { error } = await supabase.from("candidates").insert([payload]);
      if (error) {
        console.error("Failed to create candidate", error);
        return;
      }

      await refreshData();
      closeCandidateModal();
    } finally {
      setCandidateSubmitting(false);
    }
  };

  const summaryCards = [
    {
      label: "Total Kandidat",
      value: candidates.length,
      helper: "Kandidat aktif yang terdaftar",
    },
    {
      label: "Umur Rata-rata",
      value: averageAge,
      postfix: " tahun",
      helper: "Dihitung dari data kandidat",
    },
  ];

  const resetFilters = () => {
    setBlokFilter("");
    setGenderFilter("");
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Rukun 03
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                Pemilihan RT/RW Perumahan Sawangan Regensi RT 03
              </h1>
              <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
                Pantau kandidat, kirim saran, dan pastikan semua warga bisa berpartisipasi real-time lewat handphone.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-3xl border border-slate-100/80 bg-white/80 p-5 shadow-sm backdrop-blur"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {card.value}
                  {card.postfix && (
                    <span className="align-middle text-base font-medium text-slate-400">{card.postfix}</span>
                  )}
                </p>
                <p className="mt-2 text-xs text-slate-500">{card.helper}</p>
              </div>
            ))}
            <div className="rounded-3xl border border-slate-100/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total per Blok</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {BLOK_OPTIONS.map((blok) => (
                  <span
                    key={blok}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500/80" />
                    {blok}: {candidatesPerBlok[blok] ?? 0}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px,1fr]">
          <section className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-100 backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Filter data</p>
                <p className="text-sm text-slate-500">Sempurnakan daftar berdasarkan blok dan gender.</p>
              </div>
              {(blokFilter || genderFilter) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blok</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={blokFilter}
                  onChange={(event) => setBlokFilter(event.target.value)}
                >
                  <option value="">Semua Blok</option>
                  {BLOK_OPTIONS.map((blok) => (
                    <option key={blok} value={blok}>
                      Blok {blok}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gender</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={genderFilter}
                  onChange={(event) => setGenderFilter(event.target.value)}
                >
                  <option value="">Semua Gender</option>
                  {GENDER_OPTIONS.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Statistik diperbarui otomatis sesuai pilihan Anda.
            </div>
          </section>

          <section className="w-full space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex w-full justify-center">
                <div className="inline-flex items-center rounded-3xl border border-slate-200 bg-slate-100 p-1 shadow-inner">
                  {["kandidat", "saran"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeTab === tab
                          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-600 hover:text-slate-800"
                      }`}
                      onClick={() => setActiveTab(tab as "kandidat" | "saran")}
                    >
                      {tab === "kandidat" ? "Kandidat RT/RW" : "Saran Warga"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex w-full justify-end">
                {activeTab === "kandidat" ? (
                  <button
                    type="button"
                    onClick={openCandidateModal}
                    className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-blue-600/90 hover:to-indigo-500/90"
                  >
                    Tambah Kandidat
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSaranModalOpen(true)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  >
                    Kirim Saran
                  </button>
                )}
              </div>
            </div>

            {activeTab === "kandidat" ? (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Daftar kandidat aktif</p>
                    <p className="text-sm text-slate-500">Ketuk kartu untuk melihat detail. Data tidak dapat diubah.</p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-10 text-sm text-slate-500">
                    Memuat kandidat...
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada kandidat yang terdaftar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredCandidates.map((candidate) => {
                      const age = calculateAge(candidate.tanggal_lahir);
                      const initials = candidate.name ? candidate.name.charAt(0).toUpperCase() : "?";

                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => openCandidateDetail(candidate)}
                          className="group w-full cursor-pointer rounded-3xl border border-slate-200/80 bg-white/90 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                        >
                          <div className="flex items-stretch gap-4">
                            <div className="min-h-[96px] w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                              {candidate.foto_profil_url ? (
                                <img
                                  src={candidate.foto_profil_url}
                                  alt={`Foto ${candidate.name}`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-base font-semibold text-slate-400">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-1 flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-semibold text-slate-900">{candidate.name}</p>
                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
                                  {candidate.role}
                                </span>
                              </div>
                              <p className="text-sm text-slate-500">
                                Blok {candidate.blok} • {candidate.gender} • {age} tahun
                              </p>
                              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 ring-1 ring-slate-200">
                                  Pekerjaan: {candidate.status_pekerjaan}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 ring-1 ring-slate-200">
                                  Status: {candidate.status_perkawinan}
                                </span>
                                {candidate.nomor_whatsapp && (
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200">
                                    WA: {candidate.nomor_whatsapp}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="hidden sm:block text-right">
                              <span className="text-xs font-semibold text-blue-600 transition group-hover:translate-x-0.5">
                                Lihat detail →
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Masukan warga</p>
                  <p className="text-sm text-slate-500">Suara warga terkini ditampilkan di bawah.</p>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-10 text-sm text-slate-500">
                    Memuat saran...
                  </div>
                ) : sarans.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada saran masuk.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sarans.map((saran) => {
                      const timestamp = saran.created_at
                        ? new Date(saran.created_at).toLocaleString()
                        : "Waktu tidak tersedia";

                      return (
                        <article
                          key={saran.id}
                          className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {saran.author_name || "Warga Tidak Diketahui"}
                              </p>
                              <p className="text-xs text-slate-500">{timestamp}</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                              Saran
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-slate-700">{saran.content}</p>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {candidateModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg">
            <div className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Tambah Kandidat</h2>
                  <p className="text-xs text-slate-500">Isi data baru. Data yang sudah ada tidak bisa diubah.</p>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                  onClick={closeCandidateModal}
                >
                  Tutup
                </button>
              </div>
              <div className="space-y-3 px-6 pb-6 pt-0 max-h-[calc(100vh-9rem)] overflow-y-auto">
                <label className="text-xs font-semibold uppercase text-slate-500">Nama</label>
                <input
                  type="text"
                  value={candidateFormValues.name}
                  onChange={(event) => handleCandidateChange("name", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <label className="text-xs font-semibold uppercase text-slate-500">NIK</label>
                <input
                  type="text"
                  value={candidateFormValues.nik}
                  onChange={(event) => handleCandidateChange("nik", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <label className="text-xs font-semibold uppercase text-slate-500">Nomor Whatsapp</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={candidateFormValues.nomor_whatsapp}
                  onChange={(event) => handleCandidateChange("nomor_whatsapp", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Contoh: 08123456789"
                />
                <label className="text-xs font-semibold uppercase text-slate-500">Tanggal Lahir</label>
                <input
                  type="date"
                  value={candidateFormValues.tanggal_lahir}
                  onChange={(event) => handleCandidateChange("tanggal_lahir", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Status Perkawinan</label>
                    <select
                      value={candidateFormValues.status_perkawinan}
                      onChange={(event) =>
                        handleCandidateChange("status_perkawinan", event.target.value as CandidateFormValues["status_perkawinan"])
                      }
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {MARITAL_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Gender</label>
                    <select
                      value={candidateFormValues.gender}
                      onChange={(event) => handleCandidateChange("gender", event.target.value as CandidateFormValues["gender"])}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {GENDER_OPTIONS.map((gender) => (
                        <option key={gender} value={gender}>
                          {gender}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Blok Rumah</label>
                    <select
                      value={candidateFormValues.blok}
                      onChange={(event) => handleCandidateChange("blok", event.target.value as CandidateFormValues["blok"])}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {BLOK_OPTIONS.map((blok) => (
                        <option key={blok} value={blok}>
                          Blok {blok}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Kandidat Untuk</label>
                    <select
                      value={candidateFormValues.role}
                      onChange={(event) => handleCandidateChange("role", event.target.value as CandidateFormValues["role"])}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="text-xs font-semibold uppercase text-slate-500">Status Pekerjaan</label>
                <select
                  value={candidateFormValues.status_pekerjaan}
                  onChange={(event) =>
                    handleCandidateChange("status_pekerjaan", event.target.value as CandidateFormValues["status_pekerjaan"])
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {JOB_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-500">Foto Profil</label>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                    <input type="file" accept="image/*" onChange={(event) => setProfileFile(event.target.files?.[0] ?? null)} />
                    <p className="mt-2 text-xs text-slate-500">
                      {profileFile
                        ? `File dipilih: ${profileFile.name}`
                        : candidateFormValues.foto_profil_url
                        ? "File tersimpan akan diganti jika Anda mengunggah baru."
                        : "Unggah foto profil kandidat."}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-500">KTP</label>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                    <input type="file" accept="image/*" onChange={(event) => setKtpFile(event.target.files?.[0] ?? null)} />
                    <p className="mt-2 text-xs text-slate-500">
                      {ktpFile
                        ? `File dipilih: ${ktpFile.name}`
                        : candidateFormValues.ktp_url
                        ? "File tersimpan akan diganti jika Anda mengunggah baru."
                        : "Unggah foto KTP kandidat."}
                    </p>
                  </div>
                </div>
                <label className="text-xs font-semibold uppercase text-slate-500">Riwayat Organisasi / Kegiatan Sosial</label>
                <textarea
                  value={candidateFormValues.riwayat_organisasi}
                  onChange={(event) => handleCandidateChange("riwayat_organisasi", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  rows={3}
                  placeholder="Tuliskan pengalaman organisasi atau kegiatan sosial."
                />
                <label className="text-xs font-semibold uppercase text-slate-500">Visi</label>
                <textarea
                  value={candidateFormValues.visi}
                  onChange={(event) => handleCandidateChange("visi", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  rows={3}
                />
                <label className="text-xs font-semibold uppercase text-slate-500">Misi</label>
                <textarea
                  value={candidateFormValues.misi}
                  onChange={(event) => handleCandidateChange("misi", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  rows={3}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={handleCandidateSubmit}
                  disabled={candidateSubmitting}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-blue-600/90 hover:to-indigo-500/90 disabled:opacity-70"
                >
                  {candidateSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={closeCandidateModal}
                  className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCandidate && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl">
            <div className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Detail Kandidat</h2>
                  <p className="text-xs text-slate-500">Data hanya untuk dibaca</p>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                  onClick={closeCandidateDetail}
                >
                  Tutup
                </button>
              </div>
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-6 pb-6 pt-0">
                <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-stretch">
                  <div className="h-40 w-40 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                    {selectedCandidate.foto_profil_url ? (
                      <img
                        src={selectedCandidate.foto_profil_url}
                        alt={`Foto ${selectedCandidate.name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
                        {selectedCandidate.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-semibold text-slate-900">{selectedCandidate.name}</p>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
                        {selectedCandidate.role}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Blok {selectedCandidate.blok} • {selectedCandidate.gender} • {calculateAge(selectedCandidate.tanggal_lahir)} tahun
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 ring-1 ring-slate-200">
                        Status: {selectedCandidate.status_perkawinan}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 ring-1 ring-slate-200">
                        Pekerjaan: {selectedCandidate.status_pekerjaan}
                      </span>
                      {selectedCandidate.nomor_whatsapp && (
                        <a
                          href={`https://wa.me/${selectedCandidate.nomor_whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200 transition hover:text-emerald-800"
                        >
                          Hubungi via WA
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-semibold uppercase text-slate-500">NIK</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCandidate.nik}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-semibold uppercase text-slate-500">Tanggal Lahir</p>
                    <p className="mt-1 text-sm text-slate-800">
                      {selectedCandidate.tanggal_lahir} ({calculateAge(selectedCandidate.tanggal_lahir)} tahun)
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-semibold uppercase text-slate-500">Nomor Whatsapp</p>
                    <p className="mt-1 text-sm text-slate-800">{selectedCandidate.nomor_whatsapp || "-"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-semibold uppercase text-slate-500">Blok &amp; Kandidasi</p>
                    <p className="mt-1 text-sm text-slate-800">
                      Blok {selectedCandidate.blok} • {selectedCandidate.role}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visi</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{selectedCandidate.visi || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Misi</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{selectedCandidate.misi || "-"}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Riwayat Organisasi / Kegiatan Sosial
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{selectedCandidate.riwayat_organisasi || "-"}</p>
                </div>

                {(selectedCandidate.foto_profil_url || selectedCandidate.ktp_url) && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {selectedCandidate.foto_profil_url && (
                      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Foto Profil</p>
                        <img
                          src={selectedCandidate.foto_profil_url}
                          alt="Foto Profil"
                          className="mt-2 h-48 w-full rounded-xl object-cover"
                        />
                      </div>
                    )}
                    {selectedCandidate.ktp_url && (
                      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">KTP</p>
                        <img
                          src={selectedCandidate.ktp_url}
                          alt="KTP"
                          className="mt-2 h-48 w-full rounded-xl bg-white object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}

                {(selectedCandidate.foto_profil_url || selectedCandidate.ktp_url) && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedCandidate.foto_profil_url && (
                      <a
                        href={selectedCandidate.foto_profil_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:text-blue-800"
                      >
                        Lihat foto profil
                      </a>
                    )}
                    {selectedCandidate.ktp_url && (
                      <a
                        href={selectedCandidate.ktp_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:text-slate-900"
                      >
                        Lihat KTP
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {saranModalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg">
            <div className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <p className="text-lg font-semibold text-slate-900">Saran Warga</p>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                  onClick={closeSaranModal}
                >
                  Tutup
                </button>
              </div>
              <div className="space-y-3 px-6 pb-6 pt-0 max-h-[calc(100vh-10rem)] overflow-y-auto">
                <label className="text-xs font-semibold uppercase text-slate-500">Nama Pengirim</label>
                <input
                  type="text"
                  value={saranFormValues.author_name}
                  onChange={(event) => handleSaranChange("author_name", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <label className="text-xs font-semibold uppercase text-slate-500">Saran</label>
                <textarea
                  value={saranFormValues.content}
                  onChange={(event) => handleSaranChange("content", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  rows={4}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={handleSaranSubmit}
                  disabled={saranSubmitting}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-blue-600/90 hover:to-indigo-500/90 disabled:opacity-70"
                >
                  {saranSubmitting ? "Mengirim..." : "Kirim"}
                </button>
                <button
                  type="button"
                  onClick={closeSaranModal}
                  className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
