"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabase";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimar(true), 80);
    return () => clearTimeout(timer);
  }, []);

  async function handleEnviarRecuperacao(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  setLoading(true);
  setMensagem("");
  setErro("");

  const emailNormalizado = email.trim().toLowerCase();

  if (!emailNormalizado) {
    setLoading(false);
    setErro("Informe seu e-mail para receber o link de recuperação.");
    return;
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("profiles")
    .select("id, nome, email, role, trocas_senha")
    .eq("email", emailNormalizado)
    .maybeSingle();

  if (perfilError) {
    setLoading(false);
    setErro("Não foi possível verificar seu cadastro agora. Tente novamente.");
    return;
  }

  if (!perfil) {
    setLoading(false);
    setMensagem(
      "Se este e-mail estiver cadastrado no CEO Club, enviaremos um link de recuperação. Verifique também a caixa de spam."
    );
    return;
  }

  const quantidadeTrocas = perfil.trocas_senha || 0;

  if (quantidadeTrocas >= 1) {
    const { error: ticketError } = await supabase
      .from("suporte_tickets")
      .insert({
        usuario_id: perfil.id,
        nome_usuario: perfil.nome,
        email_usuario: perfil.email,
        tipo_usuario: perfil.role,
        categoria: "Alteração de senha",
        assunto: "Solicitação de nova troca de senha",
        mensagem:
          "O usuário tentou alterar a senha novamente. Como esta não é a primeira troca, o sistema bloqueou o envio automático e abriu este ticket para análise do suporte/T.I.",
        status: "aberto",
        prioridade: "media",
        origem: "sistema",
      });

    setLoading(false);

    if (ticketError) {
      setErro(
        "Não foi possível abrir o chamado de suporte agora. Tente novamente em alguns instantes."
      );
      return;
    }

    setMensagem(
      "Você já realizou uma alteração de senha anteriormente. Por segurança, abrimos um chamado para o suporte/T.I. Aguarde o retorno da equipe para continuar."
    );

    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(emailNormalizado, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  });

  setLoading(false);

  if (error) {
    setErro(
      "Não foi possível enviar o e-mail de recuperação agora. Tente novamente em alguns instantes."
    );
    return;
  }

  setMensagem(
    "Se este e-mail estiver cadastrado no CEO Club, enviaremos um link de recuperação. Verifique também a caixa de spam."
  );
}

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f5f8] p-3 sm:p-4">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-[24px] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.10)] lg:min-h-[640px] lg:grid-cols-[0.95fr_1.05fr] xl:min-h-[680px]">
        <div className="relative hidden lg:flex">
          <img
            src="/images/luciana.jpg"
            alt="Mentora Dra. Luciana Rocha"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1400ms] ease-out ${
              animar ? "scale-100 opacity-100" : "scale-110 opacity-0"
            }`}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="relative z-10 flex w-full flex-col justify-between p-8 text-white xl:p-10">
            <div
              className={`transition-all duration-1000 ease-out ${
                animar ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
              }`}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#C9CED6]">
                Acesso CEO Club
              </p>
            </div>

            <div
              className={`transition-all delay-150 duration-[1200ms] ease-out ${
                animar ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <h1 className="max-w-md break-words text-3xl font-extrabold leading-tight drop-shadow-lg xl:text-4xl">
                Recupere seu acesso com segurança
              </h1>

              <p className="mt-3 max-w-md break-words text-sm font-semibold leading-6 text-white/80">
                Informe seu e-mail cadastrado para receber o link de redefinição
                e continuar sua jornada dentro do CEO Club.
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex min-w-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 sm:p-6 md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(229,231,235,0.18),rgba(229,231,235,0.06),transparent)]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(191,195,201,0.10),transparent)]" />

          <div
            className={`relative z-10 w-full max-w-sm transition-all duration-[1000ms] ease-out sm:max-w-md ${
              animar ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
            }`}
          >
            <div className="mb-6 text-center">
              <div
                className={`mx-auto mb-4 h-24 w-24 rounded-[22px] border border-white/10 bg-white/10 p-1.5 shadow-[0_16px_34px_rgba(0,0,0,0.22)] backdrop-blur-sm transition-all duration-[1000ms] ease-out sm:h-28 sm:w-28 ${
                  animar ? "scale-100 opacity-100" : "scale-90 opacity-0"
                }`}
              >
                <img
                  src="/images/logo.jpeg"
                  alt="Logo CEO Club"
                  className="h-full w-full rounded-[18px] object-cover"
                />
              </div>

              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                Esqueci minha senha
              </h1>

              <p className="mt-2 break-words text-xs font-semibold leading-5 text-[#C9CED6] sm:text-sm">
                Digite seu e-mail de acesso para receber o link de recuperação.
              </p>
            </div>

            <form onSubmit={handleEnviarRecuperacao} className="space-y-3.5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#E5E7EB]">
                  E-mail cadastrado
                </span>

                <input
                  type="email"
                  placeholder="exemplo: seunome@ceoclubmentoria.com.br"
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white outline-none backdrop-blur-sm transition placeholder:text-[#C9CED6] focus:border-[#E5E7EB] focus:ring-2 focus:ring-[#E5E7EB]/40 sm:py-3"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErro("");
                    setMensagem("");
                  }}
                />
              </label>

              {mensagem && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-semibold leading-5 text-emerald-100">
                  {mensagem}
                </div>
              )}

              {erro && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-semibold leading-5 text-red-200">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-3 text-sm font-bold text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
                style={{
                  background:
                    "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
                }}
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link
                href="/login"
                className="text-xs font-semibold text-[#C9CED6] transition hover:text-white hover:underline"
              >
                Voltar para o login
              </Link>
            </div>

            <p className="mt-5 break-words text-center text-xs font-semibold leading-5 text-[#C9CED6]">
              O link será enviado pelo e-mail oficial do CEO Club.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}