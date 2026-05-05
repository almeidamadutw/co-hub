"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

export default function MentoradosPage() {
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

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando mentorados...
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
              <h1 className="text-xl font-black">Mentorados</h1>
            </div>
          </div>

          <button
            onClick={() => router.push("/usuarios")}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
          >
            + Cadastrar mentorado
          </button>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-8 py-10">
          <section className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-2xl shadow-[#07122F]/20 xl:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-28 left-14 h-60 w-60 rounded-full bg-blue-400/20 blur-3xl" />
            <div className="absolute right-1/3 top-1/2 h-36 w-36 rounded-full bg-slate-300/10 blur-2xl" />

            <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-200">
                  Gestão da jornada
                </p>

                <h2 className="mt-4 max-w-4xl text-3xl font-black leading-tight md:text-4xl xl:text-[3.05rem]">
                  Acompanhe mentorados com clareza, contexto e visão
                  estratégica.
                </h2>

                <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100 md:text-lg">
                  Centralize acessos, evolução, status e acompanhamento em uma
                  área pronta para receber os dados reais do CEO Club.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Tag>visão geral</Tag>
                  <Tag>progresso</Tag>
                  <Tag>acessos</Tag>
                  <Tag>acompanhamento</Tag>
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-white/10 bg-white/10 p-6 backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                  Resumo da área
                </p>

                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl bg-white/10 px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                      Mentorados
                    </p>

                    <strong className="mt-2 block text-3xl font-black">
                      0
                    </strong>

                    <p className="mt-1 text-sm text-blue-100">
                      Nenhum cadastro encontrado ainda.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <MiniMetric titulo="Ativos" valor="0" />
                    <MiniMetric titulo="Alertas" valor="0" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <KPI
              titulo="Mentorados cadastrados"
              valor="0"
              texto="Nenhum cadastro encontrado."
              destaque
            />

            <KPI
              titulo="Ativos"
              valor="0"
              texto="Aguardando dados reais."
            />

            <KPI
              titulo="Pendentes"
              valor="0"
              texto="Nenhum convite pendente."
            />

            <KPI
              titulo="Em atenção"
              valor="0"
              texto="Nenhum alerta registrado."
              alerta
            />
          </section>

          <section className="mt-8 rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Lista de mentorados
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  Gestão individual da jornada
                </h3>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                  Quando os mentorados forem cadastrados, eles aparecerão aqui
                  com status, progresso, último acesso e atalho para análise
                  individual.
                </p>
              </div>

              <button
                onClick={() => router.push("/usuarios")}
                className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
              >
                Cadastrar primeiro mentorado
              </button>
            </div>

            <div className="mt-6 grid gap-4 rounded-[1.7rem] border border-slate-100 bg-[#f9fafb] p-4 md:grid-cols-4">
              <FilterCard titulo="Busca" texto="Nome, e-mail ou telefone" />
              <FilterCard titulo="Status" texto="Ativo, pendente ou inativo" />
              <FilterCard titulo="Módulo" texto="Etapa atual da jornada" />
              <FilterCard titulo="Risco" texto="Atenção ou baixa atividade" />
            </div>

            <div className="mt-7 overflow-hidden rounded-[1.8rem] border border-slate-100 bg-white">
              <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr] bg-slate-50 px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                <span>Mentorado</span>
                <span>Status</span>
                <span>Progresso</span>
                <span>Último acesso</span>
              </div>

              <div className="border-t border-slate-100 bg-white px-6 py-12 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#f3f5f8] text-3xl shadow-sm">
                  ✦
                </div>

                <h4 className="mt-5 text-xl font-black">
                  Nenhum mentorado cadastrado ainda
                </h4>

                <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                  Sem dados fictícios nesta tela. A lista está pronta para
                  exibir mentorados reais quando a integração estiver ativa.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => router.push("/usuarios")}
                    className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    Cadastrar mentorado
                  </button>

                  <button
                    onClick={() => router.push("/relatorios")}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
                  >
                    Ver relatórios
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-3">
            <InsightCard
              titulo="Acompanhamento"
              texto="Veja rapidamente quem está ativo, quem está pendente e quem precisa de contato."
            />

            <InsightCard
              titulo="Evolução"
              texto="Quando conectado ao banco, o sistema mostrará avanço por módulo e etapa da jornada."
            />

            <InsightCard
              titulo="Decisão"
              texto="Use os dados para saber onde orientar, reforçar conteúdos e priorizar atendimentos."
            />
          </section>
        </div>
      </section>
    </main>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100">
      {children}
    </span>
  );
}

function MiniMetric({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
        {titulo}
      </p>

      <strong className="mt-2 block text-2xl font-black">{valor}</strong>
    </div>
  );
}

function FilterCard({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {titulo}
      </p>

      <p className="mt-2 text-sm font-bold text-[#08163F]">{texto}</p>
    </div>
  );
}

function InsightCard({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <article className="rounded-[1.7rem] bg-white p-6 shadow-xl shadow-slate-200/70">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-lg font-black text-[#08163F]">
        ◌
      </div>

      <h3 className="mt-5 text-xl font-black">{titulo}</h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {texto}
      </p>
    </article>
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
          ? "bg-rose-50 text-rose-700 shadow-slate-200/70"
          : "bg-white text-[#07122F] shadow-slate-200/70"
      }`}
    >
      <p
        className={`text-sm font-black ${
          destaque
            ? "text-blue-100"
            : alerta
            ? "text-rose-700"
            : "text-slate-500"
        }`}
      >
        {titulo}
      </p>

      <strong className="mt-4 block text-4xl font-black">{valor}</strong>

      <p
        className={`mt-3 text-sm font-medium leading-6 ${
          destaque
            ? "text-blue-100"
            : alerta
            ? "text-rose-600"
            : "text-slate-500"
        }`}
      >
        {texto}
      </p>
    </article>
  );
}