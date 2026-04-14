"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, User, logoutUsuario } from "../../utils/auth";

type Mentorado = {
  nome: string;
  etapa: string;
  progresso: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.push("/login");
      return;
    }

    setUsuario(user);

    setMentorados([
      { nome: "Dr. João", etapa: "Vendas", progresso: 70 },
      { nome: "Dra. Ana", etapa: "Marketing", progresso: 45 },
      { nome: "Dr. Carlos", etapa: "Posicionamento", progresso: 90 },
      { nome: "Dra. Julia", etapa: "Fechamento", progresso: 30 },
    ]);
  }, [router]);

  function sair() {
    logoutUsuario();
    router.push("/login");
  }

  if (!usuario) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Carregando...
      </main>
    );
  }

  const totalMentorados = mentorados.length;
  const progressoMedio =
    mentorados.reduce((acc, m) => acc + m.progresso, 0) /
    (mentorados.length || 1);
  const mentoradosAtrasados = mentorados.filter((m) => m.progresso < 50).length;

  const perfilLabel = usuario.role === "mentor" ? "mentor" : "mentorado";

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#0B1D59]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 p-6 md:p-8">
        <div className="mb-8 rounded-[28px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white shadow-xl">
          <h1 className="text-3xl font-bold">Bem-vindo, {usuario.nome}</h1>
          <p className="mt-2 text-[#C9CED6]">
            Você está acessando como{" "}
            <span className="font-semibold">{perfilLabel}</span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-6">
          <KPI titulo="Mentorados ativos" valor={totalMentorados} />
          <KPI titulo="Progresso médio" valor={`${Math.round(progressoMedio)}%`} />
          <KPI titulo="Abaixo do esperado" valor={mentoradosAtrasados} />
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-5">Evolução dos mentorados</h2>

          <div className="space-y-4">
            {mentorados.map((m, index) => (
              <div key={index} className="p-4 rounded-2xl border bg-[#f9fafb]">
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="font-semibold">{m.nome}</p>
                    <p className="text-sm text-gray-500">Etapa: {m.etapa}</p>
                  </div>

                  <span className="font-bold text-[#08163F]">{m.progresso}%</span>
                </div>

                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#5B7FFF] to-[#12317C]"
                    style={{ width: `${m.progresso}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={sair}
            className="rounded-2xl px-6 py-3 font-bold text-[#08163F] shadow-md transition hover:brightness-105"
            style={{
              background:
                "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
            }}
          >
            Sair
          </button>
        </div>
      </section>
    </main>
  );
}

function KPI({ titulo, valor }: { titulo: string; valor: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-md">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="text-2xl font-bold mt-2 text-[#08163F]">{valor}</p>
    </div>
  );
}