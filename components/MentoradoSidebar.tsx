"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario } from "@/utils/auth";

type MentoradoSidebarProps = {
  nome: string;
  codigoInscricao?: string | null;
};

type UsuarioSidebar = {
  id?: string;
  email?: string | null;
  codigo_inscricao?: string | null;
  codigoInscricao?: string | null;
};

const menusMentorado = [
  { label: "Início", href: "/mentorado/dashboard" },
  { label: "Minha agenda", href: "/mentorado/agenda" },
  { label: "Meus módulos", href: "/mentorado/modulos" },
  { label: "Biblioteca", href: "/mentorado/biblioteca" },
  { label: "Praticar", href: "/mentorado/praticar" },
  { label: "Meu progresso", href: "/mentorado/progresso" },
  { label: "Financeiro", href: "/mentorado/financeiro" },
  { label: "Suporte", href: "/mentorado/suporte" },
  { label: "Minha conta", href: "/mentorado/conta" },
];

export default function MentoradoSidebar({
  nome,
  codigoInscricao,
}: MentoradoSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [menuAberto, setMenuAberto] = useState(false);
  const [codigoEncontrado, setCodigoEncontrado] = useState(
    codigoInscricao || ""
  );

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarCodigoInscricao() {
      if (codigoInscricao) {
        setCodigoEncontrado(codigoInscricao);
        return;
      }

      const user = getUsuarioLogado() as UsuarioSidebar | null;

      const codigoLocal = user?.codigo_inscricao || user?.codigoInscricao;

      if (codigoLocal) {
        setCodigoEncontrado(codigoLocal);
        return;
      }

      if (!user?.id && !user?.email) {
        setCodigoEncontrado("");
        return;
      }

      let consulta = supabase
        .from("profiles")
        .select("codigo_inscricao")
        .eq("role", "mentorado");

      if (user.id) {
        consulta = consulta.eq("id", user.id);
      } else if (user.email) {
        consulta = consulta.ilike("email", user.email.trim());
      }

      const { data, error } = await consulta.maybeSingle();

      if (!componenteAtivo) return;

      if (error) {
        console.error("Erro ao buscar inscrição do mentorado:", error.message);
        setCodigoEncontrado("");
        return;
      }

      setCodigoEncontrado(data?.codigo_inscricao || "");
    }

    carregarCodigoInscricao();

    return () => {
      componenteAtivo = false;
    };
  }, [codigoInscricao]);

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  function navegar(href: string) {
    setMenuAberto(false);
    router.push(href);
  }

  function rotaAtiva(href: string) {
    if (href === "/mentorado/dashboard") {
      return pathname === "/mentorado/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden h-dvh w-[220px] flex-col overflow-hidden border-r border-black/5 bg-[#f6f7fb] px-3 py-3 text-[#08163F] shadow-[0_18px_50px_rgba(15,23,42,0.08)] lg:flex xl:w-[230px]">
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 rounded-[20px] bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.055)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[#080D2D] p-1 shadow-md xl:h-12 xl:w-12">
                <Image
                  src="/images/logo.jpeg"
                  alt="Logo CEO Club"
                  width={48}
                  height={48}
                  className="h-full w-full rounded-[12px] object-cover"
                />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400 xl:tracking-[0.26em]">
                  Curso
                </p>

                <h1 className="mt-1 truncate text-base font-black text-[#08163F]">
                  CEO Club
                </h1>
              </div>
            </div>
          </div>

          <nav className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {menusMentorado.map((item) => {
              const ativo = rotaAtiva(item.href);

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navegar(item.href)}
                  className={`flex w-full items-center justify-between rounded-[16px] px-3 py-2.5 text-left text-[12px] font-black transition xl:px-4 xl:text-[13px] ${
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

          <div className="mt-3 shrink-0 rounded-[20px] bg-[#080D2D] p-3 text-white shadow-[0_12px_28px_rgba(8,13,45,0.16)] xl:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C9CED6] xl:tracking-[0.28em]">
              Mentorado
            </p>

            <p className="mt-3 truncate text-sm font-black xl:text-base">
              {nome}
            </p>

            <p className="mt-1 truncate text-xs font-black text-white/90">
              Inscrição {codigoEncontrado || "não informada"}
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
            <div className="mb-4 flex shrink-0 items-center justify-between gap-3 rounded-[20px] bg-white p-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[#080D2D] p-1 shadow-md">
                  <Image
                    src="/images/logo.jpeg"
                    alt="Logo CEO Club"
                    width={48}
                    height={48}
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

            <div className="mb-4 shrink-0 rounded-[20px] bg-[#080D2D] p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9CED6]">
                Mentorado
              </p>

              <p className="mt-2 break-words text-sm font-black">{nome}</p>

              <p className="mt-1 break-words text-xs font-black text-white/80">
                Inscrição {codigoEncontrado || "não informada"}
              </p>
            </div>

            <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
              className="mt-4 w-full shrink-0 rounded-2xl bg-[#08163F] py-3 text-sm font-black text-white"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </>
  );
}
