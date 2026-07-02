"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";

function AgendaRedirectContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mentor/agenda");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
      <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">
          CEO Club
        </p>

        <h1 className="mt-3 text-2xl font-black">
          Redirecionando para a agenda...
        </h1>
      </div>
    </main>
  );
}

export default function AgendaRedirectPage() {
  return (
    <AuthGuard permitido={["mentor", "suporte"]}>
      <AgendaRedirectContent />
    </AuthGuard>
  );
}