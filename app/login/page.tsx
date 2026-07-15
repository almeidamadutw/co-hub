"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/utils/supabase";
import {
  logoutUsuario,
  salvarUsuarioLogado,
  sincronizarUsuarioComSessao,
} from "@/utils/auth";
import { definirPersistenciaSessao } from "@/utils/sessionPersistence";

type UserRole = "mentor" | "mentorado" | "financeiro" | "suporte";

type UsuarioLogado = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  acesso_suporte?: boolean;
};

const rolesValidas: UserRole[] = [
  "mentor",
  "mentorado",
  "financeiro",
  "suporte",
];

function redirecionarPorRole(
  role: UserRole,
  router: ReturnType<typeof useRouter>
) {
  if (role === "mentor") {
    router.replace("/mentor/dashboard");
    return;
  }

  if (role === "mentorado") {
    router.replace("/mentorado/dashboard");
    return;
  }

  if (role === "financeiro") {
    router.replace("/mentor/financeiro");
    return;
  }

  if (role === "suporte") {
    router.replace("/suporte");
    return;
  }

  router.replace("/login");
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [animar, setAnimar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [manterConectado, setManterConectado] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimar(true), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let componenteAtivo = true;

    async function restaurarSessao() {
      try {
        const usuario = await sincronizarUsuarioComSessao();

        if (!componenteAtivo) return;

        if (usuario && rolesValidas.includes(usuario.role)) {
          redirecionarPorRole(usuario.role, router);
          return;
        }
      } catch (error) {
        console.error("Não foi possível restaurar a sessão:", error);
      } finally {
        if (componenteAtivo) {
          setVerificandoSessao(false);
        }
      }
    }

    void restaurarSessao();

    return () => {
      componenteAtivo = false;
    };
  }, [router]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setCarregando(true);

    const emailNormalizado = email.toLowerCase().trim();
    const senhaNormalizada = senha.trim();

    if (!emailNormalizado || !senhaNormalizada) {
      setCarregando(false);
      setErro("Preencha e-mail e senha para entrar.");
      return;
    }

    definirPersistenciaSessao(manterConectado);

    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: emailNormalizado,
        password: senhaNormalizada,
      });

    if (loginError || !loginData.user) {
      setCarregando(false);
      setErro("E-mail ou senha inválidos.");
      return;
    }

    const user = loginData.user;

    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("nome, email, role, acesso_suporte, status")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil) {
      setCarregando(false);
      setErro("Perfil não encontrado. Verifique o cadastro no Supabase.");
      await supabase.auth.signOut();
      return;
    }

    const role = String(perfil.role ?? "")
      .trim()
      .toLowerCase() as UserRole;
    const nome = perfil.nome || user.email || "Usuário";
    const status = String(perfil.status ?? "").trim().toLowerCase();

    if (!rolesValidas.includes(role) || (status && status !== "ativo")) {
      setCarregando(false);
      setErro(
        status && status !== "ativo"
          ? "Seu acesso está inativo ou pendente. Fale com o suporte."
          : "Perfil inválido no banco de dados."
      );
      await logoutUsuario();
      return;
    }

    const usuarioLogado: UsuarioLogado = {
      id: user.id,
      nome,
      email: perfil.email || user.email || emailNormalizado,
      role,
      acesso_suporte: Boolean(perfil.acesso_suporte),
    };

    salvarUsuarioLogado(usuarioLogado, manterConectado);

    setCarregando(false);
    redirecionarPorRole(role, router);
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f5f8] p-3 sm:p-4">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-[24px] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.10)] lg:min-h-[640px] lg:grid-cols-[0.95fr_1.05fr] xl:min-h-[680px]">
        <div className="relative hidden lg:flex">
          <Image
            src="/images/luciana.jpg"
            alt="Mentora Dra. Luciana Rocha"
            fill
            priority
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
                Curso de Mentoria
              </p>
            </div>

            <div
              className={`transition-all delay-150 duration-[1200ms] ease-out ${
                animar ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <h1 className="max-w-md break-words text-3xl font-extrabold leading-tight drop-shadow-lg xl:text-4xl">
                Inove seu jeito de pensar
              </h1>

              <p className="mt-3 max-w-md break-words text-sm font-semibold leading-6 text-white/80">
                Acesse sua jornada de mentoria, acompanhe módulos, encontros,
                evolução e próximos passos dentro do CEO Club.
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
                CEO Club
              </h1>

              <p className="mt-2 break-words text-xs font-semibold text-[#C9CED6] sm:text-sm">
                by Mentora Dra. Luciana Rocha
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3.5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#E5E7EB]">
                  E-mail de acesso
                </span>

                <input
                  type="email"
                  placeholder="exemplo: seunome@ceoclubmentoria.com.br"
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white outline-none backdrop-blur-sm transition placeholder:text-[#C9CED6] focus:border-[#E5E7EB] focus:ring-2 focus:ring-[#E5E7EB]/40 sm:py-3"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErro("");
                  }}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#E5E7EB]">
                  Senha
                </span>

                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Digite sua senha"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 pr-28 text-sm font-semibold text-white outline-none backdrop-blur-sm transition placeholder:text-[#C9CED6] focus:border-[#E5E7EB] focus:ring-2 focus:ring-[#E5E7EB]/40 sm:py-3"
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value);
                      setErro("");
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-[#E5E7EB] px-3 py-1.5 text-xs font-black text-[#08163F] shadow-sm transition hover:bg-white hover:shadow-md"
                  >
                    {mostrarSenha ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs font-semibold text-[#E5E7EB] backdrop-blur-sm transition hover:bg-white/15">
                  <input
                    type="checkbox"
                    checked={manterConectado}
                    onChange={(e) => setManterConectado(e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-[#E5E7EB]"
                  />

                  <span>Manter conectado</span>
                </label>

                <Link
                  href="/esqueci-senha"
                  className="text-right text-xs font-semibold text-[#C9CED6] transition hover:text-white hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>

              {erro && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={carregando || verificandoSessao}
                className="w-full rounded-2xl py-3 text-sm font-bold text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
                style={{
                  background:
                    "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
                }}
              >
                {verificandoSessao
                  ? "Verificando sessão..."
                  : carregando
                    ? "Entrando..."
                    : "Entrar"}
              </button>
            </form>

            <p className="mt-5 break-words text-center text-xs font-semibold leading-5 text-[#C9CED6]">
              Acesso exclusivo para mentor, mentorados e equipe autorizada.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
