"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type SidebarProps = {
  nome: string;
  role: string;
};

type Paciente = {
  status: string;
};

type Lead = {
  status: string;
};

type Consulta = {
  data: string;
};

type Lancamento = {
  status: string;
};

const STORAGE_KEY_PACIENTES = "cohub_pacientes";
const STORAGE_KEY_FINANCEIRO = "cohub_lancamentos_financeiro";
const STORAGE_KEY_LEADS = "cohub_leads";
const STORAGE_KEY_AGENDA = "cohub_agenda";

export default function Sidebar({ nome, role }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [totalPacientes, setTotalPacientes] = useState(0);
  const [consultasHoje, setConsultasHoje] = useState(0);
  const [pendenciasFinanceiras, setPendenciasFinanceiras] = useState(0);
  const [leadsAtivos, setLeadsAtivos] = useState(0);

  const menuPorPerfil: Record<string, string[]> = {
    admin: [
      "Dashboard",
      "Pacientes",
      "Agenda",
      "Protocolos",
      "Financeiro",
      "Usuários",
      "Leads",
    ],
    recepcao: ["Dashboard", "Pacientes", "Agenda"],
    dentista: ["Dashboard", "Pacientes", "Agenda", "Protocolos"],
    financeiro: ["Dashboard", "Financeiro", "Relatórios"],
    crc: ["Dashboard", "Pacientes", "Agenda", "Financeiro", "Leads", "Relatórios"],
  };

  const itens = menuPorPerfil[role] || [];

  const rotas = useMemo(
    () => ({
      Dashboard: "/dashboard",
      Leads: "/leads",
      Pacientes: "/pacientes",
      Agenda: "/agenda",
      Financeiro: "/financeiro",
      Protocolos: "/protocolos",
      Usuários: "/usuarios",
      Relatórios: "/relatorios",
    }),
    []
  );

  useEffect(() => {
    try {
      const pacientesSalvos = localStorage.getItem(STORAGE_KEY_PACIENTES);
      const financeiroSalvo = localStorage.getItem(STORAGE_KEY_FINANCEIRO);
      const leadsSalvos = localStorage.getItem(STORAGE_KEY_LEADS);
      const agendaSalva = localStorage.getItem(STORAGE_KEY_AGENDA);

      const pacientes: Paciente[] = pacientesSalvos ? JSON.parse(pacientesSalvos) : [];
      const lancamentos: Lancamento[] = financeiroSalvo ? JSON.parse(financeiroSalvo) : [];
      const leads: Lead[] = leadsSalvos ? JSON.parse(leadsSalvos) : [];
      const consultas: Consulta[] = agendaSalva ? JSON.parse(agendaSalva) : [];

      const hojeIso = new Date().toISOString().split("T")[0];

      setTotalPacientes(pacientes.length);

      setConsultasHoje(
        consultas.filter((consulta: Consulta) => consulta.data === hojeIso).length
      );

      setPendenciasFinanceiras(
        lancamentos.filter(
          (item: Lancamento) =>
            item.status === "Pendente" || item.status === "Atrasado"
        ).length
      );

      setLeadsAtivos(
        leads.filter(
          (lead: Lead) => lead.status !== "Agendamento realizado"
        ).length
      );
    } catch (error) {
      console.error("Erro ao carregar badges da sidebar:", error);
      setTotalPacientes(0);
      setConsultasHoje(0);
      setPendenciasFinanceiras(0);
      setLeadsAtivos(0);
    }
  }, [pathname]);

  function navegar(item: string) {
    const rota = rotas[item as keyof typeof rotas];

    if (rota) {
      router.push(rota);
    }
  }

  function sair() {
    localStorage.removeItem("cohub_user");
    router.push("/login");
  }

  function getBadge(item: string) {
    switch (item) {
      case "Pacientes":
        return totalPacientes;
      case "Agenda":
        return consultasHoje;
      case "Financeiro":
        return pendenciasFinanceiras;
      case "Leads":
        return leadsAtivos;
      default:
        return null;
    }
  }

  function isAtivo(item: string) {
    const rota = rotas[item as keyof typeof rotas];
    if (!rota) return false;
    return pathname === rota;
  }

  return (
    <aside className="w-72 min-h-screen bg-[#1A1F4D] text-white p-6 flex flex-col">
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

      <nav className="space-y-3 flex-1">
        {itens.map((item) => {
          const badge = getBadge(item);
          const ativo = isAtivo(item);

          return (
            <button
              key={item}
              onClick={() => navegar(item)}
              className={`w-full text-left rounded-xl px-4 py-3 transition flex items-center justify-between ${
                ativo
                  ? "bg-[#D4AF37] text-white shadow-md"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              <span className="font-medium">{item}</span>

              {badge !== null && (
                <span
                  className={`min-w-[28px] h-7 px-2 rounded-full text-xs font-bold flex items-center justify-center ${
                    ativo
                      ? "bg-white text-[#1A1F4D]"
                      : "bg-white text-[#1A1F4D]"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="pt-6">
        <button
          onClick={sair}
          className="w-full bg-red-500 text-white px-4 py-3 rounded-xl font-bold hover:brightness-110 transition"
        >
          Sair do sistema
        </button>
      </div>
    </aside>
  );
}