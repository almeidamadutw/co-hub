import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";

const BUCKET_BIBLIOTECA = "ceo-club-biblioteca";
const LIMITE_UPLOAD_BYTES = 25 * 1024 * 1024;

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
  criado_por?: string | null;
  nome: string;
  categoria: string;
  tipo: string;
  url: string;
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

const CAMPOS_LISTA_MATERIAIS = [
  "materiais",
  "arquivos",
  "documentos",
  "anexos",
  "materiais_aula",
  "arquivos_aula",
  "documentos_aula",
  "files",
  "attachments",
];

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

const TABELAS_MATERIAIS_AULA = [
  "aula_documentos",
  "aula_materiais",
  "aula_arquivos",
  "aulas_documentos",
  "aulas_materiais",
  "aulas_arquivos",
  "materiais_aula",
  "documentos_aula",
  "arquivos_aula",
];

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

function tentarParseJson(valor: unknown) {
  if (typeof valor !== "string") return valor;

  try {
    return JSON.parse(valor);
  } catch {
    return valor;
  }
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

function normalizarRelacao<T = Record<string, unknown>>(valor: unknown): T | null {
  if (Array.isArray(valor)) return (valor[0] as T) ?? null;
  if (valor && typeof valor === "object") return valor as T;
  return null;
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

function publicUrl(bucket: string, path: string) {
  const pathLimpo = path.replace(/^\/+/, "");

  const { data } = supabase.storage.from(bucket).getPublicUrl(pathLimpo);

  return data.publicUrl;
}

function extrairUrlPublicaDeSupabase(valor: string) {
  if (!valor.includes("/storage/v1/object/public/")) return null;

  const partePublica = valor.split("/storage/v1/object/public/")[1];

  if (!partePublica) return null;

  const [bucket, ...resto] = partePublica.split("/");
  const path = resto.join("/");

  if (!bucket || !path) return null;

  return {
    bucket,
    path,
    url: valor,
  };
}

function separarBucketDoPath(pathOriginal: string, bucketHint?: string | null) {
  const bruto = pathOriginal.trim();

  if (!bruto) {
    return {
      bucket: bucketHint || BUCKETS_POSSIVEIS_AULAS[0] || BUCKET_BIBLIOTECA,
      path: "",
    };
  }

  const urlPublica = extrairUrlPublicaDeSupabase(bruto);

  if (urlPublica) {
    return {
      bucket: urlPublica.bucket,
      path: urlPublica.path,
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
      const { data, error } = await supabase.storage
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
      url: publicUrl(bucket, separado.path),
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
    url: publicUrl(bucket, separado.path),
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

async function extrairMateriaisDeArray(
  aula: Record<string, unknown>,
  modulo: Record<string, unknown> | null
): Promise<BibliotecaItem[]> {
  const itens: BibliotecaItem[] = [];
  const aulaId = texto(aula.id);
  const moduloId = texto(aula.modulo_id) || texto(modulo?.id);
  const aulaNome = nomeAula(aula);
  const moduloNome = nomeModulo(modulo);

  for (const campo of CAMPOS_LISTA_MATERIAIS) {
    const valorBruto = tentarParseJson(aula[campo]);

    if (!Array.isArray(valorBruto)) continue;

    for (let index = 0; index < valorBruto.length; index++) {
      const itemBruto = valorBruto[index];

      if (typeof itemBruto === "string") {
        const itemComoObjeto = { url: itemBruto };
        const resolvido = await resolverUrlMaterial(itemComoObjeto);

        if (!resolvido.url) continue;

        itens.push({
          id: `aula-${aulaId}-${campo}-${index}`,
          nome: `Material - ${aulaNome}`,
          categoria: "material",
          tipo: tipoPorUrl(resolvido.url),
          url: resolvido.url,
          storage_path: resolvido.storagePath,
          tamanho_bytes: null,
          observacao: null,
          created_at: texto(aula.created_at) || new Date().toISOString(),
          updated_at: texto(aula.updated_at) || null,
          origem: "aula",
          modulo_id: moduloId || null,
          modulo_nome: moduloNome,
          aula_id: aulaId || null,
          aula_nome: aulaNome,
        });

        continue;
      }

      if (!itemBruto || typeof itemBruto !== "object") continue;

      const item = itemBruto as Record<string, unknown>;
      const resolvido = await resolverUrlMaterial(item);

      if (!resolvido.url) continue;

      const nome = nomeDoMaterial(item, `Material - ${aulaNome}`);

      itens.push({
        id: texto(item.id) || `aula-${aulaId}-${campo}-${index}`,
        nome,
        categoria: texto(item.categoria) || "material",
        tipo: tipoPorUrl(resolvido.url, texto(item.tipo)),
        url: resolvido.url,
        storage_path: resolvido.storagePath,
        tamanho_bytes: numero(item.tamanho_bytes ?? item.size ?? item.bytes),
        observacao: observacaoDoMaterial(item),
        created_at: texto(item.created_at) || texto(aula.created_at) || new Date().toISOString(),
        updated_at: texto(item.updated_at) || texto(aula.updated_at) || null,
        origem: "aula",
        modulo_id: moduloId || null,
        modulo_nome: moduloNome,
        aula_id: aulaId || null,
        aula_nome: aulaNome,
      });
    }
  }

  return itens;
}

async function extrairMaterialSimples(
  aula: Record<string, unknown>,
  modulo: Record<string, unknown> | null
): Promise<BibliotecaItem[]> {
  const itens: BibliotecaItem[] = [];
  const aulaId = texto(aula.id);
  const moduloId = texto(aula.modulo_id) || texto(modulo?.id);
  const aulaNome = nomeAula(aula);
  const moduloNome = nomeModulo(modulo);

  const candidatos = [
    ...CAMPOS_URL_MATERIAL.map((campo) => ({
      campo,
      valor: texto(aula[campo]),
    })),
    ...CAMPOS_STORAGE_PATH.map((campo) => ({
      campo,
      valor: texto(aula[campo]),
    })),
  ];

  const valoresJaUsados = new Set<string>();

  for (const candidato of candidatos) {
    if (!candidato.valor || valoresJaUsados.has(candidato.valor)) continue;

    valoresJaUsados.add(candidato.valor);

    const resolvido = await resolverUrlMaterial(aula, candidato.valor);

    if (!resolvido.url) continue;

    const nome =
      texto(aula.material_nome) ||
      texto(aula.arquivo_nome) ||
      texto(aula.nome_material) ||
      texto(aula.nome_arquivo) ||
      texto(aula.documento_nome) ||
      `Material - ${aulaNome}`;

    itens.push({
      id: `aula-${aulaId}-${candidato.campo}`,
      nome,
      categoria: texto(aula.categoria_material) || "material",
      tipo: tipoPorUrl(resolvido.url, texto(aula.tipo_material) || texto(aula.tipo)),
      url: resolvido.url,
      storage_path: resolvido.storagePath,
      tamanho_bytes: numero(aula.tamanho_bytes ?? aula.arquivo_tamanho_bytes),
      observacao:
        texto(aula.observacao_material) ||
        texto(aula.descricao_material) ||
        texto(aula.descricao) ||
        null,
      created_at: texto(aula.created_at) || new Date().toISOString(),
      updated_at: texto(aula.updated_at) || null,
      origem: "aula",
      modulo_id: moduloId || null,
      modulo_nome: moduloNome,
      aula_id: aulaId || null,
      aula_nome: aulaNome,
    });
  }

  return itens;
}

async function buscarAulasComModulos() {
  const tentativaComRelacao = await supabase
    .from("aulas")
    .select("*, modulos(*)")
    .order("created_at", { ascending: false });

  if (!tentativaComRelacao.error) {
    return (tentativaComRelacao.data ?? []) as Record<string, unknown>[];
  }

  const tentativaSimples = await supabase.from("aulas").select("*");

  const aulas = (tentativaSimples.data ?? []) as Record<string, unknown>[];

  const moduloIds = Array.from(
    new Set(aulas.map((aula) => texto(aula.modulo_id)).filter(Boolean))
  );

  if (moduloIds.length === 0) return aulas;

  const { data: modulos } = await supabase.from("modulos").select("*").in("id", moduloIds);

  const mapaModulos = new Map(
    ((modulos ?? []) as Record<string, unknown>[]).map((modulo) => [
      texto(modulo.id),
      modulo,
    ])
  );

  return aulas.map((aula) => ({
    ...aula,
    modulos: mapaModulos.get(texto(aula.modulo_id)) ?? null,
  }));
}

async function buscarMateriaisNasAulas(podeVerTudo: boolean) {
  const aulas = await buscarAulasComModulos();
  const materiais: BibliotecaItem[] = [];

  for (const aula of aulas) {
    const modulo = normalizarRelacao<Record<string, unknown>>(aula.modulos);

    if (!podeVerTudo && !moduloEstaLiberado(modulo)) {
      continue;
    }

    materiais.push(...(await extrairMateriaisDeArray(aula, modulo)));
    materiais.push(...(await extrairMaterialSimples(aula, modulo)));
  }

  return materiais;
}

async function buscarMapasAulasEModulos() {
  const { data: aulasData } = await supabase.from("aulas").select("*");
  const aulas = (aulasData ?? []) as Record<string, unknown>[];

  const moduloIds = Array.from(
    new Set(aulas.map((aula) => texto(aula.modulo_id)).filter(Boolean))
  );

  const { data: modulosData } =
    moduloIds.length > 0
      ? await supabase.from("modulos").select("*").in("id", moduloIds)
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
    const { data, error } = await supabase.from(tabela).select("*");

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
  const materiaisNasAulas = await buscarMateriaisNasAulas(podeVerTudo);
  const materiaisTabelasSeparadas = await buscarMateriaisEmTabelasSeparadas(podeVerTudo);

  const todos = [...materiaisNasAulas, ...materiaisTabelasSeparadas];

  const chaves = new Set<string>();

  return todos.filter((item) => {
    if (!item.url) return false;

    const chave = `${item.aula_id || "sem-aula"}-${item.url}`;

    if (chaves.has(chave)) return false;

    chaves.add(chave);
    return true;
  });
}

function normalizarArquivoBiblioteca(arquivo: Record<string, unknown>): BibliotecaItem {
  const url = texto(arquivo.url);

  return {
    id: texto(arquivo.id),
    mentorado_id: texto(arquivo.mentorado_id) || null,
    criado_por: texto(arquivo.criado_por) || null,
    nome: texto(arquivo.nome) || "Material",
    categoria: texto(arquivo.categoria) || "material",
    tipo: texto(arquivo.tipo) || tipoPorUrl(url),
    url,
    storage_path: texto(arquivo.storage_path) || null,
    tamanho_bytes: numero(arquivo.tamanho_bytes),
    observacao: texto(arquivo.observacao) || null,
    created_at: texto(arquivo.created_at) || new Date().toISOString(),
    updated_at: texto(arquivo.updated_at) || null,
    origem: "biblioteca",
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const mentoradoId = searchParams.get("mentoradoId");
    const perfil = searchParams.get("perfil");

    const podeVerTudo = ["mentor", "suporte", "financeiro"].includes(perfil ?? "");

    let query = supabase
      .from("biblioteca_arquivos")
      .select("*")
      .order("created_at", { ascending: false });

    if (mentoradoId && mentoradoId !== "todos") {
      query = query.eq("mentorado_id", mentoradoId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const arquivosBiblioteca = ((data ?? []) as Record<string, unknown>[])
      .map(normalizarArquivoBiblioteca)
      .filter((arquivo) => Boolean(arquivo.url));

    const materiaisAulas = await buscarMateriaisDasAulas(podeVerTudo);

    const arquivos = [...arquivosBiblioteca, ...materiaisAulas].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({
      ok: true,
      arquivos,
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
    const formData = await request.formData();

    const mentoradoId = texto(formData.get("mentoradoId"));
    const criadoPor = texto(formData.get("criadoPor"));
    const nome = texto(formData.get("nome"));
    const categoria = texto(formData.get("categoria")) || "material";
    const observacao = texto(formData.get("observacao"));
    const modo = texto(formData.get("modo")) || "arquivo";
    const urlInformada = texto(formData.get("url"));
    const arquivo = formData.get("arquivo");

    if (!mentoradoId) {
      return NextResponse.json(
        { ok: false, error: "Selecione o mentorado." },
        { status: 400 }
      );
    }

    if (!nome) {
      return NextResponse.json(
        { ok: false, error: "Informe o nome do material." },
        { status: 400 }
      );
    }

    let urlFinal = "";
    let storagePath: string | null = null;
    let tamanhoBytes: number | null = null;
    let tipo = "link";

    if (modo === "link") {
      if (!urlInformada) {
        return NextResponse.json(
          { ok: false, error: "Cole o link do material." },
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

      const nomeLimpo = limparNomeArquivo(arquivo.name || "arquivo");
      const caminho = `${mentoradoId}/${Date.now()}-${nomeLimpo}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_BIBLIOTECA)
        .upload(caminho, arquivo, {
          cacheControl: "3600",
          upsert: false,
          contentType: arquivo.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from(BUCKET_BIBLIOTECA)
        .getPublicUrl(caminho);

      urlFinal = publicData.publicUrl;
      storagePath = caminho;
      tamanhoBytes = arquivo.size;
      tipo = tipoPorArquivo(arquivo);
    }

    const { data, error } = await supabase
      .from("biblioteca_arquivos")
      .insert({
        mentorado_id: mentoradoId,
        criado_por: criadoPor || null,
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

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      arquivo: normalizarArquivoBiblioteca(data as Record<string, unknown>),
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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const id = texto(body?.id);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Informe o material que deseja remover." },
        { status: 400 }
      );
    }

    const { data: arquivo, error: buscaError } = await supabase
      .from("biblioteca_arquivos")
      .select("id, storage_path")
      .eq("id", id)
      .single();

    if (buscaError) throw buscaError;

    const storagePath = texto((arquivo as Record<string, unknown>)?.storage_path);

    const { error: deleteError } = await supabase
      .from("biblioteca_arquivos")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    if (storagePath) {
      await supabase.storage.from(BUCKET_BIBLIOTECA).remove([storagePath]);
    }

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