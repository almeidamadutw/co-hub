"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

type StatusModulo = "Concluído" | "Em andamento" | "Bloqueado";

type ModuloMentorado = {
  nome: string;
  descricao: string;
  progresso: number;
  aulasConcluidas: number;
  totalAulas: number;
  status: StatusModulo;
};

type AtividadeMentorado = {
  titulo: string;
  tipo: "Aula" | "Simulado" | "Atividade";
  modulo: string;
  status: "Pendente" | "Concluído";
};

const modulosMock: ModuloMentorado[] = [
  {
    nome: "Mentalidade",
    descricao: "Construção de visão empresarial, postura de CEO e tomada de decisão.",
    progresso: 100,
    aulasConcluidas: 6,
    totalAulas: 6,
    status: "Concluído",
  },
  {
    nome: "Agendamento",
    descricao: "Organização da agenda, previsibilidade e controle de horários.",
    progresso: 72,
    aulasConcluidas: 5,
    totalAulas: 7,
    status: "Em andamento",
  },
  {
    nome: "Posicionamento",
    descricao: "Autoridade, diferenciação e percepção de valor no mercado.",
    progresso: 35,
    aulasConcluidas: 2,
    totalAulas: 6,
    status: "Em andamento",
  },
  {
    nome: "Marketing",
    descricao: "Estratégias para atração, relacionamento e fortalecimento da marca.",
    progresso: 0,
    aulasConcluidas: 0,
    totalAulas: 8,
    status: "Bloqueado",
  },
  {
    nome: "Vendas",
    descricao: "Conversão, negociação e fechamento com mais segurança.",
    progresso: 0,
    aulasConcluidas: 0,
    totalAulas: 7,
    status: "Bloqueado",
  },
];

const atividadesMock: AtividadeMentorado[] = [
  {
    titulo: "Assistir aula: Agenda como ativo financeiro",
    tipo: "Aula",
    modulo: "Agendamento",
    status: "Pendente",
  },
  {
    titulo: "Responder simulado de posicionamento",
    tipo: "Simulado",
    modulo: "Posicionamento",
    status: "Pendente",
  },
  {
    titulo: "Exercício: diagnóstico da agenda atual",
    tipo: "Atividade",
    modulo: "Agendamento",
    status: "Concluído",
  },
];

export default function ProgressoMentoradoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [filtro, setFiltro] = useState("Todos");

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "mentorado") {
      router.replace("/dashboard");
      return;
    }

    setUsuario(user);
  }, [router]);

  const progressoGeral = useMemo(() => {
    const total = modulosMock.reduce((soma, modulo) => soma + modulo.progresso, 0);
    return Math.round(total / modulosMock.length);
  }, []);

  const aulasConcluidas = modulosMock.reduce(
    (total, modulo) => total + modulo.aulasConcluidas,
    0
  );

  const totalAulas = modulosMock.reduce(
    (total, modulo) => total + modulo.totalAulas,
    0
  );

  const modulosConcluidos = modulosMock.filter(
    (modulo) => modulo.status === "Concluído"
  ).length;

  const atividadesPendentes = atividadesMock.filter(
    (atividade) => atividade.status === "Pendente"
  ).length;

  const modulosFiltrados = modulosMock.filter((modulo) => {
    if (filtro === "Todos") return true;
    return modulo.status === filtro;
  });

  const proximoModulo = modulosMock.find(
    (modulo) => modulo.status === "Em andamento"
  );

  const statusClasses: Record<StatusModulo, string> = {
    "Concluído": "bg-emerald-50 text-emerald-700",
    "Em andamento": "bg-blue-50 text-blue-700",
    "Bloqueado": "bg-slate-100 text-slate-500",
  };

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando seu progresso...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-8 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] to-[#12317C] text-sm font-black text-white shadow-lg">
            CC
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
              Área do mentorado
            </p>
            <h1 className="text-xl font-black">Meu progresso</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/mentorado/dashboard")}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#08163F] shadow-sm transition hover:shadow-md"
          >
            Voltar ao painel
          </button>

          <button
            onClick={() => {
              logoutUsuario();
              router.replace("/login");
            }}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="px-8 py-10">
        <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-2xl shadow-[#07122F]/20">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">
              Jornada CEO Club
            </p>

            <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight">
              {usuario.nome}, sua evolução está em {progressoGeral}%.
            </h2>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-blue-100">
              Continue avançando nos módulos, concluindo aulas e praticando os
              conhecimentos para transformar sua rotina em uma gestão mais
              estratégica.
            </p>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-black text-blue-100">
                  Progresso geral
                </span>
                <span className="text-sm font-black text-white">
                  {progressoGeral}%
                </span>
              </div>

              <div className="h-5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-white via-blue-200 to-[#57A8FF]"
                  style={{ width: `${progressoGeral}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Próximo passo
            </p>

            <h3 className="mt-1 text-2xl font-black">
              Continue de onde parou
            </h3>

            {proximoModulo ? (
              <div className="mt-6 rounded-[1.5rem] bg-[#f9fafb] p-6">
                <p className="text-sm font-black text-slate-500">
                  Módulo atual
                </p>

                <h4 className="mt-2 text-3xl font-black">
                  {proximoModulo.nome}
                </h4>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {proximoModulo.descricao}
                </p>

                <div className="mt-5 h-4 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#071A55] to-[#1D7BFF]"
                    style={{ width: `${proximoModulo.progresso}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between text-sm font-black">
                  <span>{proximoModulo.progresso}% concluído</span>
                  <span>
                    {proximoModulo.aulasConcluidas}/{proximoModulo.totalAulas} aulas
                  </span>
                </div>

                <button
                  onClick={() => router.push("/mentorado/modulos")}
                  className="mt-6 rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                >
                  Continuar módulo
                </button>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] bg-emerald-50 p-6">
                <p className="text-lg font-black text-emerald-700">
                  Todos os módulos disponíveis foram concluídos.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <KPI
            titulo="Aulas concluídas"
            valor={`${aulasConcluidas}/${totalAulas}`}
            texto="Aulas finalizadas até agora."
            destaque
          />

          <KPI
            titulo="Módulos concluídos"
            valor={`${modulosConcluidos}/${modulosMock.length}`}
            texto="Módulos totalmente finalizados."
          />

          <KPI
            titulo="Atividades pendentes"
            valor={atividadesPendentes}
            texto="Tarefas que ainda precisam de atenção."
            alerta={atividadesPendentes > 0}
          />

          <KPI
            titulo="Simulados"
            valor="3"
            texto="Simulados realizados na jornada."
          />
        </section>

        <section className="mt-8 rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Módulos
              </p>

              <h3 className="mt-1 text-2xl font-black">
                Minha evolução por módulo
              </h3>
            </div>

            <select
              value={filtro}
              onChange={(event) => setFiltro(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none"
            >
              <option>Todos</option>
              <option>Concluído</option>
              <option>Em andamento</option>
              <option>Bloqueado</option>
            </select>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {modulosFiltrados.map((moduloItem) => (
              <article
                key={moduloItem.nome}
                className="rounded-[1.7rem] border border-slate-100 bg-[#f9fafb] p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-xl font-black">{moduloItem.nome}</h4>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {moduloItem.descricao}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                      statusClasses[moduloItem.status]
                    }`}
                  >
                    {moduloItem.status}
                  </span>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Progresso
                    </span>
                    <span className="text-sm font-black text-[#071A55]">
                      {moduloItem.progresso}%
                    </span>
                  </div>

                  <div className="h-4 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${
                        moduloItem.status === "Bloqueado"
                          ? "bg-slate-300"
                          : "bg-gradient-to-r from-[#071A55] to-[#1D7BFF]"
                      }`}
                      style={{ width: `${moduloItem.progresso}%` }}
                    />
                  </div>
                </div>

                <p className="mt-4 text-sm font-bold text-slate-500">
                  {moduloItem.aulasConcluidas}/{moduloItem.totalAulas} aulas concluídas
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Atividades
            </p>

            <h3 className="mt-1 text-2xl font-black">
              Pendências e conclusões
            </h3>

            <div className="mt-6 space-y-4">
              {atividadesMock.map((atividade) => (
                <div
                  key={atividade.titulo}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] bg-[#f9fafb] p-5"
                >
                  <div>
                    <p className="font-black">{atividade.titulo}</p>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {atividade.tipo} · {atividade.modulo}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      atividade.status === "Concluído"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {atividade.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Leitura da mentoria
            </p>

            <h3 className="mt-1 text-2xl font-black">
              Como interpretar seu avanço
            </h3>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-blue-50 p-5">
                <p className="font-black text-blue-700">
                  Módulos concluídos consolidam base
                </p>
                <p className="mt-2 text-sm leading-6 text-blue-600">
                  Quando um módulo chega a 100%, ele representa uma etapa já
                  trabalhada dentro da jornada.
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 p-5">
                <p className="font-black text-amber-700">
                  Pendências reduzem ritmo de evolução
                </p>
                <p className="mt-2 text-sm leading-6 text-amber-600">
                  Atividades e simulados ajudam a transformar aula assistida em
                  prática aplicada.
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-5">
                <p className="font-black text-emerald-700">
                  Consistência vence velocidade
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-600">
                  O ideal é manter avanço semanal, mesmo que em pequenos passos.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function KPI({
  titulo,
  valor,
  texto,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: React.ReactNode;
  texto: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <article
      className={`rounded-[1.7rem] p-6 shadow-xl ${
        destaque
          ? "bg-[#071A55] text-white shadow-[#071A55]/20"
          : alerta
          ? "bg-amber-50 text-amber-700 shadow-slate-200/70"
          : "bg-white text-[#07122F] shadow-slate-200/70"
      }`}
    >
      <p
        className={`text-sm font-black ${
          destaque
            ? "text-blue-100"
            : alerta
            ? "text-amber-700"
            : "text-slate-500"
        }`}
      >
        {titulo}
      </p>

      <strong className="mt-4 block text-4xl font-black">{valor}</strong>

      <p
        className={`mt-3 text-sm font-medium ${
          destaque
            ? "text-blue-100"
            : alerta
            ? "text-amber-600"
            : "text-slate-500"
        }`}
      >
        {texto}
      </p>
    </article>
  );
}