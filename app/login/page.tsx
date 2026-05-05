"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";

type UserRole = "mentor" | "mentorado" | "modulos" | "financeiro" | "progresso";

type UsuarioLogado = {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
};

const rolesValidas: UserRole[] = [
  "mentor",
  "mentorado",
  "modulos",
  "financeiro",
  "progresso",
];

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [animar, setAnimar] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimar(true), 80);
    return () => clearTimeout(timer);
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setCarregando(true);

    const emailNormalizado = email.toLowerCase().trim();
    const senhaNormalizada = senha.trim();

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
      .select("nome, email, role")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil) {
      setCarregando(false);
      setErro("Perfil não encontrado. Verifique o cadastro no Supabase.");
      await supabase.auth.signOut();
      return;
    }

    const role = perfil.role as UserRole;
    const nome = perfil.nome || user.email || "Usuário";

    if (!rolesValidas.includes(role)) {
      setCarregando(false);
      setErro("Perfil inválido no banco de dados.");
      await supabase.auth.signOut();
      return;
    }

    const usuarioLogado: UsuarioLogado = {
      nome,
      email: perfil.email || user.email || emailNormalizado,
      senha: "",
      role,
    };

    localStorage.removeItem("cohub_user");
    localStorage.setItem("ceoclub_user", JSON.stringify(usuarioLogado));

    setCarregando(false);

    if (role === "mentor") {
      router.replace("/dashboard");
      return;
    }

    if (role === "mentorado") {
      router.replace("/mentorado/dashboard");
      return;
    }

    if (role === "financeiro") {
      router.replace("/financeiro");
      return;
    }

    if (role === "modulos") {
      router.replace("/modulos");
      return;
    }

    if (role === "progresso") {
      router.replace("/progresso");
      return;
    }

    router.replace("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f5f8] p-4">
      <section className="grid min-h-[760px] w-full max-w-7xl overflow-hidden rounded-[32px] bg-white shadow-[0_25px_60px_rgba(15,23,42,0.10)] lg:grid-cols-2">
        <div className="relative hidden lg:flex">
          <img
            src="/images/luciana.jpg"
            alt="Mentora Dra. Luciana Rocha"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1400ms] ease-out ${
              animar ? "scale-100 opacity-100" : "scale-110 opacity-0"
            }`}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white">
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
              <h1 className="max-w-md text-4xl font-extrabold leading-[1.02] drop-shadow-lg xl:text-5xl">
                Inove seu jeito de pensar
              </h1>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-6 md:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(229,231,235,0.18),rgba(229,231,235,0.06),transparent)]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(191,195,201,0.10),transparent)]" />

          <div
            className={`relative z-10 w-full max-w-md transition-all duration-[1000ms] ease-out ${
              animar ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
            }`}
          >
            <div className="mb-8 text-center">
              <div
                className={`mx-auto mb-5 h-36 w-36 rounded-[28px] border border-white/10 bg-white/10 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-sm transition-all duration-[1000ms] ease-out ${
                  animar ? "scale-100 opacity-100" : "scale-90 opacity-0"
                }`}
              >
                <img
                  src="/images/logo.jpeg"
                  alt="Logo CEO Club"
                  className="h-full w-full rounded-[22px] object-cover"
                />
              </div>

              <h1 className="text-4xl font-bold text-white">CEO Club</h1>
              <p className="mt-2 text-sm font-semibold text-[#C9CED6]">
                by Mentora Dra. Luciana Rocha
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                placeholder="E-mail"
                className="w-full rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-white outline-none backdrop-blur-sm transition placeholder:text-[#C9CED6] focus:border-[#E5E7EB] focus:ring-2 focus:ring-[#E5E7EB]/40"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErro("");
                }}
              />

              <input
                type="password"
                placeholder="Senha"
                className="w-full rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-white outline-none backdrop-blur-sm transition placeholder:text-[#C9CED6] focus:border-[#E5E7EB] focus:ring-2 focus:ring-[#E5E7EB]/40"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErro("");
                }}
              />

              {erro && (
                <p className="text-sm font-semibold text-red-300">{erro}</p>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full rounded-2xl py-3.5 font-bold text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  background:
                    "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
                }}
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/8 p-4 text-sm text-[#D1D5DB] backdrop-blur-sm">
              <p className="mb-2 font-semibold text-white">
                exemplo de login:
              </p>
              <p>mentor: seunomeadmin@ceoclub.com / 123456</p>
              <p>mentorado: seunome@ceoclub.com / 123456</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}