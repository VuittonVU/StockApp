"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
  });

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Produk", href: "/products" },
    { label: "Transaksi", href: "/transactions" },
    { label: "Riwayat", href: "/riwayat" },
    { label: "Profil", href: "/profile" },
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    setProfile({
      full_name: data?.full_name || user.user_metadata?.full_name || "",
      email: data?.email || user.email || "",
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const displayName = profile.full_name || profile.email || "User";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="border-b border-black/10 bg-white">
      <nav className="mx-auto flex max-w-[1600px] flex-col gap-5 px-6 py-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-2xl font-bold text-white shadow-md">
            S
          </div>

          <div>
            <p className="text-base text-black">Simple Inventory</p>
            <h1 className="text-3xl font-bold text-black">StockApp</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap rounded-full border border-black bg-white p-2 shadow-sm">
            {navItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-6 py-3 text-lg font-bold transition-all duration-300 ${
                    active
                      ? "bg-black text-white shadow-md"
                      : "text-black hover:bg-black hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-full border border-black bg-white px-4 py-3 transition-all duration-300 hover:bg-black hover:text-white"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black font-bold text-white">
              {initial}
            </div>

            <span className="max-w-[220px] truncate text-lg font-bold text-black group-hover:text-white">
              {displayName}
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-black px-6 py-3 text-lg font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          >
            Keluar
          </button>
        </div>
      </nav>
    </header>
  );
}