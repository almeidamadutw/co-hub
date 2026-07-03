"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MentorMentoradosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mentor/mentorados/lista");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] px-4 text-[#08163F]">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-8 text-center shadow-xl shadow-slate-200/70">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
          CEO Club
        </p>

        <h1 className="mt-3 text-2xl font-black">
          Redirecionando para mentorados...
        </h1>
      </div>
    </main>
  );
}
