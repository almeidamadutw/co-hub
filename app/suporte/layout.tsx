"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import SuporteSidebar from "@/components/SuporteSidebar";
import { getUsuarioLogado } from "@/utils/auth";

type UsuarioLogado = {
  nome?: string | null;
  name?: string | null;
  email?: string | null;
};

export default function SuporteLayout({ children }: { children: ReactNode }) {
  const [nome, setNome] = useState("Suporte");

  useEffect(() => {
    const user = getUsuarioLogado() as UsuarioLogado | null;

    setNome(user?.nome || user?.name || user?.email || "Suporte");
  }, []);

  return (
    <div className="h-dvh overflow-hidden bg-[#f3f6fa]">
      <SuporteSidebar nome={nome} />

      <main className="h-dvh overflow-y-auto overflow-x-hidden lg:ml-[240px] xl:ml-[260px] 2xl:ml-[290px]">
        <div className="min-h-full px-4 py-6 sm:px-6 lg:px-6 xl:px-7 2xl:px-8 2xl:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}