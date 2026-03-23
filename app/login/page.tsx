"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fakeUsers } from "@/data/users";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const usuario = fakeUsers.find(
      (u) => u.email === email && u.senha === senha
    );

    if (!usuario) {
      setErro("E-mail ou senha inválidos.");
      return;
    }

    localStorage.setItem("cohub_user", JSON.stringify(usuario));
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#1A1F4D,#202A6B)] flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-yellow-600/20">
        
        <div className="text-center mb-8">
          <img
            src="/images/logo.png"
            alt="Logo Casal Odonto"
            className="mx-auto mb-4 w-48 h-auto object-contain bg-[#1A1F4D] p-4 rounded-2xl shadow-lg"
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
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          {erro && <p className="text-red-500 text-sm">{erro}</p>}

          <button
            type="submit"
            className="w-full bg-[#D4AF37] text-white py-3 rounded-xl font-bold"
          >
            Entrar
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-500">
          <p>admin@cohub.com / 123456</p>
          <p>recepcao@cohub.com / 123456</p>
        </div>
      </section>
    </main>
  );
}