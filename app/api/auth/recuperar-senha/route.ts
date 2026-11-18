import { NextRequest, NextResponse } from "next/server";
import { criarClienteAdmin } from "@/utils/apiAuth";
import { emailDoLogin } from "@/utils/loginCEO";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = emailDoLogin(String(body?.login ?? ""));
  if (!email) return NextResponse.json({ error: "Use o formato nome@ceoclubmentoria." }, { status: 400 });
  const { error } = await criarClienteAdmin().rpc("solicitar_codigo_ao_suporte", { p_email: email });
  if (error) return NextResponse.json({ error: "O suporte está indisponível. Tente novamente." }, { status: 503 });
  return NextResponse.json({ ok: true, mensagem: "Se o login estiver ativo, o suporte receberá seu pedido. A equipe confirmará sua identidade antes de entregar o código." });
}
