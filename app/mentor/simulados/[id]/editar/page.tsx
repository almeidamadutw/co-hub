"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, usuarioTemPermissao, User } from "@/utils/auth";
import { useCeoClubDados } from "@/utils/useCeoClubDados";
import {
  AlternativaSupabase,
  PerguntaSupabase,
  SimuladoSupabase,
  StatusSimulado,
  TipoPergunta,
  TipoSimulado,
  useSimuladosSupabase,
} from "@/utils/useSimuladosSupabase";

type FormSimulado = {
  titulo: string;
  descricao: string;
  instrucoes: string;
  moduloId: string;
  tipo: TipoSimulado;
  status: StatusSimulado;
  tempoLimiteMinutos: string;
  permitirRefazer: boolean;
  mostrarResultado: boolean;
  mostrarGabarito: boolean;
  exigirTodasRespostas: boolean;
  limiteTentativas: string;
};

type FormPergunta = {
  tipo: TipoPergunta;
  enunciado: string;
  descricao: string;
  obrigatoria: boolean;
  pontos: string;
  escalaMin: string;
  escalaMax: string;
};

type FormAlternativa = {
  texto: string;
  correta: boolean;
};

const perguntaInicial: FormPergunta = {
  tipo: "multipla_escolha",
  enunciado: "",
  descricao: "",
  obrigatoria: true,
  pontos: "1",
  escalaMin: "1",
  escalaMax: "5",
};

const alternativaInicial: FormAlternativa = {
  texto: "",
  correta: false,
};

const tiposPergunta: {
  value: TipoPergunta;
  label: string;
  descricao: string;
}[] = [
  {
    value: "multipla_escolha",
    label: "Múltipla escolha",
    descricao: "Uma alternativa correta para medir domínio objetivo.",
  },
  {
    value: "caixa_selecao",
    label: "Caixa de seleção",
    descricao: "Uma ou mais alternativas corretas para perguntas compostas.",
  },
  {
    value: "resposta_curta",
    label: "Resposta curta",
    descricao: "Resposta aberta breve, ideal para conceitos e decisões.",
  },
  {
    value: "resposta_longa",
    label: "Resposta longa",
    descricao: "Campo aberto para reflexão, plano de ação ou análise.",
  },
  {
    value: "escala",
    label: "Escala",
    descricao: "Nota numérica, útil para autoavaliação e diagnóstico.",
  },
  {
    value: "sim_nao",
    label: "Sim / Não",
    descricao: "Resposta objetiva para checar execução ou prontidão.",
  },
  {
    value: "upload",
    label: "Upload",
    descricao: "Entrega de arquivo, evidência ou comprovante da atividade.",
  },
];

const tiposSimulado: { value: TipoSimulado; label: string }[] = [
  { value: "treino", label: "Treino livre" },
  { value: "avaliacao", label: "Avaliação" },
  { value: "diagnostico", label: "Diagnóstico" },
  { value: "atividade", label: "Atividade prática" },
];

const fieldClass =
  "w-full rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 text-sm font-bold text-[#08163F] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10";

const textareaClass = `${fieldClass} resize-y leading-6`;

const selectClass =
  "w-full cursor-pointer rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 text-sm font-bold text-[#08163F] shadow-sm outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10";

const glassPanelClass =
  "rounded-[28px] border border-white/70 bg-white/90 shadow-2xl shadow-slate-200/80 backdrop-blur-xl";

export default function SimuladoEditorPage() {
  const router = useRouter();
  const params = useParams();
  const simuladoId = String(params.id);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [formSimulado, setFormSimulado] = useState<FormSimulado | null>(null);
  const [formPergunta, setFormPergunta] =
    useState<FormPergunta>(perguntaInicial);
  const [perguntaEditandoId, setPerguntaEditandoId] = useState<string | null>(
    null
  );
  const [formAlternativas, setFormAlternativas] = useState<
    Record<string, FormAlternativa>
  >({});
  const [salvando, setSalvando] = useState(false);
  const [erroLocal, setErroLocal] = useState("");
  const [aba, setAba] = useState<"estrutura" | "respostas" | "configuracoes">(
    "estrutura"
  );

  const { modulos, carregando: carregandoDados } = useCeoClubDados();

  const {
    carregando,
    erro,
    setErro,
    simulados,
    tentativas,
    respostas,
    carregarTentativas,
    carregarRespostas,
    atualizarSimulado,
    atualizarStatusSimulado,
    excluirSimulado,
    criarPergunta,
    atualizarPergunta,
    excluirPergunta,
    criarAlternativa,
    atualizarAlternativa,
    excluirAlternativa,
  } = useSimuladosSupabase();

  const simulado = useMemo(() => {
    return simulados.find((item) => item.id === simuladoId) ?? null;
  }, [simulados, simuladoId]);

  const tentativasDoSimulado = useMemo(() => {
    return tentativas.filter((tentativa) => tentativa.simulado_id === simuladoId);
  }, [tentativas, simuladoId]);

  const resumo = useMemo(() => {
    const totalPerguntas = simulado?.perguntas.length ?? 0;

    const totalPontos =
      simulado?.perguntas.reduce(
        (total, pergunta) => total + Number(pergunta.pontos || 0),
        0
      ) ?? 0;

    const media =
      tentativasDoSimulado.length === 0
        ? 0
        : Math.round(
            tentativasDoSimulado.reduce(
              (total, tentativa) => total + Number(tentativa.percentual || 0),
              0
            ) / tentativasDoSimulado.length
          );

    const objetivas =
      simulado?.perguntas.filter((pergunta) =>
        ["multipla_escolha", "caixa_selecao", "sim_nao"].includes(pergunta.tipo)
      ).length ?? 0;

    return {
      totalPerguntas,
      totalPontos,
      tentativas: tentativasDoSimulado.length,
      media,
      objetivas,
    };
  }, [simulado, tentativasDoSimulado]);

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

  useEffect(() => {
    if (!simulado) return;

    setFormSimulado({
      titulo: simulado.titulo,
      descricao: simulado.descricao ?? "",
      instrucoes: simulado.instrucoes ?? "",
      moduloId: simulado.modulo_id ?? "",
      tipo: simulado.tipo,
      status: simulado.status,
      tempoLimiteMinutos: simulado.tempo_limite_minutos
        ? String(simulado.tempo_limite_minutos)
        : "",
      permitirRefazer: simulado.permitir_refazer,
      mostrarResultado: simulado.mostrar_resultado,
      mostrarGabarito: simulado.mostrar_gabarito,
      exigirTodasRespostas: simulado.exigir_todas_respostas,
      limiteTentativas: simulado.limite_tentativas
        ? String(simulado.limite_tentativas)
        : "",
    });
  }, [simulado]);

  useEffect(() => {
    const tentativaId = tentativasDoSimulado[0]?.id;

    if (tentativaId) {
      carregarRespostas(tentativaId);
    }
  }, [tentativasDoSimulado, carregarRespostas]);

  function nomeModuloAtual(item: SimuladoSupabase) {
    return (
      item.modulos?.nome_premium ||
      item.modulos?.nome_explicativo ||
      item.modulos?.titulo ||
      "Sem módulo vinculado"
    );
  }

  function nomeModuloSelect(modulo: any) {
    return (
      modulo.nome_premium ||
      modulo.nome_explicativo ||
      modulo.titulo ||
      "Módulo sem nome"
    );
  }

  function resetPergunta() {
    setPerguntaEditandoId(null);
    setFormPergunta(perguntaInicial);
  }

  function preencherPergunta(pergunta: PerguntaSupabase) {
    setPerguntaEditandoId(pergunta.id);

    setFormPergunta({
      tipo: pergunta.tipo,
      enunciado: pergunta.enunciado,
      descricao: pergunta.descricao ?? "",
      obrigatoria: pergunta.obrigatoria,
      pontos: String(pergunta.pontos ?? 1),
      escalaMin: String(pergunta.escala_min ?? 1),
      escalaMax: String(pergunta.escala_max ?? 5),
    });

    setAba("estrutura");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarDadosGerais(e: React.FormEvent) {
    e.preventDefault();

    if (!simulado || !formSimulado) return;

    setErro("");
    setErroLocal("");

    if (!formSimulado.titulo.trim()) {
      setErroLocal("Informe o título do simulado.");
      return;
    }

    try {
      setSalvando(true);

      await atualizarSimulado(simulado.id, {
        titulo: formSimulado.titulo,
        descricao: formSimulado.descricao,
        instrucoes: formSimulado.instrucoes,
        moduloId: formSimulado.moduloId || null,
        tipo: formSimulado.tipo,
        status: formSimulado.status,
        tempoLimiteMinutos: formSimulado.tempoLimiteMinutos
          ? Number(formSimulado.tempoLimiteMinutos)
          : null,
        permitirRefazer: formSimulado.permitirRefazer,
        mostrarResultado: formSimulado.mostrarResultado,
        mostrarGabarito: formSimulado.mostrarGabarito,
        exigirTodasRespostas: formSimulado.exigirTodasRespostas,
        limiteTentativas: formSimulado.limiteTentativas
          ? Number(formSimulado.limiteTentativas)
          : null,
        criadoPor: simulado.criado_por,
      });
    } catch (error) {
      setErroLocal(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os dados do simulado."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarPergunta(e: React.FormEvent) {
    e.preventDefault();

    if (!simulado) return;

    setErro("");
    setErroLocal("");

    if (!formPergunta.enunciado.trim()) {
      setErroLocal("Informe o enunciado da pergunta.");
      return;
    }

    try {
      setSalvando(true);

      const payload = {
        simuladoId: simulado.id,
        ordem: perguntaEditandoId
          ? simulado.perguntas.find(
              (pergunta) => pergunta.id === perguntaEditandoId
            )?.ordem ?? simulado.perguntas.length + 1
          : simulado.perguntas.length + 1,
        tipo: formPergunta.tipo,
        enunciado: formPergunta.enunciado,
        descricao: formPergunta.descricao,
        obrigatoria: formPergunta.obrigatoria,
        pontos: Number(formPergunta.pontos || 1),
        escalaMin: Number(formPergunta.escalaMin || 1),
        escalaMax: Number(formPergunta.escalaMax || 5),
      };

      if (perguntaEditandoId) {
        await atualizarPergunta(perguntaEditandoId, payload);
      } else {
        await criarPergunta(payload);
      }

      resetPergunta();
    } catch (error) {
      setErroLocal(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a pergunta."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarAlternativa(pergunta: PerguntaSupabase) {
    const form = formAlternativas[pergunta.id] ?? alternativaInicial;

    setErro("");
    setErroLocal("");

    if (!form.texto.trim()) {
      setErroLocal("Informe o texto da alternativa.");
      return;
    }

    try {
      setSalvando(true);

      await criarAlternativa({
        perguntaId: pergunta.id,
        texto: form.texto,
        ordem: pergunta.alternativas.length + 1,
        correta: form.correta,
      });

      setFormAlternativas({
        ...formAlternativas,
        [pergunta.id]: alternativaInicial,
      });
    } catch (error) {
      setErroLocal(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a alternativa."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function marcarAlternativaCorreta(
    pergunta: PerguntaSupabase,
    alternativa: AlternativaSupabase
  ) {
    try {
      setErro("");
      setErroLocal("");

      if (pergunta.tipo === "multipla_escolha" || pergunta.tipo === "sim_nao") {
        await Promise.all(
          pergunta.alternativas.map((item) =>
            atualizarAlternativa(item.id, {
              perguntaId: pergunta.id,
              texto: item.texto,
              ordem: item.ordem,
              correta: item.id === alternativa.id ? !alternativa.correta : false,
            })
          )
        );

        return;
      }

      await atualizarAlternativa(alternativa.id, {
        perguntaId: pergunta.id,
        texto: alternativa.texto,
        ordem: alternativa.ordem,
        correta: !alternativa.correta,
      });
    } catch (error) {
      setErroLocal(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a alternativa correta."
      );
    }
  }

  async function criarAlternativasSimNao(pergunta: PerguntaSupabase) {
    if (pergunta.alternativas.length > 0) return;

    try {
      setSalvando(true);

      await criarAlternativa({
        perguntaId: pergunta.id,
        texto: "Sim",
        ordem: 1,
        correta: true,
      });

      await criarAlternativa({
        perguntaId: pergunta.id,
        texto: "Não",
        ordem: 2,
        correta: false,
      });
    } catch (error) {
      setErroLocal(
        error instanceof Error
          ? error.message
          : "Não foi possível criar alternativas Sim/Não."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExcluirPergunta(pergunta: PerguntaSupabase) {
    const confirmar = window.confirm(
      `Deseja excluir a pergunta "${pergunta.enunciado}"?`
    );

    if (!confirmar) return;

    try {
      setErro("");
      setErroLocal("");
      await excluirPergunta(pergunta.id);

      if (perguntaEditandoId === pergunta.id) {
        resetPergunta();
      }
    } catch (error) {
      setErroLocal(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a pergunta."
      );
    }
  }

  async function confirmarExcluirAlternativa(alternativa: AlternativaSupabase) {
    const confirmar = window.confirm(
      `Deseja excluir a alternativa "${alternativa.texto}"?`
    );

    if (!confirmar) return;

    try {
      setErro("");
      setErroLocal("");
      await excluirAlternativa(alternativa.id);
    } catch (error) {
      setErroLocal(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a alternativa."
      );
    }
  }

  async function publicar(status: StatusSimulado) {
    if (!simulado) return;

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

  async function confirmarExcluirSimulado() {
    if (!simulado) return;

    const confirmar = window.confirm(
      `Deseja excluir o simulado "${simulado.titulo}"? Essa ação remove perguntas, alternativas e respostas.`
    );

    if (!confirmar) return;

    try {
      await excluirSimulado(simulado.id);
      router.push("/simulados");
    } catch (error) {
      setErroLocal(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o simulado."
      );
    }
  }

  if (!usuario || carregando || carregandoDados) {
    return <MentorLoading mensagem="Carregando editor do simulado..." />;
  }

  if (!simulado || !formSimulado) {
    return (
      <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
        <Sidebar nome={usuario.nome} role={usuario.role} />

        <section className="relative flex min-w-0 flex-1 items-center justify-center overflow-x-hidden p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-[28px] border border-white/70 bg-white/95 p-6 text-center shadow-2xl shadow-slate-200/80 sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#08163F] text-xl text-white">
              ✦
            </div>

            <h1 className="mt-5 break-words text-2xl font-black sm:text-3xl">
              Simulado não encontrado
            </h1>

            <p className="mt-3 break-words text-sm font-semibold leading-6 text-gray-500">
              Esse simulado não existe, foi removido ou o ID da URL não veio do
              banco de simulados.
            </p>

            <button
              type="button"
              onClick={() => router.push("/simulados")}
              className="mt-6 rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
            >
              Voltar para simulados
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/simulados")}
              className="rounded-2xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
            >
              ← Voltar
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Editor avançado
              </p>

              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
                {simulado.titulo}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {simulado.status !== "publicado" && (
              <button
                type="button"
                onClick={() => publicar("publicado")}
                className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:brightness-110 sm:text-sm"
              >
                Publicar
              </button>
            )}

            {simulado.status === "publicado" && (
              <button
                type="button"
                onClick={() => publicar("rascunho")}
                className="rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-black text-[#08163F] shadow-sm transition hover:bg-white sm:text-sm"
              >
                Rascunho
              </button>
            )}

            <button
              type="button"
              onClick={confirmarExcluirSimulado}
              className="rounded-2xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-600 transition hover:bg-red-100 sm:text-sm"
            >
              Excluir
            </button>
          </div>
        </header>

        <div className="relative min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="relative mb-4 min-w-0 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white shadow-2xl shadow-[#07122F]/20 sm:p-6 lg:p-7">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />

            <div className="relative grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(330px,0.9fr)] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={simulado.status} />
                  <TipoBadge tipo={simulado.tipo} />

                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-blue-100 ring-1 ring-white/10">
                    {nomeModuloAtual(simulado)}
                  </span>
                </div>

                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-200 sm:text-xs">
                  Estrutura da prática
                </p>

                <h2 className="mt-3 break-words text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  {simulado.titulo}
                </h2>

                <p className="mt-4 max-w-3xl break-words text-sm font-semibold leading-7 text-blue-100">
                  Construa perguntas, defina regras e acompanhe a evolução do
                  mentorado com uma experiência prática, objetiva e premium.
                </p>
              </div>

              <div className="grid min-w-0 gap-3 rounded-[26px] border border-white/10 bg-white/10 p-4 backdrop-blur-md sm:grid-cols-2">
                <Metric titulo="Perguntas" valor={String(resumo.totalPerguntas)} />
                <Metric titulo="Pontos" valor={String(resumo.totalPontos)} />
                <Metric titulo="Objetivas" valor={String(resumo.objetivas)} />
                <Metric titulo="Média" valor={`${resumo.media}%`} />
              </div>
            </div>
          </section>

          {(erro || erroLocal) && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
              {erroLocal || erro}
            </div>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            <TabButton ativo={aba === "estrutura"} onClick={() => setAba("estrutura")}>
              Estrutura
            </TabButton>

            <TabButton
              ativo={aba === "configuracoes"}
              onClick={() => setAba("configuracoes")}
            >
              Configurações
            </TabButton>

            <TabButton ativo={aba === "respostas"} onClick={() => setAba("respostas")}>
              Respostas
            </TabButton>
          </div>

          {aba === "configuracoes" && (
            <Card titulo="Configurações do simulado" subtitulo="Ajuste as regras, o módulo e as informações que o mentorado verá.">
              <form onSubmit={salvarDadosGerais} className="space-y-4">
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <Campo label="Título">
                    <input
                      value={formSimulado.titulo}
                      onChange={(e) =>
                        setFormSimulado({
                          ...formSimulado,
                          titulo: e.target.value,
                        })
                      }
                      className={fieldClass}
                    />
                  </Campo>

                  <Campo label="Módulo">
                    <select
                      value={formSimulado.moduloId}
                      onChange={(e) =>
                        setFormSimulado({
                          ...formSimulado,
                          moduloId: e.target.value,
                        })
                      }
                      className={selectClass}
                    >
                      <option value="">Sem módulo</option>

                      {modulos.map((modulo: any) => (
                        <option key={modulo.id} value={modulo.id}>
                          {nomeModuloSelect(modulo)}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Modo">
                    <select
                      value={formSimulado.tipo}
                      onChange={(e) =>
                        setFormSimulado({
                          ...formSimulado,
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

                  <Campo label="Status">
                    <select
                      value={formSimulado.status}
                      onChange={(e) =>
                        setFormSimulado({
                          ...formSimulado,
                          status: e.target.value as StatusSimulado,
                        })
                      }
                      className={selectClass}
                    >
                      <option value="rascunho">Rascunho</option>
                      <option value="publicado">Publicado</option>
                      <option value="arquivado">Arquivado</option>
                    </select>
                  </Campo>

                  <Campo label="Descrição">
                    <textarea
                      value={formSimulado.descricao}
                      onChange={(e) =>
                        setFormSimulado({
                          ...formSimulado,
                          descricao: e.target.value,
                        })
                      }
                      className={`${textareaClass} min-h-[96px]`}
                    />
                  </Campo>

                  <Campo label="Instruções">
                    <textarea
                      value={formSimulado.instrucoes}
                      onChange={(e) =>
                        setFormSimulado({
                          ...formSimulado,
                          instrucoes: e.target.value,
                        })
                      }
                      className={`${textareaClass} min-h-[96px]`}
                    />
                  </Campo>

                  <Campo label="Tempo limite em minutos">
                    <input
                      type="number"
                      min={0}
                      value={formSimulado.tempoLimiteMinutos}
                      onChange={(e) =>
                        setFormSimulado({
                          ...formSimulado,
                          tempoLimiteMinutos: e.target.value,
                        })
                      }
                      className={fieldClass}
                    />
                  </Campo>

                  <Campo label="Limite de tentativas">
                    <input
                      type="number"
                      min={0}
                      value={formSimulado.limiteTentativas}
                      onChange={(e) =>
                        setFormSimulado({
                          ...formSimulado,
                          limiteTentativas: e.target.value,
                        })
                      }
                      className={fieldClass}
                    />
                  </Campo>
                </div>

                <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Toggle
                    label="Permitir refazer"
                    checked={formSimulado.permitirRefazer}
                    onChange={(checked) =>
                      setFormSimulado({
                        ...formSimulado,
                        permitirRefazer: checked,
                      })
                    }
                  />

                  <Toggle
                    label="Mostrar resultado"
                    checked={formSimulado.mostrarResultado}
                    onChange={(checked) =>
                      setFormSimulado({
                        ...formSimulado,
                        mostrarResultado: checked,
                      })
                    }
                  />

                  <Toggle
                    label="Mostrar gabarito"
                    checked={formSimulado.mostrarGabarito}
                    onChange={(checked) =>
                      setFormSimulado({
                        ...formSimulado,
                        mostrarGabarito: checked,
                      })
                    }
                  />

                  <Toggle
                    label="Exigir obrigatórias"
                    checked={formSimulado.exigirTodasRespostas}
                    onChange={(checked) =>
                      setFormSimulado({
                        ...formSimulado,
                        exigirTodasRespostas: checked,
                      })
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#08163F]/20 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando ? "Salvando..." : "Salvar configurações"}
                </button>
              </form>
            </Card>
          )}

          {aba === "estrutura" && (
            <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <Card
                titulo={perguntaEditandoId ? "Editar pergunta" : "Nova pergunta"}
                subtitulo="Crie perguntas com pontuação, obrigatoriedade e alternativas."
              >
                <form onSubmit={salvarPergunta} className="space-y-4">
                  <Campo label="Tipo de pergunta">
                    <select
                      value={formPergunta.tipo}
                      onChange={(e) =>
                        setFormPergunta({
                          ...formPergunta,
                          tipo: e.target.value as TipoPergunta,
                        })
                      }
                      className={selectClass}
                    >
                      {tiposPergunta.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Enunciado">
                    <textarea
                      value={formPergunta.enunciado}
                      onChange={(e) =>
                        setFormPergunta({
                          ...formPergunta,
                          enunciado: e.target.value,
                        })
                      }
                      placeholder="Digite a pergunta"
                      className={`${textareaClass} min-h-[110px]`}
                    />
                  </Campo>

                  <Campo label="Descrição / apoio">
                    <textarea
                      value={formPergunta.descricao}
                      onChange={(e) =>
                        setFormPergunta({
                          ...formPergunta,
                          descricao: e.target.value,
                        })
                      }
                      placeholder="Texto de apoio opcional"
                      className={`${textareaClass} min-h-[86px]`}
                    />
                  </Campo>

                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    <Campo label="Pontos">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={formPergunta.pontos}
                        onChange={(e) =>
                          setFormPergunta({
                            ...formPergunta,
                            pontos: e.target.value,
                          })
                        }
                        className={fieldClass}
                      />
                    </Campo>

                    <Toggle
                      label="Obrigatória"
                      checked={formPergunta.obrigatoria}
                      onChange={(checked) =>
                        setFormPergunta({
                          ...formPergunta,
                          obrigatoria: checked,
                        })
                      }
                    />
                  </div>

                  {formPergunta.tipo === "escala" && (
                    <div className="grid min-w-0 gap-3 md:grid-cols-2">
                      <Campo label="Escala mínima">
                        <input
                          type="number"
                          value={formPergunta.escalaMin}
                          onChange={(e) =>
                            setFormPergunta({
                              ...formPergunta,
                              escalaMin: e.target.value,
                            })
                          }
                          className={fieldClass}
                        />
                      </Campo>

                      <Campo label="Escala máxima">
                        <input
                          type="number"
                          value={formPergunta.escalaMax}
                          onChange={(e) =>
                            setFormPergunta({
                              ...formPergunta,
                              escalaMax: e.target.value,
                            })
                          }
                          className={fieldClass}
                        />
                      </Campo>
                    </div>
                  )}

                  <div className="rounded-[24px] border border-blue-100 bg-gradient-to-br from-[#F8FAFF] to-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Como funciona
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      {tiposPergunta.find(
                        (tipo) => tipo.value === formPergunta.tipo
                      )?.descricao ?? "Configure a pergunta conforme a atividade."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={salvando}
                      className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#08163F]/20 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {salvando
                        ? "Salvando..."
                        : perguntaEditandoId
                        ? "Salvar pergunta"
                        : "Adicionar pergunta"}
                    </button>

                    {perguntaEditandoId && (
                      <button
                        type="button"
                        onClick={resetPergunta}
                        className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                      >
                        Cancelar edição
                      </button>
                    )}
                  </div>
                </form>
              </Card>

              <div className="min-w-0 space-y-4">
                {simulado.perguntas.length === 0 ? (
                  <Card titulo="Perguntas cadastradas" subtitulo="As perguntas aparecem aqui em ordem de criação.">
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-[#f9fafb] p-7 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                        ✦
                      </div>
                      <p className="mt-4 text-lg font-black">
                        Nenhuma pergunta ainda
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        Comece criando a primeira pergunta do simulado.
                      </p>
                    </div>
                  </Card>
                ) : (
                  simulado.perguntas.map((pergunta, index) => (
                    <PerguntaCard
                      key={pergunta.id}
                      pergunta={pergunta}
                      index={index}
                      formAlternativa={
                        formAlternativas[pergunta.id] ?? alternativaInicial
                      }
                      setFormAlternativa={(form) =>
                        setFormAlternativas({
                          ...formAlternativas,
                          [pergunta.id]: form,
                        })
                      }
                      onSalvarAlternativa={() => salvarAlternativa(pergunta)}
                      onEditar={() => preencherPergunta(pergunta)}
                      onExcluir={() => confirmarExcluirPergunta(pergunta)}
                      onMarcarCorreta={(alternativa) =>
                        marcarAlternativaCorreta(pergunta, alternativa)
                      }
                      onExcluirAlternativa={confirmarExcluirAlternativa}
                      onCriarSimNao={() => criarAlternativasSimNao(pergunta)}
                    />
                  ))
                )}
              </div>
            </section>
          )}

          {aba === "respostas" && (
            <Card titulo="Respostas e tentativas" subtitulo="Acompanhe o desempenho das respostas enviadas pelo mentorado.">
              {tentativasDoSimulado.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-[#f9fafb] p-7 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                    ◌
                  </div>
                  <p className="mt-4 text-lg font-black">Nenhuma tentativa enviada</p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Quando um mentorado responder, o histórico aparece aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tentativasDoSimulado.map((tentativa) => (
                    <article
                      key={tentativa.id}
                      className="rounded-[24px] border border-slate-100 bg-[#f9fafb] p-4"
                    >
                      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                            Tentativa
                          </p>

                          <h3 className="mt-1 break-words text-lg font-black text-[#08163F]">
                            {tentativa.percentual}% de aproveitamento
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            Enviado em{" "}
                            {tentativa.enviado_em
                              ? formatarDataHora(tentativa.enviado_em)
                              : "não enviado"}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <InfoMini label="Acertos" value={String(tentativa.acertos)} />
                          <InfoMini
                            label="Pontos"
                            value={String(tentativa.total_pontos)}
                          />
                          <InfoMini label="Status" value={tentativa.status} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {respostas.length > 0 && (
                <div className="mt-5 rounded-[24px] bg-[#f9fafb] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Respostas da tentativa mais recente carregada
                  </p>

                  <div className="mt-3 space-y-2">
                    {respostas.map((resposta) => (
                      <div
                        key={resposta.id}
                        className="rounded-2xl bg-white p-3 text-sm font-semibold text-slate-600 shadow-sm"
                      >
                        <p className="break-words">
                          Pergunta: {resposta.pergunta_id}
                        </p>

                        <p className="mt-1 break-words">
                          Resposta:{" "}
                          {resposta.resposta_texto ||
                            resposta.resposta_numero ||
                            resposta.alternativa_id ||
                            resposta.alternativas_ids?.join(", ") ||
                            resposta.arquivo_url ||
                            "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function PerguntaCard({
  pergunta,
  index,
  formAlternativa,
  setFormAlternativa,
  onSalvarAlternativa,
  onEditar,
  onExcluir,
  onMarcarCorreta,
  onExcluirAlternativa,
  onCriarSimNao,
}: {
  pergunta: PerguntaSupabase;
  index: number;
  formAlternativa: FormAlternativa;
  setFormAlternativa: (form: FormAlternativa) => void;
  onSalvarAlternativa: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onMarcarCorreta: (alternativa: AlternativaSupabase) => void;
  onExcluirAlternativa: (alternativa: AlternativaSupabase) => void;
  onCriarSimNao: () => void;
}) {
  const usaAlternativas =
    pergunta.tipo === "multipla_escolha" ||
    pergunta.tipo === "caixa_selecao" ||
    pergunta.tipo === "sim_nao";

  return (
    <article className="min-w-0 overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl shadow-slate-200/80">
      <div className="border-b border-slate-100 bg-gradient-to-br from-[#F8FAFF] via-white to-white p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#08163F] px-3 py-1.5 text-xs font-black text-white">
                Pergunta {index + 1}
              </span>

              <span className="rounded-full bg-[#EEF2FF] px-3 py-1.5 text-xs font-black text-[#08163F]">
                {labelTipoPergunta(pergunta.tipo)}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                {pergunta.pontos} ponto(s)
              </span>

              {pergunta.obrigatoria && (
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                  Obrigatória
                </span>
              )}
            </div>

            <h3 className="mt-3 break-words text-lg font-black text-[#08163F] sm:text-xl">
              {pergunta.enunciado}
            </h3>

            {pergunta.descricao && (
              <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-500">
                {pergunta.descricao}
              </p>
            )}

            {pergunta.tipo === "escala" && (
              <p className="mt-2 text-sm font-bold text-slate-500">
                Escala de {pergunta.escala_min ?? 1} até{" "}
                {pergunta.escala_max ?? 5}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={onEditar}
              className="rounded-2xl bg-[#EEF2FF] px-4 py-2.5 text-xs font-black text-[#08163F] transition hover:bg-blue-100"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={onExcluir}
              className="rounded-2xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-600 transition hover:bg-red-100"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {!usaAlternativas && pergunta.tipo !== "sim_nao" && (
          <div className="rounded-[24px] border border-slate-100 bg-[#f9fafb] p-4 text-sm font-semibold text-slate-500">
            {pergunta.tipo === "resposta_curta" &&
              "O mentorado responderá em um campo curto."}
            {pergunta.tipo === "resposta_longa" &&
              "O mentorado responderá em um campo de texto longo."}
            {pergunta.tipo === "escala" &&
              "O mentorado escolherá uma nota dentro da escala configurada."}
            {pergunta.tipo === "upload" &&
              "O mentorado poderá enviar um link/arquivo da atividade."}
          </div>
        )}

        {pergunta.tipo === "sim_nao" && pergunta.alternativas.length === 0 && (
          <button
            type="button"
            onClick={onCriarSimNao}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#08163F]/20"
          >
            Criar alternativas Sim / Não
          </button>
        )}

        {usaAlternativas && (
          <div className="space-y-3">
            {pergunta.alternativas.length > 0 && (
              <div className="space-y-2">
                {pergunta.alternativas.map((alternativa) => (
                  <div
                    key={alternativa.id}
                    className={`flex min-w-0 flex-col gap-2 rounded-[22px] border p-3 sm:flex-row sm:items-center sm:justify-between ${
                      alternativa.correta
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-100 bg-[#f9fafb] text-slate-600"
                    }`}
                  >
                    <p className="break-words text-sm font-black">
                      {alternativa.texto}
                    </p>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onMarcarCorreta(alternativa)}
                        className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-[#08163F] shadow-sm"
                      >
                        {alternativa.correta ? "Correta ✓" : "Marcar correta"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onExcluirAlternativa(alternativa)}
                        className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pergunta.tipo !== "sim_nao" && (
              <div className="rounded-[24px] border border-slate-100 bg-[#f9fafb] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Nova alternativa
                </p>

                <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_170px_120px]">
                  <input
                    value={formAlternativa.texto}
                    onChange={(e) =>
                      setFormAlternativa({
                        ...formAlternativa,
                        texto: e.target.value,
                      })
                    }
                    placeholder="Texto da alternativa"
                    className={fieldClass}
                  />

                  <Toggle
                    label="Correta"
                    checked={formAlternativa.correta}
                    onChange={(checked) =>
                      setFormAlternativa({
                        ...formAlternativa,
                        correta: checked,
                      })
                    }
                  />

                  <button
                    type="button"
                    onClick={onSalvarAlternativa}
                    className="rounded-2xl bg-[#08163F] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#08163F]/20"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function MentorLoading({ mensagem }: { mensagem: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] px-4 text-[#08163F]">
      <div className="w-full max-w-sm rounded-[28px] border border-white/60 bg-white/90 p-6 text-center shadow-2xl shadow-slate-200/80 backdrop-blur-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-xs font-black text-white shadow-lg">
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

function Card({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${glassPanelClass} min-w-0 overflow-hidden p-5 lg:p-6`}>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
          CEO Club
        </p>

        <h2 className="break-words text-xl font-black text-[#08163F] sm:text-2xl">
          {titulo}
        </h2>

        {subtitulo && (
          <p className="max-w-2xl break-words text-sm font-semibold leading-6 text-slate-500">
            {subtitulo}
          </p>
        )}
      </div>

      <div className="mt-5 min-w-0">{children}</div>
    </section>
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
      <span className="mb-2 block break-words text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-[#f9fafb] p-3">
      <span className="break-words text-sm font-black text-[#08163F]">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-[#08163F]"
      />
    </label>
  );
}

function TabButton({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
        ativo
          ? "bg-[#08163F] text-white shadow-lg shadow-[#08163F]/20"
          : "bg-white text-[#08163F] shadow-sm hover:shadow-md"
      }`}
    >
      {children}
    </button>
  );
}

function Metric({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100">
        {titulo}
      </p>

      <p className="mt-2 break-words text-xl font-black text-white">{valor}</p>
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black text-[#08163F]">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusSimulado }) {
  const classe =
    status === "publicado"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : status === "arquivado"
      ? "bg-slate-100 text-slate-600 ring-slate-200"
      : "bg-amber-50 text-amber-700 ring-amber-100";

  const label =
    status === "publicado"
      ? "Publicado"
      : status === "arquivado"
      ? "Arquivado"
      : "Rascunho";

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 ${classe}`}
    >
      {label}
    </span>
  );
}

function TipoBadge({ tipo }: { tipo: TipoSimulado }) {
  const label = tiposSimulado.find((item) => item.value === tipo)?.label ?? tipo;

  return (
    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-blue-100 ring-1 ring-white/10">
      {label}
    </span>
  );
}

function labelTipoPergunta(tipo: TipoPergunta) {
  const labels: Record<TipoPergunta, string> = {
    multipla_escolha: "Múltipla escolha",
    caixa_selecao: "Caixa de seleção",
    resposta_curta: "Resposta curta",
    resposta_longa: "Resposta longa",
    escala: "Escala",
    sim_nao: "Sim / Não",
    upload: "Upload",
  };

  return labels[tipo];
}

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}
