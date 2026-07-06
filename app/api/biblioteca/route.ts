import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";

const BUCKET_BIBLIOTECA = "ceo-club-biblioteca";
const LIMITE_UPLOAD_BYTES = 25 * 1024 * 1024;

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
];

const CAMPOS_URL_MATERIAL = [
  "arquivo_url",
  "material_url",
  "url_material",
  "pdf_url",
  "video_url",
  "link_material",
  "link_url",
  "documento_url",
  "anexo_url",
  "url",
];

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
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
    urlLower.includes(".mov")
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

  const statusBloqueados = ["bloqueado", "bloqueada", "rascunho", "oculto", "oculta", "inativo"];
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

function extrairMateriaisDeArray(
  aula: Record<string, unknown>,
  modulo: Record<string, unknown> | null
): BibliotecaItem[] {
  const itens: BibliotecaItem[] = [];
  const aulaId = texto(aula.id);
  const moduloId = texto(aula.modulo_id) || texto(modulo?.id);
  const aulaNome = nomeAula(aula);
  const moduloNome = nomeModulo(modulo);

  for (const campo of CAMPOS_LISTA_MATERIAIS) {
    const valorBruto = tentarParseJson(aula[campo]);

    if (!Array.isArray(valorBruto)) continue;

    valorBruto.forEach((itemBruto, index) => {
      if (typeof itemBruto === "string") {
        const url = itemBruto.trim();

        if (!url) return;

        itens.push({
          id: `aula-${aulaId}-${campo}-${index}`,
          nome: `Material - ${aulaNome}`,
          categoria: "material",
          tipo: tipoPorUrl(url),
          url,
          storage_path: null,
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

        return;
      }

      if (!itemBruto || typeof itemBruto !== "object") return;

      const item = itemBruto as Record<string, unknown>;

      const url =
        pegarPrimeiroTexto(item, [
          "url",
          "arquivo_url",
          "material_url",
          "link",
          "href",
          "src",
          "publicUrl",
          "public_url",
        ]) || "";

      if (!url) return;

      const nome =
        pegarPrimeiroTexto(item, ["nome", "titulo", "title", "label", "filename"]) ||
        `Material - ${aulaNome}`;

      itens.push({
        id: `aula-${aulaId}-${campo}-${index}`,
        nome,
        categoria: texto(item.categoria) || "material",
        tipo: tipoPorUrl(url, texto(item.tipo)),
        url,
        storage_path: texto(item.storage_path) || null,
        tamanho_bytes: Number(item.tamanho_bytes || item.size || item.bytes) || null,
        observacao: texto(item.observacao) || texto(item.descricao) || null,
        created_at: texto(item.created_at) || texto(aula.created_at) || new Date().toISOString(),
        updated_at: texto(item.updated_at) || texto(aula.updated_at) || null,
        origem: "aula",
        modulo_id: moduloId || null,
        modulo_nome: moduloNome,
        aula_id: aulaId || null,
        aula_nome: aulaNome,
      });
    });
  }

  return itens;
}

function extrairMaterialSimples(
  aula: Record<string, unknown>,
  modulo: Record<string, unknown> | null
): BibliotecaItem[] {
  const itens: BibliotecaItem[] = [];
  const aulaId = texto(aula.id);
  const moduloId = texto(aula.modulo_id) || texto(modulo?.id);
  const aulaNome = nomeAula(aula);
  const moduloNome = nomeModulo(modulo);

  const urlsJaUsadas = new Set<string>();

  for (const campo of CAMPOS_URL_MATERIAL) {
    const url = texto(aula[campo]);

    if (!url || urlsJaUsadas.has(url)) continue;

    urlsJaUsadas.add(url);

    const nome =
      texto(aula.material_nome) ||
      texto(aula.arquivo_nome) ||
      texto(aula.nome_material) ||
      `Material - ${aulaNome}`;

    itens.push({
      id: `aula-${aulaId}-${campo}`,
      nome,
      categoria: texto(aula.categoria_material) || "material",
      tipo: tipoPorUrl(url, texto(aula.tipo_material) || texto(aula.tipo)),
      url,
      storage_path: texto(aula.storage_path) || texto(aula.arquivo_storage_path) || null,
      tamanho_bytes: Number(aula.tamanho_bytes || aula.arquivo_tamanho_bytes) || null,
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

  const tentativaSimples = await supabase
    .from("aulas")
    .select("*")
    .order("created_at", { ascending: false });

  const aulas = (tentativaSimples.data ?? []) as Record<string, unknown>[];

  const moduloIds = Array.from(
    new Set(aulas.map((aula) => texto(aula.modulo_id)).filter(Boolean))
  );

  if (moduloIds.length === 0) return aulas;

  const { data: modulos } = await supabase
    .from("modulos")
    .select("*")
    .in("id", moduloIds);

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

async function buscarMateriaisDasAulas(podeVerTudo: boolean) {
  const aulas = await buscarAulasComModulos();
  const materiais: BibliotecaItem[] = [];

  for (const aula of aulas) {
    const modulo = normalizarRelacao<Record<string, unknown>>(aula.modulos);

    if (!podeVerTudo && !moduloEstaLiberado(modulo)) {
      continue;
    }

    materiais.push(...extrairMateriaisDeArray(aula, modulo));
    materiais.push(...extrairMaterialSimples(aula, modulo));
  }

  const urls = new Set<string>();

  return materiais.filter((item) => {
    if (!item.url) return false;

    const chave = `${item.aula_id}-${item.url}`;

    if (urls.has(chave)) return false;

    urls.add(chave);
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
    tamanho_bytes: Number(arquivo.tamanho_bytes) || null,
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
