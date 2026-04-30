"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

type Mentorado = {
  id: string;
  nome: string;
  area: string;
  progresso: number;
  sessoes: number;
  acoes: number;
  proximoEncontro: string;
  status: "Excelente" | "Em evolução" | "Atenção";
};

const mentoradosMock: Mentorado[] = [
  {
    id: "joao",
    nome: "Dr. João Almeida",
    area: "Vendas",
    progresso: 72,
    sessoes: 8,
    acoes: 21,
    proximoEncontro: "06/05 às 14h",
    status: "Em evolução",
  },
  {
    id: "ana",
    nome: "Dra. Ana Martins",
    area: "Marketing",
    progresso: 44,
    sessoes: 4,
    acoes: 9,
    proximoEncontro: "08/05 às 10h",
    status: "Atenção",
  },
  {
    id: "carlos",
    nome: "Dr. Carlos Vieira",
    area: "Posicionamento",
    progresso: 91,
    sessoes: 11,
    acoes: 34,
    proximoEncontro: "10/05 às 16h",
    status: "Excelente",
  },
  {
    id: "julia",
    nome: "Dra. Julia Rocha",
    area: "Fechamento",
    progresso: 58,
    sessoes: 6,
    acoes: 16,
    proximoEncontro: "12/05 às 9h",
    status: "Em evolução",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentorado") {
      router.replace("/mentorado/dashboard");
      return;
    }

    if (user.role !== "mentor") {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);
  }, [router]);

  const resumo = useMemo(() => {
    const total = mentoradosMock.length;

    const progressoMedio = Math.round(
      mentoradosMock.reduce((acc, item) => acc + item.progresso, 0) / total
    );

    const sessoes = mentoradosMock.reduce((acc, item) => acc + item.sessoes, 0);
    const acoes = mentoradosMock.reduce((acc, item) => acc + item.acoes, 0);
    const atencao = mentoradosMock.filter((m) => m.status === "Atenção").length;
    const excelentes = mentoradosMock.filter(
      (m) => m.status === "Excelente"
    ).length;

    return { total, progressoMedio, sessoes, acoes, atencao, excelentes };
  }, []);

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando painel da mentora...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-8 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] to-[#12317C] text-sm font-black text-white shadow-lg">
              CC
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
                Área da mentora
              </p>
              <h1 className="text-xl font-black">Painel estratégico</h1>
            </div>
          </div>

          <button
            onClick={sair}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Sair
          </button>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-8 py-10">
          <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-gray-200 bg-white shadow-lg">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D9DEE7] to-[#9CA3AF] text-3xl font-black text-white">
                  {usuario.nome.charAt(0)}
                </div>
              </div>

              <div>
                <h2 className="text-4xl font-black tracking-tight text-[#050816]">
                  Bem-vinda de volta, Luciana
                </h2>
                <p className="mt-2 text-lg font-medium text-gray-500">
                  Aqui está a visão completa da evolução dos mentorados.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push("/mentorados")}
              className="rounded-2xl bg-gradient-to-b from-[#F3F4F6] via-[#D1D5DB] to-[#9CA3AF] px-6 py-4 font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Gerenciar mentorados →
            </button>
          </section>

          <section className="mb-7 grid gap-5 xl:grid-cols-5">
            <KPI titulo="Mentorados ativos" valor={resumo.total} destaque />
            <KPI titulo="Evolução média" valor={`${resumo.progressoMedio}%`} />
            <KPI titulo="Sessões concluídas" valor={resumo.sessoes} />
            <KPI titulo="Ações executadas" valor={resumo.acoes} />
            <KPI titulo="Em atenção" valor={resumo.atencao} alerta />
          </section>

          <section className="mb-8 rounded-[26px] bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-500">
                Evolução geral dos mentorados
              </p>
              <p className="text-sm font-black text-[#08163F]">
                {resumo.progressoMedio}%
              </p>
            </div>

            <div className="h-5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                style={{ width: `${resumo.progressoMedio}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-6 text-sm font-semibold text-gray-500">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#12317C]" />
                Evolução atual
              </span>

              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-gray-300" />
                Espaço de crescimento
              </span>

              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                Atenção necessária
              </span>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card titulo="Mentorados em destaque">
              <div className="space-y-4">
                {mentoradosMock.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => router.push(`/mentorados/${m.id}`)}
                    className="w-full rounded-2xl border border-gray-100 bg-[#f9fafb] p-4 text-left transition hover:border-[#12317C]/20 hover:bg-white hover:shadow-md"
                  >
                    <div className="mb-3 flex justify-between gap-4">
                      <div>
                        <p className="font-black text-[#08163F]">{m.nome}</p>
                        <p className="text-sm font-medium text-gray-500">
                          Área atual: {m.area}
                        </p>
                      </div>

                      <StatusBadge status={m.status} />
                    </div>

                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-semibold text-gray-500">
                        Progresso
                      </span>
                      <span className="font-black text-[#08163F]">
                        {m.progresso}%
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] to-[#12317C]"
                        style={{ width: `${m.progresso}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card titulo="Próximos encontros">
              <div className="space-y-4">
                {mentoradosMock.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => router.push(`/mentorados/${m.id}`)}
                    className="flex w-full items-center justify-between rounded-2xl bg-[#f9fafb] p-4 text-left transition hover:bg-white hover:shadow-md"
                  >
                    <div>
                      <p className="font-black text-[#08163F]">{m.nome}</p>
                      <p className="text-sm font-semibold text-gray-500">
                        {m.area}
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#08163F] shadow-sm">
                      {m.proximoEncontro}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            <Card titulo="Desempenho por área">
              <div className="space-y-4">
                <Area nome="Vendas" progresso={76} />
                <Area nome="Marketing" progresso={52} />
                <Area nome="Posicionamento" progresso={88} />
                <Area nome="Fechamento" progresso={61} />
              </div>
            </Card>

            <Card titulo="Insights da mentora">
              <div className="space-y-4">
                <Insight texto="Marketing está com execução abaixo da média geral." />
                <Insight texto="Ana precisa de acompanhamento próximo nesta semana." />
                <Insight texto="Carlos está pronto para avançar para uma etapa mais estratégica." />
                <Insight texto="Vendas segue como área com maior potencial de crescimento." />
              </div>
            </Card>

            <Card titulo="Mentorados que precisam de atenção">
              <div className="space-y-3">
                {mentoradosMock
                  .filter((m) => m.status === "Atenção" || m.progresso < 50)
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => router.push(`/mentorados/${m.id}`)}
                      className="flex w-full items-center justify-between rounded-2xl bg-red-50 p-4 text-left transition hover:bg-red-100"
                    >
                      <div>
                        <p className="font-black text-red-800">{m.nome}</p>
                        <p className="text-sm font-semibold text-red-500">
                          Travada em {m.area}
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-red-700">
                        {m.progresso}%
                      </span>
                    </button>
                  ))}
              </div>
            </Card>

            <Card titulo="Ações rápidas">
              <div className="grid gap-4 md:grid-cols-2">
                <ActionButton
                  label="Novo mentorado"
                  onClick={() => router.push("/mentorados")}
                />
                <ActionButton
                  label="Ver agenda"
                  onClick={() => router.push("/agenda")}
                />
                <ActionButton
                  label="Abrir progresso"
                  onClick={() => router.push("/progresso")}
                />
                <ActionButton
                  label="Financeiro"
                  onClick={() => router.push("/financeiro")}
                />
              </div>
            </Card>
          </section>
        </div>
      </section>
    </main>
  );
}

function KPI({
  titulo,
  valor,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: React.ReactNode;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-[26px] p-6 shadow-lg ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : alerta
          ? "bg-red-50 text-red-800"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          destaque ? "text-[#C9CED6]" : alerta ? "text-red-500" : "text-gray-500"
        }`}
      >
        {titulo}
      </p>

      <p className="mt-4 text-3xl font-black">{valor}</p>
    </div>
  );
}

function Card({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-6">
        <h3 className="text-2xl font-black text-[#050816]">{titulo}</h3>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}

function Area({ nome, progresso }: { nome: string; progresso: number }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4">
      <div className="mb-2 flex justify-between">
        <p className="font-black text-[#08163F]">{nome}</p>
        <p className="font-black text-[#08163F]">{progresso}%</p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] to-[#12317C]"
          style={{ width: `${progresso}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Mentorado["status"] }) {
  const classes = {
    Excelente: "bg-green-100 text-green-700",
    "Em evolução": "bg-blue-100 text-blue-700",
    Atenção: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}>
      {status}
    </span>
  );
}

function Insight({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-[#12317C]/10 bg-[#f8fafc] p-4">
      <p className="text-sm font-semibold leading-relaxed text-gray-600">
        💡 {texto}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-[#f9fafb] p-5 text-left font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
    >
      {label} →
    </button>
  );
}