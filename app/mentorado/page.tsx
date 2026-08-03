"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PageLoading from "@/components/PageLoading";

export default function MentoradoPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mentorado/dashboard");
  }, [router]);

  return <PageLoading pagina="área do mentorado" />;
}
