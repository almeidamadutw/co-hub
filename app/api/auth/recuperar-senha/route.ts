import { NextRequest, NextResponse } from "next/server";
import { erroConfig } from "@/utils/apiAuth";
import {
  enviarLinkRecuperacao,
  reservarRecuperacaoSenha,
} from "@/utils/passwordRecoveryServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MENSAGEM_GENERICA =
  "Se este e-mail estiver cadastrado no CEO Club, enviaremos um link ou encaminharemos a solicitação ao Suporte. Verifique também a caixa de spam.";

function respostaGenerica() {
  return NextResponse.json(
    { ok: true, mensagem: MENSAGEM_GENERICA },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

function emailValido(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const configuracao = erroConfig();

  if (configuracao) {
    return NextResponse.json(
      { ok: false, error: configuracao },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!emailValido(email)) {
    return NextResponse.json(
      { ok: false, error: "Informe um e-mail válido." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  try {
    const reserva = await reservarRecuperacaoSenha({
      email,
      origem: "automatico",
    });

    if (reserva.acao === "enviar") {
      await enviarLinkRecuperacao(reserva, request);
    }
  } catch (error) {
    console.error(
      "Falha no fluxo público de recuperação:",
      error instanceof Error ? error.message : "erro desconhecido"
    );
  }

  return respostaGenerica();
}
