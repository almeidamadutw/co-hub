"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import MentoradoLoading from "@/components/MentoradoLoading";
import {
  logoutUsuario,
  sincronizarUsuarioComSessao,
  User,
} from "@/utils/auth";
import { supabase } from "@/utils/supabase";

type TipoPergunta =
  | "multipla_escolha"
  | "caixa_selecao"
  | "resposta_curta"
  | "resposta_longa"
  | "escala"
  | "sim_nao"
  | "upload";

type AlternativaPublica = {
  id: string;
  pergunta_id: string;
  texto: string;
  ordem: number;
};

type PerguntaPublica = {
  id: string;
  simulado_id: string;
  ordem: number;
  tipo: TipoPergunta;
  enunciado: string;
  descricao: string | null;
  obrigatoria: boolean | null;
  pontos: number | null;
  escala_min: number | null;
  escala_max: number | null;
  alternativas: AlternativaPublica[];
};

type SimuladoPublico = {
  id: string;
  titulo: string;
  descricao: string | null;
  instrucoes: string | null;
  tipo: string;
  tempo_limite_minutos: number | null;
  permitir_refazer: boolean;
  mostrar_resultado: boolean;
  exigir_todas_respostas: boolean;
  limite_tentativas: number | null;
  perguntas: PerguntaPublica[];
};

type Tentativa = {
  id: string;
  simulado_id: string;
  status: "em_andamento" | "enviado" | "corrigido";
  percentual: number | null;
  created_at: string;
};

type RespostaFormulario = {
  perguntaId: string;
  alternativaId?: string | null;
  alternativasIds?: string[] | null;
  respostaTexto?: string | null;
  respostaNumero?: number | null;
  arquivoUrl?: string | null;
};

type ResultadoEnvio = {
  acertos: number;
  totalPontos: number;
  percentual: number;
} | null;

async function obterTokenSessao() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export default function MentoradoPraticarPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [simulados, setSimulados] = useState<SimuladoPublico[]>([]);
  const [tentativas, setTentativas] = useState<Tentativa[]>([]);
  const [simuladoAberto, setSimuladoAberto] =
    useState<SimuladoPublico | null>(null);
  const [respostas, setRespostas] = useState<
    Record<string, RespostaFormulario>
  >({});
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [resultado, setResultado] = useState<ResultadoEnvio>(null);

  useEffect(() => {
    let componenteAtivo = true;

    async function iniciarTela() {
      const user = await sincronizarUsuarioComSessao();

      if (!componenteAtivo) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      if (user.role === "mentor") {
        router.replace("/mentor/dashboard");
        return;
      }

      if (user.role !== "mentorado") {
        await logoutUsuario();
        router.replace("/login");
        return;
      }

      setUsuario(user);
      await carregarSimulados();
    }

    void iniciarTela();

    return () => {
      componenteAtivo = false;
    };
  }, [router]);

  async function carregarSimulados() {
    try {
      setCarregando(true);
      setErro("");

      const token = await obterTokenSessao();

      if (!token) throw new Error("Sessão não encontrada.");

      const resposta = await fetch("/api/simulados/mentorado", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resposta.json();

      if (!resposta.ok) {
        throw new Error(json.error ?? "Não foi possível carregar os simulados.");
      }

      setSimulados((json.simulados ?? []) as SimuladoPublico[]);
      setTentativas((json.tentativas ?? []) as Tentativa[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os simulados."
      );
    } finally {
      setCarregando(false);
    }
  }

  const totalRespondidos = useMemo(
    () =>
      new Set(
        tentativas
          .filter(
            (tentativa) =>
              tentativa.status === "enviado" ||
              tentativa.status === "corrigido"
          )
          .map((tentativa) => tentativa.simulado_id)
      ).size,
    [tentativas]
  );

  const melhorResultado = useMemo(() => {
    const simuladosComResultado = new Set(
      simulados
        .filter((simulado) => simulado.mostrar_resultado)
        .map((simulado) => simulado.id)
    );
    const resultadosVisiveis = tentativas
      .filter(
        (tentativa) =>
          simuladosComResultado.has(tentativa.simulado_id) &&
          tentativa.percentual !== null
      )
      .map((tentativa) => Number(tentativa.percentual || 0));

    if (resultadosVisiveis.length === 0) return null;

    return Math.max(...resultadosVisiveis);
  }, [simulados, tentativas]);

  function tentativasDoSimulado(simuladoId: string) {
    return tentativas.filter(
      (tentativa) => tentativa.simulado_id === simuladoId
    );
  }

  function podeResponder(simulado: SimuladoPublico) {
    const quantidade = tentativasDoSimulado(simulado.id).length;

    if (!simulado.permitir_refazer && quantidade > 0) return false;

    return !(
      simulado.limite_tentativas &&
      quantidade >= simulado.limite_tentativas
    );
  }

  function abrirSimulado(simulado: SimuladoPublico) {
    setErro("");
    setSucesso("");
    setResultado(null);
    setRespostas({});
    setSimuladoAberto(simulado);
  }

  function atualizarResposta(
    perguntaId: string,
    alteracao: Partial<RespostaFormulario>
  ) {
    setRespostas((atual) => ({
      ...atual,
      [perguntaId]: {
        ...atual[perguntaId],
        ...alteracao,
        perguntaId,
      },
    }));
  }

  function alternarCheckbox(perguntaId: string, alternativaId: string) {
    const marcadas = respostas[perguntaId]?.alternativasIds ?? [];
    const proximaLista = marcadas.includes(alternativaId)
      ? marcadas.filter((id) => id !== alternativaId)
      : [...marcadas, alternativaId];

    atualizarResposta(perguntaId, { alternativasIds: proximaLista });
  }

  async function enviarTentativa() {
    if (!simuladoAberto) return;

    try {
      setEnviando(true);
      setErro("");
      setSucesso("");

      const token = await obterTokenSessao();

      if (!token) throw new Error("Sessão não encontrada.");

      const resposta = await fetch("/api/simulados/mentorado", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          simuladoId: simuladoAberto.id,
          respostas: Object.values(respostas),
        }),
      });
      const json = await resposta.json();

      if (!resposta.ok) {
        throw new Error(json.error ?? "Não foi possível enviar a tentativa.");
      }

      setTentativas((atual) => [json.tentativa as Tentativa, ...atual]);
      setResultado((json.resultado ?? null) as ResultadoEnvio);
      setSucesso("Respostas enviadas com sucesso.");
      setRespostas({});
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a tentativa."
      );
    } finally {
      setEnviando(false);
    }
  }

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return <MentoradoLoading mensagem="Carregando simulados..." />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <MentoradoSidebar nome={usuario.nome} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.push("/mentorado/dashboard")}
              className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
            >
              ← Voltar
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 sm:text-xs">
                Prática CEO Club
              </p>
              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
                Simulados
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/mentorado/suporte")}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-sm sm:text-sm"
            >
              Suporte
            </button>
            <button
              onClick={sair}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white shadow-lg sm:text-sm"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="relative min-w-0 overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="overflow-hidden rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white shadow-2xl shadow-[#07122F]/20 sm:p-6 lg:p-7">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-200">
              Central de prática
            </p>
            <h2 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Teste o que aprendeu com atividades reais.
            </h2>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-blue-100 sm:text-base">
              Aqui aparecem somente os simulados publicados e ligados aos
              módulos já liberados para você.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <ResumoPratica titulo="Disponíveis" valor={simulados.length} />
              <ResumoPratica titulo="Respondidos" valor={totalRespondidos} />
              <ResumoPratica
                titulo="Melhor resultado"
                valor={melhorResultado === null ? "—" : `${melhorResultado}%`}
              />
            </div>
          </section>

          {(erro || sucesso) && (
            <div
              className={`mt-4 rounded-2xl p-4 text-sm font-bold ${
                erro
                  ? "bg-red-50 text-red-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {erro || sucesso}
            </div>
          )}

          {simuladoAberto ? (
            <section className="mt-4 rounded-[24px] bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                    Respondendo simulado
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    {simuladoAberto.titulo}
                  </h2>
                  {simuladoAberto.instrucoes && (
                    <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                      {simuladoAberto.instrucoes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSimuladoAberto(null);
                    setResultado(null);
                    setSucesso("");
                  }}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600"
                >
                  Fechar
                </button>
              </div>

              {resultado ? (
                <div className="mt-6 rounded-[22px] bg-emerald-50 p-6 text-center">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
                    Resultado registrado
                  </p>
                  <strong className="mt-3 block text-5xl font-black text-emerald-800">
                    {resultado.percentual}%
                  </strong>
                  <p className="mt-2 text-sm font-bold text-emerald-700">
                    {resultado.acertos} acerto(s) · {resultado.totalPontos} ponto(s)
                    possíveis
                  </p>
                </div>
              ) : sucesso ? (
                <div className="mt-6 rounded-[22px] bg-emerald-50 p-6 text-center text-sm font-bold text-emerald-700">
                  Sua tentativa foi registrada. O resultado deste simulado não é
                  exibido automaticamente.
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-4">
                    {simuladoAberto.perguntas.map((pergunta, indice) => (
                      <PerguntaCard
                        key={pergunta.id}
                        pergunta={pergunta}
                        numero={indice + 1}
                        resposta={respostas[pergunta.id]}
                        onAtualizar={(alteracao) =>
                          atualizarResposta(pergunta.id, alteracao)
                        }
                        onAlternarCheckbox={(alternativaId) =>
                          alternarCheckbox(pergunta.id, alternativaId)
                        }
                      />
                    ))}
                  </div>

                  <button
                    onClick={enviarTentativa}
                    disabled={enviando || simuladoAberto.perguntas.length === 0}
                    className="mt-6 w-full rounded-2xl bg-[#08163F] px-5 py-4 text-sm font-black text-white transition hover:bg-[#12317C] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {enviando ? "Enviando..." : "Enviar respostas"}
                  </button>
                </>
              )}
            </section>
          ) : (
            <section className="mt-4 grid gap-4 xl:grid-cols-2">
              {simulados.length === 0 && (
                <div className="rounded-[22px] bg-white p-7 text-center shadow-xl shadow-slate-200/70 xl:col-span-2">
                  <h3 className="text-xl font-black">
                    Nenhum simulado publicado
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Quando a mentoria publicar uma nova atividade, ela aparecerá
                    aqui automaticamente.
                  </p>
                </div>
              )}

              {simulados.map((simulado) => {
                const tentativasAtuais = tentativasDoSimulado(simulado.id);
                const ultimaTentativa = tentativasAtuais[0];
                const liberado = podeResponder(simulado);

                return (
                  <article
                    key={simulado.id}
                    className="min-w-0 overflow-hidden rounded-[22px] bg-white p-5 shadow-xl shadow-slate-200/70"
                  >
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#08163F] px-3 py-1.5 text-xs font-black text-white">
                        {rotuloTipo(simulado.tipo)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
                        {simulado.perguntas.length} pergunta(s)
                      </span>
                      {simulado.tempo_limite_minutos && (
                        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                          {simulado.tempo_limite_minutos} min
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 break-words text-xl font-black">
                      {simulado.titulo}
                    </h3>
                    <p className="mt-2 min-h-12 break-words text-sm font-semibold leading-6 text-slate-500">
                      {simulado.descricao ||
                        "Atividade preparada pela equipe da mentoria."}
                    </p>

                    <div className="mt-4 rounded-2xl bg-[#f8fafc] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        Seu histórico
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-600">
                        {ultimaTentativa
                          ? simulado.mostrar_resultado
                            ? `Último resultado: ${Number(
                                ultimaTentativa.percentual || 0
                              )}%`
                            : "Última tentativa enviada"
                          : "Ainda não respondido"}
                      </p>
                    </div>

                    <button
                      onClick={() => abrirSimulado(simulado)}
                      disabled={!liberado || simulado.perguntas.length === 0}
                      className="mt-5 w-full rounded-2xl bg-[#08163F] px-4 py-3 text-sm font-black text-white transition hover:bg-[#12317C] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {!liberado
                        ? "Limite de tentativas atingido"
                        : ultimaTentativa
                        ? "Responder novamente"
                        : "Começar simulado"}
                    </button>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function PerguntaCard({
  pergunta,
  numero,
  resposta,
  onAtualizar,
  onAlternarCheckbox,
}: {
  pergunta: PerguntaPublica;
  numero: number;
  resposta?: RespostaFormulario;
  onAtualizar: (alteracao: Partial<RespostaFormulario>) => void;
  onAlternarCheckbox: (alternativaId: string) => void;
}) {
  const escalaMin = pergunta.escala_min ?? 1;
  const escalaMax = pergunta.escala_max ?? 5;
  const valoresEscala =
    escalaMax >= escalaMin && escalaMax - escalaMin <= 20
      ? Array.from(
          { length: escalaMax - escalaMin + 1 },
          (_, indice) => escalaMin + indice
        )
      : [];

  return (
    <article className="rounded-[20px] border border-slate-100 bg-[#fbfcfe] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#08163F] text-xs font-black text-white">
          {numero}
        </span>
        <div className="min-w-0">
          <h3 className="break-words text-base font-black sm:text-lg">
            {pergunta.enunciado}
            {pergunta.obrigatoria !== false && (
              <span className="ml-1 text-red-500">*</span>
            )}
          </h3>
          {pergunta.descricao && (
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              {pergunta.descricao}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {(pergunta.tipo === "multipla_escolha" ||
          pergunta.tipo === "sim_nao") &&
          pergunta.alternativas.map((alternativa) => (
            <label
              key={alternativa.id}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700"
            >
              <input
                type="radio"
                name={pergunta.id}
                checked={resposta?.alternativaId === alternativa.id}
                onChange={() =>
                  onAtualizar({ alternativaId: alternativa.id })
                }
                className="h-4 w-4 accent-[#08163F]"
              />
              {alternativa.texto}
            </label>
          ))}

        {pergunta.tipo === "caixa_selecao" &&
          pergunta.alternativas.map((alternativa) => (
            <label
              key={alternativa.id}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700"
            >
              <input
                type="checkbox"
                checked={Boolean(
                  resposta?.alternativasIds?.includes(alternativa.id)
                )}
                onChange={() => onAlternarCheckbox(alternativa.id)}
                className="h-4 w-4 accent-[#08163F]"
              />
              {alternativa.texto}
            </label>
          ))}

        {pergunta.tipo === "resposta_curta" && (
          <input
            value={resposta?.respostaTexto ?? ""}
            onChange={(evento) =>
              onAtualizar({ respostaTexto: evento.target.value })
            }
            placeholder="Digite sua resposta"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
          />
        )}

        {pergunta.tipo === "resposta_longa" && (
          <textarea
            value={resposta?.respostaTexto ?? ""}
            onChange={(evento) =>
              onAtualizar({ respostaTexto: evento.target.value })
            }
            placeholder="Descreva sua resposta"
            rows={5}
            className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
          />
        )}

        {pergunta.tipo === "escala" && (
          <div className="flex flex-wrap gap-2">
            {valoresEscala.map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => onAtualizar({ respostaNumero: valor })}
                className={`h-11 min-w-11 rounded-xl px-3 text-sm font-black transition ${
                  resposta?.respostaNumero === valor
                    ? "bg-[#08163F] text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {valor}
              </button>
            ))}
          </div>
        )}

        {pergunta.tipo === "upload" && (
          <input
            type="url"
            value={resposta?.arquivoUrl ?? ""}
            onChange={(evento) =>
              onAtualizar({ arquivoUrl: evento.target.value })
            }
            placeholder="Cole o link do arquivo enviado"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
          />
        )}
      </div>
    </article>
  );
}

function ResumoPratica({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number | string;
}) {
  return (
    <article className="rounded-[20px] bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
        {titulo}
      </p>
      <strong className="mt-3 block text-3xl font-black text-white">
        {valor}
      </strong>
    </article>
  );
}

function rotuloTipo(tipo: string) {
  const rotulos: Record<string, string> = {
    treino: "Treino",
    avaliacao: "Avaliação",
    diagnostico: "Diagnóstico",
    atividade: "Atividade",
  };

  return rotulos[tipo] ?? "Simulado";
}
