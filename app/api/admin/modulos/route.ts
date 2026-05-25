import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type LiberacaoModulo = "manual" | "imediata" | "bloqueada";
type TipoAula = "obrigatoria" | "complementar";

type ModulePayload = {
  titulo?: string;
  subtitulo?: string;
  descricao?: string;
  objetivo?: string;
  aprendizado?: string;
  capa_url?: string;
  categoria?: string;
  ordem?: number;
  publicado?: boolean;
  liberacao?: LiberacaoModulo;
};

type LessonPayload = {
  module_id?: string;
  titulo?: string;
  descricao?: string;
  video_url?: string;
  material_url?: string;
  duracao?: string;
  ordem?: number;
  publicado?: boolean;
  tipo?: TipoAula;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

function erroConfig() {
  if (!supabaseUrl) return "NEXT_PUBLIC_SUPABASE_URL não configurada.";
  if (!publishableKey) {
    return "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não configurada.";
  }
  if (!secretKey) return "SUPABASE_SECRET_KEY não configurada.";
  return "";
}

function criarClientePublico(token?: string) {
  return createClient(supabaseUrl!, publishableKey!, {
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
}

function criarClienteAdmin() {
  return createClient(supabaseUrl!, secretKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verificarMentor(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return {
      ok: false,
      mensagem: "Sessão não encontrada.",
    };
  }

  const supabasePublico = criarClientePublico(token);

  const { data: userData, error: userError } =
    await supabasePublico.auth.getUser(token);

  if (userError || !userData.user) {
    return {
      ok: false,
      mensagem: "Usuário não autenticado.",
    };
  }

  const admin = criarClienteAdmin();

  const { data: perfil, error: perfilError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (perfilError || perfil?.role !== "mentor") {
    return {
      ok: false,
      mensagem: "Acesso permitido apenas para mentora.",
    };
  }

  return {
    ok: true,
    mensagem: "",
  };
}

export async function GET(req: NextRequest) {
  const config = erroConfig();

  if (config) {
    return NextResponse.json({ error: config }, { status: 500 });
  }

  const permissao = await verificarMentor(req);

  if (!permissao.ok) {
    return NextResponse.json({ error: permissao.mensagem }, { status: 401 });
  }

  const admin = criarClienteAdmin();

  const { data: modules, error } = await admin
    .from("modules")
    .select(
      `
      id,
      titulo,
      subtitulo,
      descricao,
      objetivo,
      aprendizado,
      capa_url,
      categoria,
      liberacao,
      ordem,
      publicado,
      created_at,
      atualizado_em,
      lessons (
        id,
        module_id,
        titulo,
        descricao,
        video_url,
        material_url,
        duracao,
        tipo,
        ordem,
        publicado,
        created_at,
        atualizado_em
      )
    `
    )
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const modulosOrdenados = (modules ?? []).map((modulo) => ({
    ...modulo,
    lessons: [...(modulo.lessons ?? [])].sort((a, b) => {
      if ((a.ordem ?? 0) !== (b.ordem ?? 0)) {
        return (a.ordem ?? 0) - (b.ordem ?? 0);
      }

      return String(a.created_at).localeCompare(String(b.created_at));
    }),
  }));

  return NextResponse.json({ modulos: modulosOrdenados });
}

export async function POST(req: NextRequest) {
  const config = erroConfig();

  if (config) {
    return NextResponse.json({ error: config }, { status: 500 });
  }

  const permissao = await verificarMentor(req);

  if (!permissao.ok) {
    return NextResponse.json({ error: permissao.mensagem }, { status: 401 });
  }

  const body = await req.json();
  const tipo = String(body.tipo ?? "");

  const admin = criarClienteAdmin();

  if (tipo === "modulo") {
    const payload = body.modulo as ModulePayload;

    const titulo = String(payload?.titulo ?? "").trim();
    const subtitulo = String(payload?.subtitulo ?? "").trim();
    const descricao = String(payload?.descricao ?? "").trim();
    const objetivo = String(payload?.objetivo ?? "").trim();
    const aprendizado = String(payload?.aprendizado ?? "").trim();
    const capa_url = String(payload?.capa_url ?? "").trim();
    const categoria = String(payload?.categoria ?? "").trim();
    const ordem = Number(payload?.ordem ?? 0);
    const publicado = Boolean(payload?.publicado ?? false);
    const liberacao = payload?.liberacao ?? "manual";

    if (!titulo) {
      return NextResponse.json(
        { error: "Informe o título do módulo." },
        { status: 400 }
      );
    }

    if (!["manual", "imediata", "bloqueada"].includes(liberacao)) {
      return NextResponse.json(
        { error: "Tipo de liberação inválido." },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("modules")
      .insert({
        titulo,
        subtitulo: subtitulo || null,
        descricao: descricao || null,
        objetivo: objetivo || null,
        aprendizado: aprendizado || null,
        capa_url: capa_url || null,
        categoria: categoria || null,
        ordem,
        publicado,
        liberacao,
        atualizado_em: new Date().toISOString(),
      })
      .select(
        `
        id,
        titulo,
        subtitulo,
        descricao,
        objetivo,
        aprendizado,
        capa_url,
        categoria,
        liberacao,
        ordem,
        publicado,
        created_at,
        atualizado_em
      `
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ modulo: { ...data, lessons: [] } });
  }

  if (tipo === "aula") {
    const payload = body.aula as LessonPayload;

    const module_id = String(payload?.module_id ?? "").trim();
    const titulo = String(payload?.titulo ?? "").trim();
    const descricao = String(payload?.descricao ?? "").trim();
    const video_url = String(payload?.video_url ?? "").trim();
    const material_url = String(payload?.material_url ?? "").trim();
    const duracao = String(payload?.duracao ?? "").trim();
    const ordem = Number(payload?.ordem ?? 0);
    const publicado = Boolean(payload?.publicado ?? false);
    const tipoAula = payload?.tipo ?? "obrigatoria";

    if (!module_id || !titulo) {
      return NextResponse.json(
        { error: "Informe o módulo e o título da aula." },
        { status: 400 }
      );
    }

    if (!["obrigatoria", "complementar"].includes(tipoAula)) {
      return NextResponse.json(
        { error: "Tipo de aula inválido." },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("lessons")
      .insert({
        module_id,
        titulo,
        descricao: descricao || null,
        video_url: video_url || null,
        material_url: material_url || null,
        duracao: duracao || null,
        ordem,
        publicado,
        tipo: tipoAula,
        atualizado_em: new Date().toISOString(),
      })
      .select(
        `
        id,
        module_id,
        titulo,
        descricao,
        video_url,
        material_url,
        duracao,
        tipo,
        ordem,
        publicado,
        created_at,
        atualizado_em
      `
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ aula: data });
  }

  return NextResponse.json(
    { error: "Tipo de cadastro inválido." },
    { status: 400 }
  );
}

export async function PATCH(req: NextRequest) {
  const config = erroConfig();

  if (config) {
    return NextResponse.json({ error: config }, { status: 500 });
  }

  const permissao = await verificarMentor(req);

  if (!permissao.ok) {
    return NextResponse.json({ error: permissao.mensagem }, { status: 401 });
  }

  const body = await req.json();
  const tipo = String(body.tipo ?? "");
  const id = String(body.id ?? "");

  if (!id) {
    return NextResponse.json({ error: "ID não informado." }, { status: 400 });
  }

  const admin = criarClienteAdmin();

  if (tipo === "modulo") {
    const publicado = Boolean(body.publicado ?? false);

    const { data, error } = await admin
      .from("modules")
      .update({
        publicado,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        id,
        titulo,
        subtitulo,
        descricao,
        objetivo,
        aprendizado,
        capa_url,
        categoria,
        liberacao,
        ordem,
        publicado,
        created_at,
        atualizado_em
      `
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ modulo: data });
  }

  if (tipo === "aula") {
    const publicado = Boolean(body.publicado ?? false);

    const { data, error } = await admin
      .from("lessons")
      .update({
        publicado,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        id,
        module_id,
        titulo,
        descricao,
        video_url,
        material_url,
        duracao,
        tipo,
        ordem,
        publicado,
        created_at,
        atualizado_em
      `
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ aula: data });
  }

  return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
}