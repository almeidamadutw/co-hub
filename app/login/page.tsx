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
  localStorage.setItem("cohub_user", JSON.stringify(usuario));
  router.push("/dashboard");
}

  return (
    <main className="min-h-screen bg-[#f5f7fb] flex items-center justify-center p-4 overflow-hidden">
      <section className="w-full max-w-6xl min-h-[700px] bg-white rounded-3xl overflow-hidden shadow-2xl grid lg:grid-cols-2">

        {/* LADO ESQUERDO */}
        <div className="hidden lg:flex relative">
          <img
            src="/images/fundadores.png"
            alt="Fundadores Casal Odonto"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[1400ms] ease-out ${
              animar ? "scale-100 opacity-100" : "scale-110 opacity-0"
            }`}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="relative z-10 flex flex-col justify-between w-full p-10 text-white">
            <div
              className={`transition-all duration-1000 ease-out ${
                animar ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
              }`}
            >
              <p className="text-sm uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
                Casal Odonto
              </p>
            </div>

            <div
              className={`transition-all duration-[1200ms] ease-out delay-150 ${
                animar ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight drop-shadow-lg max-w-md">
                Excelência, cuidado e encantamento em cada detalhe.
              </h1>
            </div>
          </div>
        </div>

        {/* LADO DIREITO */}
        <div className="flex items-center justify-center p-6 md:p-10">
          <div
            className={`w-full max-w-md transition-all duration-[1000ms] ease-out ${
              animar ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
            }`}
          >
            <div className="text-center mb-8">
              <img
                src="/images/logo.png"
                alt="Logo Casal Odonto"
                className={`mx-auto mb-4 w-40 h-auto object-contain bg-[#1A1F4D] p-4 rounded-2xl shadow-lg transition-all duration-[1000ms] ease-out ${
                  animar ? "scale-100 opacity-100" : "scale-90 opacity-0"
                }`}
              />

              <h1 className="text-4xl font-bold text-[#1A1F4D]">CO Hub</h1>
              <p className="text-sm font-semibold text-[#D4AF37] mt-1">
                by Casal Odonto
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                placeholder="E-mail"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Senha"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />

              {erro && <p className="text-red-500 text-sm">{erro}</p>}

              <button
                type="submit"
                className="w-full bg-[#D4AF37] text-white py-3 rounded-xl font-bold hover:brightness-110 transition"
              >
                Entrar
              </button>
            </form>

            <div className="mt-6 text-xs text-gray-500 bg-gray-50 rounded-xl p-4">
              <p className="font-semibold mb-2 text-[#1A1F4D]">Logins de teste:</p>
              <p>luadmin@cohub.com / 123456</p>
              <p>recepcao@cohub.com / 123456</p>
              <p>analucia@cohub.com / 123456</p>
              <p>financeiro@cohub.com / 123456</p>
              <p>crc@cohub.com / 123456</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}