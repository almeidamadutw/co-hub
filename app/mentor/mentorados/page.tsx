"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PageLoading from "@/components/PageLoading";

export default function MentorMentoradosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mentor/mentorados/lista");
  }, [router]);

  return <PageLoading pagina="mentorados" />;
}
