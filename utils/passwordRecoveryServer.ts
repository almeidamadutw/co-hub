import "server-only";

import type { NextRequest } from "next/server";
import { criarClienteAdmin, criarClientePublico } from "@/utils/apiAuth";

export type ReservaRecuperacaoSenha = {
  acao: "enviar" | "aguardar" | "bloqueado" | "ignorar";
  solicitacao_id: string | null;
  profile_id: string | null;
  email: string | null;
  nome: string | null;
  role: string | null;
};

type FinalizacaoRecuperacaoSenha = {
  profile_id: string;
  origem: "automatico" | "suporte";
  estado: "enviado" | "falhou" | "reservado" | "concluido" | "expirado";
};

const ORIGEM_PRODUCAO = "https://ceoclubmentoria.app.br";

function origemConfigurada() {
  const valor =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (!valor) return null;

  try {
    const url = new URL(valor);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (url.protocol !== "https:" && !local) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function urlRedefinicaoSenha(request?: NextRequest) {
  const configurada = origemConfigurada();
  if (configurada) return `${configurada}/redefinir-senha`;

  if (process.env.NODE_ENV !== "production" && request) {
    const host = request.nextUrl.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return `${request.nextUrl.origin}/redefinir-senha`;
    }
  }

  return `${ORIGEM_PRODUCAO}/redefinir-senha`;
}

export async function reservarRecuperacaoSenha(params: {
  email?: string;
  profileId?: string;
  origem: "automatico" | "suporte";
  actorId?: string;
}) {
  const admin = criarClienteAdmin();
  const { data, error } = await admin.rpc("recuperacao_senha_reservar", {
    p_profile_id: params.profileId ?? null,
    p_email: params.email ?? null,
    p_origem: params.origem,
    p_actor_id: params.actorId ?? null,
  });

  if (error) {
    throw new Error(error.message || "Não foi possível reservar a recuperação.");
  }

  const reserva = (Array.isArray(data) ? data[0] : data) as
    | ReservaRecuperacaoSenha
    | null;

  if (!reserva?.acao) {
    throw new Error("A reserva de recuperação não retornou um estado válido.");
  }

  return reserva;
}

async function finalizarEnvio(
  solicitacaoId: string,
  sucesso: boolean,
  erroCodigo?: string
) {
  const admin = criarClienteAdmin();
  const { data, error } = await admin.rpc(
    "recuperacao_senha_finalizar_envio",
    {
      p_solicitacao_id: solicitacaoId,
      p_sucesso: sucesso,
      p_erro_codigo: erroCodigo ?? null,
    }
  );

  if (error) {
    throw new Error(
      error.message || "Não foi possível finalizar o envio da recuperação."
    );
  }

  return (Array.isArray(data) ? data[0] : data) as
    | FinalizacaoRecuperacaoSenha
    | null;
}

function codigoSeguro(error: { code?: string; status?: number } | null) {
  if (!error) return undefined;
  if (error.code) return String(error.code).slice(0, 120);
  if (error.status) return `auth_${error.status}`;
  return "auth_envio_falhou";
}

export async function enviarLinkRecuperacao(
  reserva: ReservaRecuperacaoSenha,
  request?: NextRequest
) {
  if (
    reserva.acao !== "enviar" ||
    !reserva.solicitacao_id ||
    !reserva.email
  ) {
    throw new Error("A recuperação não está pronta para envio.");
  }

  const publico = criarClientePublico();
  const { error } = await publico.auth.resetPasswordForEmail(reserva.email, {
    redirectTo: urlRedefinicaoSenha(request),
  });

  try {
    await finalizarEnvio(
      reserva.solicitacao_id,
      !error,
      codigoSeguro(error)
    );
  } catch (finalizacaoError) {
    console.error(
      "Falha ao finalizar reserva de recuperação:",
      finalizacaoError instanceof Error
        ? finalizacaoError.message
        : "erro desconhecido"
    );

    if (!error) {
      throw new Error(
        "O e-mail foi solicitado, mas a auditoria da recuperação não foi finalizada."
      );
    }
  }

  if (error) {
    throw new Error("O provedor não aceitou o envio do e-mail de recuperação.");
  }
}
