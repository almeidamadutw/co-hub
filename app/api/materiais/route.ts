import { NextRequest, NextResponse } from "next/server";
import {
  criarClienteAdmin,
  erroConfig,
  responderPermissaoNegada,
  verificarAcesso,
} from "@/utils/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MATERIAIS_BUCKET = "ceo-club-materiais";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const UPLOAD_TIMEOUT_MS = 60_000;
const DATABASE_TIMEOUT_MS = 20_000;

type TipoMaterial =
  | "pdf"
  | "video"
  | "link"
  | "imagem"
  | "documento"
  | "atividade"
  | "reuniao"
  | "outro";

type MaterialAula = {
  id: string;
  aula_id: string;
  nome: string;
  url: string;
  created_at: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function limparNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function detectarTipoMaterial(file: File | null): TipoMaterial {
  if (!file) return "outro";

  const tipoArquivo = file.type.toLowerCase();
  const nomeArquivo = file.name.toLowerCase();

  if (tipoArquivo.includes("pdf") || nomeArquivo.endsWith(".pdf")) return "pdf";
  if (tipoArquivo.includes("video")) return "video";
  if (tipoArquivo.includes("image")) return "imagem";

  if (
    nomeArquivo.endsWith(".doc") ||
    nomeArquivo.endsWith(".docx") ||
    nomeArquivo.endsWith(".xls") ||
    nomeArquivo.endsWith(".xlsx") ||
    nomeArquivo.endsWith(".ppt") ||
    nomeArquivo.endsWith(".pptx")
  ) {
    return "documento";
  }

  return "outro";
}

function labelTipoMaterial(tipo: TipoMaterial) {
  const labels: Record<TipoMaterial, string> = {
    pdf: "PDF",
    video: "Vídeo",
    link: "Link",
    imagem: "Imagem",
    documento: "Documento",
    atividade: "Atividade",
    reuniao: "Reunião",
    outro: "Material",
  };

  return labels[tipo];
}

function normalizarTipo(valor: FormDataEntryValue | null): TipoMaterial {
  const tipo = String(valor ?? "outro") as TipoMaterial;

  const tiposPermitidos: TipoMaterial[] = [
    "pdf",
    "video",
    "link",
    "imagem",
    "documento",
    "atividade",
    "reuniao",
    "outro",
  ];

  return tiposPermitidos.includes(tipo) ? tipo : "outro";
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  let caminhoArquivoEnviado: string | null = null;

  try {
    const erroConfiguracao = erroConfig();

    if (erroConfiguracao) {
      return jsonError(erroConfiguracao, 500);
    }

    const permissao = await verificarAcesso(request, ["mentor", "suporte"]);

    if (!permissao.ok) {
      return responderPermissaoNegada(permissao);
    }

    const supabaseAdmin = criarClienteAdmin();
    const formData = await request.formData();

    const aulaId = String(formData.get("aulaId") ?? "").trim();
    const nome = String(formData.get("nome") ?? "").trim();
    const modo = String(formData.get("modo") ?? "arquivo").trim();
    const urlRecebida = String(formData.get("url") ?? "").trim();
    let tipoFinal = normalizarTipo(formData.get("tipo"));

    if (!aulaId || !nome) {
      return jsonError("Selecione a aula e informe o nome do material.");
    }

    let urlFinal = urlRecebida;

    if (modo === "link") {
      tipoFinal = "link";

      if (!urlFinal) {
        return jsonError("Informe o link do material.");
      }
    } else {
      const arquivo = formData.get("arquivo");

      if (!(arquivo instanceof File)) {
        return jsonError("Escolha um arquivo para enviar.");
      }

      if (arquivo.size <= 0) {
        return jsonError("O arquivo escolhido está vazio.");
      }

      if (arquivo.size > MAX_FILE_SIZE) {
        return jsonError(
          "Arquivo muito grande. Envie arquivos de até 25 MB ou use a opção Salvar link."
        );
      }

      tipoFinal = detectarTipoMaterial(arquivo);

      const nomeSeguro = limparNomeArquivo(arquivo.name || "material");
      caminhoArquivoEnviado = `modulos/aulas/${aulaId}/${Date.now()}-${nomeSeguro}`;

      const buffer = Buffer.from(await arquivo.arrayBuffer());

      const uploadResult = await withTimeout(
        supabaseAdmin.storage
          .from(MATERIAIS_BUCKET)
          .upload(caminhoArquivoEnviado, buffer, {
            cacheControl: "3600",
            contentType: arquivo.type || "application/octet-stream",
            upsert: false,
          }),
        UPLOAD_TIMEOUT_MS,
        "Tempo limite ao enviar o arquivo. Tente um arquivo menor ou salve como link."
      );

      if (uploadResult.error) {
        return jsonError(
          `Não foi possível enviar o arquivo para o Storage: ${uploadResult.error.message}`,
          500
        );
      }

      const publicUrlResult = supabaseAdmin.storage
        .from(MATERIAIS_BUCKET)
        .getPublicUrl(caminhoArquivoEnviado);

      urlFinal = publicUrlResult.data.publicUrl;
    }

    const nomeComTipo = nome.includes("·")
      ? nome
      : `${labelTipoMaterial(tipoFinal)} · ${nome}`;

    const insertResult = await withTimeout(
      supabaseAdmin
        .from("materiais_aula")
        .insert({
          aula_id: aulaId,
          nome: nomeComTipo,
          url: urlFinal,
        })
        .select("id, aula_id, nome, url, created_at")
        .single(),
      DATABASE_TIMEOUT_MS,
      "Tempo limite ao salvar o material no banco."
    );

    if (insertResult.error) {
      if (caminhoArquivoEnviado) {
        await supabaseAdmin.storage
          .from(MATERIAIS_BUCKET)
          .remove([caminhoArquivoEnviado]);
      }

      return jsonError(
        `Arquivo enviado, mas não foi possível salvar no banco: ${insertResult.error.message}`,
        500
      );
    }

    const material = insertResult.data as MaterialAula;

    return NextResponse.json({
      ok: true,
      material,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível salvar o material.";

    return jsonError(message, 500);
  }
}
