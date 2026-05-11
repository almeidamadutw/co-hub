"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import {
  gerarId,
  ResultadoSimulado,
  Simulado,
  useSimulados,
} from "@/utils/useSimulados";

function getMentoradoId(user: User) {
  return user.email || user.nome;
}

export default function PraticarPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [simuladoSelecionadoId, setSimuladoSelecionadoId] = useState("");
  const [respostasAtuais, setRespostasAtuais] = useState<Record<string, string>>(
    {}
  );
  const [resultadoAtual, setResultadoAtual] =
    useState<ResultadoSimulado | null>(null);

  const { carregando, simuladosAtivos, resultados, setResultados } =
    useSimulados();

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentor") {
  router.replace("/dashboard");
  return;
}

if (user.role !== "mentorado") {
  logoutUsuario();
  router.replace("/login");
  return;
}

    setUsuario(user);
  }, [router]);

  useEffect(() => {
    if (carregando || simuladosAtivos.length === 0) return;

    setSimuladoSelecionadoId((atual) => atual || simuladosAtivos[0].id);
  }, [carregando, simuladosAtivos]);

  const simuladoSelecionado = useMemo<Simulado | null>(() => {
    return (
      simuladosAtivos.find(
        (simulado) => simulado.id === simuladoSelecionadoId
      ) ??
      simuladosAtivos[0] ??
      null
    );
  }, [simuladosAtivos, simuladoSelecionadoId]);

  const resultadosDoUsuario = useMemo(() => {
    if (!usuario) return [];

    return resultados.filter(
      (resultado) => resultado.mentoradoId === getMentoradoId(usuario)
    );
  }, [resultados, usuario]);

  const ultimoResultadoSimulado = useMemo(() => {
    if (!simuladoSelecionado || !usuario) return null;

    return (
      resultados
        .filter(
          (resultado) =>
            resultado.mentoradoId === getMentoradoId(usuario) &&
            resultado.simuladoId === simuladoSelecionado.id
        )
        .sort(
          (a, b) =>
            new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
        )[0] ?? null
    );
  }, [resultados, simuladoSelecionado, usuario]);

  function selecionarSimulado(simuladoId: string) {
    setSimuladoSelecionadoId(simuladoId);
    setRespostasAtuais({});
    setResultadoAtual(null);
  }

  function responderQuestao(questaoId: string, alternativaId: string) {
    setRespostasAtuais((estadoAtual) => ({
      ...estadoAtual,
      [questaoId]: alternativaId,
    }));
  }

  function finalizarSimulado() {
    if (!simuladoSelecionado || !usuario) return;

    if (simuladoSelecionado.questoes.length === 0) return;

    const todasRespondidas = simuladoSelecionado.questoes.every(
      (questao) => respostasAtuais[questao.id]
    );

    if (!todasRespondidas) {
      alert("Responda todas as questões antes de finalizar.");
      return;
    }

    const acertos = simuladoSelecionado.questoes.filter((questao: any) => {
  const respostaMarcada = respostasAtuais[questao.id];

  if (questao.respostaCorretaId) {
    return respostaMarcada === questao.respostaCorretaId;
  }

  if (Array.isArray(questao.respostasCorretas)) {
    const indiceMarcado = questao.alternativas.findIndex(
      (alternativa: any) => alternativa.id === respostaMarcada
    );

    return questao.respostasCorretas.includes(indiceMarcado);
  }

  return false;
}).length;

    const total = simuladoSelecionado.questoes.length;
    const percentual = Math.round((acertos / total) * 100);

    const resultado: ResultadoSimulado = {
      id: gerarId("resultado"),
      simuladoId: simuladoSelecionado.id,
      simuladoTitulo: simuladoSelecionado.titulo,
      mentoradoId: getMentoradoId(usuario),
      mentoradoNome: usuario.nome,
      respostas: simuladoSelecionado.questoes.map((questao) => ({
        questaoId: questao.id,
        alternativaId: respostasAtuais[questao.id],
      })),
      acertos,
      total,
      percentual,
      criadoEm: new Date().toISOString(),
    };

    setResultados((estadoAtual) => [resultado, ...estadoAtual]);
    setResultadoAtual(resultado);
  }

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando simulados...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <header className="sticky top-0 z-20 flex h-[88px] items-center justify-between border-b border-slate-100 bg-white/85 px-6 backdrop-blur-xl lg:px-9">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/mentorado/dashboard")}
            className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
          >
            ← Voltar
          </button>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              Área do mentorado
            </p>
            <h1 className="text-xl font-black md:text-2xl">
              Praticar conhecimentos
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/mentorado/suporte")}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-sm"
          >
            Suporte
          </button>

          <button
            onClick={sair}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="px-6 py-10 lg:px-9">
        <section className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-9 text-white shadow-2xl shadow-[#07122F]/20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />

          <div className="relative grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-200">
                Simulados CEO Club
              </p>

              <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight">
                Pratique o conteúdo e acompanhe sua evolução.
              </h2>

              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-blue-100">
                Responda os simulados liberados pela mentora e veja seu
                desempenho em cada prática.
              </p>
            </div>

            <div className="grid gap-4 rounded-[1.8rem] border border-white/10 bg-white/10 p-6 backdrop-blur-md">
              <Metric
                titulo="Simulados disponíveis"
                valor={String(simuladosAtivos.length)}
              />

              <div className="grid grid-cols-2 gap-4">
                <MiniMetric
                  titulo="Respostas"
                  valor={String(resultadosDoUsuario.length)}
                />

                <MiniMetric
                  titulo="Última nota"
                  valor={
                    resultadosDoUsuario[0]
                      ? `${resultadosDoUsuario[0].percentual}%`
                      : "—"
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {simuladosAtivos.length === 0 ? (
          <section className="mt-8 rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/70">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#f3f5f8] text-3xl">
              ✦
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Nenhum simulado disponível ainda
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-500">
              Assim que a mentora publicar um simulado, ele aparecerá aqui.
            </p>
          </section>
        ) : (
          <section className="mt-8 grid gap-8 xl:grid-cols-[380px_1fr]">
            <aside className="rounded-[2rem] bg-white p-5 shadow-xl shadow-slate-200/70">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Simulados liberados
              </p>

              <div className="mt-5 space-y-4">
                {simuladosAtivos.map((simulado) => {
                  const ativo = simuladoSelecionado?.id === simulado.id;

                  const ultimoResultado = resultadosDoUsuario.find(
                    (resultado) => resultado.simuladoId === simulado.id
                  );

                  return (
                    <button
                      key={simulado.id}
                      type="button"
                      onClick={() => selecionarSimulado(simulado.id)}
                      className={`w-full rounded-[1.5rem] p-5 text-left transition ${
                        ativo
                          ? "bg-[#EEF2FF] text-[#08163F]"
                          : "bg-[#f9fafb] text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        {simulado.moduloTitulo || "Simulado"}
                      </p>

                      <h3 className="mt-2 text-lg font-black">
                        {simulado.titulo}
                      </h3>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                          {simulado.questoes.length} questões
                        </span>

                        {ultimoResultado && (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            {ultimoResultado.percentual}%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70">
              {simuladoSelecionado && (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                        Prática selecionada
                      </p>

                      <h2 className="mt-1 text-3xl font-black">
                        {simuladoSelecionado.titulo}
                      </h2>

                      {simuladoSelecionado.descricao && (
                        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                          {simuladoSelecionado.descricao}
                        </p>
                      )}
                    </div>

                    {ultimoResultadoSimulado && !resultadoAtual && (
                      <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-700">
                        <p className="text-xs font-black uppercase tracking-[0.18em]">
                          Último resultado
                        </p>

                        <strong className="mt-1 block text-2xl font-black">
                          {ultimoResultadoSimulado.percentual}%
                        </strong>
                      </div>
                    )}
                  </div>

                  {resultadoAtual ? (
                    <div className="mt-8 rounded-[2rem] bg-[#f9fafb] p-8 text-center">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                        Resultado
                      </p>

                      <h3 className="mt-3 text-5xl font-black text-[#08163F]">
                        {resultadoAtual.percentual}%
                      </h3>

                      <p className="mt-3 text-sm font-bold text-slate-500">
                        Você acertou {resultadoAtual.acertos} de{" "}
                        {resultadoAtual.total} questões.
                      </p>

                      <button
                        onClick={() => {
                          setResultadoAtual(null);
                          setRespostasAtuais({});
                        }}
                        className="mt-6 rounded-2xl bg-[#08163F] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
                      >
                        Refazer simulado
                      </button>
                    </div>
                  ) : simuladoSelecionado.questoes.length === 0 ? (
                    <div className="mt-8 rounded-[1.8rem] border border-dashed border-slate-200 bg-[#f9fafb] p-10 text-center">
                      <p className="text-xl font-black">
                        Este simulado ainda não possui questões.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-8 space-y-6">
                      {simuladoSelecionado.questoes.map((questao, index) => (
                        <article
                          key={questao.id}
                          className="rounded-[1.7rem] border border-slate-100 bg-[#f9fafb] p-6"
                        >
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                            Questão {index + 1}
                          </p>

                          <h3 className="mt-2 text-xl font-black">
                            {questao.enunciado}
                          </h3>

                          <div className="mt-5 grid gap-3">
                            {questao.alternativas.map((alternativa) => {
                              const marcada =
                                respostasAtuais[questao.id] === alternativa.id;

                              return (
                                <button
                                  key={alternativa.id}
                                  type="button"
                                  onClick={() =>
                                    responderQuestao(
                                      questao.id,
                                      alternativa.id
                                    )
                                  }
                                  className={`rounded-2xl p-4 text-left text-sm font-bold transition ${
                                    marcada
                                      ? "bg-[#08163F] text-white"
                                      : "bg-white text-slate-600 hover:bg-[#EEF2FF]"
                                  }`}
                                >
                                  {alternativa.id}. {alternativa.texto}
                                </button>
                              );
                            })}
                          </div>
                        </article>
                      ))}

                      <button
                        onClick={finalizarSimulado}
                        className="rounded-2xl bg-[#08163F] px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
                      >
                        Finalizar simulado
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
        {titulo}
      </p>

      <strong className="mt-2 block text-3xl font-black">{valor}</strong>
    </div>
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