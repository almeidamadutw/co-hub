import { NextRequest, NextResponse } from "next/server";
import {
  criarClienteAdmin,
  erroConfig,
  responderPermissaoNegada,
  verificarAcesso,
} from "@/utils/apiAuth";
import {
  assinarUrlStorage,
  CEO_STORAGE_BUCKETS,
  criarReferenciaStorage,
  extrairReferenciaStorage,
} from "@/utils/storageUrls";

const BUCKET_BIBLIOTECA = "ceo-club-biblioteca";
const BUCKET_MATERIAIS = "ceo-club-materiais";
const LIMITE_UPLOAD_BYTES = 25 * 1024 * 1024;

let clienteAdmin: ReturnType<typeof criarClienteAdmin> | null = null;

function supabaseAdmin() {
  clienteAdmin ??= criarClienteAdmin();
  return clienteAdmin;
}

const BUCKETS_POSSIVEIS_AULAS = Array.from(
  new Set([
    process.env.NEXT_PUBLIC_SUPABASE_BUCKET_AULAS,
    process.env.SUPABASE_BUCKET_AULAS,
    "ceo-club-aulas",
    "ceo-club-materiais",
    "ceo-club-biblioteca",
    "biblioteca",
    "materiais",
    "aulas",
  ].filter(Boolean) as string[])
);

type OrigemBiblioteca = "biblioteca" | "aula";

type BibliotecaItem = {
  id: string;
  mentorado_id?: string | null;
  mentorado_nome?: string | null;
  mentorado_email?: string | null;
  criado_por?: string | null;
  pasta_id?: string | null;
  pasta_nome?: string | null;
  pasta_visibilidade?: "publica" | "privada" | null;
  escopo?: "mentorado" | "geral" | "interno";
  nome: string;
  categoria: string;
  tipo: string;
  url: string;
  url_original?: string | null;
  storage_path?: string | null;
  tamanho_bytes?: number | null;
  observacao?: string | null;
  created_at: string;
  updated_at?: string | null;
  origem: OrigemBiblioteca;
  modulo_id?: string | null;
  modulo_nome?: string | null;
  aula_id?: string | null;
  aula_nome?: string | null;
};

const CAMPOS_URL_MATERIAL = [
  "url",
  "arquivo_url",
  "material_url",
  "url_material",
  "pdf_url",
  "video_url",
  "link_material",
  "link_url",
  "documento_url",
  "anexo_url",
  "public_url",
  "publicUrl",
  "href",
  "src",
];

const CAMPOS_STORAGE_PATH = [
  "storage_path",
  "arquivo_storage_path",
  "material_storage_path",
  "documento_storage_path",
  "anexo_storage_path",
  "storagePath",
  "arquivo_path",
  "material_path",
  "documento_path",
  "anexo_path",
  "file_path",
  "path",
  "caminho",
  "arquivo",
  "documento",
];

const CAMPOS_BUCKET = [
  "bucket",
  "bucket_name",
  "bucketName",
  "storage_bucket",
  "storageBucket",
];

const TABELAS_MATERIAIS_AULA = ["materiais_aula"];

const EXTENSOES_PERMITIDAS = new Set([
  "csv",
  "doc",
  "docx",
  "gif",
  "jpeg",
  "jpg",
  "mov",
  "mp4",
  "pdf",
  "png",
  "ppt",
  "pptx",
  "txt",
  "webm",
  "webp",
  "xls",
  "xlsx",
  "zip",
]);

const ESCOPOS_BIBLIOTECA = new Set(["mentorado", "geral", "interno"]);

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function numero(valor: unknown) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) && convertido > 0 ? convertido : null;
}

function booleanoFalso(valor: unknown) {
  return valor === false || valor === "false" || valor === 0 || valor === "0";
}

function pegarPrimeiroTexto(objeto: Record<string, unknown>, campos: string[]) {
  for (const campo of campos) {
    const valor = texto(objeto[campo]);
    if (valor) return valor;
  }

  return "";
}

function limparNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function urlExternaValida(valor: string) {
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extensaoArquivo(nome: string) {
  return nome.toLowerCase().split(".").pop() || "";
}

function arquivoPermitido(arquivo: File) {
  return EXTENSOES_PERMITIDAS.has(extensaoArquivo(arquivo.name));
}

function usuarioPodeGerenciarBiblioteca(permissao: {
  role: string;
  acessoSuporte: boolean;
}) {
  return (
    permissao.role === "mentor" ||
    permissao.role === "suporte" ||
    permissao.acessoSuporte
  );
}

function nomeArquivoDoPath(path: string) {
  return limparNomeArquivo(path.split("/").pop() || "arquivo") || "arquivo";
}

function destinoAtualIgual(
  atual: Record<string, unknown>,
  destino: {
    escopo: "mentorado" | "geral" | "interno";
    mentoradoId: string | null;
    pastaId: string | null;
  }
) {
  return (
    texto(atual.escopo) === destino.escopo &&
    (texto(atual.mentorado_id) || null) === destino.mentoradoId &&
    (texto(atual.pasta_id) || null) === destino.pastaId
  );
}

async function registrarAuditoriaBiblioteca({
  usuarioId,
  acao,
  entidade,
  entidadeId,
  descricao,
  metadata = {},
}: {
  usuarioId: string;
  acao: string;
  entidade: "biblioteca_arquivo" | "biblioteca_pasta";
  entidadeId: string;
  descricao: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { data: perfil } = await supabaseAdmin()
      .from("profiles")
      .select("nome, email")
      .eq("id", usuarioId)
      .single();

    await supabaseAdmin().from("suporte_logs").insert({
      suporte_id: usuarioId,
      suporte_nome: texto(perfil?.nome) || null,
      suporte_email: texto(perfil?.email) || null,
      acao,
      entidade,
      entidade_id: entidadeId,
      descricao,
      metadata,
    });
  } catch (error) {
    console.error("Não foi possível registrar a auditoria da Biblioteca:", error);
  }
}

async function validarMentorado(mentoradoId: string) {
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, nome, email, role, status, excluido_em")
    .eq("id", mentoradoId)
    .single();

  if (error || !data || texto(data.role).toLowerCase() !== "mentorado") {
    throw new Error("Mentorado não encontrado.");
  }

  if (data.excluido_em || texto(data.status).toLowerCase() !== "ativo") {
    throw new Error("O mentorado selecionado não está ativo.");
  }

  return data;
}

async function resolverDestinoBiblioteca({
  destino,
  mentoradoId,
  pastaId,
}: {
  destino: string;
  mentoradoId: string;
  pastaId: string;
}) {
  if (destino === "mentorado") {
    if (!mentoradoId) throw new Error("Selecione o mentorado.");
    await validarMentorado(mentoradoId);

    return {
      escopo: "mentorado" as const,
      mentoradoId,
      pastaId: null,
      prefixoStorage: `mentorados/${mentoradoId}`,
    };
  }

  if (destino === "pasta") {
    if (!pastaId) throw new Error("Selecione a pasta.");

    const { data: pasta, error } = await supabaseAdmin()
      .from("biblioteca_pastas")
      .select("id, nome, visibilidade")
      .eq("id", pastaId)
      .single();

    if (error || !pasta) throw new Error("Pasta não encontrada.");

    return {
      escopo: pasta.visibilidade === "publica" ? ("geral" as const) : ("interno" as const),
      mentoradoId: null,
      pastaId,
      prefixoStorage: `pastas/${pastaId}`,
    };
  }

  if (destino !== "geral") {
    throw new Error("Destino do material inválido.");
  }

  return {
    escopo: "geral" as const,
    mentoradoId: null,
    pastaId: null,
    prefixoStorage: "geral",
  };
}

function tipoPorUrl(url: string, tipoOriginal?: string | null) {
  const tipo = texto(tipoOriginal).toLowerCase();

  if (tipo) return tipo;
  if (!url) return "link";

  const urlLower = url.toLowerCase();

  if (urlLower.includes(".pdf")) return "pdf";

  if (
    urlLower.includes("youtube.com") ||
    urlLower.includes("youtu.be") ||
    urlLower.includes("vimeo.com") ||
    urlLower.includes(".mp4") ||
    urlLower.includes(".mov") ||
    urlLower.includes(".avi")
  ) {
    return "video";
  }

  if (
    urlLower.includes(".png") ||
    urlLower.includes(".jpg") ||
    urlLower.includes(".jpeg") ||
    urlLower.includes(".webp") ||
    urlLower.includes(".gif")
  ) {
    return "imagem";
  }

  if (
    urlLower.includes(".doc") ||
    urlLower.includes(".docx") ||
    urlLower.includes(".ppt") ||
    urlLower.includes(".pptx") ||
    urlLower.includes(".xls") ||
    urlLower.includes(".xlsx")
  ) {
    return "documento";
  }

  return "link";
}

function tipoPorArquivo(arquivo: File) {
  const mime = arquivo.type.toLowerCase();
  const nome = arquivo.name.toLowerCase();

  if (mime.includes("pdf") || nome.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "imagem";

  if (
    nome.endsWith(".doc") ||
    nome.endsWith(".docx") ||
    nome.endsWith(".ppt") ||
    nome.endsWith(".pptx") ||
    nome.endsWith(".xls") ||
    nome.endsWith(".xlsx")
  ) {
    return "documento";
  }

  return "documento";
}

function moduloEstaLiberado(modulo: Record<string, unknown> | null) {
  if (!modulo) return true;

  const status = texto(
    modulo.status_mentorado ?? modulo.status ?? modulo.situacao ?? modulo.disponibilidade
  ).toLowerCase();

  if (!status) return true;

  const statusBloqueados = [
    "bloqueado",
    "bloqueada",
    "rascunho",
    "oculto",
    "oculta",
    "inativo",
    "inativa",
  ];

  return !statusBloqueados.includes(status);
}

function nomeModulo(modulo: Record<string, unknown> | null) {
  if (!modulo) return null;

  return (
    texto(modulo.nome_explicativo) ||
    texto(modulo.nome_premium) ||
    texto(modulo.nome) ||
    texto(modulo.titulo) ||
    null
  );
}

function nomeAula(aula: Record<string, unknown>) {
  return (
    texto(aula.titulo) ||
    texto(aula.nome) ||
    texto(aula.nome_aula) ||
    texto(aula.title) ||
    "Aula"
  );
}

async function signedUrl(bucket: string, path: string) {
  const pathLimpo = path.replace(/^\/+/, "");

  if (!CEO_STORAGE_BUCKETS.includes(bucket as (typeof CEO_STORAGE_BUCKETS)[number])) {
    const { data } = supabaseAdmin().storage.from(bucket).getPublicUrl(pathLimpo);
    return data.publicUrl;
  }

  return assinarUrlStorage(
    supabaseAdmin(),
    criarReferenciaStorage(
      bucket as "ceo-club-biblioteca" | "ceo-club-materiais",
      pathLimpo
    )
  );
}

function separarBucketDoPath(pathOriginal: string, bucketHint?: string | null) {
  const bruto = pathOriginal.trim();

  if (!bruto) {
    return {
      bucket: bucketHint || BUCKETS_POSSIVEIS_AULAS[0] || BUCKET_BIBLIOTECA,
      path: "",
    };
  }

  const referenciaStorage = extrairReferenciaStorage(bruto);

  if (referenciaStorage) {
    return {
      bucket: referenciaStorage.bucket,
      path: referenciaStorage.path,
    };
  }

  const semBarras = bruto.replace(/^\/+/, "");

  for (const bucket of BUCKETS_POSSIVEIS_AULAS) {
    if (semBarras === bucket) {
      return {
        bucket,
        path: "",
      };
    }

    if (semBarras.startsWith(`${bucket}/`)) {
      return {
        bucket,
        path: semBarras.replace(`${bucket}/`, ""),
      };
    }
  }

  return {
    bucket: bucketHint || BUCKETS_POSSIVEIS_AULAS[0] || BUCKET_BIBLIOTECA,
    path: semBarras,
  };
}

async function descobrirBucketPorPath(path: string) {
  const pathLimpo = path.replace(/^\/+/, "");

  if (!pathLimpo || pathLimpo.startsWith("http")) {
    return BUCKETS_POSSIVEIS_AULAS[0] || BUCKET_BIBLIOTECA;
  }

  const partes = pathLimpo.split("/");
  const nomeArquivo = partes.pop() || "";
  const pasta = partes.join("/");

  if (!nomeArquivo) {
    return BUCKETS_POSSIVEIS_AULAS[0] || BUCKET_BIBLIOTECA;
  }

  for (const bucket of BUCKETS_POSSIVEIS_AULAS) {
    try {
      const { data, error } = await supabaseAdmin().storage
        .from(bucket)
        .list(pasta || undefined, {
          search: nomeArquivo,
          limit: 20,
        });

      if (error) continue;

      const encontrado = (data ?? []).some((item) => item.name === nomeArquivo);

      if (encontrado) return bucket;
    } catch {
      continue;
    }
  }

  return BUCKETS_POSSIVEIS_AULAS[0] || BUCKET_BIBLIOTECA;
}

async function resolverUrlMaterial(
  item: Record<string, unknown>,
  urlDireta?: string
) {
  const url =
    texto(urlDireta) ||
    pegarPrimeiroTexto(item, CAMPOS_URL_MATERIAL);

  if (url) {
    const referenciaStorage = extrairReferenciaStorage(url);

    if (referenciaStorage) {
      return {
        url: await signedUrl(referenciaStorage.bucket, referenciaStorage.path),
        storagePath: referenciaStorage.path,
      };
    }

    if (url.startsWith("http")) {
      return {
        url,
        storagePath: pegarPrimeiroTexto(item, CAMPOS_STORAGE_PATH) || null,
      };
    }

    const bucketHint = pegarPrimeiroTexto(item, CAMPOS_BUCKET);
    const separado = separarBucketDoPath(url, bucketHint);
    const bucket = separado.bucket || (await descobrirBucketPorPath(separado.path));

    return {
      url: await signedUrl(bucket, separado.path),
      storagePath: separado.path,
    };
  }

  const storagePath = pegarPrimeiroTexto(item, CAMPOS_STORAGE_PATH);

  if (!storagePath) {
    return {
      url: "",
      storagePath: null,
    };
  }

  if (storagePath.startsWith("http")) {
    return {
      url: storagePath,
      storagePath,
    };
  }

  const bucketHint = pegarPrimeiroTexto(item, CAMPOS_BUCKET);
  const separado = separarBucketDoPath(storagePath, bucketHint);
  const bucket = bucketHint || separado.bucket || (await descobrirBucketPorPath(separado.path));

  return {
    url: await signedUrl(bucket, separado.path),
    storagePath: separado.path,
  };
}

function nomeDoMaterial(item: Record<string, unknown>, fallback: string) {
  return (
    pegarPrimeiroTexto(item, [
      "nome",
      "titulo",
      "title",
      "label",
      "filename",
      "file_name",
      "nome_arquivo",
      "arquivo_nome",
      "material_nome",
      "documento_nome",
    ]) || fallback
  );
}

function observacaoDoMaterial(item: Record<string, unknown>) {
  return (
    texto(item.observacao) ||
    texto(item.descricao) ||
    texto(item.description) ||
    texto(item.resumo) ||
    null
  );
}

async function buscarMapasAulasEModulos() {
  const { data: aulasData } = await supabaseAdmin().from("aulas").select("*");
  const aulas = (aulasData ?? []) as Record<string, unknown>[];

  const moduloIds = Array.from(
    new Set(aulas.map((aula) => texto(aula.modulo_id)).filter(Boolean))
  );

  const { data: modulosData } =
    moduloIds.length > 0
      ? await supabaseAdmin().from("modulos").select("*").in("id", moduloIds)
      : { data: [] };

  const modulos = (modulosData ?? []) as Record<string, unknown>[];

  const mapaAulas = new Map(aulas.map((aula) => [texto(aula.id), aula]));
  const mapaModulos = new Map(modulos.map((modulo) => [texto(modulo.id), modulo]));

  return {
    mapaAulas,
    mapaModulos,
  };
}

async function buscarMateriaisEmTabelasSeparadas(podeVerTudo: boolean) {
  const materiais: BibliotecaItem[] = [];
  const { mapaAulas, mapaModulos } = await buscarMapasAulasEModulos();

  for (const tabela of TABELAS_MATERIAIS_AULA) {
    const { data, error } = await supabaseAdmin().from(tabela).select("*");

    if (error || !data) continue;

    for (const registro of data as Record<string, unknown>[]) {
      if (
        !podeVerTudo &&
        (booleanoFalso(registro.visivel_mentorado) ||
          booleanoFalso(registro.liberado_mentorado) ||
          booleanoFalso(registro.ativo))
      ) {
        continue;
      }

      const aulaId = texto(registro.aula_id) || texto(registro.aulas_id);
      const aula = mapaAulas.get(aulaId) ?? null;

      const moduloId =
        texto(registro.modulo_id) ||
        texto(registro.modulos_id) ||
        texto(aula?.modulo_id);

      const modulo = mapaModulos.get(moduloId) ?? null;

      if (!podeVerTudo && !moduloEstaLiberado(modulo)) {
        continue;
      }

      const resolvido = await resolverUrlMaterial(registro);

      if (!resolvido.url) continue;

      const aulaNome = aula ? nomeAula(aula) : texto(registro.aula_nome) || null;
      const moduloNome = nomeModulo(modulo) || texto(registro.modulo_nome) || null;

      materiais.push({
        id: texto(registro.id) || `${tabela}-${aulaId}-${resolvido.url}`,
        nome: nomeDoMaterial(registro, aulaNome ? `Material - ${aulaNome}` : "Material da aula"),
        categoria: texto(registro.categoria) || "material",
        tipo: tipoPorUrl(resolvido.url, texto(registro.tipo)),
        url: resolvido.url,
        url_original: pegarPrimeiroTexto(registro, CAMPOS_URL_MATERIAL) || null,
        storage_path: resolvido.storagePath,
        tamanho_bytes: numero(registro.tamanho_bytes ?? registro.size ?? registro.bytes),
        observacao: observacaoDoMaterial(registro),
        created_at: texto(registro.created_at) || texto(aula?.created_at) || new Date().toISOString(),
        updated_at: texto(registro.updated_at) || null,
        origem: "aula",
        modulo_id: moduloId || null,
        modulo_nome: moduloNome,
        aula_id: aulaId || null,
        aula_nome: aulaNome,
      });
    }
  }

  return materiais;
}

async function buscarMateriaisDasAulas(podeVerTudo: boolean) {
  // O schema de produção usa materiais_aula como fonte única. Evita percorrer
  // todas as aulas e tentar interpretar campos legados a cada abertura.
  let todos = await buscarMateriaisEmTabelasSeparadas(podeVerTudo);

  if (!podeVerTudo) {
    const { data: liberacoes, error } = await supabaseAdmin()
      .from("modulo_liberacoes")
      .select("modulo_id, status_liberacao, liberar_em");

    if (error) throw error;

    const agora = Date.now();
    const modulosLiberados = new Set(
      ((liberacoes ?? []) as Record<string, unknown>[])
        .filter((liberacao) => {
          const status = texto(liberacao.status_liberacao);

          if (status === "aberto") return true;

          if (status !== "agendado") return false;

          const liberarEm = texto(liberacao.liberar_em);
          const timestamp = liberarEm ? new Date(liberarEm).getTime() : NaN;

          return Number.isFinite(timestamp) && timestamp <= agora;
        })
        .map((liberacao) => texto(liberacao.modulo_id))
        .filter(Boolean)
    );

    todos = todos.filter(
      (item) => item.modulo_id && modulosLiberados.has(item.modulo_id)
    );
  }

  const chaves = new Set<string>();

  return todos.filter((item) => {
    if (!item.url) return false;

    const chave = `${item.aula_id || "sem-aula"}-${
      item.storage_path || item.url
    }`;

    if (chaves.has(chave)) return false;

    chaves.add(chave);
    return true;
  });
}

async function atualizarMaterialAula({
  id,
  nome,
  modo,
  urlInformada,
  novoArquivo,
  usuarioId,
}: {
  id: string;
  nome: string;
  modo: string;
  urlInformada: string;
  novoArquivo: FormDataEntryValue | null;
  usuarioId: string;
}) {
  const { data: atual, error: buscaError } = await supabaseAdmin()
    .from("materiais_aula")
    .select("*")
    .eq("id", id)
    .single();

  if (buscaError || !atual) {
    throw new Error("Material da aula não encontrado.");
  }

  const aulaId = texto(atual.aula_id);
  let urlFinal = texto(atual.url);
  let storagePath = texto(atual.storage_path) || null;
  let tipo = texto(atual.tipo) || tipoPorUrl(urlFinal);
  let novoStoragePath: string | null = null;

  if (novoArquivo instanceof File && novoArquivo.size > 0) {
    if (novoArquivo.size > LIMITE_UPLOAD_BYTES) {
      throw new Error("O arquivo precisa ter no máximo 25 MB.");
    }

    if (!arquivoPermitido(novoArquivo)) {
      throw new Error(
        "Formato não permitido. Envie PDF, documento, planilha, apresentação, imagem, vídeo, texto, CSV ou ZIP."
      );
    }

    const nomeLimpo = limparNomeArquivo(novoArquivo.name || "arquivo");
    novoStoragePath = `modulos/aulas/${aulaId}/${crypto.randomUUID()}-${nomeLimpo}`;

    const { error: uploadError } = await supabaseAdmin().storage
      .from(BUCKET_MATERIAIS)
      .upload(novoStoragePath, novoArquivo, {
        cacheControl: "3600",
        upsert: false,
        contentType: novoArquivo.type || undefined,
      });

    if (uploadError) throw uploadError;

    urlFinal = criarReferenciaStorage(BUCKET_MATERIAIS, novoStoragePath);
    storagePath = novoStoragePath;
    tipo = tipoPorArquivo(novoArquivo);
  } else if (modo === "link") {
    if (!urlExternaValida(urlInformada)) {
      throw new Error("Use um link válido começando com http:// ou https://.");
    }

    urlFinal = urlInformada;
    storagePath = null;
    tipo = tipoPorUrl(urlInformada);
  }

  const { data, error } = await supabaseAdmin()
    .from("materiais_aula")
    .update({
      nome,
      url: urlFinal,
      storage_path: storagePath,
      tipo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (novoStoragePath) {
      await supabaseAdmin().storage
        .from(BUCKET_MATERIAIS)
        .remove([novoStoragePath]);
    }

    throw error;
  }

  const storageAnterior = texto(atual.storage_path);

  if (
    storageAnterior &&
    storageAnterior !== storagePath &&
    (novoStoragePath || modo === "link")
  ) {
    const { error: limpezaError } = await supabaseAdmin().storage
      .from(BUCKET_MATERIAIS)
      .remove([storageAnterior]);

    if (limpezaError) {
      console.error("Material antigo da aula não pôde ser removido:", limpezaError);
    }
  }

  await registrarAuditoriaBiblioteca({
    usuarioId,
    acao: "biblioteca_material_aula_atualizado",
    entidade: "biblioteca_arquivo",
    entidadeId: id,
    descricao: `Material da aula "${nome}" atualizado pela Biblioteca.`,
    metadata: {
      origem: "aula",
      aula_id: aulaId || null,
      antes: {
        nome: atual.nome,
        url: atual.url,
        storage_path: atual.storage_path,
      },
      depois: {
        nome,
        url: urlFinal,
        storage_path: storagePath,
      },
      arquivo_substituido: Boolean(novoStoragePath),
    },
  });

  return data;
}

async function normalizarArquivoBiblioteca(
  arquivo: Record<string, unknown>
): Promise<BibliotecaItem> {
  const urlOriginal = texto(arquivo.url);
  const storagePath = texto(arquivo.storage_path) || null;
  const url = storagePath
    ? await signedUrl(BUCKET_BIBLIOTECA, storagePath)
    : await assinarUrlStorage(supabaseAdmin(), urlOriginal);

  return {
    id: texto(arquivo.id),
    mentorado_id: texto(arquivo.mentorado_id) || null,
    mentorado_nome: texto(arquivo.mentorado_nome) || null,
    mentorado_email: texto(arquivo.mentorado_email) || null,
    criado_por: texto(arquivo.criado_por) || null,
    pasta_id: texto(arquivo.pasta_id) || null,
    pasta_nome: texto(arquivo.pasta_nome) || null,
    pasta_visibilidade:
      arquivo.pasta_visibilidade === "publica" ||
      arquivo.pasta_visibilidade === "privada"
        ? arquivo.pasta_visibilidade
        : null,
    escopo: ESCOPOS_BIBLIOTECA.has(texto(arquivo.escopo))
      ? (texto(arquivo.escopo) as "mentorado" | "geral" | "interno")
      : "mentorado",
    nome: texto(arquivo.nome) || "Material",
    categoria: texto(arquivo.categoria) || "material",
    tipo: texto(arquivo.tipo) || tipoPorUrl(url),
    url,
    url_original: urlOriginal || null,
    storage_path: storagePath,
    tamanho_bytes: numero(arquivo.tamanho_bytes),
    observacao: texto(arquivo.observacao) || null,
    created_at: texto(arquivo.created_at) || new Date().toISOString(),
    updated_at: texto(arquivo.updated_at) || null,
    origem: "biblioteca",
  };
}

export async function GET(request: NextRequest) {
  try {
    const erroConfiguracao = erroConfig();

    if (erroConfiguracao) {
      return NextResponse.json(
        { ok: false, error: erroConfiguracao },
        { status: 500 }
      );
    }

    const permissao = await verificarAcesso(request, [
      "mentor",
      "mentorado",
      "suporte",
    ]);

    if (!permissao.ok) {
      return responderPermissaoNegada(permissao);
    }

    const podeGerenciar = usuarioPodeGerenciarBiblioteca(permissao);

    if (!podeGerenciar && permissao.role !== "mentorado") {
      return NextResponse.json(
        { ok: false, error: "Você não tem permissão para acessar a Biblioteca." },
        { status: 403 }
      );
    }

    const podeVerTudo = podeGerenciar;

    let query = supabaseAdmin()
      .from("biblioteca_arquivos")
      .select("*")
      .order("created_at", { ascending: false });

    if (permissao.role === "mentorado") {
      query = query.or(
        `mentorado_id.eq.${permissao.userId},escopo.eq.geral`
      );
    }

    let pastasQuery = supabaseAdmin()
      .from("biblioteca_pastas")
      .select("id, nome, descricao, visibilidade, criada_por, created_at, updated_at")
      .order("nome", { ascending: true });

    if (!podeVerTudo) {
      pastasQuery = pastasQuery.eq("visibilidade", "publica");
    }

    const perfisQuery = supabaseAdmin()
      .from("profiles")
      .select("id, nome, email, status")
      .eq("role", "mentorado")
      .is("excluido_em", null)
      .order("nome", { ascending: true });

    const [arquivosResult, pastasResult, perfisResult, materiaisAulas] =
      await Promise.all([
        query,
        pastasQuery,
        perfisQuery,
        buscarMateriaisDasAulas(podeVerTudo),
      ]);

    if (arquivosResult.error) throw arquivosResult.error;
    if (pastasResult.error) throw pastasResult.error;
    if (perfisResult.error) throw perfisResult.error;

    const pastas = pastasResult.data ?? [];
    const mentorados = (perfisResult.data ?? []).filter((perfil) => {
      const status = texto(perfil.status).toLowerCase();
      return !status || status === "ativo";
    });

    const mapaPastas = new Map(
      pastas.map((pasta) => [pasta.id, pasta])
    );
    const mapaMentorados = new Map(
      mentorados.map((perfil) => [perfil.id, perfil])
    );

    const arquivosBiblioteca = (
      await Promise.all(
        ((arquivosResult.data ?? []) as Record<string, unknown>[]).map((arquivo) => {
          const pasta = mapaPastas.get(texto(arquivo.pasta_id));
          const perfil = mapaMentorados.get(texto(arquivo.mentorado_id));

          return normalizarArquivoBiblioteca({
            ...arquivo,
            pasta_nome: pasta?.nome ?? null,
            pasta_visibilidade: pasta?.visibilidade ?? null,
            mentorado_nome: perfil?.nome ?? null,
            mentorado_email: perfil?.email ?? null,
          });
        })
      )
    ).filter((arquivo) => Boolean(arquivo.url));

    const arquivos = [...arquivosBiblioteca, ...materiaisAulas].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({
      ok: true,
      arquivos,
      pastas,
      mentorados: podeGerenciar ? mentorados : [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a biblioteca.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const erroConfiguracao = erroConfig();

    if (erroConfiguracao) {
      return NextResponse.json(
        { ok: false, error: erroConfiguracao },
        { status: 500 }
      );
    }

    const permissao = await verificarAcesso(request, [
      "mentor",
      "suporte",
    ]);

    if (!permissao.ok) {
      return responderPermissaoNegada(permissao);
    }

    if (!usuarioPodeGerenciarBiblioteca(permissao)) {
      return NextResponse.json(
        { ok: false, error: "Somente mentora e Suporte/T.I. podem enviar materiais." },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const mentoradoId = texto(formData.get("mentoradoId"));
    const pastaId = texto(formData.get("pastaId"));
    const destino = texto(formData.get("destino")) || "mentorado";
    const nome = texto(formData.get("nome"));
    const categoria = texto(formData.get("categoria")) || "material";
    const observacao = texto(formData.get("observacao"));
    const modo = texto(formData.get("modo")) || "arquivo";
    const urlInformada = texto(formData.get("url"));
    const arquivo = formData.get("arquivo");

    if (!nome || nome.length > 160) {
      return NextResponse.json(
        { ok: false, error: "Informe o nome do material com até 160 caracteres." },
        { status: 400 }
      );
    }

    let urlFinal = "";
    let storagePath: string | null = null;
    let tamanhoBytes: number | null = null;
    let tipo = "link";
    let storageEnviado: string | null = null;

    const destinoResolvido = await resolverDestinoBiblioteca({
      destino,
      mentoradoId,
      pastaId,
    });

    if (modo === "link") {
      if (!urlInformada) {
        return NextResponse.json(
          { ok: false, error: "Cole o link do material." },
          { status: 400 }
        );
      }

      if (!urlExternaValida(urlInformada)) {
        return NextResponse.json(
          { ok: false, error: "Use um link válido começando com http:// ou https://." },
          { status: 400 }
        );
      }

      urlFinal = urlInformada;
      tipo = tipoPorUrl(urlFinal);
    } else {
      if (!(arquivo instanceof File)) {
        return NextResponse.json(
          { ok: false, error: "Escolha um arquivo para enviar." },
          { status: 400 }
        );
      }

      if (arquivo.size > LIMITE_UPLOAD_BYTES) {
        return NextResponse.json(
          { ok: false, error: "O arquivo precisa ter no máximo 25 MB." },
          { status: 400 }
        );
      }

      if (!arquivoPermitido(arquivo)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Formato não permitido. Envie PDF, documento, planilha, apresentação, imagem, vídeo, texto, CSV ou ZIP.",
          },
          { status: 400 }
        );
      }

      const nomeLimpo = limparNomeArquivo(arquivo.name || "arquivo");
      const caminho = `${destinoResolvido.prefixoStorage}/${crypto.randomUUID()}-${nomeLimpo}`;

      const { error: uploadError } = await supabaseAdmin().storage
        .from(BUCKET_BIBLIOTECA)
        .upload(caminho, arquivo, {
          cacheControl: "3600",
          upsert: false,
          contentType: arquivo.type || undefined,
        });

      if (uploadError) throw uploadError;

      storageEnviado = caminho;

      urlFinal = criarReferenciaStorage(BUCKET_BIBLIOTECA, caminho);
      storagePath = caminho;
      tamanhoBytes = arquivo.size;
      tipo = tipoPorArquivo(arquivo);
    }

    const { data, error } = await supabaseAdmin()
      .from("biblioteca_arquivos")
      .insert({
        mentorado_id: destinoResolvido.mentoradoId,
        pasta_id: destinoResolvido.pastaId,
        escopo: destinoResolvido.escopo,
        criado_por: permissao.userId,
        nome,
        categoria,
        tipo,
        url: urlFinal,
        storage_path: storagePath,
        tamanho_bytes: tamanhoBytes,
        observacao: observacao || null,
      })
      .select("*")
      .single();

    if (error) {
      if (storageEnviado) {
        await supabaseAdmin().storage
          .from(BUCKET_BIBLIOTECA)
          .remove([storageEnviado]);
      }

      throw error;
    }

    await registrarAuditoriaBiblioteca({
      usuarioId: permissao.userId,
      acao: "biblioteca_arquivo_criado",
      entidade: "biblioteca_arquivo",
      entidadeId: data.id,
      descricao: `Material "${nome}" adicionado à Biblioteca.`,
      metadata: {
        categoria,
        destino,
        escopo: destinoResolvido.escopo,
        mentorado_id: destinoResolvido.mentoradoId,
        pasta_id: destinoResolvido.pastaId,
        modo,
      },
    });

    return NextResponse.json({
      ok: true,
      arquivo: await normalizarArquivoBiblioteca(
        data as Record<string, unknown>
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o material.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const erroConfiguracao = erroConfig();

    if (erroConfiguracao) {
      return NextResponse.json(
        { ok: false, error: erroConfiguracao },
        { status: 500 }
      );
    }

    const permissao = await verificarAcesso(request, ["mentor", "suporte"]);

    if (!permissao.ok) {
      return responderPermissaoNegada(permissao);
    }

    if (!usuarioPodeGerenciarBiblioteca(permissao)) {
      return NextResponse.json(
        { ok: false, error: "Somente mentora e Suporte/T.I. podem editar materiais." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const id = texto(formData.get("id"));
    const origem = texto(formData.get("origem")) || "biblioteca";
    const nome = texto(formData.get("nome"));
    const categoria = texto(formData.get("categoria")) || "material";
    const observacao = texto(formData.get("observacao"));
    const destino = texto(formData.get("destino")) || "geral";
    const mentoradoId = texto(formData.get("mentoradoId"));
    const pastaId = texto(formData.get("pastaId"));
    const modo = texto(formData.get("modo")) || "arquivo";
    const urlInformada = texto(formData.get("url"));
    const novoArquivo = formData.get("arquivo");

    if (!id || !nome || nome.length > 160) {
      return NextResponse.json(
        { ok: false, error: "Informe o material e um nome com até 160 caracteres." },
        { status: 400 }
      );
    }

    if (origem === "aula") {
      const material = await atualizarMaterialAula({
        id,
        nome,
        modo,
        urlInformada,
        novoArquivo,
        usuarioId: permissao.userId,
      });

      return NextResponse.json({ ok: true, arquivo: material });
    }

    if (origem !== "biblioteca") {
      return NextResponse.json(
        { ok: false, error: "Origem do material inválida." },
        { status: 400 }
      );
    }

    const { data: atual, error: buscaError } = await supabaseAdmin()
      .from("biblioteca_arquivos")
      .select("*")
      .eq("id", id)
      .single();

    if (buscaError || !atual) {
      return NextResponse.json(
        { ok: false, error: "Material não encontrado." },
        { status: 404 }
      );
    }

    const destinoResolvido = await resolverDestinoBiblioteca({
      destino,
      mentoradoId,
      pastaId,
    });

    let urlFinal = texto(atual.url);
    let storagePath = texto(atual.storage_path) || null;
    let tamanhoBytes = numero(atual.tamanho_bytes);
    let tipo = texto(atual.tipo) || "link";
    let novoStoragePath: string | null = null;
    let storageReposicionadoDe: string | null = null;

    if (novoArquivo instanceof File && novoArquivo.size > 0) {
      if (novoArquivo.size > LIMITE_UPLOAD_BYTES) {
        return NextResponse.json(
          { ok: false, error: "O arquivo precisa ter no máximo 25 MB." },
          { status: 400 }
        );
      }

      if (!arquivoPermitido(novoArquivo)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Formato não permitido. Envie PDF, documento, planilha, apresentação, imagem, vídeo, texto, CSV ou ZIP.",
          },
          { status: 400 }
        );
      }

      const nomeLimpo = limparNomeArquivo(novoArquivo.name || "arquivo");
      novoStoragePath = `${destinoResolvido.prefixoStorage}/${crypto.randomUUID()}-${nomeLimpo}`;

      const { error: uploadError } = await supabaseAdmin().storage
        .from(BUCKET_BIBLIOTECA)
        .upload(novoStoragePath, novoArquivo, {
          cacheControl: "3600",
          upsert: false,
          contentType: novoArquivo.type || undefined,
        });

      if (uploadError) throw uploadError;

      urlFinal = criarReferenciaStorage(BUCKET_BIBLIOTECA, novoStoragePath);
      storagePath = novoStoragePath;
      tamanhoBytes = novoArquivo.size;
      tipo = tipoPorArquivo(novoArquivo);
    } else if (modo === "link") {
      if (!urlExternaValida(urlInformada)) {
        return NextResponse.json(
          { ok: false, error: "Use um link válido começando com http:// ou https://." },
          { status: 400 }
        );
      }

      urlFinal = urlInformada;
      storagePath = null;
      tamanhoBytes = null;
      tipo = tipoPorUrl(urlInformada);
    } else if (
      storagePath &&
      !destinoAtualIgual(atual as Record<string, unknown>, destinoResolvido)
    ) {
      const destinoStorage = `${destinoResolvido.prefixoStorage}/${crypto.randomUUID()}-${nomeArquivoDoPath(storagePath)}`;
      const { error: moveError } = await supabaseAdmin().storage
        .from(BUCKET_BIBLIOTECA)
        .move(storagePath, destinoStorage);

      if (moveError) throw moveError;

      storageReposicionadoDe = storagePath;
      storagePath = destinoStorage;
      urlFinal = criarReferenciaStorage(BUCKET_BIBLIOTECA, destinoStorage);
    }

    const { data, error } = await supabaseAdmin()
      .from("biblioteca_arquivos")
      .update({
        mentorado_id: destinoResolvido.mentoradoId,
        pasta_id: destinoResolvido.pastaId,
        escopo: destinoResolvido.escopo,
        nome,
        categoria,
        observacao: observacao || null,
        tipo,
        url: urlFinal,
        storage_path: storagePath,
        tamanho_bytes: tamanhoBytes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (novoStoragePath) {
        await supabaseAdmin().storage
          .from(BUCKET_BIBLIOTECA)
          .remove([novoStoragePath]);
      }

      if (storageReposicionadoDe && storagePath) {
        const { error: rollbackError } = await supabaseAdmin().storage
          .from(BUCKET_BIBLIOTECA)
          .move(storagePath, storageReposicionadoDe);

        if (rollbackError) {
          console.error("Não foi possível desfazer a movimentação do arquivo:", rollbackError);
        }
      }

      throw error;
    }

    const storageAnterior = texto(atual.storage_path);

    if (
      storageAnterior &&
      storageAnterior !== storagePath &&
      (novoStoragePath || modo === "link")
    ) {
      const { error: limpezaError } = await supabaseAdmin().storage
        .from(BUCKET_BIBLIOTECA)
        .remove([storageAnterior]);

      if (limpezaError) {
        console.error("Arquivo antigo da Biblioteca não pôde ser removido:", limpezaError);
      }
    }

    await registrarAuditoriaBiblioteca({
      usuarioId: permissao.userId,
      acao: "biblioteca_arquivo_atualizado",
      entidade: "biblioteca_arquivo",
      entidadeId: id,
      descricao: `Material "${nome}" atualizado na Biblioteca.`,
      metadata: {
        antes: {
          nome: atual.nome,
          categoria: atual.categoria,
          escopo: atual.escopo,
          mentorado_id: atual.mentorado_id,
          pasta_id: atual.pasta_id,
        },
        depois: {
          nome,
          categoria,
          escopo: destinoResolvido.escopo,
          mentorado_id: destinoResolvido.mentoradoId,
          pasta_id: destinoResolvido.pastaId,
        },
        arquivo_substituido: Boolean(novoStoragePath),
        arquivo_movido_no_storage: Boolean(storageReposicionadoDe),
      },
    });

    return NextResponse.json({
      ok: true,
      arquivo: await normalizarArquivoBiblioteca(
        data as Record<string, unknown>
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o material.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const erroConfiguracao = erroConfig();

    if (erroConfiguracao) {
      return NextResponse.json(
        { ok: false, error: erroConfiguracao },
        { status: 500 }
      );
    }

    const permissao = await verificarAcesso(request, ["mentor", "suporte"]);

    if (!permissao.ok) {
      return responderPermissaoNegada(permissao);
    }

    if (!usuarioPodeGerenciarBiblioteca(permissao)) {
      return NextResponse.json(
        { ok: false, error: "Somente mentora e Suporte/T.I. podem mover materiais." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const id = texto(body?.id);
    const origem = texto(body?.origem) || "biblioteca";
    const destino = texto(body?.destino);
    const mentoradoId = texto(body?.mentoradoId);
    const pastaId = texto(body?.pastaId);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Informe o material que deseja mover." },
        { status: 400 }
      );
    }

    const destinoResolvido = await resolverDestinoBiblioteca({
      destino,
      mentoradoId,
      pastaId,
    });

    if (origem === "biblioteca") {
      const { data: atual, error: buscaError } = await supabaseAdmin()
        .from("biblioteca_arquivos")
        .select("*")
        .eq("id", id)
        .single();

      if (buscaError || !atual) {
        return NextResponse.json(
          { ok: false, error: "Material não encontrado." },
          { status: 404 }
        );
      }

      if (destinoAtualIgual(atual as Record<string, unknown>, destinoResolvido)) {
        return NextResponse.json(
          { ok: false, error: "O material já está nesse destino." },
          { status: 409 }
        );
      }

      const storageAnterior = texto(atual.storage_path) || null;
      let storagePath = storageAnterior;
      let urlFinal = texto(atual.url);

      if (storageAnterior) {
        storagePath = `${destinoResolvido.prefixoStorage}/${crypto.randomUUID()}-${nomeArquivoDoPath(storageAnterior)}`;
        const { error: moveError } = await supabaseAdmin().storage
          .from(BUCKET_BIBLIOTECA)
          .move(storageAnterior, storagePath);

        if (moveError) throw moveError;
        urlFinal = criarReferenciaStorage(BUCKET_BIBLIOTECA, storagePath);
      }

      const { data, error } = await supabaseAdmin()
        .from("biblioteca_arquivos")
        .update({
          mentorado_id: destinoResolvido.mentoradoId,
          pasta_id: destinoResolvido.pastaId,
          escopo: destinoResolvido.escopo,
          url: urlFinal,
          storage_path: storagePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        if (storageAnterior && storagePath && storageAnterior !== storagePath) {
          const { error: rollbackError } = await supabaseAdmin().storage
            .from(BUCKET_BIBLIOTECA)
            .move(storagePath, storageAnterior);

          if (rollbackError) {
            console.error("Não foi possível desfazer a movimentação do material:", rollbackError);
          }
        }

        throw error;
      }

      await registrarAuditoriaBiblioteca({
        usuarioId: permissao.userId,
        acao: "biblioteca_arquivo_movido",
        entidade: "biblioteca_arquivo",
        entidadeId: id,
        descricao: `Material "${texto(atual.nome) || "sem nome"}" movido na Biblioteca.`,
        metadata: {
          origem: {
            escopo: atual.escopo,
            mentorado_id: atual.mentorado_id,
            pasta_id: atual.pasta_id,
            storage_path: storageAnterior,
          },
          destino: {
            escopo: destinoResolvido.escopo,
            mentorado_id: destinoResolvido.mentoradoId,
            pasta_id: destinoResolvido.pastaId,
            storage_path: storagePath,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        arquivo: await normalizarArquivoBiblioteca(
          data as Record<string, unknown>
        ),
      });
    }

    if (origem !== "aula") {
      return NextResponse.json(
        { ok: false, error: "Origem do material inválida." },
        { status: 400 }
      );
    }

    const { data: materialAula, error: buscaAulaError } = await supabaseAdmin()
      .from("materiais_aula")
      .select("*")
      .eq("id", id)
      .single();

    if (buscaAulaError || !materialAula) {
      return NextResponse.json(
        { ok: false, error: "Material da aula não encontrado." },
        { status: 404 }
      );
    }

    const storageAnterior = texto(materialAula.storage_path) || null;
    let novoStoragePath: string | null = null;
    let urlFinal = texto(materialAula.url);

    if (storageAnterior) {
      novoStoragePath = `${destinoResolvido.prefixoStorage}/${crypto.randomUUID()}-${nomeArquivoDoPath(storageAnterior)}`;
      const { error: moveError } = await supabaseAdmin().storage
        .from(BUCKET_MATERIAIS)
        .move(storageAnterior, novoStoragePath, {
          destinationBucket: BUCKET_BIBLIOTECA,
        });

      if (moveError) throw moveError;
      urlFinal = criarReferenciaStorage(BUCKET_BIBLIOTECA, novoStoragePath);
    }

    const tipo = texto(materialAula.tipo) || tipoPorUrl(urlFinal);
    const { data: novoMaterial, error: insertError } = await supabaseAdmin()
      .from("biblioteca_arquivos")
      .insert({
        mentorado_id: destinoResolvido.mentoradoId,
        pasta_id: destinoResolvido.pastaId,
        escopo: destinoResolvido.escopo,
        criado_por: permissao.userId,
        nome: texto(materialAula.nome) || "Material",
        categoria: tipo === "link" ? "link" : tipo || "material",
        tipo,
        url: urlFinal,
        storage_path: novoStoragePath,
        tamanho_bytes: null,
        observacao: null,
      })
      .select("*")
      .single();

    if (insertError || !novoMaterial) {
      if (storageAnterior && novoStoragePath) {
        const { error: rollbackError } = await supabaseAdmin().storage
          .from(BUCKET_BIBLIOTECA)
          .move(novoStoragePath, storageAnterior, {
            destinationBucket: BUCKET_MATERIAIS,
          });

        if (rollbackError) {
          console.error("Não foi possível devolver o material à aula:", rollbackError);
        }
      }

      throw insertError || new Error("Não foi possível criar o material no novo destino.");
    }

    const { error: deleteAulaError } = await supabaseAdmin()
      .from("materiais_aula")
      .delete()
      .eq("id", id);

    if (deleteAulaError) {
      await supabaseAdmin()
        .from("biblioteca_arquivos")
        .delete()
        .eq("id", novoMaterial.id);

      if (storageAnterior && novoStoragePath) {
        const { error: rollbackError } = await supabaseAdmin().storage
          .from(BUCKET_BIBLIOTECA)
          .move(novoStoragePath, storageAnterior, {
            destinationBucket: BUCKET_MATERIAIS,
          });

        if (rollbackError) {
          console.error("Não foi possível devolver o material à aula:", rollbackError);
        }
      }

      throw deleteAulaError;
    }

    await registrarAuditoriaBiblioteca({
      usuarioId: permissao.userId,
      acao: "biblioteca_material_aula_movido",
      entidade: "biblioteca_arquivo",
      entidadeId: novoMaterial.id,
      descricao: `Material "${texto(materialAula.nome) || "sem nome"}" movido da aula para a Biblioteca.`,
      metadata: {
        origem: {
          tipo: "aula",
          material_id: id,
          aula_id: materialAula.aula_id,
          storage_path: storageAnterior,
        },
        destino: {
          escopo: destinoResolvido.escopo,
          mentorado_id: destinoResolvido.mentoradoId,
          pasta_id: destinoResolvido.pastaId,
          storage_path: novoStoragePath,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      arquivo: await normalizarArquivoBiblioteca(
        novoMaterial as Record<string, unknown>
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível mover o material.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const erroConfiguracao = erroConfig();

    if (erroConfiguracao) {
      return NextResponse.json(
        { ok: false, error: erroConfiguracao },
        { status: 500 }
      );
    }

    const permissao = await verificarAcesso(request, [
      "mentor",
      "suporte",
    ]);

    if (!permissao.ok) {
      return responderPermissaoNegada(permissao);
    }

    if (!usuarioPodeGerenciarBiblioteca(permissao)) {
      return NextResponse.json(
        { ok: false, error: "Somente mentora e Suporte/T.I. podem remover materiais." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const id = texto(body?.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Informe o material que deseja remover." },
        { status: 400 }
      );
    }

    const { data: arquivo, error: buscaError } = await supabaseAdmin()
      .from("biblioteca_arquivos")
      .select("*")
      .eq("id", id)
      .single();

    if (buscaError) throw buscaError;

    const storagePath = texto((arquivo as Record<string, unknown>)?.storage_path);

    const { error: deleteError } = await supabaseAdmin()
      .from("biblioteca_arquivos")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    if (storagePath) {
      const { error: storageError } = await supabaseAdmin().storage
        .from(BUCKET_BIBLIOTECA)
        .remove([storagePath]);

      if (storageError) {
        console.error("Arquivo órfão pendente de limpeza na Biblioteca:", storageError);
      }
    }

    await registrarAuditoriaBiblioteca({
      usuarioId: permissao.userId,
      acao: "biblioteca_arquivo_removido",
      entidade: "biblioteca_arquivo",
      entidadeId: id,
      descricao: `Material "${texto(arquivo.nome) || "sem nome"}" removido da Biblioteca.`,
      metadata: {
        nome: arquivo.nome,
        categoria: arquivo.categoria,
        escopo: arquivo.escopo,
        mentorado_id: arquivo.mentorado_id,
        pasta_id: arquivo.pasta_id,
        storage_path: storagePath || null,
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível remover o material.",
      },
      { status: 500 }
    );
  }
}
