import "server-only";
import { createHmac } from "node:crypto";
import { criarClienteAdmin } from "@/utils/apiAuth";

export function assinaturaDoCodigo(profileId: string, codigo: string) {
  const chave = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("Configuração do suporte indisponível.");
  return createHmac("sha256", chave).update(`codigo-ceo:${profileId}:${codigo}`).digest("hex");
}

export async function gerarCodigo(profileId: string, actorId: string) {
  const admin = criarClienteAdmin();
  const reserva = await admin.rpc("recuperacao_senha_reservar", {
    p_profile_id: profileId, p_email: null, p_origem: "suporte", p_actor_id: actorId,
  });
  const item = reserva.data?.[0];
  if (reserva.error || item?.acao !== "enviar") {
    throw new Error("Não foi possível liberar o código. Confira se a conta está ativa ou tente novamente em instantes.");
  }

  // O endereço deve vir da identidade autenticável do ID autorizado.
  const identidade = await admin.auth.admin.getUserById(profileId);
  const email = identidade.data.user?.email;
  let codigo: string | undefined;
  if (email && email === item.email) {
    const { data } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (data.user?.id === profileId) codigo = data.properties?.email_otp;
  }

  if (codigo) {
    const registro = await admin.rpc("registrar_codigo_suporte", {
      p_pedido: item.solicitacao_id, p_assinatura: assinaturaDoCodigo(profileId, codigo),
    });
    if (registro.error || !registro.data) codigo = undefined;
  }

  const fim = await admin.rpc("recuperacao_senha_finalizar_envio", {
    p_solicitacao_id: item.solicitacao_id, p_sucesso: Boolean(codigo),
    p_erro_codigo: codigo ? null : "codigo_nao_gerado",
  });
  if (!codigo || fim.error || fim.data?.[0]?.estado !== "enviado") {
    throw new Error("Não foi possível gerar o código. Solicite uma nova emissão.");
  }
  return codigo;
}
