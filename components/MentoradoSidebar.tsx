"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type MentoradoSidebarProps = {
  nome: string;
  codigoInscricao?: string | null;
};

const menusMentorado = [
  { label: "Início", href: "/mentorado/dashboard" },
  { label: "Minha agenda", href: "/mentorado/agenda" },
  { label: "Meus módulos", href: "/mentorado/modulos" },
  { label: "Praticar", href: "/mentorado/praticar" },
  { label: "Meu progresso", href: "/mentorado/progresso" },
  { label: "Financeiro", href: "/mentorado/financeiro" },
  { label: "Minha conta", href: "/mentorado/conta" },
];

export default function MentoradoSidebar({
  nome,
  codigoInscricao,
}: MentoradoSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  function sair() {
    localStorage.removeItem("cohub_user");
    localStorage.removeItem("ceoclub_user");
    router.replace("/login");
  }

  function navegar(href: string) {
    setMenuAberto(false);
    router.push(href);
  }

  function rotaAtiva(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[230px] shrink-0 overflow-hidden border-r border-black/5 bg-[#f6f7fb] px-3 py-3 text-[#08163F] lg:flex lg:flex-col">
        <div className="flex h-full min-h-0 flex-col">
          <div className="rounded-[20px] bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.055)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[#080D2D] p-1 shadow-md">
                <img
                  src="/images/logo.jpeg"
                  alt="Logo CEO Club"
                  className="h-full w-full rounded-[12px] object-cover"
                />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">
                  Curso
                </p>

                <h1 className="mt-1 truncate text-base font-black text-[#08163F]">
                  CEO Club
                </h1>
              </div>
            </div>
          </div>

          <nav className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {menusMentorado.map((item) => {
              const ativo = rotaAtiva(item.href);

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navegar(item.href)}
                  className={`flex w-full items-center justify-between rounded-[16px] px-4 py-2.5 text-left text-[13px] font-black transition ${
                    ativo
                      ? "bg-[#EEF0FF] text-[#08163F] shadow-sm"
                      : "text-slate-500 hover:bg-white hover:text-[#08163F] hover:shadow-sm"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="ml-3 shrink-0 text-xs">→</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-3 rounded-[20px] bg-[#080D2D] p-4 text-white shadow-[0_12px_28px_rgba(8,13,45,0.16)]">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9CED6]">
              Mentorado
            </p>

            <p className="mt-3 truncate text-base font-black">{nome}</p>

            <p className="mt-1 truncate text-xs font-black text-white/90">
              Inscrição {codigoInscricao || "não informada"}
            </p>

            <button
              type="button"
              onClick={sair}
              className="mt-4 w-full rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-[#08163F] shadow-md transition hover:brightness-95"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setMenuAberto(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(8,22,63,0.35)] lg:hidden"
      >
        Menu
      </button>

      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <div className="absolute bottom-0 right-0 top-0 flex w-[88vw] max-w-[360px] flex-col overflow-hidden bg-[#f6f7fb] p-4 text-[#08163F] shadow-[-20px_0_50px_rgba(0,0,0,0.30)]">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-[20px] bg-white p-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[#080D2D] p-1 shadow-md">
                  <img
                    src="/images/logo.jpeg"
                    alt="Logo CEO Club"
                    className="h-full w-full rounded-[12px] object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Curso
                  </p>

                  <h2 className="truncate text-base font-black">CEO Club</h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                className="rounded-2xl bg-[#f3f5f8] px-3 py-2 text-sm font-black text-[#08163F]"
              >
                X
              </button>
            </div>

            <div className="mb-4 rounded-[20px] bg-[#080D2D] p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9CED6]">
                Mentorado
              </p>

              <p className="mt-2 break-words text-sm font-black">{nome}</p>

              <p className="mt-1 break-words text-xs font-black text-white/80">
                Inscrição {codigoInscricao || "não informada"}
              </p>
            </div>

            <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {menusMentorado.map((item) => {
                const ativo = rotaAtiva(item.href);

                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => navegar(item.href)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                      ativo
                        ? "bg-[#08163F] text-white shadow-md"
                        : "bg-white text-slate-600 shadow-sm"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span>→</span>
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={sair}
              className="mt-4 w-full rounded-2xl bg-[#08163F] py-3 text-sm font-black text-white"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </>
  );
}