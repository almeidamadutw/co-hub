"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado } from "@/utils/auth";

type UsuarioLogado = {
  nome?: string | null;
  name?: string | null;
  email?: string | null;
};

export default function MentorLayout({ children }: { children: ReactNode }) {
  const [nome, setNome] = useState("Mentora");

  useEffect(() => {
    const user = getUsuarioLogado() as UsuarioLogado | null;

    setNome(user?.nome || user?.name || user?.email || "Mentora");
  }, []);

  return (
    <div className="h-dvh overflow-hidden bg-[#f3f6fa]">
      <Sidebar nome={nome} />

      <main className="h-dvh overflow-y-auto overflow-x-hidden lg:ml-[240px] xl:ml-[260px] 2xl:ml-[290px]">
        <div className="min-h-full px-4 py-6 sm:px-6 lg:px-6 xl:px-7 2xl:px-8 2xl:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}