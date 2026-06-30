"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import { getUsuarioLogado } from "@/utils/auth";

type UsuarioLogado = {
  nome?: string | null;
  name?: string | null;
  email?: string | null;
  codigo_inscricao?: string | null;
  codigoInscricao?: string | null;
};

export default function MentoradoLayout({ children }: { children: ReactNode }) {
  const [nome, setNome] = useState("Mentorado");
  const [codigoInscricao, setCodigoInscricao] = useState<string | null>(null);

  useEffect(() => {
    const user = getUsuarioLogado() as UsuarioLogado | null;

    setNome(user?.nome || user?.name || user?.email || "Mentorado");
    setCodigoInscricao(user?.codigo_inscricao || user?.codigoInscricao || null);
  }, []);

  return (
    <div className="h-dvh overflow-hidden bg-[#f6f7fb]">
      <MentoradoSidebar nome={nome} codigoInscricao={codigoInscricao} />

      <main className="h-dvh overflow-y-auto overflow-x-hidden lg:ml-[220px] xl:ml-[230px]">
        <div className="min-h-full px-4 py-6 sm:px-6 lg:px-6 xl:px-8 xl:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}