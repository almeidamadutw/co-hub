import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin, criarClientePublico } from "@/utils/apiAuth";
import { assinaturaDoCodigo } from "@/utils/passwordRecoveryServer";
import { emailDoLogin } from "@/utils/loginCEO";

function resposta(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = emailDoLogin(String(body?.login ?? ""));
  const codigo = String(body?.codigo ?? "").trim();
  const senha = typeof body?.senha === "string" ? body.senha : "";
  if (!email || !/^\d{6,10}$/.test(codigo)) {
    return resposta({ error: "Confira o login e o código recebido do suporte." }, 400);
  }
  if (senha !== senha.trim() || senha.length < 8 || senha.length > 128 || !/\p{L}/u.test(senha) || !/\d/.test(senha)) {
    return resposta({ error: "Use de 8 a 128 caracteres com letra e número, sem espaços nas pontas." }, 400);
  }

  const cliente = criarClientePublico();
  const { data, error } = await cliente.auth.verifyOtp({ email, token: codigo, type: "recovery" });
  if (error || !data.user || !data.session) {
    return resposta({ error: "Código inválido ou expirado. Confira o código mais recente ou solicite outro." }, 400);
  }

  try {
    const id = data.user.id;
    const admin = criarClienteAdmin();
    const { data: perfil } = await admin.from("profiles").select("status").eq("id", id).is("excluido_em", null).maybeSingle();
    const { data: pedido } = await admin.rpc("pedido_do_codigo", {
      p_perfil: id, p_assinatura: assinaturaDoCodigo(id, codigo),
    });
    if (!perfil || (perfil.status && perfil.status.toLowerCase() !== "ativo") || !pedido) {
      return resposta({ error: "Solicite uma nova liberação ao suporte." }, 403);
    }
    const alteracao = await cliente.auth.updateUser({ password: senha });
    if (alteracao.error) return resposta({ error: "A senha foi recusada. Solicite outro código e escolha uma senha diferente." }, 400);
    const registro = await admin.rpc("concluir_troca_por_codigo", { p_perfil: id, p_pedido: pedido });
    if (registro.error || !registro.data) console.error("Falha ao registrar conclusão da troca por código", pedido);
    return resposta({ ok: true, mensagem: "Senha salva. Entre com seu login e a nova senha." });
  } finally {
    await cliente.auth.signOut({ scope: "local" });
  }
}
