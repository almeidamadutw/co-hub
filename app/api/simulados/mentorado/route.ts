import { NextRequest, NextResponse } from "next/server";
import {
  criarClienteAdmin,
  responderPermissaoNegada,
  verificarAcesso,
} from "@/utils/apiAuth";
import {
  idsModulosLiberados,
  ModuloLiberacaoGlobal,
} from "@/utils/moduloLiberacoes";

type RespostaRecebida = {
  perguntaId: string;
  alternativaId?: string | null;
  alternativasIds?: string[] | null;
  respostaTexto?: string | null;
  respostaNumero?: number | null;
  arquivoUrl?: string | null;
};

type PerguntaBanco = {
  id: string;
  simulado_id: string;
  ordem: number;
  tipo: string;
  enunciado: string;
  descricao: string | null;
  obrigatoria: boolean | null;
  pontos: number | null;
  escala_min: number | null;
  escala_max: number | null;
};

type AlternativaBanco = {
  id: string;
  pergunta_id: string;
  texto: string;
  ordem: number;
  correta: boolean;
};

const CAMPOS_SIMULADO =
  "id, titulo, descricao, instrucoes, modulo_id, tipo, status, ativo, tempo_limite_minutos, permitir_refazer, mostrar_resultado, mostrar_gabarito, exigir_todas_respostas, limite_tentativas, created_at, updated_at";

const CAMPOS_PERGUNTA =
  "id, simulado_id, ordem, tipo, enunciado, descricao, obrigatoria, pontos, escala_min, escala_max";

const CAMPOS_TENTATIVA =
  "id, simulado_id, mentorado_id, status, acertos, total_pontos, percentual, iniciado_em, enviado_em, corrigido_em, created_at, updated_at";

function respostaPreenchida(
  pergunta: PerguntaBanco,
  resposta: RespostaRecebida | undefined
) {
  if (!resposta) return false;

  if (
    pergunta.tipo === "multipla_escolha" ||
    pergunta.tipo === "sim_nao"
  ) {
    return Boolean(resposta.alternativaId);
  }

  if (pergunta.tipo === "caixa_selecao") {
    return Boolean(resposta.alternativasIds?.length);
  }

  if (pergunta.tipo === "escala") {
    return (
      resposta.respostaNumero !== null &&
      resposta.respostaNumero !== undefined
    );
  }

  if (pergunta.tipo === "upload") {
    return Boolean(resposta.arquivoUrl?.trim());
  }

  return Boolean(resposta.respostaTexto?.trim());
}

function corrigirResposta(
  pergunta: PerguntaBanco,
  alternativas: AlternativaBanco[],
  resposta: RespostaRecebida | undefined
) {
  const pontos = Number(pergunta.pontos || 1);

  if (
    pergunta.tipo === "resposta_curta" ||
    pergunta.tipo === "resposta_longa" ||
    pergunta.tipo === "upload" ||
    pergunta.tipo === "escala"
  ) {
    return { correta: null, pontosObtidos: 0 };
  }

  if (
    pergunta.tipo === "sim_nao" ||
    pergunta.tipo === "multipla_escolha"
  ) {
    const alternativaCorreta = alternativas.find(
      (alternativa) => alternativa.correta
    );
    const acertou = Boolean(
      alternativaCorreta &&
        resposta?.alternativaId === alternativaCorreta.id
    );

    return {
      correta: acertou,
      pontosObtidos: acertou ? pontos : 0,
    };
  }

  if (pergunta.tipo === "caixa_selecao") {
    const corretas = alternativas
      .filter((alternativa) => alternativa.correta)
      .map((alternativa) => alternativa.id)
      .sort();
    const marcadas = [...(resposta?.alternativasIds ?? [])].sort();
    const acertou =
      corretas.length === marcadas.length &&
      corretas.every((id, indice) => id === marcadas[indice]);

    return {
      correta: acertou,
      pontosObtidos: acertou ? pontos : 0,
    };
  }

  return { correta: null, pontosObtidos: 0 };
}

async function carregarModulosLiberados() {
  const admin = criarClienteAdmin();
  const { data, error } = await admin
    .from("modulo_liberacoes")
    .select("modulo_id, status_liberacao, liberar_em");

  if (error) throw new Error(error.message);

  return idsModulosLiberados((data ?? []) as ModuloLiberacaoGlobal[]);
}

export async function GET(request: NextRequest) {
  try {
    const permissao = await verificarAcesso(request, ["mentorado"]);

    if (!permissao.ok) {
      return responderPermissaoNegada(permissao);
    }

    const admin = criarClienteAdmin();
    const modulosLiberados = await carregarModulosLiberados();

    const { data: simuladosData, error: simuladosError } = await admin
      .from("simulados")
      .select(CAMPOS_SIMULADO)
      .eq("ativo", true)
      .eq("status", "publicado")
      .order("created_at", { ascending: false });

    if (simuladosError) throw new Error(simuladosError.message);

    const simulados = (simuladosData ?? []).filter(
      (simulado) =>
        !simulado.modulo_id || modulosLiberados.has(simulado.modulo_id)
    );
    const simuladoIds = simulados.map((simulado) => simulado.id);

    let perguntas: PerguntaBanco[] = [];

    if (simuladoIds.length > 0) {
      const { data, error } = await admin
        .from("simulado_perguntas")
        .select(CAMPOS_PERGUNTA)
        .in("simulado_id", simuladoIds)
        .order("ordem", { ascending: true });

      if (error) throw new Error(error.message);
      perguntas = (data ?? []) as PerguntaBanco[];
    }

    const perguntaIds = perguntas.map((pergunta) => pergunta.id);
    let alternativas: AlternativaBanco[] = [];

    if (perguntaIds.length > 0) {
      const { data, error } = await admin
        .from("simulado_alternativas")
        .select("id, pergunta_id, texto, ordem, correta")
        .in("pergunta_id", perguntaIds)
        .order("ordem", { ascending: true });

      if (error) throw new Error(error.message);
      alternativas = (data ?? []) as AlternativaBanco[];
    }

    const { data: tentativas, error: tentativasError } = await admin
      .from("simulado_tentativas")
      .select(CAMPOS_TENTATIVA)
      .eq("mentorado_id", permissao.userId)
      .order("created_at", { ascending: false });

    if (tentativasError) throw new Error(tentativasError.message);

    const simuladosQueMostramResultado = new Set(
      simulados
        .filter((simulado) => simulado.mostrar_resultado)
        .map((simulado) => simulado.id)
    );

    return NextResponse.json({
      simulados: simulados.map((simulado) => ({
        ...simulado,
        perguntas: perguntas
          .filter((pergunta) => pergunta.simulado_id === simulado.id)
          .map((pergunta) => ({
            ...pergunta,
            alternativas: alternativas
              .filter(
                (alternativa) => alternativa.pergunta_id === pergunta.id
              )
              .map((alternativa) => ({
                id: alternativa.id,
                pergunta_id: alternativa.pergunta_id,
                texto: alternativa.texto,
                ordem: alternativa.ordem,
              })),
          })),
      })),
      tentativas: (tentativas ?? []).map((tentativa) =>
        simuladosQueMostramResultado.has(tentativa.simulado_id)
          ? tentativa
          : {
              ...tentativa,
              acertos: null,
              total_pontos: null,
              percentual: null,
            }
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os simulados.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const permissao = await verificarAcesso(request, ["mentorado"]);

    if (!permissao.ok) {
      return responderPermissaoNegada(permissao);
    }

    const corpo = (await request.json()) as {
      simuladoId?: string;
      respostas?: RespostaRecebida[];
    };
    const simuladoId = corpo.simuladoId?.trim();

    if (!simuladoId || !Array.isArray(corpo.respostas)) {
      return NextResponse.json(
        { error: "Simulado ou respostas inválidos." },
        { status: 400 }
      );
    }

    const admin = criarClienteAdmin();
    const { data: simulado, error: simuladoError } = await admin
      .from("simulados")
      .select(CAMPOS_SIMULADO)
      .eq("id", simuladoId)
      .eq("ativo", true)
      .eq("status", "publicado")
      .maybeSingle();

    if (simuladoError) throw new Error(simuladoError.message);

    if (!simulado) {
      return NextResponse.json(
        { error: "Este simulado não está disponível." },
        { status: 404 }
      );
    }

    if (simulado.modulo_id) {
      const modulosLiberados = await carregarModulosLiberados();

      if (!modulosLiberados.has(simulado.modulo_id)) {
        return NextResponse.json(
          { error: "O módulo deste simulado ainda não foi liberado." },
          { status: 403 }
        );
      }
    }

    const { count: totalTentativas, error: contagemError } = await admin
      .from("simulado_tentativas")
      .select("id", { count: "exact", head: true })
      .eq("simulado_id", simuladoId)
      .eq("mentorado_id", permissao.userId);

    if (contagemError) throw new Error(contagemError.message);

    const quantidadeTentativas = totalTentativas ?? 0;

    if (!simulado.permitir_refazer && quantidadeTentativas > 0) {
      return NextResponse.json(
        { error: "Este simulado permite somente uma tentativa." },
        { status: 409 }
      );
    }

    if (
      simulado.limite_tentativas &&
      quantidadeTentativas >= simulado.limite_tentativas
    ) {
      return NextResponse.json(
        { error: "Você atingiu o limite de tentativas deste simulado." },
        { status: 409 }
      );
    }

    const { data: perguntasData, error: perguntasError } = await admin
      .from("simulado_perguntas")
      .select(CAMPOS_PERGUNTA)
      .eq("simulado_id", simuladoId)
      .order("ordem", { ascending: true });

    if (perguntasError) throw new Error(perguntasError.message);

    const perguntas = (perguntasData ?? []) as PerguntaBanco[];

    if (perguntas.length === 0) {
      return NextResponse.json(
        { error: "Este simulado ainda não possui perguntas." },
        { status: 409 }
      );
    }

    const respostasPorPergunta = new Map(
      corpo.respostas.map((resposta) => [resposta.perguntaId, resposta])
    );
    const perguntaObrigatoriaSemResposta = perguntas.find(
      (pergunta) =>
        pergunta.obrigatoria !== false &&
        !respostaPreenchida(
          pergunta,
          respostasPorPergunta.get(pergunta.id)
        )
    );

    if (
      simulado.exigir_todas_respostas &&
      perguntaObrigatoriaSemResposta
    ) {
      return NextResponse.json(
        { error: "Responda todas as perguntas obrigatórias antes de enviar." },
        { status: 400 }
      );
    }

    const perguntaIds = perguntas.map((pergunta) => pergunta.id);
    const { data: alternativasData, error: alternativasError } = await admin
      .from("simulado_alternativas")
      .select("id, pergunta_id, texto, ordem, correta")
      .in("pergunta_id", perguntaIds);

    if (alternativasError) throw new Error(alternativasError.message);

    const alternativas = (alternativasData ?? []) as AlternativaBanco[];
    let pontosObtidos = 0;
    let acertos = 0;
    const totalPontos = perguntas.reduce(
      (total, pergunta) => total + Number(pergunta.pontos || 1),
      0
    );

    const respostasCalculadas = perguntas.map((pergunta) => {
      const resposta = respostasPorPergunta.get(pergunta.id);
      const alternativasPergunta = alternativas.filter(
        (alternativa) => alternativa.pergunta_id === pergunta.id
      );
      const idsAlternativasPergunta = new Set(
        alternativasPergunta.map((alternativa) => alternativa.id)
      );

      if (
        resposta?.alternativaId &&
        !idsAlternativasPergunta.has(resposta.alternativaId)
      ) {
        throw new Error("Uma das alternativas enviadas é inválida.");
      }

      if (
        resposta?.alternativasIds?.some(
          (alternativaId) => !idsAlternativasPergunta.has(alternativaId)
        )
      ) {
        throw new Error("Uma das alternativas enviadas é inválida.");
      }

      const correcao = corrigirResposta(
        pergunta,
        alternativasPergunta,
        resposta
      );
      pontosObtidos += correcao.pontosObtidos;

      if (correcao.correta === true) acertos += 1;

      return { pergunta, resposta, correcao };
    });

    const percentual =
      totalPontos > 0
        ? Math.round((pontosObtidos / totalPontos) * 100)
        : 0;
    const agora = new Date().toISOString();

    const { data: tentativa, error: tentativaError } = await admin
      .from("simulado_tentativas")
      .insert({
        simulado_id: simuladoId,
        mentorado_id: permissao.userId,
        status: "enviado",
        acertos,
        total_pontos: totalPontos,
        percentual,
        enviado_em: agora,
        updated_at: agora,
      })
      .select(CAMPOS_TENTATIVA)
      .single();

    if (tentativaError) throw new Error(tentativaError.message);

    const respostasPayload = respostasCalculadas.map(
      ({ pergunta, resposta, correcao }) => ({
        simulado_id: simuladoId,
        mentorado_id: permissao.userId,
        tentativa_id: tentativa.id,
        pergunta_id: pergunta.id,
        alternativa_id: resposta?.alternativaId || null,
        alternativas_ids: resposta?.alternativasIds ?? null,
        resposta_texto: resposta?.respostaTexto?.trim() || null,
        resposta_numero: resposta?.respostaNumero ?? null,
        arquivo_url: resposta?.arquivoUrl?.trim() || null,
        correta: correcao.correta,
        pontos_obtidos: correcao.pontosObtidos,
        updated_at: agora,
      })
    );

    const { error: respostasError } = await admin
      .from("simulado_respostas")
      .insert(respostasPayload);

    if (respostasError) {
      await admin
        .from("simulado_tentativas")
        .delete()
        .eq("id", tentativa.id);
      throw new Error(respostasError.message);
    }

    return NextResponse.json({
      tentativa: simulado.mostrar_resultado
        ? tentativa
        : {
            ...tentativa,
            acertos: null,
            total_pontos: null,
            percentual: null,
          },
      resultado: simulado.mostrar_resultado
        ? { acertos, totalPontos, percentual }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar a tentativa.",
      },
      { status: 500 }
    );
  }
}
