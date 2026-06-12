"use client";

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

  function sair() {
    localStorage.removeItem("cohub_user");
    localStorage.removeItem("ceoclub_user");
    router.replace("/login");
  }

  function rotaAtiva(href: string) {
    if (href === "/suporte") {
      return pathname === "/suporte";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="relative flex min-h-screen w-[290px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-[0_18px_50px_rgba(8,22,63,0.22)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(229,231,235,0.16),transparent)]" />
      <div className="pointer-events-none absolute -left-14 bottom-10 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(191,195,201,0.10),transparent)]" />

      <div className="relative z-10">
        <div className="mb-8 flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-1">
            <img
              src="/images/logo.jpeg"
              alt="Logo CEO Club"
              className="h-full w-full rounded-xl object-cover"
            />
          </div>

          <div>
            <h1 className="text-lg font-bold leading-tight text-white">
              CEO Club
            </h1>

            <p className="text-xs font-medium text-[#C9CED6]">
              Suporte técnico
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-[#C9CED6]">
            Admin geral
          </p>

          <p className="mt-2 break-words text-base font-semibold text-white">
            {nome}
          </p>

          <p className="mt-1 text-sm text-[#D9DEE7]">Suporte</p>
        </div>

        <nav className="space-y-2">
          {menusSuporte.map((item) => {
            const ativo = rotaAtiva(item.href);

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                  ativo
                    ? "border-white/20 bg-white text-[#08163F] shadow-[0_10px_25px_rgba(255,255,255,0.14)]"
                    : "border-transparent bg-white/10 text-[#E5E7EB] hover:border-white/10 hover:bg-white/15 hover:text-white"
                }`}
              >
                <span>{item.label}</span>
                <span className={ativo ? "text-[#08163F]" : "text-[#BFC3C9]"}>
                  →
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="relative z-10 mt-auto pt-6">
        <button
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
    </aside>
  );
}