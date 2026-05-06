"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, usuarioTemPermissao, User } from "@/utils/auth";
import { useCeoClubDados } from "@/utils/useCeoClubDados";
import {
  gerarId,
  Simulado,
  QuestaoSimulado,
  useSimulados,
} from "@/utils/useSimulados";

const simuladoInicial = {
  titulo: "",
  descricao: "",
  moduloId: "",
};

const questaoInicial = {
  enunciado: "",
  alternativa1: "",
  alternativa2: "",
  alternativa3: "",
  alternativa4: "",
  correta: "1",
};

export default function SimuladosPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [simuladoAbertoId, setSimuladoAbertoId] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [novoSimulado, setNovoSimulado] = useState(simuladoInicial);
  const [questaoPorSimulado, setQuestaoPorSimulado] = useState<
    Record<string, typeof questaoInicial>
  >({});
  const [erro, setErro] = useState("");

  const { modulos, carregando: carregandoDados } = useCeoClubDados();
  const {
    carregando: carregandoSimulados,
    simulados,
    setSimulados,
    totalQuestoes,
    resultados,
  } = useSimulados();

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!usuarioTemPermissao(user, ["mentor"])) {
      router.replace("/dashboard");
      return;
    }

    setUsuario(user);
  }, [router]);

  const simuladosPublicados = useMemo(() => {
    return simulados.filter((simulado) => simulado.ativo).length;
  }, [simulados]);

  const mediaResultados = useMemo(() => {
    if (resultados.length === 0) return 0;

    const soma = resultados.reduce(
      (total, resultado) => total + resultado.percentual,
      0
    );

    return Math.round(soma / resultados.length);
  }, [resultados]);

  function criarSimulado(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!novoSimulado.titulo.trim()) {
      setErro("Informe o título do simulado.");
      return;
    }

    const moduloSelecionado = modulos.find(
      (modulo) => modulo.id === novoSimulado.moduloId
    );

    const simulado: Simulado = {
      id: gerarId("simulado"),
      titulo: novoSimulado.titulo.trim(),
      descricao: novoSimulado.descricao.trim(),
      moduloId: moduloSelecionado?.id ?? "",
      moduloTitulo: moduloSelecionado?.titulo ?? "",
      ativo: false,
      questoes: [],
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    setSimulados((estadoAtual) => [simulado, ...estadoAtual]);
    setNovoSimulado(simuladoInicial);
    setMostrarFormulario(false);
    setSimuladoAbertoId(simulado.id);
  }

  function excluirSimulado(simuladoId: string) {
    setSimulados((estadoAtual) =>
      estadoAtual.filter((simulado) => simulado.id !== simuladoId)
    );

    if (simuladoAbertoId === simuladoId) {
      setSimuladoAbertoId("");
    }
  }

  function alternarPublicacao(simuladoId: string) {
    setSimulados((estadoAtual) =>
      estadoAtual.map((simulado) =>
        simulado.id === simuladoId
          ? {
              ...simulado,
              ativo: !simulado.ativo,
              atualizadoEm: new Date().toISOString(),
            }
          : simulado
      )
    );
  }

  function atualizarQuestaoTemporaria(
    simuladoId: string,
    campo: keyof typeof questaoInicial,
    valor: string
  ) {
    setQuestaoPorSimulado((estadoAtual) => ({
      ...estadoAtual,
      [simuladoId]: {
        ...(estadoAtual[simuladoId] ?? questaoInicial),
        [campo]: valor,
      },
    }));
  }

  function adicionarQuestao(simuladoId: string) {
    setErro("");

    const questaoTemp = questaoPorSimulado[simuladoId] ?? questaoInicial;

    if (!questaoTemp.enunciado.trim()) {
      setErro("Informe o enunciado da questão.");
      return;
    }

    const alternativasTexto = [
      questaoTemp.alternativa1,
      questaoTemp.alternativa2,
      questaoTemp.alternativa3,
      questaoTemp.alternativa4,
    ].map((item) => item.trim());

    if (alternativasTexto.some((item) => !item)) {
      setErro("Preencha as quatro alternativas da questão.");
      return;
    }

    const alternativas = alternativasTexto.map((texto, index) => ({
      id: `${index + 1}`,
      texto,
    }));

    const questao: QuestaoSimulado = {
      id: gerarId("questao"),
      enunciado: questaoTemp.enunciado.trim(),
      alternativas,
      respostaCorretaId: questaoTemp.correta,
    };

    setSimulados((estadoAtual) =>
      estadoAtual.map((simulado) =>
        simulado.id === simuladoId
          ? {
              ...simulado,
              questoes: [...simulado.questoes, questao],
              atualizadoEm: new Date().toISOString(),
            }
          : simulado
      )
    );

    setQuestaoPorSimulado((estadoAtual) => ({
      ...estadoAtual,
      [simuladoId]: questaoInicial,
    }));
  }

  function removerQuestao(simuladoId: string, questaoId: string) {
    setSimulados((estadoAtual) =>
      estadoAtual.map((simulado) =>
        simulado.id === simuladoId
          ? {
              ...simulado,
              questoes: simulado.questoes.filter(
                (questao) => questao.id !== questaoId
              ),
              atualizadoEm: new Date().toISOString(),
            }
          : simulado
      )
    );
  }

  if (!usuario || carregandoDados || carregandoSimulados) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando simulados...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-8 backdrop-blur-xl">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">
              Área da mentora
            </p>
            <h1 className="text-xl font-black">Simulados</h1>
          </div>

          <button
            onClick={() => setMostrarFormulario((atual) => !atual)}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
          >
            {mostrarFormulario ? "Fechar" : "+ Novo simulado"}
          </button>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-8 py-10">
          <section className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-9 text-white shadow-2xl shadow-[#07122F]/20">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />

            <div className="relative grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-200">
                  Prática e avaliação
                </p>

                <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight">
                  Crie simulados para medir entendimento e evolução dos mentorados.
                </h2>

                <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-blue-100">
                  Monte perguntas, vincule aos módulos e publique para o
                  mentorado responder na área de prática.
                </p>
              </div>

              <div className="grid gap-4 rounded-[1.8rem] border border-white/10 bg-white/10 p-6 backdrop-blur-md">
                <Metric titulo="Simulados" valor={String(simulados.length)} />
                <div className="grid grid-cols-3 gap-4">
                  <MiniMetric titulo="Publicados" valor={String(simuladosPublicados)} />
                  <MiniMetric titulo="Questões" valor={String(totalQuestoes)} />
                  <MiniMetric titulo="Média" valor={`${mediaResultados}%`} />
                </div>
              </div>
            </div>
          </section>

          {mostrarFormulario && (
            <form
              onSubmit={criarSimulado}
              className="mt-8 rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70"
            >
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Novo simulado
              </p>

              <h3 className="mt-1 text-2xl font-black">
                Criar avaliação prática
              </h3>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Título do simulado"
                  value={novoSimulado.titulo}
                  onChange={(e) =>
                    setNovoSimulado({
                      ...novoSimulado,
                      titulo: e.target.value,
                    })
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C]"
                />

                <select
                  value={novoSimulado.moduloId}
                  onChange={(e) =>
                    setNovoSimulado({
                      ...novoSimulado,
                      moduloId: e.target.value,
                    })
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C]"
                >
                  <option value="">Vincular a um módulo</option>

                  {modulos.map((modulo) => (
                    <option key={modulo.id} value={modulo.id}>
                      {modulo.titulo}
                    </option>
                  ))}
                </select>

                <textarea
                  placeholder="Descrição do simulado"
                  value={novoSimulado.descricao}
                  onChange={(e) =>
                    setNovoSimulado({
                      ...novoSimulado,
                      descricao: e.target.value,
                    })
                  }
                  className="min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C] md:col-span-2"
                />
              </div>

              {erro && (
                <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                  {erro}
                </p>
              )}

              <button
                type="submit"
                className="mt-6 rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
              >
                Criar simulado
              </button>
            </form>
          )}

          <section className="mt-8 rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Banco de simulados
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  Simulados cadastrados
                </h3>
              </div>

              <button
                onClick={() => setMostrarFormulario(true)}
                className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
              >
                + Criar simulado
              </button>
            </div>

            {erro && !mostrarFormulario && (
              <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                {erro}
              </p>
            )}

            {simulados.length === 0 ? (
              <div className="mt-7 rounded-[1.8rem] border border-dashed border-slate-200 bg-[#f9fafb] p-10 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white text-3xl shadow-sm">
                  ✦
                </div>

                <h4 className="mt-5 text-xl font-black">
                  Nenhum simulado criado ainda
                </h4>

                <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                  Crie o primeiro simulado para liberar atividades práticas ao
                  mentorado.
                </p>
              </div>
            ) : (
              <div className="mt-7 space-y-5">
                {simulados.map((simulado) => {
                  const aberto = simuladoAbertoId === simulado.id;
                  const questaoTemp =
                    questaoPorSimulado[simulado.id] ?? questaoInicial;

                  return (
                    <article
                      key={simulado.id}
                      className="overflow-hidden rounded-[1.8rem] border border-slate-100 bg-[#f9fafb]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSimuladoAbertoId(aberto ? "" : simulado.id)
                        }
                        className="flex w-full flex-wrap items-center justify-between gap-4 bg-white p-6 text-left"
                      >
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-4 py-2 text-xs font-black ${
                                simulado.ativo
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {simulado.ativo ? "Publicado" : "Rascunho"}
                            </span>

                            {simulado.moduloTitulo && (
                              <span className="rounded-full bg-[#EEF2FF] px-4 py-2 text-xs font-black text-[#08163F]">
                                {simulado.moduloTitulo}
                              </span>
                            )}
                          </div>

                          <h4 className="mt-4 text-2xl font-black">
                            {simulado.titulo}
                          </h4>

                          {simulado.descricao && (
                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                              {simulado.descricao}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                            {simulado.questoes.length} questões
                          </span>

                          <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                            {aberto ? "Recolher" : "Editar"}
                          </span>
                        </div>
                      </button>

                      {aberto && (
                        <div className="space-y-5 border-t border-slate-100 p-6">
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => alternarPublicacao(simulado.id)}
                              className={`rounded-2xl px-5 py-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 ${
                                simulado.ativo
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {simulado.ativo
                                ? "Despublicar"
                                : "Publicar simulado"}
                            </button>

                            <button
                              type="button"
                              onClick={() => excluirSimulado(simulado.id)}
                              className="rounded-2xl bg-red-50 px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-100"
                            >
                              Excluir simulado
                            </button>
                          </div>

                          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                              Nova questão
                            </p>

                            <textarea
                              placeholder="Enunciado da questão"
                              value={questaoTemp.enunciado}
                              onChange={(e) =>
                                atualizarQuestaoTemporaria(
                                  simulado.id,
                                  "enunciado",
                                  e.target.value
                                )
                              }
                              className="mt-4 min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C]"
                            />

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              {[1, 2, 3, 4].map((numero) => (
                                <input
                                  key={numero}
                                  type="text"
                                  placeholder={`Alternativa ${numero}`}
                                  value={
                                    questaoTemp[
                                      `alternativa${numero}` as keyof typeof questaoInicial
                                    ]
                                  }
                                  onChange={(e) =>
                                    atualizarQuestaoTemporaria(
                                      simulado.id,
                                      `alternativa${numero}` as keyof typeof questaoInicial,
                                      e.target.value
                                    )
                                  }
                                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C]"
                                />
                              ))}
                            </div>

                            <select
                              value={questaoTemp.correta}
                              onChange={(e) =>
                                atualizarQuestaoTemporaria(
                                  simulado.id,
                                  "correta",
                                  e.target.value
                                )
                              }
                              className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C]"
                            >
                              <option value="1">Alternativa 1 correta</option>
                              <option value="2">Alternativa 2 correta</option>
                              <option value="3">Alternativa 3 correta</option>
                              <option value="4">Alternativa 4 correta</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => adicionarQuestao(simulado.id)}
                              className="mt-4 rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
                            >
                              + Adicionar questão
                            </button>
                          </div>

                          {simulado.questoes.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-8 text-center">
                              <p className="font-black">
                                Nenhuma questão adicionada
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-500">
                                Adicione questões antes de publicar para os
                                mentorados.
                              </p>
                            </div>
                          ) : (
                            <div className="grid gap-5 xl:grid-cols-2">
                              {simulado.questoes.map((questao, index) => (
                                <div
                                  key={questao.id}
                                  className="rounded-[1.5rem] bg-white p-5 shadow-sm"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                        Questão {index + 1}
                                      </p>

                                      <h5 className="mt-2 text-lg font-black">
                                        {questao.enunciado}
                                      </h5>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removerQuestao(
                                          simulado.id,
                                          questao.id
                                        )
                                      }
                                      className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                                    >
                                      Remover
                                    </button>
                                  </div>

                                  <div className="mt-4 space-y-2">
                                    {questao.alternativas.map((alternativa) => (
                                      <div
                                        key={alternativa.id}
                                        className={`rounded-2xl p-3 text-sm font-bold ${
                                          alternativa.id ===
                                          questao.respostaCorretaId
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-slate-50 text-slate-600"
                                        }`}
                                      >
                                        {alternativa.id}. {alternativa.texto}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
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