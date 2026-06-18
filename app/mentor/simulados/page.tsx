"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, usuarioTemPermissao, User } from "@/utils/auth";
import { useCeoClubDados } from "@/utils/useCeoClubDados";
import {
  SimuladoSupabase,
  StatusSimulado,
  TipoSimulado,
  useSimuladosSupabase,
} from "@/utils/useSimuladosSupabase";

type FormSimulado = {
  titulo: string;
  moduloId: string;
  descricao: string;
  tempoLimiteMinutos: string;
  tipo: TipoSimulado;
};

type ModuloOption = {
  id: string;
  titulo?: string | null;
  nome_premium?: string | null;
  nome_explicativo?: string | null;
};

const formInicial: FormSimulado = {
  titulo: "",
  moduloId: "",
  descricao: "",
  tempoLimiteMinutos: "30",
  tipo: "atividade",
};

const tiposSimulado: { value: TipoSimulado; label: string; resumo: string }[] = [
  {
    value: "treino",
    label: "Treino livre",
    resumo: "Prática sem pressão para fixar o conteúdo.",
  },
  {
    value: "avaliacao",
    label: "Avaliação",
    resumo: "Mede domínio e evolução com mais controle.",
  },
  {
    value: "diagnostico",
    label: "Diagnóstico",
    resumo: "Identifica pontos fortes, lacunas e próximos passos.",
  },
  {
    value: "atividade",
    label: "Atividade prática",
    resumo: "Transforma aula em execução dentro da clínica.",
  },
];

const fieldClass =
  "w-full rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3.5 text-sm font-bold text-[#08163F] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10";

const textareaClass =
  "w-full rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3.5 text-sm font-bold leading-6 text-[#08163F] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10 min-h-[118px] resize-y";

const selectClass =
  "w-full cursor-pointer rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3.5 text-sm font-black text-[#08163F] shadow-sm outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10";

export default function SimuladosPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [form, setForm] = useState<FormSimulado>(formInicial);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroLocal, setErroLocal] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusSimulado | "todos">(
    "todos"
  );

  const { modulos, carregando: carregandoModulos } = useCeoClubDados();

  const {
    carregando,
    erro,
    setErro,
    simulados,
    totalPerguntas,
    tentativas,
    carregarTentativas,
    criarSimulado,
    atualizarStatusSimulado,
    excluirSimulado,
  } = useSimuladosSupabase();

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!usuarioTemPermissao(user, ["mentor"])) {
      router.replace(
        user.role === "mentorado" ? "/mentorado/dashboard" : "/login"
      );
      return;
    }

    setUsuario(user);
  }, [router]);

  useEffect(() => {
    if (!usuario) return;
    carregarTentativas();
  }, [usuario, carregarTentativas]);

  const simuladosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return simulados.filter((simulado) => {
      const nomeModulo = nomeModuloSimulado(simulado).toLowerCase();

      const texto = [
        simulado.titulo,
        simulado.descricao,
        simulado.instrucoes,
        simulado.tipo,
        simulado.status,
        nomeModulo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const bateBusca = !termo || texto.includes(termo);
      const bateStatus =
        statusFiltro === "todos" || simulado.status === statusFiltro;

      return bateBusca && bateStatus;
    });
  }, [simulados, busca, statusFiltro]);

  const resumo = useMemo(() => {
    const publicados = simulados.filter(
      (simulado) => simulado.status === "publicado"
    ).length;

    const rascunhos = simulados.filter(
      (simulado) => simulado.status === "rascunho"
    ).length;

    const enviados = tentativas.filter(
      (tentativa) =>
        tentativa.status === "enviado" || tentativa.status === "corrigido"
    );

    const media =
      enviados.length === 0
        ? 0
        : Math.round(
            enviados.reduce(
              (total, tentativa) => total + Number(tentativa.percentual || 0),
              0
            ) / enviados.length
          );

    return {
      total: simulados.length,
      publicados,
      rascunhos,
      perguntas: totalPerguntas,
      tentativas: tentativas.length,
      media,
    };
  }, [simulados, tentativas, totalPerguntas]);

  const tipoSelecionado = tiposSimulado.find((tipo) => tipo.value === form.tipo);

  function nomeModuloSimulado(simulado: SimuladoSupabase) {
    return (
      simulado.modulos?.nome_premium ||
      simulado.modulos?.nome_explicativo ||
      simulado.modulos?.titulo ||
      "Sem módulo"
    );
  }

  function nomeModuloSelect(modulo: ModuloOption) {
    return (
      modulo.nome_premium ||
      modulo.nome_explicativo ||
      modulo.titulo ||
      "Módulo sem nome"
    );
  }

  async function criarEEditar(e: React.FormEvent) {
    e.preventDefault();

    setErro("");
    setErroLocal("");

    if (!form.titulo.trim()) {
      setErroLocal("Informe o título do simulado.");
      return;
    }

    try {
      setSalvando(true);

      const novoSimulado = await criarSimulado({
        titulo: form.titulo,
        descricao: form.descricao,
        instrucoes:
          "Leia com atenção, responda com sinceridade e envie ao final.",
        moduloId: form.moduloId || null,
        tipo: form.tipo,
        status: "rascunho",
        tempoLimiteMinutos: form.tempoLimiteMinutos
          ? Number(form.tempoLimiteMinutos)
          : null,
        permitirRefazer: true,
        mostrarResultado: true,
        mostrarGabarito: false,
        exigirTodasRespostas: true,
        limiteTentativas: null,
        criadoPor: (usuario as User & { id?: string })?.id ?? null,
      });

      const novoId = (novoSimulado as SimuladoSupabase | undefined)?.id;

      setForm(formInicial);
      setMostrarFormulario(false);

      if (novoId) {
        router.push(`/simulados/${novoId}/editar`);
      }
    } catch (error) {
      setErroLocal(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o simulado."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(simulado: SimuladoSupabase, status: StatusSimulado) {
    try {
      setErro("");
      setErroLocal("");
      await atualizarStatusSimulado(simulado.id, status);
    } catch (error) {
      setErroLocal(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o status."
      );
    }
  }

  async function removerSimulado(simulado: SimuladoSupabase) {
    const confirmar = window.confirm(
      `Deseja excluir o simulado "${simulado.titulo}"?`
    );

    if (!confirmar) return;

    try {
      setErro("");
      setErroLocal("");
      await excluirSimulado(simulado.id);
    } catch (error) {
      setErroLocal(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o simulado."
      );
    }
  }

  if (!usuario || carregando || carregandoModulos) {
    return <MentorLoading mensagem="Carregando simulados..." />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#eef2f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-[22%] top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-[#12317C]/10 blur-3xl" />
          <div className="absolute bottom-[-16rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[#07122F]/10 blur-3xl" />
        </div>

        <header className="sticky top-0 z-20 flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5 lg:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 sm:text-xs">
              Área da mentora
            </p>

            <h1 className="truncate text-lg font-black sm:text-xl md:text-2xl">
              Simulados
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setMostrarFormulario((atual) => !atual)}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-xs font-black text-white shadow-xl shadow-[#08163F]/20 transition hover:-translate-y-0.5 hover:brightness-110 sm:text-sm"
          >
            {mostrarFormulario ? "Fechar criação" : "+ Criar simulado"}
          </button>
        </header>

        <div className="relative z-10 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 lg:px-7 lg:py-6">
          <section className="relative min-w-0 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white shadow-2xl shadow-[#07122F]/25 sm:p-6 lg:p-7">
            <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            <div className="relative grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(310px,0.75fr)] xl:items-center">
              <div>
                <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-100 backdrop-blur-md sm:text-xs">
                  Prática e avaliação
                </div>

                <h2 className="mt-5 max-w-4xl break-words text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  Crie atividades práticas para acompanhar evolução real.
                </h2>

                <p className="mt-4 max-w-2xl break-words text-sm font-semibold leading-7 text-blue-100 sm:text-base">
                  Monte simulados, desafios e exercícios de aplicação para
                  reforçar conteúdo, medir progresso e preparar o mentorado para
                  agir com mais segurança na clínica.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setMostrarFormulario(true)}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-50"
                  >
                    Criar novo simulado
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const alvo = document.getElementById("banco-simulados");
                      alvo?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    Ver banco
                  </button>
                </div>
              </div>

              <div className="grid min-w-0 gap-3 rounded-[26px] border border-white/12 bg-white/10 p-4 backdrop-blur-md sm:p-5">
                <Metric titulo="Simulados" valor={String(resumo.total)} />
                <div className="grid grid-cols-3 gap-3">
                  <MiniMetric titulo="Publicados" valor={String(resumo.publicados)} />
                  <MiniMetric titulo="Perguntas" valor={String(resumo.perguntas)} />
                  <MiniMetric titulo="Média" valor={`${resumo.media}%`} />
                </div>
              </div>
            </div>
          </section>

          {(erro || erroLocal) && (
            <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm">
              {erroLocal || erro}
            </p>
          )}

          {mostrarFormulario && (
            <section className="mt-5 overflow-hidden rounded-[30px] border border-white/80 bg-white/90 shadow-2xl shadow-slate-200/80 backdrop-blur-xl">
              <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="p-5 sm:p-6 lg:p-7">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                        Novo simulado
                      </p>

                      <h2 className="mt-2 break-words text-2xl font-black sm:text-3xl">
                        Criar novo simulado
                      </h2>

                      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                        Primeiro crie o rascunho. Depois você será levado ao
                        editor para cadastrar perguntas, alternativas e regras.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setForm(formInicial);
                        setMostrarFormulario(false);
                      }}
                      className="w-fit rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
                    >
                      Fechar
                    </button>
                  </div>

                  <form onSubmit={criarEEditar} className="mt-6 space-y-5">
                    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                      <Campo label="Título do simulado">
                        <input
                          value={form.titulo}
                          onChange={(e) =>
                            setForm({ ...form, titulo: e.target.value })
                          }
                          placeholder="Ex: Diagnóstico de vendas premium"
                          className={fieldClass}
                        />
                      </Campo>

                      <Campo label="Módulo vinculado">
                        <select
                          value={form.moduloId}
                          onChange={(e) =>
                            setForm({ ...form, moduloId: e.target.value })
                          }
                          className={selectClass}
                        >
                          <option value="">Sem módulo vinculado</option>

                          {modulos.map((modulo: ModuloOption) => (
                            <option key={modulo.id} value={modulo.id}>
                              {nomeModuloSelect(modulo)}
                            </option>
                          ))}
                        </select>
                      </Campo>

                      <Campo label="Modo">
                        <select
                          value={form.tipo}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              tipo: e.target.value as TipoSimulado,
                            })
                          }
                          className={selectClass}
                        >
                          {tiposSimulado.map((tipo) => (
                            <option key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </option>
                          ))}
                        </select>
                      </Campo>

                      <Campo label="Tempo limite em minutos">
                        <input
                          type="number"
                          min={0}
                          value={form.tempoLimiteMinutos}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              tempoLimiteMinutos: e.target.value,
                            })
                          }
                          className={fieldClass}
                        />
                      </Campo>
                    </div>

                    <Campo label="Descrição para o mentorado">
                      <textarea
                        value={form.descricao}
                        onChange={(e) =>
                          setForm({ ...form, descricao: e.target.value })
                        }
                        placeholder="Explique o objetivo deste simulado e o que você espera que o mentorado pratique..."
                        className={textareaClass}
                      />
                    </Campo>

                    <div className="rounded-[24px] border border-amber-100 bg-amber-50/80 p-4 text-sm font-bold leading-6 text-amber-900">
                      <p className="font-black">Regra de publicação</p>
                      <p className="mt-1">
                        O simulado nasce como rascunho. Você adiciona perguntas
                        no editor avançado e publica quando estiver pronto.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                      <button
                        type="submit"
                        disabled={salvando}
                        className="rounded-2xl bg-[#08163F] px-6 py-3 text-sm font-black text-white shadow-xl shadow-[#08163F]/20 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {salvando ? "Criando..." : "Criar e editar perguntas →"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForm(formInicial);
                          setMostrarFormulario(false);
                        }}
                        className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>

                <aside className="border-t border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6 lg:border-l lg:border-t-0 lg:p-7">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                    Fluxo premium
                  </p>

                  <h3 className="mt-3 text-xl font-black">
                    Da ideia ao simulado publicado.
                  </h3>

                  <div className="mt-5 space-y-3">
                    <FluxoStep numero="01" titulo="Rascunho">
                      Você cria a capa da atividade e vincula ao módulo certo.
                    </FluxoStep>

                    <FluxoStep numero="02" titulo="Estrutura">
                      No editor, adiciona perguntas, alternativas e pontuação.
                    </FluxoStep>

                    <FluxoStep numero="03" titulo="Publicação">
                      Depois de revisar, publica para o mentorado responder.
                    </FluxoStep>
                  </div>

                  <div className="mt-6 rounded-[24px] bg-[#08163F] p-5 text-white shadow-xl shadow-[#08163F]/20">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">
                      Modo selecionado
                    </p>

                    <h4 className="mt-2 text-lg font-black">
                      {tipoSelecionado?.label}
                    </h4>

                    <p className="mt-2 text-sm font-semibold leading-6 text-blue-100">
                      {tipoSelecionado?.resumo}
                    </p>
                  </div>
                </aside>
              </div>
            </section>
          )}

          <section
            id="banco-simulados"
            className="mt-5 min-w-0 rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-2xl shadow-slate-200/80 backdrop-blur-xl sm:p-6 lg:p-7"
          >
            <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Banco de simulados
                </p>

                <h2 className="mt-2 break-words text-2xl font-black sm:text-3xl">
                  Simulados cadastrados
                </h2>

                <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                  Gerencie rascunhos, publique avaliações e acompanhe a
                  estrutura de perguntas de cada atividade.
                </p>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_180px] xl:min-w-[560px]">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar simulado ou módulo"
                  className={fieldClass}
                />

                <select
                  value={statusFiltro}
                  onChange={(e) =>
                    setStatusFiltro(e.target.value as StatusSimulado | "todos")
                  }
                  className={selectClass}
                >
                  <option value="todos">Todos status</option>
                  <option value="rascunho">Rascunho</option>
                  <option value="publicado">Publicado</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>
            </div>

            {simuladosFiltrados.length === 0 ? (
              <div className="mt-6 rounded-[26px] border border-dashed border-slate-200 bg-slate-50/80 p-7 text-center sm:p-9">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-3xl shadow-sm">
                  ✦
                </div>

                <h3 className="mt-4 break-words text-xl font-black sm:text-2xl">
                  Nenhum simulado encontrado
                </h3>

                <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                  Crie um simulado para começar a cadastrar perguntas e liberar
                  atividades práticas ao mentorado.
                </p>

                <button
                  type="button"
                  onClick={() => setMostrarFormulario(true)}
                  className="mt-5 rounded-2xl bg-[#08163F] px-6 py-3 text-sm font-black text-white shadow-xl shadow-[#08163F]/20 transition hover:-translate-y-0.5 hover:brightness-110"
                >
                  Criar primeiro simulado
                </button>
              </div>
            ) : (
              <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-2">
                {simuladosFiltrados.map((simulado) => (
                  <article
                    key={simulado.id}
                    className="group min-w-0 overflow-hidden rounded-[26px] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/80 sm:p-5"
                  >
                    <div className="flex min-w-0 flex-col gap-4">
                      <div className="flex min-w-0 flex-wrap gap-2">
                        <StatusBadge status={simulado.status} />
                        <TipoBadge tipo={simulado.tipo} />

                        <span className="rounded-full bg-[#EEF2FF] px-3 py-1.5 text-[11px] font-black text-[#08163F] sm:text-xs">
                          {nomeModuloSimulado(simulado)}
                        </span>
                      </div>

                      <div>
                        <h3 className="break-words text-xl font-black sm:text-2xl">
                          {simulado.titulo}
                        </h3>

                        {simulado.descricao && (
                          <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-500">
                            {simulado.descricao}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <InfoTile label="Perguntas" value={String(simulado.perguntas.length)} />
                        <InfoTile
                          label="Tempo"
                          value={
                            simulado.tempo_limite_minutos
                              ? `${simulado.tempo_limite_minutos} min`
                              : "Livre"
                          }
                        />
                        <InfoTile
                          label="Resultado"
                          value={simulado.mostrar_resultado ? "Visível" : "Oculto"}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/simulados/${simulado.id}/editar`)
                          }
                          className="rounded-2xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-[#08163F]/15 transition hover:brightness-110 sm:text-sm"
                        >
                          Editor avançado
                        </button>

                        {simulado.status !== "publicado" && (
                          <button
                            type="button"
                            onClick={() => mudarStatus(simulado, "publicado")}
                            className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm sm:text-sm"
                          >
                            Publicar
                          </button>
                        )}

                        {simulado.status === "publicado" && (
                          <button
                            type="button"
                            onClick={() => mudarStatus(simulado, "rascunho")}
                            className="rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm sm:text-sm"
                          >
                            Rascunho
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => removerSimulado(simulado)}
                          className="rounded-2xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-600 transition hover:bg-red-100 sm:text-sm"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function MentorLoading({ mensagem }: { mensagem: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f8] px-4 text-[#08163F]">
      <div className="w-full max-w-sm rounded-[28px] border border-white/80 bg-white/90 p-7 text-center shadow-2xl shadow-slate-200/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-xs font-black text-white shadow-lg">
          CEO
        </div>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-slate-400">
          CEO Club
        </p>

        <h1 className="mt-2 break-words text-lg font-black leading-tight text-[#08163F] sm:text-xl">
          {mensagem}
        </h1>

        <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#12317C]" />
        </div>
      </div>
    </main>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-2 block break-words text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function Metric({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
        {titulo}
      </p>

      <strong className="mt-2 block break-words text-2xl font-black sm:text-3xl">
        {valor}
      </strong>
    </div>
  );
}

function MiniMetric({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100">
        {titulo}
      </p>

      <strong className="mt-2 block break-words text-lg font-black sm:text-xl">
        {valor}
      </strong>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusSimulado }) {
  const classe =
    status === "publicado"
      ? "bg-emerald-50 text-emerald-700"
      : status === "arquivado"
      ? "bg-slate-100 text-slate-600"
      : "bg-amber-50 text-amber-700";

  const label =
    status === "publicado"
      ? "Publicado"
      : status === "arquivado"
      ? "Arquivado"
      : "Rascunho";

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-[11px] font-black sm:text-xs ${classe}`}
    >
      {label}
    </span>
  );
}

function TipoBadge({ tipo }: { tipo: TipoSimulado }) {
  const label = tiposSimulado.find((item) => item.value === tipo)?.label ?? tipo;

  return (
    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#08163F] ring-1 ring-slate-100 sm:text-xs">
      {label}
    </span>
  );
}

function FluxoStep({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {numero}
      </p>

      <h4 className="mt-1 font-black text-[#08163F]">{titulo}</h4>

      <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
        {children}
      </p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-[#08163F]">{value}</p>
    </div>
  );
}
