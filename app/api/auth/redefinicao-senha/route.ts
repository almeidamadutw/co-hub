import { NextRequest, NextResponse } from "next/server";
import {
  criarClienteAdmin,
  erroConfig,
  responderPermissaoNegada,
  verificarAcesso,
} from "@/utils/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES_AUTENTICADAS = [
  "mentor",
  "mentorado",
  "financeiro",
  "suporte",
] as const;

async function obterPermissao(request: NextRequest) {
  return verificarAcesso(request, [...ROLES_AUTENTICADAS]);
}

export async function GET(request: NextRequest) {
  const erroConfiguracao = erroConfig();

  if (erroConfiguracao) {
    return NextResponse.json(
      { ok: false, error: erroConfiguracao },
      { status: 500 }
    );
  }

  const permissao = await obterPermissao(request);

  if (!permissao.ok) {
    return responderPermissaoNegada(permissao);
  }

  const admin = criarClienteAdmin();
  const { data: perfil, error } = await admin
    .from("profiles")
    .select("trocas_senha")
    .eq("id", permissao.userId)
    .single();

  if (error || !perfil) {
    return NextResponse.json(
      { ok: false, error: "Não foi possível validar esta troca de senha." },
      { status: 500 }
    );
  }

  if (Number(perfil.trocas_senha ?? 0) >= 1) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Essa troca de senha já foi utilizada. Solicite uma nova liberação ao suporte.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const erroConfiguracao = erroConfig();

  if (erroConfiguracao) {
    return NextResponse.json(
      { ok: false, error: erroConfiguracao },
      { status: 500 }
    );
  }

  const permissao = await obterPermissao(request);

  if (!permissao.ok) {
    return responderPermissaoNegada(permissao);
  }

  const admin = criarClienteAdmin();
  const { data: perfil, error: perfilError } = await admin
    .from("profiles")
    .select("trocas_senha")
    .eq("id", permissao.userId)
    .single();

  if (perfilError || !perfil) {
    return NextResponse.json(
      { ok: false, error: "Não foi possível registrar esta troca de senha." },
      { status: 500 }
    );
  }

  const trocasAtuais = Number(perfil.trocas_senha ?? 0);

  if (trocasAtuais >= 1) {
    return NextResponse.json({ ok: true, jaRegistrada: true });
  }

  const agora = new Date().toISOString();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      trocas_senha: trocasAtuais + 1,
      ultima_troca_senha: agora,
      updated_at: agora,
    })
    .eq("id", permissao.userId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: "A senha mudou, mas o histórico não foi registrado." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
