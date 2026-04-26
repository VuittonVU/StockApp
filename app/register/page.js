"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import toast from "react-hot-toast";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.fullName.trim()) {
      toast.error("Nama lengkap wajib diisi.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak sama.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error("Gagal membuat akun.");
      return;
    }

    toast.success("Akun berhasil dibuat. Silakan login.");
    router.push("/login");
  }

  return (
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
          Buat Akun Baru
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Nama Lengkap"
            className="w-full rounded-2xl border border-black/20 px-4 py-4 text-lg text-black outline-none"
            required
          />

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full rounded-2xl border border-black/20 px-4 py-4 text-lg text-black outline-none"
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Kata Sandi"
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

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Konfirmasi Kata Sandi"
              className="w-full rounded-2xl border border-black/20 px-4 py-4 pr-12 text-lg text-black outline-none"
              required
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-black/70 hover:text-black"
            >
              {showConfirmPassword ? (
                <FiEyeOff size={22} />
              ) : (
                <FiEye size={22} />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-black px-4 py-4 text-xl font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Daftar Akun"}
          </button>
        </form>

        <p className="mt-6 text-center text-lg text-black">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold underline">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}