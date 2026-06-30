"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mentor/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
      <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">
          CEO Club
        </p>

        <h1 className="mt-3 text-2xl font-black">
          Redirecionando para o painel...
        </h1>
      </div>
    </main>
  );
}