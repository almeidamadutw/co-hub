import { NextRequest, NextResponse } from "next/server";
import {
  criarClienteAdmin,
  criarClientePublico,
  erroConfig,
} from "@/utils/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MENSAGEM_GENERICA =
  "Se este e-mail estiver cadastrado no CEO Club, enviaremos as orientações de recuperação. Verifique também a caixa de spam.";
const INTERVALO_MINIMO_MS = 60_000;

type PerfilRecuperacao = {
  id: string;
  nome: string | null;
  email: string | null;
  role: string | null;
  trocas_senha: number | null;
  total_resets_senha: number | null;
  total_solicitacoes_senha: number | null;
  ultima_solicitacao_senha: string | null;
};

function respostaGenerica() {
  return NextResponse.json({ ok: true, mensagem: MENSAGEM_GENERICA });
}

function emailValido(email: string) {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function urlDeRedirecionamento(request: NextRequest) {
  const urlConfigurada =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  try {
    const origem = urlConfigurada
      ? new URL(urlConfigurada).origin
      : new URL(request.url).origin;

    return `${origem}/redefinir-senha`;
  } catch {
    return `${new URL(request.url).origin}/redefinir-senha`;
  }
}

function solicitacaoRecente(data: string | null) {
  if (!data) return false;

  const horario = new Date(data).getTime();
  return Number.isFinite(horario) && Date.now() - horario < INTERVALO_MINIMO_MS;
}

async function abrirTicketSeNecessario(perfil: PerfilRecuperacao) {
  const admin = criarClienteAdmin();

  const { data: ticketExistente } = await admin
    .from("suporte_tickets")
    .select("id")
    .eq("usuario_id", perfil.id)
    .eq("categoria", "Alteração de senha")
    .eq("status", "aberto")
    .limit(1)
    .maybeSingle();

  if (ticketExistente) return;

  const { error } = await admin.from("suporte_tickets").insert({
    usuario_id: perfil.id,
    nome_usuario: perfil.nome ?? "Usuário sem nome",
    email_usuario: perfil.email ?? "E-mail não informado",
    tipo_usuario: perfil.role ?? "mentorado",
    categoria: "Alteração de senha",
    assunto: "Solicitação de nova troca de senha",
    mensagem:
      "O usuário solicitou uma nova troca de senha após utilizar a recuperação automática. É necessária a liberação do suporte/T.I.",
    status: "aberto",
    prioridade: "media",
    origem: "sistema",
  });

  if (error) {
    console.error("Não foi possível registrar o ticket de senha:", error);
  }
}

export async function POST(request: NextRequest) {
  const erroConfiguracao = erroConfig();

  if (erroConfiguracao) {
    return NextResponse.json(
      { ok: false, error: erroConfiguracao },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!emailValido(email)) {
    return NextResponse.json(
      { ok: false, error: "Informe um e-mail válido." },
      { status: 400 }
    );
  }

  const admin = criarClienteAdmin();
  const { data: perfil, error: perfilError } = await admin
    .from("profiles")
    .select(
      "id, nome, email, role, trocas_senha, total_resets_senha, total_solicitacoes_senha, ultima_solicitacao_senha"
    )
    .ilike("email", email)
    .maybeSingle<PerfilRecuperacao>();

  if (perfilError) {
    console.error("Não foi possível consultar a recuperação de senha:", perfilError);
    return respostaGenerica();
  }

  if (!perfil) {
    const publico = criarClientePublico();
    await publico.auth.resetPasswordForEmail(email, {
      redirectTo: urlDeRedirecionamento(request),
    });
    return respostaGenerica();
  }

  if (solicitacaoRecente(perfil.ultima_solicitacao_senha)) {
    return respostaGenerica();
  }

  const agora = new Date().toISOString();
  const totalSolicitacoes = Number(perfil.total_solicitacoes_senha ?? 0);

  const { error: registroSolicitacaoError } = await admin
    .from("profiles")
    .update({
      total_solicitacoes_senha: totalSolicitacoes + 1,
      ultima_solicitacao_senha: agora,
    })
    .eq("id", perfil.id);

  if (registroSolicitacaoError) {
    console.error(
      "Não foi possível registrar a solicitação de senha:",
      registroSolicitacaoError
    );
  }

  if (Number(perfil.trocas_senha ?? 0) >= 1) {
    await abrirTicketSeNecessario(perfil);
    return respostaGenerica();
  }

  const publico = criarClientePublico();
  const { error: resetError } = await publico.auth.resetPasswordForEmail(email, {
    redirectTo: urlDeRedirecionamento(request),
  });

  if (resetError) {
    console.error("Não foi possível enviar a recuperação de senha:", resetError);
    return respostaGenerica();
  }

  const totalResets = Number(perfil.total_resets_senha ?? 0);
  const { error: registroEnvioError } = await admin
    .from("profiles")
    .update({ total_resets_senha: totalResets + 1 })
    .eq("id", perfil.id);

  if (registroEnvioError) {
    console.error(
      "Não foi possível registrar o envio da recuperação:",
      registroEnvioError
    );
  }

  return respostaGenerica();
}
