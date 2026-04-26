"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    setChecking(false);
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e4]">
        <p className="text-xl font-semibold text-black">Memeriksa sesi...</p>
      </main>
    );
  }

  return children;
}