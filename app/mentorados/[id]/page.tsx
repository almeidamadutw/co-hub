"use client";

import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, User } from "../../utils/auth";

const mentoradosMock = [
  { id: "1", nome: "Dra. Ana Paula", etapa: "Marketing", progresso: 45 },
  { id: "2", nome: "Dr. João Ricardo", etapa: "Vendas", progresso: 70 },
  { id: "3", nome: "Dr. Carlos Henrique", etapa: "Posicionamento", progresso: 90 },
  { id: "4", nome: "Dra. Julia Martins", etapa: "Fechamento", progresso: 30 },
];

export default function MentoradosPage() {
  const router = useRouter();
  const usuario = getUsuarioLogado() as User | null;

  if (!usuario) {
    router.push("/login");
    return null;
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#0B1D59]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 p-6 md:p-8">
        <div className="mb-8 rounded-[28px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white shadow-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-[#C9CED6]">
            Mentorados
          </p>
          <h1 className="text-3xl font-bold">Acompanhe a evolução dos alunos</h1>
          <p className="mt-2 text-[#D9DEE7]">
            Visualize cada mentorado individualmente.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mentoradosMock.map((mentorado) => (
            <button
              key={mentorado.id}
              type="button"
              onClick={() => router.push(`/mentorados/${mentorado.id}`)}
              className="rounded-[24px] border border-white/50 bg-white/85 p-6 text-left shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm transition hover:-translate-y-1"
            >
              <h2 className="text-lg font-semibold text-[#08163F]">
                {mentorado.nome}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Etapa atual: {mentorado.etapa}
              </p>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Progresso</span>
                  <span className="font-bold text-[#08163F]">
                    {mentorado.progresso}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-[#5B7FFF] to-[#12317C]"
                    style={{ width: `${mentorado.progresso}%` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}