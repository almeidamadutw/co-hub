import { NextRequest, NextResponse } from "next/server";
import {
  criarClienteAdmin,
  erroConfig,
  responderPermissaoNegada,
  verificarAcesso,
} from "@/utils/apiAuth";
import {
  assinarUrlStorage,
  criarReferenciaStorage,
  extrairReferenciaStorage,
} from "@/utils/storageUrls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_AVATARES = "ceo-club-avatares";
const LIMITE_FOTO_BYTES = 2 * 1024 * 1024;
const TIPOS_FOTO = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type PerfilFoto = {
  id: string;
  nome: string | null;
  email: string | null;
  foto_url: string | null;
};

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  );
}

function caminhoAvatarPelaUrl(url: string | null) {
  const referencia = extrairReferenciaStorage(url);
  return referencia?.bucket === BUCKET_AVATARES ? referencia.path : null;
}

function referenciaPertenceAoPerfil(perfil: PerfilFoto) {
  if (!perfil.foto_url?.startsWith("storage://")) return true;

  const caminho = caminhoAvatarPelaUrl(perfil.foto_url);
  return Boolean(caminho?.startsWith(`${perfil.id}/`));
}

async function verificarAlvo(request: NextRequest, usuarioIdRecebido: string) {
  const permissao = await verificarAcesso(request, [
    "mentor",
    "mentorado",
    "financeiro",
    "suporte",
  ]);

  if (!permissao.ok) {
    return { permissao, usuarioId: "" };
  }

  const usuarioId = usuarioIdRecebido || permissao.userId;

  if (!uuidValido(usuarioId)) {
    return {
      permissao,
      usuarioId: "",
      resposta: jsonError("Usuário inválido."),
    };
  }

  if (usuarioId !== permissao.userId) {
    const permissaoSuporte = await verificarAcesso(request, ["suporte"]);

    if (!permissaoSuporte.ok) {
      return {
        permissao: permissaoSuporte,
        usuarioId: "",
      };
    }
  }

  return { permissao, usuarioId };
}

async function carregarPerfil(
  admin: ReturnType<typeof criarClienteAdmin>,
  usuarioId: string
) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, nome, email, foto_url")
    .eq("id", usuarioId)
    .is("excluido_em", null)
    .single<PerfilFoto>();

  if (error || !data) return null;
  return data;
}

async function registrarLogFoto(
  admin: ReturnType<typeof criarClienteAdmin>,
  operadorId: string,
  perfil: PerfilFoto,
  acao: "alteracao_foto_perfil" | "remocao_foto_perfil" | "migracao_foto_perfil"
) {
  if (operadorId === perfil.id && acao !== "migracao_foto_perfil") return null;

  const { data: operador } = await admin
    .from("profiles")
    .select("nome, email")
    .eq("id", operadorId)
    .single();

  const descricoes = {
    alteracao_foto_perfil: "Atualizou a foto do perfil",
    remocao_foto_perfil: "Removeu a foto do perfil",
    migracao_foto_perfil: "Migrou a foto antiga para o Storage",
  };

  const { error } = await admin.from("suporte_logs").insert({
    suporte_id: operadorId,
    suporte_nome: operador?.nome ?? "Equipe CEO Club",
    suporte_email: operador?.email ?? null,
    acao,
    entidade: "profiles",
    entidade_id: perfil.id,
    descricao: `${descricoes[acao]} de ${
      perfil.nome || perfil.email || perfil.id
    }.`,
    metadata: {
      usuario_alterado_id: perfil.id,
      armazenamento: BUCKET_AVATARES,
    },
    created_at: new Date().toISOString(),
  });

  return error;
}

async function salvarFotoNoStorage(
  admin: ReturnType<typeof criarClienteAdmin>,
  perfil: PerfilFoto,
  bytes: ArrayBuffer | Buffer,
  tipo: string,
  extensao: string
) {
  const caminho = `${perfil.id}/${Date.now()}-${crypto.randomUUID()}.${extensao}`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET_AVATARES)
    .upload(caminho, bytes, {
      cacheControl: "31536000",
      contentType: tipo,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Não foi possível enviar a foto para o Storage: ${uploadError.message}`
    );
  }

  const fotoReferencia = criarReferenciaStorage(BUCKET_AVATARES, caminho);

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      foto_url: fotoReferencia,
      updated_at: new Date().toISOString(),
    })
    .eq("id", perfil.id);

  if (updateError) {
    await admin.storage.from(BUCKET_AVATARES).remove([caminho]);
    throw new Error(
      `A foto foi enviada, mas o perfil não pôde ser atualizado: ${updateError.message}`
    );
  }

  const caminhoAnterior = caminhoAvatarPelaUrl(perfil.foto_url);

  if (caminhoAnterior && caminhoAnterior !== caminho) {
    await admin.storage.from(BUCKET_AVATARES).remove([caminhoAnterior]);
  }

  return {
    referencia: fotoReferencia,
    urlAssinada: await assinarUrlStorage(admin, fotoReferencia),
  };
}

export async function GET(request: NextRequest) {
  const config = erroConfig();
  if (config) return jsonError(config, 500);

  try {
    const usuarioIdRecebido =
      request.nextUrl.searchParams.get("usuario_id")?.trim() ?? "";
    const alvo = await verificarAlvo(request, usuarioIdRecebido);

    if (!alvo.permissao.ok) {
      return responderPermissaoNegada(alvo.permissao);
    }

    if (alvo.resposta) return alvo.resposta;

    const admin = criarClienteAdmin();
    const perfil = await carregarPerfil(admin, alvo.usuarioId);

    if (!perfil) {
      return jsonError("Usuário não encontrado.", 404);
    }

    if (!perfil.foto_url) {
      return NextResponse.json({ foto_url: null });
    }

    if (!referenciaPertenceAoPerfil(perfil)) {
      return jsonError("A referência da foto deste perfil é inválida.", 400);
    }

    return NextResponse.json({
      foto_url: await assinarUrlStorage(admin, perfil.foto_url),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Não foi possível autorizar a foto do perfil.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const config = erroConfig();
  if (config) return jsonError(config, 500);

  try {
    const formData = await request.formData();
    const usuarioIdRecebido = String(
      formData.get("usuario_id") ?? ""
    ).trim();
    const alvo = await verificarAlvo(request, usuarioIdRecebido);

    if (!alvo.permissao.ok) {
      return responderPermissaoNegada(alvo.permissao);
    }

    if (alvo.resposta) return alvo.resposta;

    const arquivo = formData.get("arquivo");

    if (!(arquivo instanceof File)) {
      return jsonError("Escolha uma foto para enviar.");
    }

    const extensao = TIPOS_FOTO.get(arquivo.type);

    if (!extensao) {
      return jsonError("Envie uma imagem JPG, PNG ou WEBP.");
    }

    if (arquivo.size <= 0) {
      return jsonError("A imagem escolhida está vazia.");
    }

    if (arquivo.size > LIMITE_FOTO_BYTES) {
      return jsonError("A foto precisa ter no máximo 2 MB.");
    }

    const admin = criarClienteAdmin();
    const perfil = await carregarPerfil(admin, alvo.usuarioId);

    if (!perfil) {
      return jsonError("Usuário não encontrado.", 404);
    }

    const fotoSalva = await salvarFotoNoStorage(
      admin,
      perfil,
      await arquivo.arrayBuffer(),
      arquivo.type,
      extensao
    );
    const logError = await registrarLogFoto(
      admin,
      alvo.permissao.userId,
      perfil,
      "alteracao_foto_perfil"
    );

    return NextResponse.json({
      foto_url: fotoSalva.urlAssinada,
      aviso: logError
        ? "A foto foi salva, mas o histórico técnico não foi atualizado."
        : null,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a foto do perfil.",
      500
    );
  }
}

export async function DELETE(request: NextRequest) {
  const config = erroConfig();
  if (config) return jsonError(config, 500);

  try {
    const body = await request.json().catch(() => null);
    const usuarioIdRecebido = String(body?.usuario_id ?? "").trim();
    const alvo = await verificarAlvo(request, usuarioIdRecebido);

    if (!alvo.permissao.ok) {
      return responderPermissaoNegada(alvo.permissao);
    }

    if (alvo.resposta) return alvo.resposta;

    const admin = criarClienteAdmin();
    const perfil = await carregarPerfil(admin, alvo.usuarioId);

    if (!perfil) {
      return jsonError("Usuário não encontrado.", 404);
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        foto_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", perfil.id);

    if (updateError) {
      return jsonError(updateError.message, 400);
    }

    const caminhoAnterior = caminhoAvatarPelaUrl(perfil.foto_url);
    let aviso: string | null = null;

    if (caminhoAnterior) {
      const { error: removeError } = await admin.storage
        .from(BUCKET_AVATARES)
        .remove([caminhoAnterior]);

      if (removeError) {
        aviso =
          "A foto saiu do perfil, mas o arquivo antigo não pôde ser limpo do Storage.";
      }
    }

    const logError = await registrarLogFoto(
      admin,
      alvo.permissao.userId,
      perfil,
      "remocao_foto_perfil"
    );

    if (logError && !aviso) {
      aviso = "A foto foi removida, mas o histórico técnico não foi atualizado.";
    }

    return NextResponse.json({ foto_url: null, aviso });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Não foi possível remover a foto do perfil.",
      500
    );
  }
}

export async function PUT(request: NextRequest) {
  const config = erroConfig();
  if (config) return jsonError(config, 500);

  const permissao = await verificarAcesso(request, ["suporte"]);

  if (!permissao.ok) {
    return responderPermissaoNegada(permissao);
  }

  const admin = criarClienteAdmin();
  const { data: perfis, error } = await admin
    .from("profiles")
    .select("id, nome, email, foto_url")
    .like("foto_url", "data:image/%")
    .is("excluido_em", null)
    .limit(25);

  if (error) return jsonError(error.message, 500);

  let migradas = 0;
  const falhas: string[] = [];

  for (const perfil of (perfis ?? []) as PerfilFoto[]) {
    try {
      const match = perfil.foto_url?.match(
        /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\r\n]+)$/i
      );

      if (!match) {
        falhas.push(perfil.id);
        continue;
      }

      const tipo = match[1].toLowerCase();
      const extensao = TIPOS_FOTO.get(tipo);
      const buffer = Buffer.from(match[2], "base64");

      if (!extensao || buffer.length <= 0 || buffer.length > LIMITE_FOTO_BYTES) {
        falhas.push(perfil.id);
        continue;
      }

      await salvarFotoNoStorage(
        admin,
        perfil,
        buffer,
        tipo,
        extensao
      );
      await registrarLogFoto(
        admin,
        permissao.userId,
        perfil,
        "migracao_foto_perfil"
      );
      migradas += 1;
    } catch {
      falhas.push(perfil.id);
    }
  }

  return NextResponse.json({
    migradas,
    falhas: falhas.length,
    aviso:
      falhas.length > 0
        ? "Algumas fotos antigas não puderam ser migradas automaticamente."
        : null,
  });
}
