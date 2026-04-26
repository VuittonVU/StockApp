"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import PopupModal from "@/components/PopupModal";
import { getErrorMessage } from "@/lib/errorMessage";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [popup, setPopup] = useState({
    open: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      router.replace("/dashboard");
      return;
    }

    setCheckingSession(false);
  }

  function showError(message, title = "Gagal") {
    setPopup({
      open: true,
      title,
      message,
    });
  }

  function closePopup() {
    setPopup({
      open: false,
      title: "",
      message: "",
    });
  }

  function handleChange(e) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.email.trim()) {
      showError("Email wajib diisi.");
      return;
    }

    if (!form.password.trim()) {
      showError("Kata sandi wajib diisi.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });

    setLoading(false);

    if (error) {
      showError(getErrorMessage(error, "Email atau kata sandi salah."));
      return;
    }

    router.replace("/dashboard");
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e4] px-6">
        <p className="text-xl font-semibold text-black">Memeriksa sesi...</p>
      </main>
    );
  }

  return (
    <>
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e4] px-6">
        <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-xl font-bold text-white">
              S
            </div>

            <div>
              <p className="text-sm text-black">Simple Inventory</p>
              <h1 className="text-3xl font-bold text-black">StockApp</h1>
            </div>
          </div>

          <h2 className="mb-8 text-center text-5xl font-bold text-black">
            Selamat Datang
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-lg font-medium text-black">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="nama@perusahaan.com"
                className="w-full rounded-2xl border border-black/20 px-4 py-4 text-lg text-black outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-lg font-medium text-black">
                Kata Sandi
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Masukkan kata sandi"
                  className="w-full rounded-2xl border border-black/20 px-4 py-4 pr-12 text-lg text-black outline-none"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black/70 hover:text-black"
                >
                  {showPassword ? <FiEyeOff size={22} /> : <FiEye size={22} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-black px-4 py-4 text-xl font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="mt-6 text-center text-lg text-black">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold underline">
              Daftar
            </Link>
          </p>
        </div>
      </main>

      <PopupModal
        open={popup.open}
        title={popup.title}
        message={popup.message}
        confirmText="Mengerti"
        onConfirm={closePopup}
      />
    </>
  );
}