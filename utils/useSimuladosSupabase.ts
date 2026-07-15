"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase";

export type TipoSimulado =
  | "treino"
  | "avaliacao"
  | "diagnostico"
  | "atividade";

export type StatusSimulado = "rascunho" | "publicado" | "arquivado";

export type TipoPergunta =
  | "multipla_escolha"
  | "caixa_selecao"
  | "resposta_curta"
  | "resposta_longa"
  | "escala"
  | "sim_nao"
  | "upload";

export type StatusTentativa = "em_andamento" | "enviado" | "corrigido";

export type AlternativaSupabase = {
  id: string;
  pergunta_id: string;
  texto: string;
  ordem: number;
  correta: boolean;
  created_at: string;
  updated_at: string;
};

export type PerguntaSupabase = {
  id: string;
  simulado_id: string;
  ordem: number;
  tipo: TipoPergunta;
  enunciado: string;
  descricao: string | null;
  obrigatoria: boolean;
  pontos: number;
  escala_min: number | null;
  escala_max: number | null;
  created_at: string;
  updated_at: string;
  alternativas: AlternativaSupabase[];
};

export type ModuloSupabase = {
  id: string;
  titulo: string | null;
  nome_premium: string | null;
  nome_explicativo: string | null;
  ordem: number | null;
};

export type SimuladoSupabase = {
  id: string;
  titulo: string;
  descricao: string | null;
  instrucoes: string | null;
  modulo_id: string | null;
  tipo: TipoSimulado;
  status: StatusSimulado;
  tempo_limite_minutos: number | null;
  permitir_refazer: boolean;
  mostrar_resultado: boolean;
  mostrar_gabarito: boolean;
  exigir_todas_respostas: boolean;
  limite_tentativas: number | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
  perguntas: PerguntaSupabase[];
  modulos?: ModuloSupabase | null;
};

export type TentativaSupabase = {
  id: string;
  simulado_id: string;
  mentorado_id: string;
  status: StatusTentativa;
  acertos: number;
  total_pontos: number;
  percentual: number;
  iniciado_em: string;
  enviado_em: string | null;
  corrigido_em: string | null;
  created_at: string;
  updated_at: string;
};

export type RespostaSupabase = {
  id: string;
  tentativa_id: string;
  pergunta_id: string;
  alternativa_id: string | null;
  alternativas_ids: string[] | null;
  resposta_texto: string | null;
  resposta_numero: number | null;
  arquivo_url: string | null;
  correta: boolean | null;
  pontos_obtidos: number;
  feedback_mentor: string | null;
  created_at: string;
  updated_at: string;
};

export type RespostaFormulario = {
  perguntaId: string;
  alternativaId?: string | null;
  alternativasIds?: string[] | null;
  respostaTexto?: string | null;
  respostaNumero?: number | null;
  arquivoUrl?: string | null;
};

export type PayloadSimulado = {
  titulo: string;
  descricao?: string | null;
  instrucoes?: string | null;
  moduloId?: string | null;
  tipo?: TipoSimulado;
  status?: StatusSimulado;
  tempoLimiteMinutos?: number | null;
  permitirRefazer?: boolean;
  mostrarResultado?: boolean;
  mostrarGabarito?: boolean;
  exigirTodasRespostas?: boolean;
  limiteTentativas?: number | null;
  criadoPor?: string | null;
};

export type PayloadPergunta = {
  simuladoId: string;
  ordem?: number;
  tipo: TipoPergunta;
  enunciado: string;
  descricao?: string | null;
  obrigatoria?: boolean;
  pontos?: number;
  escalaMin?: number | null;
  escalaMax?: number | null;
};

export type PayloadAlternativa = {
  perguntaId: string;
  texto: string;
  ordem?: number;
  correta?: boolean;
};

type AlternativaBruta = Partial<AlternativaSupabase> & {
  id: string | number;
  pergunta_id: string | number;
};

type PerguntaBruta = Partial<Omit<PerguntaSupabase, "alternativas">> & {
  id: string | number;
  simulado_id: string | number;
};

type ModuloBruto = Partial<ModuloSupabase> & {
  id: string | number;
};

type SimuladoBruto = Partial<Omit<SimuladoSupabase, "perguntas" | "modulos">> & {
  id: string | number;
};

function numeroSeguro(valor: unknown, fallback = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
}

function textoSeguro(valor: unknown, fallback = "") {
  return typeof valor === "string" ? valor : fallback;
}

function payloadSimuladoParaBanco(payload: PayloadSimulado) {
  return {
    titulo: payload.titulo.trim(),
    descricao: payload.descricao?.trim() || null,
    instrucoes: payload.instrucoes?.trim() || null,
    modulo_id: payload.moduloId || null,
    tipo: payload.tipo ?? "treino",
    status: payload.status ?? "rascunho",
    tempo_limite_minutos: payload.tempoLimiteMinutos ?? null,
    permitir_refazer: payload.permitirRefazer ?? true,
    mostrar_resultado: payload.mostrarResultado ?? true,
    mostrar_gabarito: payload.mostrarGabarito ?? false,
    exigir_todas_respostas: payload.exigirTodasRespostas ?? true,
    limite_tentativas: payload.limiteTentativas ?? null,
    criado_por: payload.criadoPor ?? null,
    updated_at: new Date().toISOString(),
  };
}

function payloadPerguntaParaBanco(payload: PayloadPergunta) {
  return {
    simulado_id: payload.simuladoId,
    ordem: payload.ordem ?? 1,
    tipo: payload.tipo,
    enunciado: payload.enunciado.trim(),
    descricao: payload.descricao?.trim() || null,
    obrigatoria: payload.obrigatoria ?? true,
    pontos: payload.pontos ?? 1,
    escala_min: payload.tipo === "escala" ? payload.escalaMin ?? 1 : null,
    escala_max: payload.tipo === "escala" ? payload.escalaMax ?? 5 : null,
    updated_at: new Date().toISOString(),
  };
}

function payloadAlternativaParaBanco(payload: PayloadAlternativa) {
  return {
    pergunta_id: payload.perguntaId,
    texto: payload.texto.trim(),
    ordem: payload.ordem ?? 1,
    correta: payload.correta ?? false,
    updated_at: new Date().toISOString(),
  };
}

function normalizarAlternativa(item: AlternativaBruta): AlternativaSupabase {
  return {
    id: String(item.id),
    pergunta_id: String(item.pergunta_id),
    texto: textoSeguro(item.texto),
    ordem: numeroSeguro(item.ordem, 1),
    correta: Boolean(item.correta),
    created_at: item.created_at ?? "",
    updated_at: item.updated_at ?? "",
  };
}

function normalizarPergunta(
  item: PerguntaBruta,
  alternativas: AlternativaSupabase[]
): PerguntaSupabase {
  return {
    id: String(item.id),
    simulado_id: String(item.simulado_id),
    ordem: numeroSeguro(item.ordem, 1),
    tipo: (item.tipo ?? "multipla_escolha") as TipoPergunta,
    enunciado: textoSeguro(item.enunciado),
    descricao: item.descricao ?? null,
    obrigatoria: Boolean(item.obrigatoria ?? true),
    pontos: numeroSeguro(item.pontos, 1),
    escala_min: item.escala_min ?? null,
    escala_max: item.escala_max ?? null,
    created_at: item.created_at ?? "",
    updated_at: item.updated_at ?? "",
    alternativas,
  };
}

function normalizarModulo(item: ModuloBruto): ModuloSupabase {
  return {
    id: String(item.id),
    titulo: item.titulo ?? null,
    nome_premium: item.nome_premium ?? null,
    nome_explicativo: item.nome_explicativo ?? null,
    ordem: item.ordem ?? null,
  };
}

function normalizarSimulado(
  item: SimuladoBruto,
  perguntas: PerguntaSupabase[],
  modulo: ModuloSupabase | null
): SimuladoSupabase {
  return {
    id: String(item.id),
    titulo: textoSeguro(item.titulo),
    descricao: item.descricao ?? null,
    instrucoes: item.instrucoes ?? null,
    modulo_id: item.modulo_id ? String(item.modulo_id) : null,
    tipo: (item.tipo ?? "treino") as TipoSimulado,
    status: (item.status ?? "rascunho") as StatusSimulado,
    tempo_limite_minutos: item.tempo_limite_minutos ?? null,
    permitir_refazer: item.permitir_refazer ?? true,
    mostrar_resultado: item.mostrar_resultado ?? true,
    mostrar_gabarito: item.mostrar_gabarito ?? false,
    exigir_todas_respostas: item.exigir_todas_respostas ?? true,
    limite_tentativas: item.limite_tentativas ?? null,
    criado_por: item.criado_por ?? null,
    created_at: item.created_at ?? "",
    updated_at: item.updated_at ?? "",
    perguntas,
    modulos: modulo,
  };
}

export function useSimuladosSupabase() {
  const [simulados, setSimulados] = useState<SimuladoSupabase[]>([]);
  const [tentativas, setTentativas] = useState<TentativaSupabase[]>([]);
  const [respostas, setRespostas] = useState<RespostaSupabase[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarSimulados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");

      const { data: simuladosData, error: erroSimulados } = await supabase
        .from("simulados")
        .select(
          `
          id,
          titulo,
          descricao,
          instrucoes,
          modulo_id,
          tipo,
          status,
          tempo_limite_minutos,
          permitir_refazer,
          mostrar_resultado,
          mostrar_gabarito,
          exigir_todas_respostas,
          limite_tentativas,
          criado_por,
          created_at,
          updated_at
        `
        )
        .order("created_at", { ascending: false });

      if (erroSimulados) {
        throw new Error(erroSimulados.message);
      }

      const simuladosBrutos = (simuladosData ?? []) as SimuladoBruto[];
      const simuladoIds = simuladosBrutos.map((item) => String(item.id));

      let perguntasBrutas: PerguntaBruta[] = [];

      if (simuladoIds.length > 0) {
        const { data, error } = await supabase
          .from("simulado_perguntas")
          .select(
            `
            id,
            simulado_id,
            ordem,
            tipo,
            enunciado,
            descricao,
            obrigatoria,
            pontos,
            escala_min,
            escala_max,
            created_at,
            updated_at
          `
          )
          .in("simulado_id", simuladoIds)
          .order("ordem", { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        perguntasBrutas = (data ?? []) as PerguntaBruta[];
      }

      const perguntaIds = perguntasBrutas.map((item) => String(item.id));
      let alternativasBrutas: AlternativaBruta[] = [];

      if (perguntaIds.length > 0) {
        const { data, error } = await supabase
          .from("simulado_alternativas")
          .select(
            `
            id,
            pergunta_id,
            texto,
            ordem,
            correta,
            created_at,
            updated_at
          `
          )
          .in("pergunta_id", perguntaIds)
          .order("ordem", { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        alternativasBrutas = (data ?? []) as AlternativaBruta[];
      }

      let modulosBrutos: ModuloBruto[] = [];

      const { data: modulosData, error: erroModulos } = await supabase
        .from("modulos")
        .select("id, titulo, nome_premium, nome_explicativo, ordem")
        .order("ordem", { ascending: true });

      if (!erroModulos) {
        modulosBrutos = (modulosData ?? []) as ModuloBruto[];
      }

      const alternativasPorPergunta = new Map<string, AlternativaSupabase[]>();

      alternativasBrutas.forEach((item) => {
        const alternativa = normalizarAlternativa(item);
        const chave = alternativa.pergunta_id;

        const listaAtual = alternativasPorPergunta.get(chave) ?? [];
        listaAtual.push(alternativa);
        alternativasPorPergunta.set(chave, listaAtual);
      });

      const perguntasPorSimulado = new Map<string, PerguntaSupabase[]>();

      perguntasBrutas.forEach((item) => {
        const perguntaId = String(item.id);
        const simuladoId = String(item.simulado_id);

        const alternativas = alternativasPorPergunta.get(perguntaId) ?? [];
        const pergunta = normalizarPergunta(item, alternativas);

        const listaAtual = perguntasPorSimulado.get(simuladoId) ?? [];
        listaAtual.push(pergunta);
        perguntasPorSimulado.set(simuladoId, listaAtual);
      });

      const modulosPorId = new Map<string, ModuloSupabase>();

      modulosBrutos.forEach((item) => {
        const modulo = normalizarModulo(item);
        modulosPorId.set(modulo.id, modulo);
      });

      const simuladosNormalizados = simuladosBrutos.map((item) => {
        const simuladoId = String(item.id);
        const moduloId = item.modulo_id ? String(item.modulo_id) : null;

        const perguntas = perguntasPorSimulado.get(simuladoId) ?? [];
        const modulo = moduloId ? modulosPorId.get(moduloId) ?? null : null;

        return normalizarSimulado(item, perguntas, modulo);
      });

      setSimulados(simuladosNormalizados);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os simulados."
      );

      setSimulados([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarTentativas = useCallback(async (mentoradoId?: string) => {
    try {
      setErro("");

      let query = supabase
        .from("simulado_tentativas")
        .select(
          "id, simulado_id, mentorado_id, status, acertos, total_pontos, percentual, iniciado_em, enviado_em, corrigido_em, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (mentoradoId) {
        query = query.eq("mentorado_id", mentoradoId);
      }

      const { data, error } = await query;

      if (error) {
        setTentativas([]);
        return;
      }

      setTentativas((data ?? []) as TentativaSupabase[]);
    } catch {
      setTentativas([]);
    }
  }, []);

  const carregarRespostas = useCallback(async (tentativaId: string) => {
    try {
      setErro("");

      const { data, error } = await supabase
        .from("simulado_respostas")
        .select(
          "id, tentativa_id, pergunta_id, alternativa_id, alternativas_ids, resposta_texto, resposta_numero, arquivo_url, correta, pontos_obtidos, feedback_mentor, created_at, updated_at"
        )
        .eq("tentativa_id", tentativaId)
        .order("created_at", { ascending: true });

      if (error) {
        setRespostas([]);
        return;
      }

      setRespostas((data ?? []) as RespostaSupabase[]);
    } catch {
      setRespostas([]);
    }
  }, []);

  useEffect(() => {
    carregarSimulados();
  }, [carregarSimulados]);

  const simuladosPublicados = useMemo(() => {
    return simulados.filter((simulado) => simulado.status === "publicado");
  }, [simulados]);

  const totalPerguntas = useMemo(() => {
    return simulados.reduce(
      (total, simulado) => total + simulado.perguntas.length,
      0
    );
  }, [simulados]);

  async function criarSimulado(payload: PayloadSimulado) {
  const { data, error } = await supabase
    .from("simulados")
    .insert(payloadSimuladoParaBanco(payload))
    .select(
      `
      id,
      titulo,
      descricao,
      instrucoes,
      modulo_id,
      tipo,
      status,
      tempo_limite_minutos,
      permitir_refazer,
      mostrar_resultado,
      mostrar_gabarito,
      exigir_todas_respostas,
      limite_tentativas,
      criado_por,
      created_at,
      updated_at
    `
    )
    .single();

  if (error) throw new Error(error.message);

  await carregarSimulados();

  return normalizarSimulado(data, [], null);
}

  async function atualizarSimulado(simuladoId: string, payload: PayloadSimulado) {
    const { error } = await supabase
      .from("simulados")
      .update(payloadSimuladoParaBanco(payload))
      .eq("id", simuladoId);

    if (error) throw new Error(error.message);

    await carregarSimulados();
  }

  async function atualizarStatusSimulado(
    simuladoId: string,
    status: StatusSimulado
  ) {
    const { error } = await supabase
      .from("simulados")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", simuladoId);

    if (error) throw new Error(error.message);

    await carregarSimulados();
  }

  async function excluirSimulado(simuladoId: string) {
    const { error } = await supabase
      .from("simulados")
      .delete()
      .eq("id", simuladoId);

    if (error) throw new Error(error.message);

    await carregarSimulados();
  }

  async function criarPergunta(payload: PayloadPergunta) {
    const { error } = await supabase
      .from("simulado_perguntas")
      .insert(payloadPerguntaParaBanco(payload));

    if (error) throw new Error(error.message);

    await carregarSimulados();
  }

  async function atualizarPergunta(
    perguntaId: string,
    payload: PayloadPergunta
  ) {
    const { error } = await supabase
      .from("simulado_perguntas")
      .update(payloadPerguntaParaBanco(payload))
      .eq("id", perguntaId);

    if (error) throw new Error(error.message);

    await carregarSimulados();
  }

  async function excluirPergunta(perguntaId: string) {
    const { error } = await supabase
      .from("simulado_perguntas")
      .delete()
      .eq("id", perguntaId);

    if (error) throw new Error(error.message);

    await carregarSimulados();
  }

  async function criarAlternativa(payload: PayloadAlternativa) {
    const { error } = await supabase
      .from("simulado_alternativas")
      .insert(payloadAlternativaParaBanco(payload));

    if (error) throw new Error(error.message);

    await carregarSimulados();
  }

  async function atualizarAlternativa(
    alternativaId: string,
    payload: PayloadAlternativa
  ) {
    const { error } = await supabase
      .from("simulado_alternativas")
      .update(payloadAlternativaParaBanco(payload))
      .eq("id", alternativaId);

    if (error) throw new Error(error.message);

    await carregarSimulados();
  }

  async function excluirAlternativa(alternativaId: string) {
    const { error } = await supabase
      .from("simulado_alternativas")
      .delete()
      .eq("id", alternativaId);

    if (error) throw new Error(error.message);

    await carregarSimulados();
  }

  function corrigirResposta(
    pergunta: PerguntaSupabase,
    resposta: RespostaFormulario
  ) {
    const pontos = numeroSeguro(pergunta.pontos, 1);

    if (
      pergunta.tipo === "resposta_curta" ||
      pergunta.tipo === "resposta_longa" ||
      pergunta.tipo === "upload" ||
      pergunta.tipo === "escala"
    ) {
      return {
        correta: null,
        pontosObtidos: 0,
      };
    }

    if (pergunta.tipo === "sim_nao" || pergunta.tipo === "multipla_escolha") {
      const correta = pergunta.alternativas.find(
        (alternativa) => alternativa.correta
      );

      const acertou = Boolean(correta && resposta.alternativaId === correta.id);

      return {
        correta: acertou,
        pontosObtidos: acertou ? pontos : 0,
      };
    }

    if (pergunta.tipo === "caixa_selecao") {
      const corretas = pergunta.alternativas
        .filter((alternativa) => alternativa.correta)
        .map((alternativa) => alternativa.id)
        .sort();

      const marcadas = [...(resposta.alternativasIds ?? [])].sort();

      const acertou =
        corretas.length === marcadas.length &&
        corretas.every((id, index) => id === marcadas[index]);

      return {
        correta: acertou,
        pontosObtidos: acertou ? pontos : 0,
      };
    }

    return {
      correta: null,
      pontosObtidos: 0,
    };
  }

  async function enviarTentativa({
    simulado,
    mentoradoId,
    respostasFormulario,
  }: {
    simulado: SimuladoSupabase;
    mentoradoId: string;
    respostasFormulario: RespostaFormulario[];
  }) {
    const perguntas = simulado.perguntas;
    const respostasPorPergunta = new Map(
      respostasFormulario.map((resposta) => [resposta.perguntaId, resposta])
    );

    if (simulado.exigir_todas_respostas) {
      const semResposta = perguntas.find((pergunta) => {
        if (!pergunta.obrigatoria) return false;

        const resposta = respostasPorPergunta.get(pergunta.id);

        if (!resposta) return true;

        if (
          pergunta.tipo === "multipla_escolha" ||
          pergunta.tipo === "sim_nao"
        ) {
          return !resposta.alternativaId;
        }

        if (pergunta.tipo === "caixa_selecao") {
          return (
            !resposta.alternativasIds || resposta.alternativasIds.length === 0
          );
        }

        if (pergunta.tipo === "escala") {
          return (
            resposta.respostaNumero === null ||
            resposta.respostaNumero === undefined
          );
        }

        if (pergunta.tipo === "upload") {
          return !resposta.arquivoUrl;
        }

        return !resposta.respostaTexto?.trim();
      });

      if (semResposta) {
        throw new Error(
          "Responda todas as perguntas obrigatórias antes de enviar."
        );
      }
    }

    const totalPontos = perguntas.reduce(
      (acc, pergunta) => acc + numeroSeguro(pergunta.pontos, 1),
      0
    );

    let pontosObtidos = 0;
    let acertos = 0;

    const respostasCalculadas = perguntas.map((pergunta) => {
      const resposta = respostasPorPergunta.get(pergunta.id) ?? {
        perguntaId: pergunta.id,
      };

      const correcao = corrigirResposta(pergunta, resposta);

      pontosObtidos += correcao.pontosObtidos;

      if (correcao.correta === true) {
        acertos += 1;
      }

      return {
        pergunta,
        resposta,
        correcao,
      };
    });

    const percentual =
      totalPontos === 0 ? 0 : Math.round((pontosObtidos / totalPontos) * 100);

    const { data: tentativa, error: erroTentativa } = await supabase
      .from("simulado_tentativas")
      .insert({
        simulado_id: simulado.id,
        mentorado_id: mentoradoId,
        status: "enviado",
        acertos,
        total_pontos: totalPontos,
        percentual,
        enviado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(
        "id, simulado_id, mentorado_id, status, acertos, total_pontos, percentual, iniciado_em, enviado_em, corrigido_em, created_at, updated_at"
      )
      .single();

    if (erroTentativa) throw new Error(erroTentativa.message);

    const respostasPayload = respostasCalculadas.map(
      ({ pergunta, resposta, correcao }) => ({
        simulado_id: simulado.id,
        mentorado_id: mentoradoId,
        tentativa_id: tentativa.id,
        pergunta_id: pergunta.id,
        alternativa_id: resposta.alternativaId || null,
        alternativas_ids: resposta.alternativasIds ?? null,
        resposta_texto: resposta.respostaTexto?.trim() || null,
        resposta_numero: resposta.respostaNumero ?? null,
        arquivo_url: resposta.arquivoUrl || null,
        correta: correcao.correta,
        pontos_obtidos: correcao.pontosObtidos,
        updated_at: new Date().toISOString(),
      })
    );

    const { error: erroRespostas } = await supabase
      .from("simulado_respostas")
      .insert(respostasPayload);

    if (erroRespostas) throw new Error(erroRespostas.message);

    await carregarTentativas(mentoradoId);

    return tentativa as TentativaSupabase;
  }

  return {
    carregando,
    erro,
    setErro,

    simulados,
    simuladosPublicados,
    totalPerguntas,

    tentativas,
    respostas,

    carregarSimulados,
    carregarTentativas,
    carregarRespostas,

    criarSimulado,
    atualizarSimulado,
    atualizarStatusSimulado,
    excluirSimulado,

    criarPergunta,
    atualizarPergunta,
    excluirPergunta,

    criarAlternativa,
    atualizarAlternativa,
    excluirAlternativa,

    enviarTentativa,
  };
}
