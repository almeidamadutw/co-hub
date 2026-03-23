"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type UserRole = "admin" | "recepcao" | "dentista" | "financeiro" | "crc";

type User = {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
};

type CardProps = {
  titulo: string;
  texto: string;
};

function Card({ titulo, texto }: CardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold text-[#1A1F4D]">{titulo}</h2>
      <p className="text-gray-500 mt-2">{texto}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("cohub_user");

    if (!user) {
      router.push("/login");
      return;
    }

    setUsuario(JSON.parse(user) as User);
  }, [router]);

  function sair() {
    localStorage.removeItem("cohub_user");
    router.push("/login");
  }

  function renderCardsPorPerfil(role: UserRole) {
    switch (role) {
      case "admin":
        return (
          <>
            <Card titulo="Agenda do dia" texto="12 consultas agendadas" />
            <Card titulo="Pacientes" texto="186 cadastrados" />
            <Card titulo="Financeiro" texto="R$ 18.450,00 no mês" />
            <Card titulo="Usuários" texto="5 perfis ativos no sistema" />
          </>
        );

      case "recepcao":
        return (
          <>
            <Card titulo="Agenda do dia" texto="10 consultas confirmadas" />
            <Card titulo="Pacientes" texto="6 novos cadastros hoje" />
            <Card titulo="Retornos" texto="4 pacientes aguardando retorno" />
          </>
        );

      case "dentista":
        return (
          <>
            <Card titulo="Agenda clínica" texto="7 atendimentos hoje" />
            <Card titulo="Protocolos" texto="3 protocolos em andamento" />
            <Card titulo="Evoluções" texto="2 pacientes precisam de atualização" />
          </>
        );

      case "financeiro":
        return (
          <>
            <Card titulo="Faturamento" texto="R$ 18.450,00 no mês" />
            <Card titulo="Pagamentos pendentes" texto="8 lançamentos pendentes" />
            <Card titulo="Relatórios" texto="3 relatórios disponíveis" />
          </>
        );

      case "crc":
        return (
          <>
            <Card titulo="Agenda do dia" texto="9 agendamentos confirmados" />
            <Card titulo="Leads" texto="14 leads em acompanhamento" />
            <Card titulo="Financeiro" texto="5 pacientes com pendência" />
            <Card titulo="Conversão" texto="72% de leads convertidos este mês" />
          </>
        );

      default:
        return null;
    }
  }

  if (!usuario) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 text-[#1A1F4D]">
        Carregando...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-gray-100 text-[#1A1F4D]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Olá, {usuario.nome}</h1>
            <p className="mt-2 text-gray-600">
              Você entrou como{" "}
              <span className="font-semibold capitalize">{usuario.role}</span>
            </p>
          </div>

          <button
            onClick={sair}
            className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
          >
            Sair
          </button>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {renderCardsPorPerfil(usuario.role)}
        </div>
      </section>
    </main>
  );
}