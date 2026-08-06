"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { limparUsuarioLogado, logoutUsuario } from "@/utils/auth";
import {
  criarClienteRecuperacaoSenha,
  lerMarcadorRecuperacao,
  limparMarcadorRecuperacao,
  salvarMarcadorRecuperacao,
} from "@/utils/supabaseRecovery";

type ClienteRecuperacao = ReturnType<typeof criarClienteRecuperacaoSenha>;

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const clienteRecuperacaoRef = useRef<ClienteRecuperacao | null>(null);
  const redirecionamentoRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [validandoLink, setValidandoLink] = useState(true);
  const [linkValido, setLinkValido] = useState(false);
  const [solicitacaoId, setSolicitacaoId] = useState("");

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
    let ativo = true;

    async function invalidarRecuperacao(
      cliente: ClienteRecuperacao,
      mensagem: string
    ) {
      limparMarcadorRecuperacao();
      await cliente.auth.signOut({ scope: "local" }).catch(() => undefined);

      if (!ativo) return;
      setLinkValido(false);
      setSolicitacaoId("");
      setErro(mensagem);
    }

    async function validarNoServidor(token: string, userId: string) {
      const response = await withTimeout(
        fetch("/api/auth/redefinicao-senha", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        10000
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok || !payload?.solicitacaoId) {
        throw new Error(
          payload?.error ||
            "Esse link não corresponde a uma recuperação ativa."
        );
      }

      const marcador = {
        userId,
        solicitacaoId: String(payload.solicitacaoId),
      };
      salvarMarcadorRecuperacao(marcador);

      return marcador.solicitacaoId;
    }

    async function preparar() {
      setValidandoLink(true);
      setErro("");

      const cliente = criarClienteRecuperacaoSenha();
      clienteRecuperacaoRef.current = cliente;

      try {
        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );
        const tipo = hashParams.get("type");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const recebeuLink = Boolean(accessToken || refreshToken || tipo);

        if (recebeuLink) {
          limparMarcadorRecuperacao();

          if (tipo !== "recovery" || !accessToken || !refreshToken) {
            await invalidarRecuperacao(
              cliente,
              "Esse link de recuperação está incompleto ou inválido. Solicite um novo link."
            );
            return;
          }

          // A sessão normal do aplicativo não pode virar uma sessão de
          // recuperação. O cliente abaixo usa um storage isolado nesta aba.
          await logoutUsuario();

          const { data, error } = await withTimeout(
            cliente.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            }),
            15000
          );

          if (error || !data.session || !data.user) {
            await invalidarRecuperacao(
              cliente,
              "Esse link de recuperação está inválido ou expirou. Solicite um novo link."
            );
            return;
          }

          const id = await validarNoServidor(
            data.session.access_token,
            data.user.id
          );

          window.history.replaceState({}, document.title, "/redefinir-senha");

          if (!ativo) return;
          setSolicitacaoId(id);
          setLinkValido(true);
          return;
        }

        const marcador = lerMarcadorRecuperacao();
        const { data, error } = await withTimeout(cliente.auth.getUser(), 15000);

        if (
          error ||
          !data.user ||
          !marcador?.userId ||
          marcador.userId !== data.user.id ||
          !marcador.solicitacaoId
        ) {
          await invalidarRecuperacao(
            cliente,
            "Abra o link enviado por e-mail para redefinir sua senha."
          );
          return;
        }

        const { data: sessao } = await cliente.auth.getSession();
        const token = sessao.session?.access_token;

        if (!token) {
          await invalidarRecuperacao(
            cliente,
            "Sua sessão de recuperação expirou. Solicite um novo link."
          );
          return;
        }

        const id = await validarNoServidor(token, data.user.id);

        if (!ativo) return;
        setSolicitacaoId(id);
        setLinkValido(true);
      } catch (error) {
        await invalidarRecuperacao(
          cliente,
          error instanceof Error
            ? error.message
            : "Não foi possível validar o link de recuperação. Solicite um novo link."
        );
      } finally {
        if (ativo) setValidandoLink(false);
      }
    }

    void preparar();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (redirecionamentoRef.current) {
        clearTimeout(redirecionamentoRef.current);
      }
    };
  }, []);

  async function handleRedefinirSenha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMensagem("");
    setErro("");

    if (!linkValido || !solicitacaoId) {
      setErro("Abra um link válido de recuperação antes de salvar a senha.");
      return;
    }

    if (!novaSenha || !confirmarSenha) {
      setErro("Preencha a nova senha e a confirmação.");
      return;
    }

    if (
      novaSenha.length < 8 ||
      novaSenha.length > 128 ||
      !/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(novaSenha) ||
      !/\d/.test(novaSenha)
    ) {
      setErro(
        "Use de 8 a 128 caracteres, com pelo menos uma letra e um número."
      );
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não conferem.");
      return;
    }

    setLoading(true);

    try {
      const cliente = clienteRecuperacaoRef.current;

      if (!cliente) {
        setErro("Sua sessão de recuperação expirou. Solicite um novo link.");
        return;
      }

      const { data: sessaoAtual, error: erroSessao } = await withTimeout(
        cliente.auth.getSession(),
        15000
      );

      const token = sessaoAtual.session?.access_token;

      if (erroSessao || !token) {
        setErro(
          "Sua sessão de redefinição expirou. Solicite um novo link de recuperação."
        );
        return;
      }

      const response = await withTimeout(
        fetch("/api/auth/redefinicao-senha", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({ solicitacaoId, novaSenha }),
        }),
        15000
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setErro(
          payload?.error ||
            "Não foi possível redefinir sua senha. Solicite um novo link."
        );
        return;
      }

      await cliente.auth.signOut({ scope: "global" }).catch(() => undefined);
      limparMarcadorRecuperacao();
      limparUsuarioLogado();

      setSenhaAtualizada(true);
      setLinkValido(false);
      setNovaSenha("");
      setConfirmarSenha("");
      setMensagem(
        payload.mensagem ||
          "Senha redefinida com sucesso. Agora você já pode acessar sua conta."
      );

      redirecionamentoRef.current = setTimeout(() => {
        router.replace("/login");
      }, 2200);
    } catch (error) {
      setErro(
        error instanceof Error && error.message.includes("Tempo limite")
          ? "A redefinição demorou demais. Confira sua conexão e tente novamente."
          : "Não foi possível redefinir sua senha. Solicite um novo link e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-[#f3f5f8] p-3 py-4 sm:p-4">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-[24px] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.10)] lg:min-h-[640px] lg:grid-cols-[0.95fr_1.05fr] xl:min-h-[680px]">
        <div className="relative hidden lg:flex">
          <Image
            src="/images/luciana.jpg"
            alt="Mentora Dra. Luciana Rocha"
            fill
            sizes="(min-width: 1024px) 48vw, 0px"
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
                <Image
                  src="/images/logo.jpeg"
                  alt="Logo CEO Club"
                  width={112}
                  height={112}
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
                    id="nova-senha"
                    name="novaSenha"
                    type={verNovaSenha ? "text" : "password"}
                    placeholder="Digite sua nova senha"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    aria-describedby="requisitos-senha"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 pr-20 text-sm font-semibold text-white outline-none backdrop-blur-sm transition placeholder:text-[#C9CED6] focus:border-[#E5E7EB] focus:ring-2 focus:ring-[#E5E7EB]/40 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3"
                    value={novaSenha}
                    onChange={(e) => {
                      setNovaSenha(e.target.value);
                      setErro("");
                      setMensagem("");
                    }}
                    disabled={
                      senhaAtualizada || loading || validandoLink || !linkValido
                    }
                  />

                  <button
                    type="button"
                    onClick={() => setVerNovaSenha((valor) => !valor)}
                    aria-label={
                      verNovaSenha ? "Ocultar nova senha" : "Mostrar nova senha"
                    }
                    aria-pressed={verNovaSenha}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#C9CED6] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={
                      senhaAtualizada || loading || validandoLink || !linkValido
                    }
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
                    id="confirmar-nova-senha"
                    name="confirmarNovaSenha"
                    type={verConfirmarSenha ? "text" : "password"}
                    placeholder="Confirme sua nova senha"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 pr-20 text-sm font-semibold text-white outline-none backdrop-blur-sm transition placeholder:text-[#C9CED6] focus:border-[#E5E7EB] focus:ring-2 focus:ring-[#E5E7EB]/40 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3"
                    value={confirmarSenha}
                    onChange={(e) => {
                      setConfirmarSenha(e.target.value);
                      setErro("");
                      setMensagem("");
                    }}
                    disabled={
                      senhaAtualizada || loading || validandoLink || !linkValido
                    }
                  />

                  <button
                    type="button"
                    onClick={() => setVerConfirmarSenha((valor) => !valor)}
                    aria-label={
                      verConfirmarSenha
                        ? "Ocultar confirmação da senha"
                        : "Mostrar confirmação da senha"
                    }
                    aria-pressed={verConfirmarSenha}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#C9CED6] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={
                      senhaAtualizada || loading || validandoLink || !linkValido
                    }
                  >
                    {verConfirmarSenha ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>

              {!senhaAtualizada && (
                <div
                  id="requisitos-senha"
                  className="grid gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs font-semibold text-[#D9DEE7] sm:grid-cols-2"
                >
                  <RegraSenha
                    ok={novaSenha.length >= 8 && novaSenha.length <= 128}
                    texto="8 a 128 caracteres"
                  />
                  <RegraSenha
                    ok={/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(novaSenha)}
                    texto="Pelo menos uma letra"
                  />
                  <RegraSenha
                    ok={/\d/.test(novaSenha)}
                    texto="Pelo menos um número"
                  />
                  <RegraSenha
                    ok={Boolean(confirmarSenha) && novaSenha === confirmarSenha}
                    texto="As duas senhas conferem"
                  />
                </div>
              )}

              {mensagem && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-semibold leading-5 text-emerald-100"
                >
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
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-semibold leading-5 text-red-200"
                >
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
                  disabled={loading || validandoLink || !linkValido}
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

function RegraSenha({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <span className={ok ? "text-emerald-200" : "text-[#D9DEE7]"}>
      <span aria-hidden="true">{ok ? "✓" : "•"}</span> {texto}
    </span>
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
