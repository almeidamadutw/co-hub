import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export type UserRole = "mentor" | "mentorado" | "financeiro" | "suporte";

type PermissaoNegada = {
  ok: false;
  status: 401 | 403;
  mensagem: string;
};

type PermissaoLiberada = {
  ok: true;
  userId: string;
  role: UserRole;
};

export type Permissao = PermissaoNegada | PermissaoLiberada;

const rolesValidas: UserRole[] = [
  "mentor",
  "mentorado",
  "financeiro",
  "suporte",
];

function obterConfig() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    secretKey:
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function erroConfig() {
  const { supabaseUrl, publishableKey, secretKey } = obterConfig();

  if (!supabaseUrl) return "NEXT_PUBLIC_SUPABASE_URL não configurada.";

  if (!publishableKey) {
    return "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.";
  }

  if (!secretKey) {
    return "SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY não configurada.";
  }

  return "";
}

export function criarClientePublico(token?: string) {
  const { supabaseUrl, publishableKey } = obterConfig();

  if (!supabaseUrl || !publishableKey) {
    throw new Error(erroConfig());
  }

  return createClient(supabaseUrl!, publishableKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
}

export function criarClienteAdmin() {
  const { supabaseUrl, secretKey } = obterConfig();

  if (!supabaseUrl || !secretKey) {
    throw new Error(erroConfig());
  }

  return createClient(supabaseUrl!, secretKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function extrairToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() ?? "";
}

function normalizarRole(role: unknown): UserRole | null {
  const valor = String(role ?? "").trim().toLowerCase();

  if (rolesValidas.includes(valor as UserRole)) {
    return valor as UserRole;
  }

  return null;
}

function statusImpedeAcesso(status: unknown) {
  const valor = String(status ?? "").trim().toLowerCase();

  // Perfis legados sem status continuam válidos; qualquer status preenchido
  // precisa representar um usuário ativo.
  return Boolean(valor) && valor !== "ativo";
}

export async function verificarAcesso(
  req: NextRequest,
  rolesPermitidas: UserRole[]
): Promise<Permissao> {
  const token = extrairToken(req);

  if (!token) {
    return {
      ok: false,
      status: 401,
      mensagem: "Sessão não encontrada.",
    };
  }

  const supabasePublico = criarClientePublico(token);

  const { data: userData, error: userError } =
    await supabasePublico.auth.getUser(token);

  if (userError || !userData.user) {
    return {
      ok: false,
      status: 401,
      mensagem: "Usuário não autenticado.",
    };
  }

  const admin = criarClienteAdmin();

  const { data: perfil, error: perfilError } = await admin
    .from("profiles")
    .select("role, status")
    .eq("id", userData.user.id)
    .single();

  if (perfilError || !perfil) {
    return {
      ok: false,
      status: 403,
      mensagem: "Perfil não encontrado.",
    };
  }

  const role = normalizarRole(perfil.role);

  if (!role || !rolesPermitidas.includes(role)) {
    return {
      ok: false,
      status: 403,
      mensagem: "Você não tem permissão para acessar este recurso.",
    };
  }

  if (statusImpedeAcesso(perfil.status)) {
    return {
      ok: false,
      status: 403,
      mensagem: "Usuário inativo ou pendente.",
    };
  }

  return {
    ok: true,
    userId: userData.user.id,
    role,
  };
}

export function responderPermissaoNegada(permissao: PermissaoNegada) {
  return NextResponse.json(
    { error: permissao.mensagem },
    { status: permissao.status }
  );
}
