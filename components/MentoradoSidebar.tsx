"use client";

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

  function sair() {
    localStorage.removeItem("cohub_user");
    localStorage.removeItem("ceoclub_user");
    router.replace("/login");
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

          <nav className="mt-3 flex flex-col gap-1">
            {menusMentorado.map((item) => {
              const ativo = rotaAtiva(item.href);

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
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

          <div className="mt-auto rounded-[20px] bg-[#080D2D] p-4 text-white shadow-[0_12px_28px_rgba(8,13,45,0.16)]">
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

      <div className="sticky top-0 z-30 flex min-h-[64px] items-center justify-between border-b border-black/5 bg-white/90 px-4 py-2 text-[#08163F] shadow-sm backdrop-blur-xl lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#080D2D] p-1 shadow-md">
            <img
              src="/images/logo.jpeg"
              alt="Logo CEO Club"
              className="h-full w-full rounded-xl object-cover"
            />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Curso CEO Club
            </p>
            <h1 className="truncate text-sm font-black">{nome}</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={sair}
          className="rounded-xl bg-[#08163F] px-4 py-2 text-xs font-black text-white shadow-md"
        >
          Sair
        </button>
      </div>
    </>
  );
}