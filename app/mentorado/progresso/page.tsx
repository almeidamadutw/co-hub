"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando progresso...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <div className="grid min-h-screen lg:grid-cols-[320px_1fr]">
        <aside className="hidden border-r border-slate-100 bg-white p-6 lg:block">
          <div className="rounded-[1.5rem] bg-[#f7f9fc] p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#07122F] text-sm font-black text-white">
                CC
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Curso
                </p>
                <h1 className="text-xl font-black">CEO Club</h1>
              </div>
            </div>
          </div>

          <nav className="mt-10 space-y-3">
            <MenuItem
              label="Início"
              onClick={() => router.push("/mentorado/dashboard")}
            />

            <MenuItem
              label="Assistir aula"
              onClick={() => router.push("/mentorado/modulos")}
            />

            <MenuItem
              label="Praticar"
              onClick={() => router.push("/mentorado/praticar")}
            />

            <MenuItem label="Meu progresso" ativo />

            <MenuItem
              label="Minha agenda"
              onClick={() => router.push("/mentorado/agenda")}
            />

            <MenuItem
              label="Financeiro"
              onClick={() => router.push("/mentorado/financeiro")}
            />

            <MenuItem
              label="Minha conta"
              onClick={() => router.push("/mentorado/conta")}
            />
          </nav>

          <div className="mt-10 rounded-[1.5rem] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
              Mentorado
            </p>

            <p className="mt-3 text-lg font-black">{usuario.nome}</p>

            <button
              onClick={sair}
              className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#08163F]"
            >
              Sair
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex h-[88px] items-center justify-between border-b border-slate-100 bg-white/85 px-6 backdrop-blur-xl lg:px-9">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/mentorado/dashboard")}
                className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
              >
                ← Voltar
              </button>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                  Evolução CEO Club
                </p>

                <h2 className="text-xl font-black md:text-2xl">
                  Meu progresso
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/mentorado/suporte")}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-sm"
              >
                Suporte
              </button>

              <button
                onClick={sair}
                className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg"
              >
                Sair
              </button>
            </div>
          </header>

          <div className="p-6 lg:p-9">
            {erro && (
              <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                {erro}
              </div>
            )}

            <section className="overflow-hidden rounded-[2.3rem] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-2xl shadow-[#07122F]/20">
              <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-200">
                    Progresso geral
                  </p>

                  <h1 className="mt-5 text-5xl font-black md:text-6xl">
                    {progressoGeral}%
                  </h1>

                  <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-blue-100">
                    Você concluiu {totalConcluidas} de {totalAulas} aulas
                    disponíveis na jornada do CEO Club.
                  </p>

                  <div className="mt-7 h-4 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-white transition-all"
                      style={{ width: `${progressoGeral}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
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

            <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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

            <section className="mt-8 rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                    Jornada por módulos
                  </p>

                  <h2 className="mt-2 text-3xl font-black text-[#08163F]">
                    Acompanhe sua evolução
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    Cada módulo mostra quantas aulas você já concluiu e o que
                    ainda falta finalizar.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/mentorado/modulos")}
                  className="rounded-2xl bg-[#08163F] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
                >
                  Continuar estudando →
                </button>
              </div>

              <div className="mt-7 space-y-4">
                {modulosComProgresso.length === 0 ? (
                  <div className="rounded-[1.6rem] bg-[#f9fafb] p-8 text-center">
                    <p className="text-xl font-black text-[#08163F]">
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
      </div>
    </main>
  );
}

function HeroMetric({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/10 p-5 backdrop-blur-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
        {titulo}
      </p>

      <p className="mt-3 text-3xl font-black text-white">{valor}</p>
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
      className={`rounded-[1.7rem] p-6 shadow-xl shadow-slate-200/70 ${
        destaque ? "bg-[#071A55] text-white" : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`text-sm font-black ${
          destaque ? "text-blue-100" : "text-slate-500"
        }`}
      >
        {titulo}
      </p>

      <strong className="mt-4 block text-4xl font-black">{valor}</strong>

      <p
        className={`mt-3 text-sm font-semibold leading-6 ${
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
    <article className="rounded-[1.7rem] border border-slate-100 bg-[#f9fafb] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#08163F] px-4 py-2 text-xs font-black text-white">
              Módulo {modulo.ordem ?? "—"}
            </span>

            <span className={`rounded-full px-4 py-2 text-xs font-black ${statusClasse}`}>
              {modulo.status}
            </span>
          </div>

          <h3 className="mt-4 text-2xl font-black text-[#08163F]">
            {modulo.titulo}
          </h3>

          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
            {modulo.descricao || "Sem descrição cadastrada."}
          </p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-black text-[#08163F]">
            {modulo.percentual}%
          </p>

          <p className="mt-1 text-sm font-black text-slate-400">
            {modulo.aulasConcluidasModulo}/{modulo.totalAulasModulo} aulas
          </p>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C]"
          style={{ width: `${modulo.percentual}%` }}
        />
      </div>

      {modulo.aulas.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {modulo.aulas.map((aula) => (
            <div
              key={aula.id}
              className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Aula {aula.ordem ?? "—"}
              </p>

              <p className="mt-2 font-black text-[#08163F]">{aula.titulo}</p>

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

function MenuItem({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-sm font-black transition ${
        ativo
          ? "bg-[#EEF2FF] text-[#08163F]"
          : "text-slate-500 hover:bg-slate-50 hover:text-[#08163F]"
      }`}
    >
      <span>{label}</span>
      <span>→</span>
    </button>
  );
}