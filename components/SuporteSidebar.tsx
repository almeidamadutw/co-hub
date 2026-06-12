"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type SuporteSidebarProps = {
  nome: string;
};

const menusSuporte = [
  { label: "Dashboard", href: "/suporte" },
  { label: "Tickets", href: "/suporte/tickets" },
  { label: "Reset de senha", href: "/suporte/reset-senha" },
  { label: "Usuários", href: "/suporte/usuarios" },
  { label: "Mentorados", href: "/suporte/mentorados" },
  { label: "Logs técnicos", href: "/suporte/logs" },
  { label: "Minha conta", href: "/suporte/conta" },
];

export default function SuporteSidebar({ nome }: SuporteSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  function sair() {
    localStorage.removeItem("cohub_user");
    localStorage.removeItem("ceoclub_user");
    sessionStorage.removeItem("cohub_user");
    sessionStorage.removeItem("ceoclub_user");
    router.replace("/login");
  }

  function navegar(href: string) {
    setMenuAberto(false);
    router.push(href);
  }

  function rotaAtiva(href: string) {
    if (href === "/suporte") {
      return pathname === "/suporte";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[290px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-[0_18px_50px_rgba(8,22,63,0.22)] lg:flex">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(229,231,235,0.16),transparent)]" />
        <div className="pointer-events-none absolute -left-14 bottom-10 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(191,195,201,0.10),transparent)]" />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div className="mb-6 flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-1">
              <img
                src="/images/logo.jpeg"
                alt="Logo CEO Club"
                className="h-full w-full rounded-xl object-cover"
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight text-white">
                CEO Club
              </h1>

              <p className="truncate text-xs font-medium text-[#C9CED6]">
                Suporte técnico
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-[#C9CED6]">
              Admin geral
            </p>

            <p className="mt-2 break-words text-base font-semibold text-white">
              {nome}
            </p>

            <p className="mt-1 text-sm text-[#D9DEE7]">Suporte</p>
          </div>

          <nav className="ceo-sidebar-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-0">
            {menusSuporte.map((item) => {
              const ativo = rotaAtiva(item.href);

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navegar(item.href)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                    ativo
                      ? "border-white/20 bg-white text-[#08163F] shadow-[0_10px_25px_rgba(255,255,255,0.14)]"
                      : "border-transparent bg-white/10 text-[#E5E7EB] hover:border-white/10 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span
                    className={`ml-3 shrink-0 ${
                      ativo ? "text-[#08163F]" : "text-[#BFC3C9]"
                    }`}
                  >
                    →
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="pt-5">
            <button
              type="button"
              onClick={sair}
              className="w-full rounded-2xl py-3 font-bold text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105"
              style={{
                background:
                  "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
              }}
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

          <div className="absolute bottom-0 right-0 top-0 flex w-[88vw] max-w-[360px] flex-col overflow-hidden bg-gradient-to-b from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-4 text-white shadow-[-20px_0_50px_rgba(0,0,0,0.35)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-1">
                  <img
                    src="/images/logo.jpeg"
                    alt="Logo CEO Club"
                    className="h-full w-full rounded-xl object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-base font-black">CEO Club</h2>
                  <p className="truncate text-xs font-bold text-[#C9CED6]">
                    Suporte técnico
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-black text-white"
              >
                X
              </button>
            </div>

            <div className="mb-4 rounded-[20px] border border-white/10 bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9CED6]">
                Admin geral
              </p>
              <p className="mt-2 break-words text-sm font-black">{nome}</p>
            </div>

            <nav className="ceo-sidebar-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-0">
              {menusSuporte.map((item) => {
                const ativo = rotaAtiva(item.href);

                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => navegar(item.href)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                      ativo
                        ? "border-white/20 bg-white text-[#08163F]"
                        : "border-white/10 bg-white/10 text-[#E5E7EB]"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="ml-3 shrink-0">→</span>
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={sair}
              className="mt-4 w-full rounded-2xl bg-white py-3 text-sm font-black text-[#08163F]"
            >
              Sair
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .ceo-sidebar-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .ceo-sidebar-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}