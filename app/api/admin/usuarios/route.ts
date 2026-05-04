import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type UserRole = "mentor" | "mentorado" | "modulos" | "financeiro" | "progresso";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

function erroConfig() {
  if (!supabaseUrl) return "NEXT_PUBLIC_SUPABASE_URL não configurada.";
  if (!publishableKey) return "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não configurada.";
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

  const { data, error } = await admin
    .from("profiles")
    .select("id, nome, email, role, telefone, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ usuarios: data ?? [] });
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

  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").toLowerCase().trim();
  const senha = String(body.senha ?? "").trim();
  const role = String(body.role ?? "mentorado") as UserRole;
  const telefone = String(body.telefone ?? "").trim();

  if (!nome || !email || !senha) {
    return NextResponse.json(
      { error: "Preencha nome, e-mail e senha temporária." },
      { status: 400 }
    );
  }

  if (!["mentor", "mentorado", "modulos", "financeiro", "progresso"].includes(role)) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  }

  const admin = criarClienteAdmin();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome,
        role,
      },
    });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Não foi possível criar o usuário." },
      { status: 400 }
    );
  }

  const { data: perfil, error: perfilError } = await admin
    .from("profiles")
    .upsert({
      id: authData.user.id,
      nome,
      email,
      role,
      telefone: telefone || null,
      status: "Ativo",
    })
    .select("id, nome, email, role, telefone, status, created_at")
    .single();

  if (perfilError) {
    return NextResponse.json({ error: perfilError.message }, { status: 500 });
  }

  return NextResponse.json({ usuario: perfil });
}