"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { logoutUsuario } from "@/utils/auth";

type MenuItem = {
  label: string;
  href: string;
};

type SidebarRole = "mentor" | "mentorado" | "financeiro" | "suporte";

type SidebarProps = {
  nome: string;
  role?: string;
  acessoSuporte?: boolean;
};

const menusPorRole: Record<SidebarRole, MenuItem[]> = {
  mentor: [
    { label: "Dashboard", href: "/mentor/dashboard" },
    { label: "Agenda", href: "/mentor/agenda" },
    { label: "Mentorados", href: "/mentor/mentorados/lista" },
    { label: "Biblioteca", href: "/mentor/biblioteca" },
    { label: "Módulos", href: "/mentor/modulos" },
    { label: "Simulados", href: "/mentor/simulados" },
    { label: "Financeiro", href: "/mentor/financeiro" },
    { label: "Relatórios", href: "/mentor/relatorios" },
    { label: "Minha conta", href: "/mentor/conta" },
  ],

  mentorado: [
    { label: "Dashboard", href: "/mentorado/dashboard" },
    { label: "Módulos", href: "/mentorado/modulos" },
    { label: "Biblioteca", href: "/mentorado/biblioteca" },
    { label: "Praticar", href: "/mentorado/praticar" },
    { label: "Progresso", href: "/mentorado/progresso" },
    { label: "Financeiro", href: "/mentorado/financeiro" },
    { label: "Agenda", href: "/mentorado/agenda" },
    { label: "Suporte", href: "/mentorado/suporte" },
    { label: "Minha conta", href: "/mentorado/conta" },
  ],

  financeiro: [
    { label: "Dashboard", href: "/mentor/financeiro" },
    { label: "Cobranças", href: "/mentor/financeiro" },
    { label: "Relatórios", href: "/mentor/relatorios" },
    { label: "Minha conta", href: "/mentor/conta" },
  ],

  suporte: [
    { label: "Dashboard", href: "/suporte" },
    { label: "Usuários", href: "/suporte/usuarios" },
    { label: "Mentorados", href: "/suporte/mentorados" },
    { label: "Biblioteca", href: "/suporte/biblioteca" },
    { label: "Financeiro", href: "/mentor/financeiro" },
    { label: "Reset de senha", href: "/suporte/reset-senha" },
    { label: "Relatórios", href: "/mentor/relatorios" },
    { label: "Minha conta", href: "/suporte/conta" },
  ],
};

function normalizarRole(role?: string): SidebarRole {
  if (
    role === "mentor" ||
    role === "mentorado" ||
    role === "financeiro" ||
    role === "suporte"
  ) {
    return role;
  }

  return "mentor";
}

function tituloDoPainel(role: SidebarRole) {
  const titulos: Record<SidebarRole, string> = {
    mentor: "Painel da mentora",
    mentorado: "Painel do mentorado",
    financeiro: "Painel financeiro",
    suporte: "Painel de suporte",
  };

  return titulos[role];
}

function nomeDoPerfil(role: SidebarRole) {
  const nomes: Record<SidebarRole, string> = {
    mentor: "Mentora",
    mentorado: "Mentorado",
    financeiro: "Financeiro",
    suporte: "Suporte",
  };

  return nomes[role];
}

function subtituloDoPerfil(role: SidebarRole) {
  const subtitulos: Record<SidebarRole, string> = {
    mentor: "Gestão CEO Club",
    mentorado: "Jornada CEO Club",
    financeiro: "Controle de cobranças",
    suporte: "Administração geral",
  };

  return subtitulos[role];
}

export default function Sidebar({
  nome,
  role = "mentor",
  acessoSuporte = false,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  const roleAtual = normalizarRole(role);
  const menusBase = menusPorRole[roleAtual];

  const menus =
    acessoSuporte &&
    roleAtual !== "suporte" &&
    !menusBase.some((item) => item.href === "/suporte")
      ? [...menusBase, { label: "Área suporte", href: "/suporte" }]
      : menusBase;

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  function navegar(href: string) {
    setMenuAberto(false);
    router.push(href);
  }

  function rotaAtiva(href: string) {
    if (href === "/mentor/dashboard") {
      return pathname === "/mentor/dashboard" || pathname === "/dashboard";
    }

    if (href === "/mentor/mentorados/lista") {
      return (
        pathname === "/mentor/mentorados" ||
        pathname === "/mentor/mentorados/lista" ||
        pathname.startsWith("/mentor/mentorados/")
      );
    }

    if (href === "/suporte") {
      return pathname === "/suporte" || pathname === "/suporte/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderizarConteudoSidebar() {
    return (
      <>
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(229,231,235,0.16),transparent)]" />
        <div className="pointer-events-none absolute -left-14 bottom-10 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(191,195,201,0.10),transparent)]" />

        <div className="relative z-10 shrink-0">
          <div className="mb-4 flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
            <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-1 2xl:h-14 2xl:w-14">
              <Image
                src="/images/logo.jpeg"
                alt="Logo CEO Club"
                width={56}
                height={56}
                className="h-full w-full rounded-xl object-cover"
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight text-white 2xl:text-lg">
                CEO Club
              </h1>

              <p className="text-[11px] font-medium text-[#C9CED6] 2xl:text-xs">
                {tituloDoPainel(roleAtual)}
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-[20px] border border-white/10 bg-white/10 p-3 backdrop-blur-sm 2xl:p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#C9CED6]">
              {nomeDoPerfil(roleAtual)}
            </p>

            <p className="mt-2 break-words text-sm font-bold text-white">
              {nome}
            </p>

            <p className="mt-1 text-xs font-semibold text-[#D9DEE7]">
              {subtituloDoPerfil(roleAtual)}
            </p>
          </div>
        </div>

        <nav className="no-scrollbar relative z-10 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0">
          {menus.map((item) => {
            const ativo = rotaAtiva(item.href);

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navegar(item.href)}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-[13px] font-bold transition 2xl:px-4 2xl:py-3 2xl:text-sm ${
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

        <div className="relative z-10 shrink-0 border-t border-white/10 pt-4">
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
      </>
    );
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden h-dvh w-[240px] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-4 text-white shadow-[0_18px_50px_rgba(8,22,63,0.22)] lg:flex xl:w-[260px] 2xl:w-[290px] 2xl:p-5">
        {renderizarConteudoSidebar()}
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

          <aside className="absolute bottom-0 left-0 top-0 flex w-[88vw] max-w-[360px] flex-col overflow-hidden bg-gradient-to-b from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-4 text-white shadow-[20px_0_50px_rgba(0,0,0,0.30)]">
            <button
              type="button"
              onClick={() => setMenuAberto(false)}
              className="relative z-10 mb-4 self-end rounded-2xl bg-white/10 px-3 py-2 text-sm font-black text-white"
            >
              X
            </button>

            {renderizarConteudoSidebar()}
          </aside>
        </div>
      )}
    </>
  );
}
