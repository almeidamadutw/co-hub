"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MentoradoPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mentorado/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
      Redirecionando para a área do mentorado...
    </main>
  );
}