"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import MentoradoLoading from "@/components/MentoradoLoading";
import {
  logoutUsuario,
  sincronizarUsuarioComSessao,
  User,
} from "@/utils/auth";
import { useModulosSupabase } from "@/utils/useModulosSupabase";

type AulaPratica = {
  id: string;
  titulo: string;
  ordem: number | null;
  duracao: string | null;
  video_url: string | null;
  moduloId: string;
  moduloTitulo: string;
  moduloOrdem: number | null;
};

export default function MentoradoPraticarPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [busca, setBusca] = useState("");

  const { carregando, modulos } = useModulosSupabase();

  useEffect(() => {
    let componenteAtivo = true;

    async function validarAcesso() {
      const user = await sincronizarUsuarioComSessao();

      if (!componenteAtivo) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      if (user.role === "mentor") {
        router.replace("/mentor/dashboard");
        return;
      }

      if (user.role !== "mentorado") {
        await logoutUsuario();
        router.replace("/login");
        return;
      }

      setUsuario(user);
    }

    void validarAcesso();

    return () => {
      componenteAtivo = false;
    };
  }, [router]);

  const modulosDisponiveis = useMemo(() => {
    return modulos
      .filter((modulo) => modulo.ativo)
      .map((modulo) => ({
        ...modulo,
        aulas: modulo.aulas.filter((aula) => aula.ativo),
      }));
  }, [modulos]);

  const atividades = useMemo<AulaPratica[]>(() => {
    return modulosDisponiveis.flatMap((modulo) =>
      modulo.aulas.map((aula) => ({
        id: aula.id,
        titulo: aula.titulo,
        ordem: aula.ordem,
        duracao: aula.duracao,
        video_url: aula.video_url,
        moduloId: modulo.id,
        moduloTitulo: modulo.titulo,
        moduloOrdem: modulo.ordem,
      }))
    );
  }, [modulosDisponiveis]);

  const atividadesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return atividades;

    return atividades.filter((atividade) => {
      const texto = [
        atividade.titulo,
        atividade.moduloTitulo,
        atividade.duracao,
        atividade.video_url ? "vídeo aula prática atividade" : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [atividades, busca]);

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return <MentoradoLoading mensagem="Carregando práticas..." />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <MentoradoSidebar nome={usuario.nome} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.push("/mentorado/dashboard")}
              className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
            >
              ← Voltar
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 sm:text-xs">
                Prática CEO Club
              </p>

              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
                Praticar
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/mentorado/suporte")}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-sm sm:text-sm"
            >
              Suporte
            </button>

            <button
              onClick={sair}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white shadow-lg sm:text-sm"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="relative min-w-0 overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="overflow-hidden rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white shadow-2xl shadow-[#07122F]/20 sm:p-6 lg:p-7">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-200">
              Central de prática
            </p>

            <h2 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Treine o que aprendeu e transforme aula em ação.
            </h2>

            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-blue-100 sm:text-base">
              Aqui ficam as práticas ligadas aos módulos disponíveis. Use esta
              área para revisar aulas, executar atividades e manter a evolução
              da mentoria em movimento.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <ResumoPratica titulo="Módulos disponíveis" valor={modulosDisponiveis.length} />
              <ResumoPratica titulo="Aulas para praticar" valor={atividades.length} />
              <ResumoPratica
                titulo="Com vídeo"
                valor={atividades.filter((aula) => aula.video_url).length}
              />
            </div>
          </section>

          <section className="mt-4 rounded-[22px] bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">
                  Buscar prática
                </p>

                <h2 className="mt-2 text-xl font-black text-[#08163F] sm:text-2xl">
                  Atividades disponíveis
                </h2>
              </div>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por aula ou módulo"
                className="w-full rounded-2xl border border-slate-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-slate-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10 sm:max-w-sm"
              />
            </div>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            {atividadesFiltradas.length === 0 && (
              <div className="rounded-[22px] bg-white p-6 text-center shadow-xl shadow-slate-200/70 xl:col-span-2">
                <h3 className="text-xl font-black text-[#08163F]">
                  Nenhuma prática encontrada
                </h3>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Quando novas aulas forem liberadas, elas aparecerão aqui para
                  você praticar.
                </p>
              </div>
            )}

            {atividadesFiltradas.map((atividade) => (
              <AtividadeCard
                key={atividade.id}
                atividade={atividade}
                onAbrirModulo={() => router.push("/mentorado/modulos")}
              />
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

function ResumoPratica({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <article className="rounded-[20px] bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
        {titulo}
      </p>

      <strong className="mt-3 block text-3xl font-black text-white">
        {valor}
      </strong>
    </article>
  );
}

function AtividadeCard({
  atividade,
  onAbrirModulo,
}: {
  atividade: AulaPratica;
  onAbrirModulo: () => void;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-[22px] bg-white p-5 shadow-xl shadow-slate-200/70">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#08163F] px-3 py-1.5 text-xs font-black text-white">
          Módulo {atividade.moduloOrdem ?? "—"}
        </span>

        <span className="rounded-full bg-[#EEF2FF] px-3 py-1.5 text-xs font-black text-[#08163F]">
          Aula {atividade.ordem ?? "—"}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
          {atividade.video_url ? "Vídeo disponível" : "Sem vídeo"}
        </span>
      </div>

      <h3 className="mt-4 break-words text-xl font-black text-[#08163F]">
        {atividade.titulo}
      </h3>

      <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-500">
        {atividade.moduloTitulo}
      </p>

      <div className="mt-4 rounded-2xl bg-[#f9fafb] p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Orientação prática
        </p>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Revise a aula, aplique o conteúdo na rotina da clínica e registre os
          principais pontos para discutir com a mentora.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAbrirModulo}
          className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
        >
          Abrir módulo →
        </button>

        {atividade.duracao && (
          <span className="inline-flex items-center rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-slate-500">
            ▶ {atividade.duracao}
          </span>
        )}
      </div>
    </article>
  );
}
