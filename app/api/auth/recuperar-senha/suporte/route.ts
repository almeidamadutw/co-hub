import { NextRequest, NextResponse } from "next/server";
import {
  erroConfig,
  responderPermissaoNegada,
  verificarAcesso,
} from "@/utils/apiAuth";
import {
  enviarLinkRecuperacao,
  reservarRecuperacaoSenha,
} from "@/utils/passwordRecoveryServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  );
}

export async function POST(request: NextRequest) {
  const configuracao = erroConfig();

  if (configuracao) {
    return NextResponse.json(
      { ok: false, error: configuracao },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const permissao = await verificarAcesso(request, ["suporte"]);
  if (!permissao.ok) return responderPermissaoNegada(permissao);

  const body = await request.json().catch(() => null);
  const profileId = String(body?.profileId ?? "").trim();

  if (!uuidValido(profileId)) {
    return NextResponse.json(
      { ok: false, error: "Usuário inválido." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  try {
    const reserva = await reservarRecuperacaoSenha({
      profileId,
      origem: "suporte",
      actorId: permissao.userId,
    });

    if (reserva.acao === "aguardar") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Já existe um envio em processamento para este usuário. Aguarde alguns instantes.",
        },
        { status: 409, headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (reserva.acao !== "enviar") {
      return NextResponse.json(
        { ok: false, error: "Não foi possível liberar este usuário agora." },
        { status: 400, headers: { "Cache-Control": "private, no-store" } }
      );
    }

    await enviarLinkRecuperacao(reserva, request);

    return NextResponse.json(
      {
        ok: true,
        mensagem: "Novo link liberado, enviado e registrado no histórico.",
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error(
      "Falha na liberação de recuperação pelo Suporte:",
      error instanceof Error ? error.message : "erro desconhecido"
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Não foi possível enviar o link. A liberação foi revertida para não perder o controle do histórico.",
      },
      { status: 502, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
