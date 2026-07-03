import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BIBLIOTECA_BUCKET = "ceo-club-biblioteca";
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 60_000;
const DATABASE_TIMEOUT_MS = 20_000;

type BibliotecaArquivo = {
  id: string;
  mentorado_id: string;
  criado_por: string | null;
  nome: string;
  categoria: string;
  tipo: string;
  url: string;
  storage_path: string | null;
  tamanho_bytes: number | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function criarSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Configuração do Supabase ausente. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SECRET_KEY no .env.local."
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function limparNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function detectarTipoArquivo(file: File | null) {
  if (!file) return "arquivo";

  const mime = file.type.toLowerCase();
  const nome = file.name.toLowerCase();

  if (mime.includes("pdf") || nome.endsWith(".pdf")) return "pdf";
  if (mime.includes("video")) return "video";
  if (mime.includes("image")) return "imagem";
  if (
    nome.endsWith(".doc") ||
    nome.endsWith(".docx") ||
    nome.endsWith(".xls") ||
    nome.endsWith(".xlsx") ||
    nome.endsWith(".ppt") ||
    nome.endsWith(".pptx")
  ) {
    return "documento";
  }

  return "arquivo";
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function GET(request: Request) {
  try {
    const supabaseAdmin = criarSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const mentoradoId = searchParams.get("mentoradoId")?.trim();

    if (!mentoradoId) {
      return jsonError("Informe o mentorado para carregar a biblioteca.");
    }

    const result = await withTimeout(
      supabaseAdmin
        .from("biblioteca_arquivos")
        .select(
          "id, mentorado_id, criado_por, nome, categoria, tipo, url, storage_path, tamanho_bytes, observacao, created_at, updated_at"
        )
        .eq("mentorado_id", mentoradoId)
        .order("created_at", { ascending: false }),
      DATABASE_TIMEOUT_MS,
      "Tempo limite ao carregar a biblioteca."
    );

    if (result.error) {
      return jsonError(result.error.message, 500);
    }

    return NextResponse.json({
      ok: true,
      arquivos: (result.data ?? []) as BibliotecaArquivo[],
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Não foi possível carregar a biblioteca.",
      500
    );
  }
}

export async function POST(request: Request) {
  let storagePath: string | null = null;

  try {
    const supabaseAdmin = criarSupabaseAdmin();
    const formData = await request.formData();

    const mentoradoId = String(formData.get("mentoradoId") ?? "").trim();
    const criadoPor = String(formData.get("criadoPor") ?? "").trim() || null;
    const nome = String(formData.get("nome") ?? "").trim();
    const categoria = String(formData.get("categoria") ?? "material").trim() || "material";
    const observacao = String(formData.get("observacao") ?? "").trim() || null;
    const modo = String(formData.get("modo") ?? "arquivo").trim();
    const urlRecebida = String(formData.get("url") ?? "").trim();

    if (!mentoradoId) {
      return jsonError("Selecione o mentorado da biblioteca.");
    }

    if (!nome) {
      return jsonError("Informe o nome do material.");
    }

    let urlFinal = urlRecebida;
    let tipoFinal = modo === "link" ? "link" : "arquivo";
    let tamanhoBytes: number | null = null;

    if (modo === "link") {
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
          `Esse arquivo tem ${(arquivo.size / 1024 / 1024).toFixed(
            1
          )} MB. Para não travar o sistema, envie arquivos de até ${MAX_FILE_SIZE_MB} MB ou salve como link do Drive.`
        );
      }

      tipoFinal = detectarTipoArquivo(arquivo);
      tamanhoBytes = arquivo.size;

      const nomeSeguro = limparNomeArquivo(arquivo.name || nome || "arquivo");
      storagePath = `biblioteca/${mentoradoId}/${Date.now()}-${nomeSeguro}`;

      const buffer = Buffer.from(await arquivo.arrayBuffer());

      const uploadResult = await withTimeout(
        supabaseAdmin.storage.from(BIBLIOTECA_BUCKET).upload(storagePath, buffer, {
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
        .from(BIBLIOTECA_BUCKET)
        .getPublicUrl(storagePath);

      urlFinal = publicUrlResult.data.publicUrl;
    }

    const insertResult = await withTimeout(
      supabaseAdmin
        .from("biblioteca_arquivos")
        .insert({
          mentorado_id: mentoradoId,
          criado_por: criadoPor,
          nome,
          categoria,
          tipo: tipoFinal,
          url: urlFinal,
          storage_path: storagePath,
          tamanho_bytes: tamanhoBytes,
          observacao,
        })
        .select(
          "id, mentorado_id, criado_por, nome, categoria, tipo, url, storage_path, tamanho_bytes, observacao, created_at, updated_at"
        )
        .single(),
      DATABASE_TIMEOUT_MS,
      "Tempo limite ao salvar o material no banco."
    );

    if (insertResult.error) {
      if (storagePath) {
        await supabaseAdmin.storage.from(BIBLIOTECA_BUCKET).remove([storagePath]);
      }

      return jsonError(
        `Arquivo enviado, mas não foi possível salvar no banco: ${insertResult.error.message}`,
        500
      );
    }

    return NextResponse.json({
      ok: true,
      arquivo: insertResult.data as BibliotecaArquivo,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Não foi possível salvar o material.",
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = criarSupabaseAdmin();
    const body = await request.json().catch(() => null);
    const id = String(body?.id ?? "").trim();

    if (!id) {
      return jsonError("Informe o arquivo para remover.");
    }

    const buscaResult = await withTimeout(
      supabaseAdmin
        .from("biblioteca_arquivos")
        .select("id, storage_path")
        .eq("id", id)
        .maybeSingle(),
      DATABASE_TIMEOUT_MS,
      "Tempo limite ao buscar o arquivo."
    );

    if (buscaResult.error) {
      return jsonError(buscaResult.error.message, 500);
    }

    const storagePath = buscaResult.data?.storage_path ?? null;

    const deleteResult = await withTimeout(
      supabaseAdmin.from("biblioteca_arquivos").delete().eq("id", id),
      DATABASE_TIMEOUT_MS,
      "Tempo limite ao remover o arquivo do banco."
    );

    if (deleteResult.error) {
      return jsonError(deleteResult.error.message, 500);
    }

    if (storagePath) {
      await supabaseAdmin.storage.from(BIBLIOTECA_BUCKET).remove([storagePath]);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Não foi possível remover o arquivo.",
      500
    );
  }
}
