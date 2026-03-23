"use client";

import { useRouter } from "next/navigation";

type SidebarProps = {
  nome: string;
  role: string;
};

export default function Sidebar({ nome, role }: SidebarProps) {
  const router = useRouter();

  const menuPorPerfil: Record<string, string[]> = {
    admin: ["Dashboard", "Pacientes", "Agenda", "Protocolos", "Financeiro", "Usuários", "Leads"],
    recepcao: ["Dashboard", "Pacientes", "Agenda"],
    dentista: ["Dashboard", "Pacientes", "Agenda", "Protocolos"],
    financeiro: ["Dashboard", "Financeiro", "Relatórios"],
    crc: ["Dashboard", "Pacientes", "Agenda", "Financeiro", "Leads", "Relatórios"],
  };

  const itens = menuPorPerfil[role] || [];

  function navegar(item: string) {
    const rotas: Record<string, string> = {
  Dashboard: "/dashboard",
  Leads: "/leads",
  Pacientes: "/pacientes",
  Agenda: "/agenda",
};

    const rota = rotas[item];

    if (rota) {
      router.push(rota);
    }
  }

  return (
    <aside className="w-72 min-h-screen bg-[#1A1F4D] text-white p-6">
      <div className="text-center mb-8">
        <img
          src="/images/logo.png"
          alt="Logo Casal Odonto"
          className="mx-auto mb-4 w-24 h-auto object-contain"
        />
        <h1 className="text-3xl font-bold">CO Hub</h1>
        <p className="text-sm text-[#D4AF37] font-semibold">by Casal Odonto</p>
      </div>

      <div className="mb-8 bg-white/10 rounded-2xl p-4">
        <p className="text-sm text-gray-300">Usuário logado</p>
        <p className="font-bold mt-1">{nome}</p>
        <p className="text-sm text-[#D4AF37] capitalize">{role}</p>
      </div>

      <nav className="space-y-3">
        {itens.map((item) => (
          <button
            key={item}
            onClick={() => navegar(item)}
            className="w-full text-left rounded-xl px-4 py-3 bg-white/10 hover:bg-white/20 transition"
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}