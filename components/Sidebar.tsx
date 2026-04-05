"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarProps = {
  nome: string;
  role: string;
};

const menuItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Pacientes", href: "/pacientes" },
  { label: "Agenda", href: "/agenda" },
  { label: "Financeiro", href: "/financeiro" },
  { label: "Leads", href: "/leads" },
  { label: "Protocolos", href: "/protocolos" },
  { label: "Relatórios", href: "/relatorios" },
  { label: "Usuários", href: "/usuarios" },
];

export default function Sidebar({ nome, role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="min-h-screen w-72 bg-gradient-to-b from-[#071133] to-[#020817] text-white shadow-xl flex flex-col">
      <div className="border-b border-[#D4AF37]/20 px-6 py-8">
        <h1 className="text-2xl font-bold text-[#D4AF37]">CO Hub</h1>
        <p className="mt-2 text-sm text-gray-300">Gestão odontológica integrada</p>
      </div>

      <div className="px-6 py-6">
        <p className="text-xs uppercase tracking-[0.25em] text-gray-400">
          Usuário logado
        </p>
        <p className="mt-3 text-xl font-bold text-white">{nome}</p>
        <p className="mt-1 text-sm text-gray-300 capitalize">{role}</p>
      </div>

      <nav className="px-4 py-2 flex-1">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const ativo = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-2xl px-4 py-3 text-lg transition ${
                  ativo
                    ? "border border-[#D4AF37]/50 bg-[#D4AF37]/15 font-medium text-[#f7d76c]"
                    : "text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-5 pb-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-lg">
          N
        </div>
      </div>
    </aside>
  );
}