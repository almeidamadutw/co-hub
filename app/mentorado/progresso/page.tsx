"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import MentoradoLoading from "@/components/MentoradoLoading";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { useModulosSupabase } from "@/utils/useModulosSupabase";

export default function MentoradoProgressoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentoradoId, setMentoradoId] = useState("");
  const [aulasConcluidas, setAulasConcluidas] = useState<string[]>([]);
  const [carregandoProgresso, setCarregandoProgresso] = useState(true);
  const [erro, setErro] = useState("");

  const { carregando, modulos } = useModulosSupabase();

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentor") {
      router.replace("/dashboard");
      return;
    }

    if (user.role !== "mentorado") {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);
  }, [router]);

  useEffect(() => {
    if (!usuario) return;

    async function carregarPerfilEProgresso() {
      setCarregandoProgresso(true);
      setErro("");

      const usuarioId = (usuario as User & { id?: string })?.id;

      if (!usuarioId) {
        setErro("Não foi possível identificar o usuário logado.");
        setCarregandoProgresso(false);
        return;
      }

      const { data: perfil, error: erroPerfil } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", usuarioId)
        .eq("role", "mentorado")
        .maybeSingle();

      if (erroPerfil) {
        setErro(erroPerfil.message);
        setCarregandoProgresso(false);
        return;
      }

      if (!perfil?.id) {
        setErro("Não foi possível identificar o perfil do mentorado.");
        setCarregandoProgresso(false);
        return;
      }

      const idPerfil = perfil.id;

      setMentoradoId(idPerfil);

      const { data, error } = await supabase
        .from("progresso_aulas")
        .select("aula_id")
        .eq("mentorado_id", idPerfil)
        .eq("concluida", true);

      if (error) {
        setErro(error.message);
        setCarregandoProgresso(false);
        return;
      }

      setAulasConcluidas((data ?? []).map((item) => item.aula_id));
      setCarregandoProgresso(false);
    }

    carregarPerfilEProgresso();
  }, [usuario]);

  const modulosDisponiveis = useMemo(() => {
    return modulos
      .filter((modulo) => modulo.ativo)
      .map((modulo) => ({
        ...modulo,
        aulas: modulo.aulas.filter((aula) => aula.ativo),
      }));
  }, [modulos]);

  const aulasDisponiveis = useMemo(() => {
    return modulosDisponiveis.flatMap((modulo) => modulo.aulas);
  }, [modulosDisponiveis]);

  const totalAulas = aulasDisponiveis.length;
  const totalConcluidas = aulasConcluidas.length;

  const progressoGeral = useMemo(() => {
    if (totalAulas === 0) return 0;
    return Math.round((totalConcluidas / totalAulas) * 100);
  }, [totalAulas, totalConcluidas]);

  const modulosComProgresso = useMemo(() => {
    return modulosDisponiveis.map((modulo) => {
      const totalAulasModulo = modulo.aulas.length;

      const aulasConcluidasModulo = modulo.aulas.filter((aula) =>
        aulasConcluidas.includes(aula.id)
      ).length;

      const percentual =
        totalAulasModulo === 0
          ? 0
          : Math.round((aulasConcluidasModulo / totalAulasModulo) * 100);

      const status =
        totalAulasModulo === 0
          ? "Sem aulas"
          : percentual === 100
          ? "Concluído"
          : percentual > 0
          ? "Em andamento"
          : "Não iniciado";

      return {
        ...modulo,
        totalAulasModulo,
        aulasConcluidasModulo,
        percentual,
        status,
      };
    });
  }, [modulosDisponiveis, aulasConcluidas]);

  const modulosConcluidos = modulosComProgresso.filter(
    (modulo) => modulo.percentual === 100 && modulo.totalAulasModulo > 0
  ).length;

  const modulosEmAndamento = modulosComProgresso.filter(
    (modulo) => modulo.percentual > 0 && modulo.percentual < 100
  ).length;

  const modulosNaoIniciados = modulosComProgresso.filter(
    (modulo) => modulo.percentual === 0 && modulo.totalAulasModulo > 0
  ).length;

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando || carregandoProgresso) {
    return <MentoradoLoading mensagem="Carregando progresso..." />;
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
                  Evolução CEO Club
                </p>

                <h2 className="truncate text-base font-black sm:text-lg md:text-xl">
                  Meu progresso
                </h2>
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

          <div className="relative min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
            {erro && (
              <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                {erro}
              </div>
            )}

            <section className="min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-2xl shadow-[#07122F]/20 sm:p-5 lg:rounded-[26px] lg:p-6">
              <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] xl:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-200">
                    Progresso geral
                  </p>

                  <h1 className="mt-3 break-words text-4xl font-black sm:text-5xl lg:text-6xl">
                    {progressoGeral}%
                  </h1>

                  <p className="mt-3 max-w-2xl break-words text-sm font-bold leading-6 text-blue-100">
                    Você concluiu {totalConcluidas} de {totalAulas} aulas
                    disponíveis na jornada do CEO Club.
                  </p>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-white transition-all"
                      style={{ width: `${progressoGeral}%` }}
                    />
                  </div>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <HeroMetric
                    titulo="Concluídos"
                    valor={String(modulosConcluidos)}
                  />

                  <HeroMetric
                    titulo="Em andamento"
                    valor={String(modulosEmAndamento)}
                  />

                  <HeroMetric
                    titulo="Não iniciados"
                    valor={String(modulosNaoIniciados)}
                  />
                </div>
              </div>
            </section>

            <section className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ResumoCard
                titulo="Aulas concluídas"
                valor={`${totalConcluidas}/${totalAulas}`}
                texto="Total de aulas finalizadas."
                destaque
              />

              <ResumoCard
                titulo="Módulos concluídos"
                valor={String(modulosConcluidos)}
                texto="Módulos totalmente finalizados."
              />

              <ResumoCard
                titulo="Em andamento"
                valor={String(modulosEmAndamento)}
                texto="Módulos já iniciados."
              />

              <ResumoCard
                titulo="A iniciar"
                valor={String(modulosNaoIniciados)}
                texto="Módulos ainda não começados."
              />
            </section>

            <section className="mt-4 min-w-0 rounded-[22px] bg-white p-4 shadow-xl shadow-slate-200/70 sm:rounded-[24px] sm:p-5 lg:p-6">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                    Jornada por módulos
                  </p>

                  <h2 className="mt-2 break-words text-xl font-black text-[#08163F] sm:text-2xl lg:text-3xl">
                    Acompanhe sua evolução
                  </h2>

                  <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-slate-500">
                    Cada módulo mostra quantas aulas você já concluiu e o que
                    ainda falta finalizar.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/mentorado/modulos")}
                  className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
                >
                  Continuar estudando →
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {modulosComProgresso.length === 0 ? (
                  <div className="rounded-[22px] bg-[#f9fafb] p-5 text-center sm:p-6">
                    <p className="break-words text-lg font-black text-[#08163F] sm:text-xl">
                      Nenhum módulo disponível ainda
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      Assim que os módulos forem cadastrados, seu progresso
                      aparecerá aqui.
                    </p>
                  </div>
                ) : (
                  modulosComProgresso.map((modulo) => (
                    <ModuloProgressoCard key={modulo.id} modulo={modulo} />
                  ))
                )}
              </div>
            </section>
          </div>
      </section>
    </main>
  );
}

function HeroMetric({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-[20px] bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
        {titulo}
      </p>

      <p className="mt-2 break-words text-2xl font-black text-white sm:text-3xl">{valor}</p>
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
  texto,
  destaque,
}: {
  titulo: string;
  valor: string;
  texto: string;
  destaque?: boolean;
}) {
  return (
    <article
      className={`min-w-0 overflow-hidden rounded-[20px] p-4 shadow-xl shadow-slate-200/70 sm:p-5 ${
        destaque ? "bg-[#071A55] text-white" : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`break-words text-xs font-black sm:text-sm ${
          destaque ? "text-blue-100" : "text-slate-500"
        }`}
      >
        {titulo}
      </p>

      <strong className="mt-3 block break-words text-2xl font-black sm:text-3xl lg:text-4xl">{valor}</strong>

      <p
        className={`mt-2 break-words text-sm font-semibold leading-6 ${
          destaque ? "text-blue-100" : "text-slate-500"
        }`}
      >
        {texto}
      </p>
    </article>
  );
}

function ModuloProgressoCard({
  modulo,
}: {
  modulo: {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number | null;
  aulas: {
    id: string;
    titulo: string;
    ordem: number | null;
    duracao: string | null;
    video_url: string | null;
  }[];
  totalAulasModulo: number;
  aulasConcluidasModulo: number;
  percentual: number;
  status: string;
};
}) {
  const statusClasse =
    modulo.status === "Concluído"
      ? "bg-emerald-50 text-emerald-700"
      : modulo.status === "Em andamento"
      ? "bg-amber-50 text-amber-700"
      : modulo.status === "Não iniciado"
      ? "bg-slate-100 text-slate-600"
      : "bg-[#EEF2FF] text-[#08163F]";

  return (
    <article className="min-w-0 rounded-[20px] border border-slate-100 bg-[#f9fafb] p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="rounded-full bg-[#08163F] px-3 py-1.5 text-[11px] font-black text-white sm:text-xs">
              Módulo {modulo.ordem ?? "—"}
            </span>

            <span className={`rounded-full px-3 py-1.5 text-[11px] font-black sm:text-xs ${statusClasse}`}>
              {modulo.status}
            </span>
          </div>

          <h3 className="mt-3 break-words text-lg font-black text-[#08163F] sm:text-xl">
            {modulo.titulo}
          </h3>

          <p className="mt-2 max-w-3xl break-words text-sm font-semibold leading-6 text-slate-500">
            {modulo.descricao || "Sem descrição cadastrada."}
          </p>
        </div>

        <div className="min-w-0 text-left sm:text-right">
          <p className="break-words text-2xl font-black text-[#08163F] sm:text-3xl">
            {modulo.percentual}%
          </p>

          <p className="mt-1 text-sm font-black text-slate-400">
            {modulo.aulasConcluidasModulo}/{modulo.totalAulasModulo} aulas
          </p>
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C]"
          style={{ width: `${modulo.percentual}%` }}
        />
      </div>

      {modulo.aulas.length > 0 && (
        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
          {modulo.aulas.map((aula) => (
            <div
              key={aula.id}
              className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-slate-100 sm:p-4"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Aula {aula.ordem ?? "—"}
              </p>

              <p className="mt-2 break-words font-black text-[#08163F]">{aula.titulo}</p>

              <p className="mt-1 text-xs font-bold text-slate-400">
                {aula.duracao
                  ? `▶ ${aula.duracao}`
                  : aula.video_url
                  ? "Vídeo disponível"
                  : "Sem vídeo"}
              </p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

