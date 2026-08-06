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

type ValidacaoRecuperacao = {
  valida: boolean;
  solicitacao_id: string | null;
};

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  );
}

function senhaValida(senha: string) {
  return (
    senha.length >= 8 &&
    senha.length <= 128 &&
    /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(senha) &&
    /\d/.test(senha)
  );
}

function respostaSemCache(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function obterPermissao(request: NextRequest) {
  return verificarAcesso(request, [...ROLES_AUTENTICADAS]);
}

async function validarRecuperacao(profileId: string) {
  const admin = criarClienteAdmin();
  const { data, error } = await admin.rpc("recuperacao_senha_validar", {
    p_profile_id: profileId,
  });

  if (error) {
    throw new Error(error.message || "Não foi possível validar a recuperação.");
  }

  return (Array.isArray(data) ? data[0] : data) as
    | ValidacaoRecuperacao
    | null;
}

export async function GET(request: NextRequest) {
  const configuracao = erroConfig();

  if (configuracao) {
    return respostaSemCache({ ok: false, error: configuracao }, 500);
  }

  const permissao = await obterPermissao(request);

  if (!permissao.ok) {
    return responderPermissaoNegada(permissao);
  }

  try {
    const validacao = await validarRecuperacao(permissao.userId);

    if (!validacao?.valida || !validacao.solicitacao_id) {
      return respostaSemCache(
        {
          ok: false,
          error:
            "Esse link não corresponde a uma recuperação ativa. Solicite um novo link.",
        },
        403
      );
    }

    return respostaSemCache({
      ok: true,
      solicitacaoId: validacao.solicitacao_id,
    });
  } catch (error) {
    console.error(
      "Falha ao validar recuperação de senha:",
      error instanceof Error ? error.message : "erro desconhecido"
    );

    return respostaSemCache(
      { ok: false, error: "Não foi possível validar esta recuperação." },
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const configuracao = erroConfig();

  if (configuracao) {
    return respostaSemCache({ ok: false, error: configuracao }, 500);
  }

  const permissao = await obterPermissao(request);

  if (!permissao.ok) {
    return responderPermissaoNegada(permissao);
  }

  const body = await request.json().catch(() => null);
  const solicitacaoId = String(body?.solicitacaoId ?? "").trim();
  const novaSenha = typeof body?.novaSenha === "string" ? body.novaSenha : "";

  if (!uuidValido(solicitacaoId)) {
    return respostaSemCache(
      { ok: false, error: "A solicitação de recuperação é inválida." },
      400
    );
  }

  if (!senhaValida(novaSenha)) {
    return respostaSemCache(
      {
        ok: false,
        error:
          "Use uma senha de 8 a 128 caracteres, com pelo menos uma letra e um número.",
      },
      400
    );
  }

  try {
    const validacao = await validarRecuperacao(permissao.userId);

    if (
      !validacao?.valida ||
      validacao.solicitacao_id !== solicitacaoId
    ) {
      return respostaSemCache(
        {
          ok: false,
          error:
            "Essa recuperação expirou ou já foi utilizada. Solicite um novo link.",
        },
        403
      );
    }

    const admin = criarClienteAdmin();
    const { error: senhaError } = await admin.auth.admin.updateUserById(
      permissao.userId,
      { password: novaSenha }
    );

    if (senhaError) {
      const codigo = String(senhaError.code ?? "").toLowerCase();
      const mensagem = senhaError.message.toLowerCase();

      if (
        codigo.includes("weak_password") ||
        mensagem.includes("password") ||
        mensagem.includes("senha")
      ) {
        return respostaSemCache(
          {
            ok: false,
            error:
              "Essa senha não atende aos requisitos de segurança. Escolha uma combinação diferente.",
          },
          400
        );
      }

      throw new Error(senhaError.message);
    }

    const { data: concluida, error: conclusaoError } = await admin.rpc(
      "recuperacao_senha_concluir",
      {
        p_profile_id: permissao.userId,
        p_solicitacao_id: solicitacaoId,
      }
    );

    if (conclusaoError || concluida !== true) {
      console.error(
        "Senha alterada sem conclusão do histórico:",
        conclusaoError?.message ?? "retorno inválido"
      );

      return respostaSemCache({
        ok: true,
        historicoRegistrado: false,
        mensagem:
          "Senha redefinida com sucesso. O registro de auditoria precisará ser conferido pelo Suporte.",
      });
    }

    return respostaSemCache({
      ok: true,
      historicoRegistrado: true,
      mensagem: "Senha redefinida com sucesso.",
    });
  } catch (error) {
    console.error(
      "Falha ao redefinir senha:",
      error instanceof Error ? error.message : "erro desconhecido"
    );

    return respostaSemCache(
      {
        ok: false,
        error:
          "Não foi possível redefinir a senha agora. Solicite um novo link e tente novamente.",
      },
      500
    );
  }
}
