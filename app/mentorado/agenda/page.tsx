"use client";

import { usePathname, useRouter } from "next/navigation";

type SidebarProps = {
  nome: string;
};

const menusMentor = [
  { label: "Dashboard", href: "/mentor/dashboard" },
  { label: "Agenda", href: "/mentor/agenda" },
  { label: "Mentorados", href: "/mentorados" },
  { label: "Módulos", href: "/modulos" },
  { label: "Simulados", href: "/simulados" },
  { label: "Financeiro", href: "/financeiro" },
  { label: "Relatórios", href: "/relatorios" },
  { label: "Usuários", href: "/usuarios" },
  { label: "Minha conta", href: "/conta" },
];

export default function Sidebar({ nome }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  function sair() {
    localStorage.removeItem("cohub_user");
    localStorage.removeItem("ceoclub_user");
    sessionStorage.removeItem("cohub_user");
    sessionStorage.removeItem("ceoclub_user");
    router.replace("/login");
  }

  function navegar(href: string) {
    router.push(href);
  }

  function rotaAtiva(href: string) {
    if (href === "/mentor/dashboard") {
      return pathname === "/mentor/dashboard" || pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[250px] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-4 text-white shadow-[0_18px_50px_rgba(8,22,63,0.22)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(229,231,235,0.16),transparent)]" />
        <div className="pointer-events-none absolute -left-14 bottom-10 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(191,195,201,0.10),transparent)]" />

        <div className="relative z-10 shrink-0">
          <div className="mb-3 flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/10 p-2.5 backdrop-blur-sm">
            <div className="h-11 w-11 overflow-hidden rounded-xl border border-white/10 bg-white/10 p-1">
              <img
                src="/images/logo.jpeg"
                alt="Logo CEO Club"
                className="h-full w-full rounded-lg object-cover"
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight text-white">
                CEO Club
              </h1>

              <p className="text-[11px] font-medium text-[#C9CED6]">
                Painel da mentora
              </p>
            </div>
          </div>

          <div className="mb-3 rounded-[18px] border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#C9CED6]">
              Mentora
            </p>

            <p className="mt-2 break-words text-sm font-bold text-white">
              {nome}
            </p>

            <p className="mt-1 text-xs font-semibold text-[#D9DEE7]">
              Gestão CEO Club
            </p>
          </div>
        </div>

        <nav className="relative z-10 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {menusMentor.map((item) => {
            const ativo = rotaAtiva(item.href);

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navegar(item.href)}
                className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition ${
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

        <div className="relative z-10 shrink-0 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={sair}
            className="w-full rounded-xl py-2.5 text-sm font-bold text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105"
            style={{
              background:
                "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="h-screen w-[250px] shrink-0" aria-hidden="true" />
    </>
  );
}