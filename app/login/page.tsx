"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fakeUsers } from "@/data/users";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimar(true), 80);
    return () => clearTimeout(timer);
  }, []);

  function handleLogin(e: React.FormEvent) {
  e.preventDefault();

  const usuario = fakeUsers.find(
    (u) => u.email === email && u.senha === senha
  );

  if (!usuario) {
    setErro("E-mail ou senha inválidos.");
    return;
  }

  localStorage.removeItem("cohub_user");
  localStorage.removeItem("ceoclub_user");

  // mantém compatibilidade com o resto do sistema
  localStorage.setItem("cohub_user", JSON.stringify(usuario));
  localStorage.setItem("ceoclub_user", JSON.stringify(usuario));

  router.push("/dashboard");
}

  return (
    <main className="min-h-screen bg-[#f3f5f8] flex items-center justify-center p-4 overflow-hidden">
      <section className="w-full max-w-7xl min-h-[760px] bg-white rounded-[32px] overflow-hidden shadow-[0_25px_60px_rgba(15,23,42,0.10)] grid lg:grid-cols-2">
        {/* LADO ESQUERDO */}
        <div className="hidden lg:flex relative">
          <img
            src="/images/luciana.jpg"
            alt="Mentora Dra. Luciana Rocha"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[1400ms] ease-out ${
              animar ? "scale-100 opacity-100" : "scale-110 opacity-0"
            }`}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="relative z-10 flex flex-col justify-between w-full p-12 text-white">
            <div
              className={`transition-all duration-1000 ease-out ${
                animar ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
              }`}
            >
              <p className="text-sm uppercase tracking-[0.32em] text-[#C9CED6] font-semibold">
                Curso de Mentoria
              </p>
            </div>

            <div
              className={`transition-all duration-[1200ms] ease-out delay-150 ${
                animar ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.02] drop-shadow-lg max-w-md">
                Inove seu jeito de pensar
              </h1>
            </div>
          </div>
        </div>

        {/* LADO DIREITO */}
        <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-6 md:p-10">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(229,231,235,0.18),rgba(229,231,235,0.06),transparent)]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(191,195,201,0.10),transparent)]" />

          <div
            className={`relative z-10 w-full max-w-md transition-all duration-[1000ms] ease-out ${
              animar ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
            }`}
          >
            <div className="text-center mb-8">
              <div
                className={`mx-auto mb-5 w-36 h-36 rounded-[28px] p-2 border border-white/10 bg-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-sm transition-all duration-[1000ms] ease-out ${
                  animar ? "scale-100 opacity-100" : "scale-90 opacity-0"
                }`}
              >
                <img
                  src="/images/logo.jpeg"
                  alt="Logo CEO Club"
                  className="w-full h-full object-cover rounded-[22px]"
                />
              </div>

              <h1 className="text-4xl font-bold text-white">CEO Club</h1>
              <p className="text-sm font-semibold text-[#C9CED6] mt-2">
                by Mentora Dra. Luciana Rocha
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                placeholder="E-mail"
                className="w-full rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-white placeholder:text-[#C9CED6] outline-none backdrop-blur-sm transition focus:border-[#E5E7EB] focus:ring-2 focus:ring-[#E5E7EB]/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Senha"
                className="w-full rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-white placeholder:text-[#C9CED6] outline-none backdrop-blur-sm transition focus:border-[#E5E7EB] focus:ring-2 focus:ring-[#E5E7EB]/40"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />

              {erro && <p className="text-red-300 text-sm">{erro}</p>}

              <button
                type="submit"
                className="w-full rounded-2xl py-3.5 font-bold text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105"
                style={{
                  background:
                    "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
                }}
              >
                Entrar
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/8 p-4 text-sm text-[#D1D5DB] backdrop-blur-sm">
              <p className="font-semibold mb-2 text-white">Logins de teste:</p>
              <p>luadmin@ceoclub.com / 123456</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}