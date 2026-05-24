"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MentoradoLoading from "@/components/MentoradoLoading";

export default function MentoradoPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mentorado/dashboard");
  }, [router]);

  return <MentoradoLoading mensagem="Redirecionando para a área do mentorado..." />;
}
