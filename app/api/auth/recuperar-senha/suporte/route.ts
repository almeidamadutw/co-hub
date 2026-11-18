import { NextRequest, NextResponse } from "next/server";
import {
  erroConfig,
  responderPermissaoNegada,
  verificarAcesso,
} from "@/utils/apiAuth";
import { gerarCodigo } from "@/utils/passwordRecoveryServer";

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
    const codigo = await gerarCodigo(profileId, permissao.userId);
    return NextResponse.json({ ok: true, codigo }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Confira se a conta está ativa e tente gerar o código novamente." }, { status: 409 });
  }
}
