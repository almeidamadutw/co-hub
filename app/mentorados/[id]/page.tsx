  "use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

type Mentorado = {
  id: string;
  nome: string;
  especialidade: string;
  area: string;
  progresso: number;
  sessoes: number;
  acoes: number;
  status: "Excelente" | "Em evolução" | "Atenção";
  proximoEncontro: string;
  email: string;
  telefone: string;
  observacao: string;
};

const mentoradosMock: Mentorado[] = [
  {
    id: "joao",
    nome: "Dr. João Almeida",
    especialidade: "Implantodontia",
    area: "Vendas",
    progresso: 72,
    sessoes: 8,
    acoes: 21,
    status: "Em evolução",
    proximoEncontro: "06/05 às 14h",
    email: "joao@ceoclub.com",
    telefone: "(15) 99999-0001",
    observacao:
      "Bom ritmo de evolução. Precisa transformar o posicionamento em rotina comercial.",
  },
  {
    id: "ana",
    nome: "Dra. Ana Martins",
    especialidade: "Harmonização",
    area: "Marketing",
    progresso: 44,
    sessoes: 4,
    acoes: 9,
    status: "Atenção",
    proximoEncontro: "08/05 às 10h",
    email: "ana@ceoclub.com",
    telefone: "(15) 99999-0002",
    observacao:
      "Está com execução abaixo do esperado. Precisa de acompanhamento mais próximo nesta semana.",
  },
  {
    id: "carlos",
    nome: "Dr. Carlos Vieira",
    especialidade: "Ortodontia",
    area: "Posicionamento",
    progresso: 91,
    sessoes: 11,
    acoes: 34,
    status: "Excelente",
    proximoEncontro: "10/05 às 16h",
    email: "carlos@ceoclub.com",
    telefone: "(15) 99999-0003",
    observacao:
      "Mentorado em ótima fase. Pode avançar para uma etapa mais estratégica.",
  },
  {
    id: "julia",
    nome: "Dra. Julia Rocha",
    especialidade: "Clínica Geral",
    area: "Fechamento",
    progresso: 58,
    sessoes: 6,
    acoes: 16,
    status: "Em evolução",
    proximoEncontro: "12/05 às 9h",
    email: "julia@ceoclub.com",
    telefone: "(15) 99999-0004",
    observacao:
      "Boa evolução, mas ainda precisa ganhar consistência nas ações semanais.",
  },
];

export default function PerfilMentoradoPage() {
  const router = useRouter();
  const params = useParams();

  const [usuario, setUsuario] = useState<User | null>(null);

  const mentoradoId = String(params.id);

  const mentorado = useMemo(() => {
    return mentoradosMock.find((item) => item.id === mentoradoId);
  }, [mentoradoId]);

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

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando perfil do mentorado...
      </main>
    );
  }

  if (!mentorado) {
    return (
      <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
        <Sidebar nome={usuario.nome} role={usuario.role} />

        <section className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-lg rounded-[30px] bg-white p-8 text-center shadow-lg">
            <h1 className="text-3xl font-black">Mentorado não encontrado</h1>
            <p className="mt-3 text-gray-500">
              Esse perfil não existe ou ainda não foi cadastrado.
            </p>

            <button
              onClick={() => router.push("/mentorados")}
              className="mt-6 rounded-2xl bg-[#08163F] px-6 py-3 font-bold text-white"
            >
              Voltar para mentorados
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-8 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/mentorados")}
              className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
            >
              ← Voltar
            </button>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
                Perfil do mentorado
              </p>
              <h1 className="text-xl font-black">{mentorado.nome}</h1>
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
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-6">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-lg">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D9DEE7] to-[#9CA3AF] text-3xl font-black text-white">
                    {mentorado.nome.charAt(0)}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                    {mentorado.especialidade}
                  </p>
                  <h2 className="mt-2 text-4xl font-black">{mentorado.nome}</h2>
                  <p className="mt-2 text-[#D9DEE7]">
                    Etapa atual:{" "}
                    <span className="font-bold text-white">{mentorado.area}</span>
                  </p>
                </div>
              </div>

              <StatusBadge status={mentorado.status} />
            </div>
          </section>

          <section className="mb-7 grid gap-5 xl:grid-cols-4">
            <KPI titulo="Progresso" valor={`${mentorado.progresso}%`} destaque />
            <KPI titulo="Sessões" valor={mentorado.sessoes} />
            <KPI titulo="Ações executadas" valor={mentorado.acoes} />
            <KPI titulo="Próximo encontro" valor={mentorado.proximoEncontro} />
          </section>

          <section className="mb-8 rounded-[26px] bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-500">
                Evolução individual
              </p>
              <p className="text-sm font-black text-[#08163F]">
                {mentorado.progresso}%
              </p>
            </div>

            <div className="h-5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                style={{ width: `${mentorado.progresso}%` }}
              />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card titulo="Dados do mentorado">
              <Info label="Nome" value={mentorado.nome} />
              <Info label="E-mail" value={mentorado.email} />
              <Info label="Telefone" value={mentorado.telefone} />
              <Info label="Especialidade" value={mentorado.especialidade} />
            </Card>

            <Card titulo="Anotações da mentora">
              <div className="rounded-2xl bg-[#f9fafb] p-5">
                <p className="text-sm font-semibold leading-relaxed text-gray-600">
                  {mentorado.observacao}
                </p>
              </div>

              <button className="mt-5 rounded-2xl bg-[#08163F] px-5 py-3 font-black text-white transition hover:brightness-110">
                + Nova anotação
              </button>
            </Card>

            <Card titulo="Trilha atual">
              <Etapa titulo="Boas-vindas" progresso={100} status="Concluído" />
              <Etapa titulo="Posicionamento" progresso={80} status="Concluído" />
              <Etapa titulo={mentorado.area} progresso={mentorado.progresso} status="Em andamento" />
              <Etapa titulo="Escala" progresso={0} status="Bloqueado" />
            </Card>

            <Card titulo="Ações rápidas">
              <div className="grid gap-4 md:grid-cols-2">
                <ActionButton label="Agendar sessão" />
                <ActionButton label="Enviar tarefa" />
                <ActionButton label="Abrir progresso" />
                <ActionButton label="Gerar relatório" />
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
}: {
  titulo: string;
  valor: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-[26px] p-6 shadow-lg ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p className={`text-sm font-bold ${destaque ? "text-[#C9CED6]" : "text-gray-500"}`}>
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

      <div className="space-y-4 p-6">{children}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <p className="mt-1 font-black text-[#08163F]">{value}</p>
    </div>
  );
}

function Etapa({
  titulo,
  progresso,
  status,
}: {
  titulo: string;
  progresso: number;
  status: "Concluído" | "Em andamento" | "Bloqueado";
}) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4">
      <div className="mb-2 flex justify-between gap-4">
        <div>
          <p className="font-black text-[#08163F]">{titulo}</p>
          <p className="text-sm font-semibold text-gray-500">{status}</p>
        </div>

        <span className="font-black text-[#08163F]">{progresso}%</span>
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
    <span className={`rounded-full px-4 py-2 text-sm font-black ${classes[status]}`}>
      {status}
    </span>
  );
}

function ActionButton({ label }: { label: string }) {
  return (
    <button className="rounded-2xl bg-[#f9fafb] p-5 text-left font-black text-[#08163F] transition hover:bg-white hover:shadow-md">
      {label} →
    </button>
  );
}