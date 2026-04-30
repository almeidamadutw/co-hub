"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

export default function MentoradoPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "mentorado") {
      router.push("/dashboard");
      return;
    }

    setUsuario(user);
  }, [router]);

  function sair() {
    logoutUsuario();
    router.push("/login");
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando área do mentorado...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <section className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="mb-8 rounded-[32px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-1">
              <img
                src="/images/logo.jpeg"
                alt="CEO Club"
                className="h-full w-full rounded-xl object-cover"
              />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#C9CED6]">
                Área do mentorado
              </p>
              <h1 className="text-3xl font-bold">Olá, {usuario.nome}</h1>
            </div>
          </div>

          <p className="max-w-2xl text-[#D9DEE7]">
            Aqui você acompanha seus módulos, progresso, tarefas e próximos
            encontros da mentoria.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Card titulo="Meu progresso" valor="32%" texto="Jornada em andamento" />
          <Card titulo="Módulo atual" valor="Vendas" texto="Etapa ativa da mentoria" />
          <Card titulo="Próximo encontro" valor="Em breve" texto="Aguardando agendamento" />
        </div>

        <div className="mt-6 rounded-[28px] bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-bold">Minha jornada</h2>

          <div className="space-y-4">
            <Etapa titulo="Boas-vindas" status="Concluído" progresso={100} />
            <Etapa titulo="Posicionamento" status="Em andamento" progresso={65} />
            <Etapa titulo="Vendas" status="Bloqueado" progresso={0} />
            <Etapa titulo="Marketing" status="Bloqueado" progresso={0} />
          </div>
        </div>

        <button
          onClick={sair}
          className="mt-6 rounded-2xl px-6 py-3 font-bold text-[#08163F] shadow-md transition hover:brightness-105"
          style={{
            background:
              "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
          }}
        >
          Sair
        </button>
      </section>
    </main>
  );
}

function Card({
  titulo,
  valor,
  texto,
}: {
  titulo: string;
  valor: string;
  texto: string;
}) {
  return (
    <div className="rounded-[26px] bg-white p-6 shadow-lg">
      <p className="text-sm font-medium text-gray-500">{titulo}</p>
      <p className="mt-2 text-3xl font-black text-[#08163F]">{valor}</p>
      <p className="mt-2 text-sm text-gray-500">{texto}</p>
    </div>
  );
}

function Etapa({
  titulo,
  status,
  progresso,
}: {
  titulo: string;
  status: string;
  progresso: number;
}) {
  return (
    <div className="rounded-2xl border bg-[#f9fafb] p-4">
      <div className="mb-2 flex justify-between">
        <div>
          <p className="font-semibold">{titulo}</p>
          <p className="text-sm text-gray-500">{status}</p>
        </div>

        <span className="font-bold">{progresso}%</span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-gradient-to-r from-[#5B7FFF] to-[#12317C]"
          style={{ width: `${progresso}%` }}
        />
      </div>
    </div>
  );
}