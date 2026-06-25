"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";

export default function RedefinirSenhaPage() {
  const router = useRouter();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [validandoLink, setValidandoLink] = useState(true);

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [animar, setAnimar] = useState(false);

  const [senhaAtualizada, setSenhaAtualizada] = useState(false);
  const [verNovaSenha, setVerNovaSenha] = useState(false);
  const [verConfirmarSenha, setVerConfirmarSenha] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimar(true), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    prepararSessaoDeRecuperacao();
  }, []);

  async function prepararSessaoDeRecuperacao() {
    setValidandoLink(true);
    setErro("");

    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      const hashParams = new URLSearchParams(
        window.location.hash.replace("#", "")
      );

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (code) {
        const { error } = await withTimeout(
          supabase.auth.exchangeCodeForSession(code),
          15000
        );

        if (error) {
          setErro(
            "Esse link de recuperação está inválido ou expirou. Solicite um novo link."
          );
          return;
        }

        limparUrl();
      } else if (accessToken && refreshToken) {
        const { error } = await withTimeout(
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }),
          15000
        );

        if (error) {
          setErro(
            "Esse link de recuperação está inválido ou expirou. Solicite um novo link."
          );
          return;
        }

        limparUrl();
      }

      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        15000
      );

      if (error || !data.session) {
        setErro(
          "Não encontramos uma sessão válida para redefinir a senha. Solicite um novo link de recuperação."
        );
      }
    } catch {
      setErro(
        "Não foi possível validar o link de recuperação. Solicite um novo link e tente novamente."
      );
    } finally {
      setValidandoLink(false);
    }
  }

  function limparUrl() {
    window.history.replaceState({}, document.title, "/redefinir-senha");
  }

  async function handleRedefinirSenha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMensagem("");
    setErro("");

    const senhaLimpa = novaSenha.trim();
    const confirmarSenhaLimpa = confirmarSenha.trim();

    if (!senhaLimpa || !confirmarSenhaLimpa) {
      setErro("Preencha a nova senha e a confirmação.");
      return;
    }

    if (senhaLimpa.length < 6) {
      setErro("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (senhaLimpa !== confirmarSenhaLimpa) {
      setErro("As senhas não conferem.");
      return;
    }

    setLoading(true);

    try {
      const { data: sessaoAtual, error: erroSessao } = await withTimeout(
        supabase.auth.getSession(),
        15000
      );

      const usuarioId = sessaoAtual.session?.user.id;

      if (erroSessao || !usuarioId) {
        setErro(
          "Sua sessão de redefinição expirou. Solicite um novo link de recuperação."
        );
        return;
      }

      let trocasAtuais = 0;

      try {
        const { data: perfilAtual, error: erroPerfil } = await withTimeout(
          supabase
            .from("profiles")
            .select("trocas_senha, ultima_troca_senha")
            .eq("id", usuarioId)
            .maybeSingle(),
          10000
        );

        if (erroPerfil) {
          throw erroPerfil;
        }

        trocasAtuais = Number(perfilAtual?.trocas_senha || 0);

        if (trocasAtuais >= 1) {
          setErro(
            "Essa troca de senha já foi utilizada. Para alterar novamente, solicite liberação ao suporte."
          );
          return;
        }
      } catch (erroValidacao) {
        console.error("Erro ao validar controle de troca de senha:", erroValidacao);
        setErro(
          "Não foi possível validar a liberação desta troca de senha. Solicite ajuda ao suporte."
        );
        return;
      }

      const { error } = await withTimeout(
        supabase.auth.updateUser({
          password: senhaLimpa,
        }),
        15000
      );

      if (error) {
        setErro(traduzirErroSenha(error.message));
        return;
      }

      let historicoRegistrado = true;

      try {
        await registrarTrocaSenhaNoPerfil(usuarioId, trocasAtuais);
      } catch (erroRegistro) {
        historicoRegistrado = false;
        console.error("Erro ao registrar histórico de troca de senha:", erroRegistro);
      }

      try {
        await supabase.auth.signOut();
      } catch {
        // Evita travar a confirmação caso o logout falhe.
      }

      setSenhaAtualizada(true);
      setNovaSenha("");
      setConfirmarSenha("");
      setMensagem(
        historicoRegistrado
          ? "Senha redefinida com sucesso. Agora você já pode acessar sua conta."
          : "Senha redefinida com sucesso, mas o histórico da troca não foi registrado. Avise o suporte caso a data não apareça no painel."
      );

      setTimeout(() => {
        router.replace("/login");
      }, historicoRegistrado ? 1800 : 2600);
    } catch {
      setErro(
        "A redefinição demorou demais ou falhou. Solicite um novo link e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  async function registrarTrocaSenhaNoPerfil(
    usuarioId: string,
    trocasAtuais: number
  ) {
    const agora = new Date().toISOString();

    const { error } = await withTimeout(
      supabase
        .from("profiles")
        .update({
          trocas_senha: trocasAtuais + 1,
          ultima_troca_senha: agora,
          updated_at: agora,
        })
        .eq("id", usuarioId)
        .select("id")
        .maybeSingle(),
      10000
    );

    if (error) {
      throw error;
    }
  }

  function traduzirErroSenha(mensagemErro: string) {
    const erroNormalizado = mensagemErro.toLowerCase();

    if (erroNormalizado.includes("new password should be different")) {
      return "A nova senha precisa ser diferente da senha anterior.";
    }

    if (erroNormalizado.includes("session") || erroNormalizado.includes("jwt")) {
      return "Sua sessão de redefinição expirou. Solicite um novo link de recuperação.";
    }

    if (erroNormalizado.includes("password")) {
      return "Não foi possível salvar essa senha. Tente uma senha diferente.";
    }

    return "Não foi possível redefinir sua senha. Solicite um novo link de recuperação e tente novamente.";
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
                Segurança CEO Club
              </p>
            </div>

            <div
              className={`transition-all delay-150 duration-[1200ms] ease-out ${
                animar ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <h1 className="max-w-md break-words text-3xl font-extrabold leading-tight drop-shadow-lg xl:text-4xl">
                Crie uma nova senha de acesso
              </h1>

              <p className="mt-3 max-w-md break-words text-sm font-semibold leading-6 text-white/80">
                Defina uma nova senha para continuar sua jornada de mentoria
                dentro do CEO Club com segurança.
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
                Redefinir senha
              </h1>

              <p className="mt-2 break-words text-xs font-semibold leading-5 text-[#C9CED6] sm:text-sm">
                Digite sua nova senha para recuperar o acesso à plataforma.
              </p>
            </div>

            <form onSubmit={handleRedefinirSenha} className="space-y-3.5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#E5E7EB]">
                  Nova senha
                </span>

                <div className="relative">
                  <input
                    type={verNovaSenha ? "text" : "password"}
                    placeholder="Digite sua nova senha"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 pr-20 text-sm font-semibold text-white outline-none backdrop-blur-sm transition placeholder:text-[#C9CED6] focus:border-[#E5E7EB] focus:ring-2 focus:ring-[#E5E7EB]/40 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3"
                    value={novaSenha}
                    onChange={(e) => {
                      setNovaSenha(e.target.value);
                      setErro("");
                      setMensagem("");
                    }}
                    disabled={senhaAtualizada || loading || validandoLink}
                  />

                  <button
                    type="button"
                    onClick={() => setVerNovaSenha((valor) => !valor)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#C9CED6] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={senhaAtualizada || loading || validandoLink}
                  >
                    {verNovaSenha ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#E5E7EB]">
                  Confirmar nova senha
                </span>

                <div className="relative">
                  <input
                    type={verConfirmarSenha ? "text" : "password"}
                    placeholder="Confirme sua nova senha"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 pr-20 text-sm font-semibold text-white outline-none backdrop-blur-sm transition placeholder:text-[#C9CED6] focus:border-[#E5E7EB] focus:ring-2 focus:ring-[#E5E7EB]/40 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3"
                    value={confirmarSenha}
                    onChange={(e) => {
                      setConfirmarSenha(e.target.value);
                      setErro("");
                      setMensagem("");
                    }}
                    disabled={senhaAtualizada || loading || validandoLink}
                  />

                  <button
                    type="button"
                    onClick={() => setVerConfirmarSenha((valor) => !valor)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#C9CED6] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={senhaAtualizada || loading || validandoLink}
                  >
                    {verConfirmarSenha ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>

              {mensagem && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-semibold leading-5 text-emerald-100">
                  {mensagem}

                  {senhaAtualizada && (
                    <div className="mt-3">
                      <Link
                        href="/login"
                        className="inline-flex rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#08163F] transition hover:bg-slate-200"
                      >
                        Ir para o login
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {erro && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-semibold leading-5 text-red-200">
                  {erro}

                  <div className="mt-3">
                    <Link
                      href="/esqueci-senha"
                      className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
                    >
                      Solicitar novo link
                    </Link>
                  </div>
                </div>
              )}

              {!senhaAtualizada && (
                <button
                  type="submit"
                  disabled={loading || validandoLink}
                  className="w-full rounded-2xl py-3 text-sm font-bold text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
                  style={{
                    background:
                      "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
                  }}
                >
                  {validandoLink
                    ? "Validando link..."
                    : loading
                    ? "Salvando..."
                    : "Salvar nova senha"}
                </button>
              )}
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
              Por segurança, utilize uma senha diferente das anteriores.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function withTimeout<T>(promise: PromiseLike<T>, tempo = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Tempo limite excedido."));
    }, tempo);

    promise.then(
      (resultado) => {
        clearTimeout(timer);
        resolve(resultado);
      },
      (erro) => {
        clearTimeout(timer);
        reject(erro);
      }
    );
  });
}