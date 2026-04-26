"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      toast.error("User belum login.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    if (error) {
      toast.error("Gagal memuat profil.");
      setLoading(false);
      return;
    }

    setProfile({
      full_name: data?.full_name || "",
      email: data?.email || user.email || "",
    });

    setLoading(false);
  }

  function handleChange(e) {
    setProfile((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!profile.full_name.trim()) {
      toast.error("Nama tidak boleh kosong.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("User belum login.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      toast.error("Gagal menyimpan profil.");
      return;
    }

    toast.success("Profil berhasil diperbarui.");
  }

  return (
    <AppShell
      title="Profil"
      subtitle="Lihat dan ubah informasi akun kamu."
    >
      <section className="max-w-2xl rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-4xl font-bold text-black">Informasi Akun</h2>

        {loading ? (
          <p className="text-lg text-black">Memuat profil...</p>
        ) : (
          <form onSubmit={handleSave} className="grid gap-5">
            <div>
              <label className="mb-2 block text-lg font-semibold text-black">
                Nama Lengkap
              </label>
              <input
                type="text"
                name="full_name"
                value={profile.full_name}
                onChange={handleChange}
                className="w-full rounded-2xl border border-black/20 px-5 py-4 text-lg text-black outline-none"
                placeholder="Nama lengkap"
              />
            </div>

            <div>
              <label className="mb-2 block text-lg font-semibold text-black">
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full rounded-2xl border border-black/20 bg-black/5 px-5 py-4 text-lg text-black outline-none"
              />
              <p className="mt-2 text-sm text-black/70">
                Email tidak bisa diubah dari halaman ini.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-black px-5 py-4 text-xl font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan Profil"}
            </button>
          </form>
        )}
      </section>
    </AppShell>
  );
}