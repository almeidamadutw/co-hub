"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { useModulosSupabase } from "@/utils/useModulosSupabase";

function converterYoutubeParaEmbed(url: string) {
  if (!url?.trim()) return "";

  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes("youtube.com")) {
      const videoId = urlObj.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      if (urlObj.pathname.startsWith("/embed/")) {
        return url;
      }

      if (urlObj.pathname.startsWith("/shorts/")) {
        const videoIdShorts = urlObj.pathname
          .split("/shorts/")[1]
          ?.split("/")[0];

        if (videoIdShorts) {
          return `https://www.youtube.com/embed/${videoIdShorts}`;
        }
      }
    }

    if (urlObj.hostname.includes("youtu.be")) {
      const videoId = urlObj.pathname.replace("/", "");

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    return "";
  } catch {
    return "";
  }
}

export default function MentoradoModulosPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentoradoId, setMentoradoId] = useState("");

  const [moduloSelecionadoId, setModuloSelecionadoId] = useState("");
  const [aulaSelecionadaId, setAulaSelecionadaId] = useState("");
  const [modalArquivosAberto, setModalArquivosAberto] = useState(false);

  const [aulasConcluidas, setAulasConcluidas] = useState<string[]>([]);
  const [carregandoProgresso, setCarregandoProgresso] = useState(true);
  const [salvandoProgresso, setSalvandoProgresso] = useState(false);
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

  useEffect(() => {
    if (carregando || modulosDisponiveis.length === 0) return;

    const primeiroModulo = modulosDisponiveis[0];
    const primeiraAula = primeiroModulo.aulas[0];

    setModuloSelecionadoId((atual) => atual || primeiroModulo.id);
    setAulaSelecionadaId((atual) => atual || primeiraAula?.id || "");
  }, [carregando, modulosDisponiveis]);

  const moduloSelecionado = useMemo(() => {
    return (
      modulosDisponiveis.find((modulo) => modulo.id === moduloSelecionadoId) ??
      modulosDisponiveis[0] ??
      null
    );
  }, [modulosDisponiveis, moduloSelecionadoId]);

  const aulaSelecionada = useMemo(() => {
    if (!moduloSelecionado) return null;

    return (
      moduloSelecionado.aulas.find((aula) => aula.id === aulaSelecionadaId) ??
      moduloSelecionado.aulas[0] ??
      null
    );
  }, [moduloSelecionado, aulaSelecionadaId]);

  const totalAulas = aulasDisponiveis.length;

  const progressoGeral = useMemo(() => {
    if (totalAulas === 0) return 0;

    return Math.round((aulasConcluidas.length / totalAulas) * 100);
  }, [aulasConcluidas.length, totalAulas]);

  const arquivosDaAula = aulaSelecionada?.materiais_aula ?? [];

  const embedUrl = aulaSelecionada?.video_url
    ? converterYoutubeParaEmbed(aulaSelecionada.video_url)
    : "";

  function selecionarAula(moduloId: string, aulaId: string) {
    setModuloSelecionadoId(moduloId);
    setAulaSelecionadaId(aulaId);
    setModalArquivosAberto(false);
  }

  async function alternarConclusao(aulaId: string) {
    if (!mentoradoId) {
      window.alert("Não foi possível identificar o mentorado logado.");
      return;
    }

    if (salvandoProgresso) return;

    const jaConcluida = aulasConcluidas.includes(aulaId);

    try {
      setSalvandoProgresso(true);
      setErro("");

      const { error } = await supabase.from("progresso_aulas").upsert(
        {
          mentorado_id: mentoradoId,
          aula_id: aulaId,
          concluida: !jaConcluida,
          concluida_em: !jaConcluida ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "mentorado_id,aula_id",
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      setAulasConcluidas((estadoAtual) => {
        if (jaConcluida) {
          return estadoAtual.filter((id) => id !== aulaId);
        }

        return [...estadoAtual, aulaId];
      });
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o progresso.";

      setErro(mensagem);
      window.alert(mensagem);
    } finally {
      setSalvandoProgresso(false);
    }
  }

  async function sair() {
  logoutUsuario();
  await supabase.auth.signOut();
  router.replace("/login");
}

  if (!usuario || carregando || carregandoProgresso) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando módulos...
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

            <MenuItem label="Assistir aula" ativo />

            <MenuItem
              label="Praticar"
              onClick={() => router.push("/mentorado/praticar")}
            />

            <MenuItem
              label="Meu progresso"
              onClick={() => router.push("/mentorado/progresso")}
            />

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
                  Aula CEO Club
                </p>

                <h2 className="line-clamp-1 text-xl font-black md:text-2xl">
                  {aulaSelecionada?.titulo ?? "Módulos"}
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

          <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:p-9">
            {erro && (
              <section className="lg:col-span-2">
                <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                  {erro}
                </div>
              </section>
            )}

            {modulosDisponiveis.length === 0 ? (
              <section className="lg:col-span-2">
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/70">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#f3f5f8] text-3xl">
                    ✦
                  </div>

                  <h1 className="mt-5 text-2xl font-black">
                    Nenhum módulo disponível ainda
                  </h1>

                  <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                    Assim que a mentora cadastrar módulos e aulas, eles
                    aparecerão automaticamente aqui.
                  </p>
                </div>
              </section>
            ) : (
              <>
                <section className="min-w-0">
                  <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] shadow-2xl shadow-[#07122F]/20">
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        title={aulaSelecionada?.titulo ?? "Aula"}
                        className="aspect-video w-full bg-black"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex aspect-video items-center justify-center p-8 text-center text-white">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-200">
                            Mentoria CEO Club
                          </p>

                          <h1 className="mt-5 text-4xl font-black md:text-5xl">
                            {aulaSelecionada?.titulo ?? "Aula"}
                          </h1>

                          <p className="mx-auto mt-5 max-w-xl text-sm font-bold text-blue-100">
                            Vídeo ainda não disponível para esta aula.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-7 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h1 className="max-w-3xl text-4xl font-black leading-tight text-[#050816]">
                        {aulaSelecionada?.titulo ?? moduloSelecionado?.titulo}
                      </h1>

                      <div className="mt-3 flex flex-wrap gap-3">
                        {moduloSelecionado?.titulo && (
                          <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-500 shadow-sm">
                            {moduloSelecionado.titulo}
                          </span>
                        )}

                        {aulaSelecionada?.duracao && (
                          <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-500 shadow-sm">
                            ▶ {aulaSelecionada.duracao}
                          </span>
                        )}

                        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-500 shadow-sm">
                          {arquivosDaAula.length} material(is)
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setModalArquivosAberto(true)}
                        className="rounded-full border border-gray-200 bg-white px-7 py-4 font-black text-[#08163F] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        📄 Arquivos disponíveis
                      </button>

                      {aulaSelecionada && (
                        <button
                          disabled={salvandoProgresso}
                          onClick={() => alternarConclusao(aulaSelecionada.id)}
                          className={`rounded-full px-7 py-4 font-black shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                            aulasConcluidas.includes(aulaSelecionada.id)
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-[#08163F] text-white"
                          }`}
                        >
                          {aulasConcluidas.includes(aulaSelecionada.id)
                            ? "Concluída ✓"
                            : "Concluir aula"}
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                <aside className="min-w-0">
                  <section className="rounded-[2rem] bg-white p-5 shadow-xl shadow-slate-200/70">
                    <div className="rounded-[1.5rem] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-6 text-white">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                        Progresso do curso
                      </p>

                      <strong className="mt-5 block text-4xl font-black">
                        {aulasConcluidas.length}/{totalAulas}
                      </strong>

                      <p className="mt-2 text-sm font-bold text-blue-100">
                        {progressoGeral}% concluído
                      </p>

                      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{
                            width: `${progressoGeral}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 max-h-[calc(100vh-310px)] space-y-5 overflow-y-auto pr-2">
                      {modulosDisponiveis.map((modulo) => {
                        const aulasConcluidasModulo = modulo.aulas.filter(
                          (aula) => aulasConcluidas.includes(aula.id)
                        ).length;

                        return (
                          <div
                            key={modulo.id}
                            className="overflow-hidden rounded-[1.5rem] border border-slate-100"
                          >
                            <div className="flex items-center justify-between bg-[#f9fafb] px-5 py-4">
                              <div>
                                <span className="rounded-full bg-[#08163F] px-4 py-2 text-xs font-black text-white">
                                  Módulo {modulo.ordem}
                                </span>

                                <h3 className="mt-4 text-xl font-black">
                                  {modulo.titulo}
                                </h3>
                              </div>

                              <span className="text-sm font-black text-slate-500">
                                {aulasConcluidasModulo}/{modulo.aulas.length}
                              </span>
                            </div>

                            {modulo.aulas.length === 0 ? (
                              <div className="px-5 py-5 text-sm font-bold text-slate-400">
                                Nenhuma aula cadastrada neste módulo.
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-100">
                                {modulo.aulas.map((aula) => {
                                  const concluida = aulasConcluidas.includes(
                                    aula.id
                                  );

                                  const selecionada =
                                    aulaSelecionada?.id === aula.id;

                                  return (
                                    <button
                                      key={aula.id}
                                      type="button"
                                      onClick={() =>
                                        selecionarAula(modulo.id, aula.id)
                                      }
                                      className={`flex w-full items-center gap-4 px-5 py-4 text-left transition ${
                                        selecionada
                                          ? "bg-[#EEF2FF]"
                                          : "bg-white hover:bg-slate-50"
                                      }`}
                                    >
                                      <span
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                                          concluida
                                            ? "bg-emerald-100 text-emerald-700"
                                            : selecionada
                                            ? "bg-[#08163F] text-white"
                                            : "bg-slate-100 text-slate-500"
                                        }`}
                                      >
                                        {concluida ? "✓" : aula.ordem}
                                      </span>

                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate font-black">
                                          {aula.titulo}
                                        </span>

                                        <span className="mt-1 block text-xs font-bold text-slate-400">
                                          {aula.duracao
                                            ? `▶ ${aula.duracao}`
                                            : aula.video_url
                                            ? "Vídeo disponível"
                                            : "Sem vídeo"}
                                        </span>
                                      </span>

                                      <span className="text-xl text-slate-400">
                                        {selecionada ? "•" : "›"}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </aside>

                <section className="grid gap-5 lg:col-span-2">
                  <InfoAulaCard
                    eyebrow="Sobre esta aula"
                    titulo="Descrição do conteúdo"
                    texto={
                      aulaSelecionada?.descricao ||
                      "A mentora ainda não adicionou uma descrição para esta aula."
                    }
                  />

                  <InfoAulaCard
                    eyebrow="Objetivo"
                    titulo="O que você deve absorver"
                    texto={
                      aulaSelecionada?.objetivo ||
                      "A mentora ainda não adicionou um objetivo específico para esta aula."
                    }
                    acao={
                      <button
                        onClick={() => router.push("/mentorado/praticar")}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-[#08163F] px-7 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
                      >
                        Praticar conteúdo →
                      </button>
                    }
                  />
                </section>
              </>
            )}
          </div>
        </section>
      </div>

      {modalArquivosAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[34px] bg-white p-7 shadow-2xl">
            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Materiais da aula
                </p>

                <h2 className="text-4xl font-black text-[#050816]">
                  Arquivos disponíveis
                </h2>
              </div>

              <button
                onClick={() => setModalArquivosAberto(false)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f5f8] text-2xl font-black text-[#08163F] transition hover:bg-gray-200"
              >
                ×
              </button>
            </div>

            {arquivosDaAula.length > 0 ? (
              <div className="space-y-4">
                {arquivosDaAula.map((arquivo) => (
                  <div
                    key={arquivo.id}
                    className="flex flex-col gap-4 rounded-[26px] bg-[#f9fafb] p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-xl font-black text-[#08163F]">
                        📄 {arquivo.nome}
                      </p>

                      <p className="mt-1 max-w-xl truncate text-sm font-bold text-gray-500">
                        {arquivo.url}
                      </p>
                    </div>

                    <a
                      href={arquivo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-gradient-to-b from-[#F3F4F6] via-[#D1D5DB] to-[#9CA3AF] px-8 py-4 text-center font-black text-[#08163F] shadow-lg transition hover:brightness-105"
                    >
                      Abrir material
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[26px] bg-[#f9fafb] p-8 text-center">
                <p className="text-2xl font-black text-[#08163F]">
                  Nenhum arquivo disponível
                </p>

                <p className="mt-2 text-sm font-semibold text-gray-500">
                  Esta aula ainda não possui materiais anexados.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function InfoAulaCard({
  eyebrow,
  titulo,
  texto,
  acao,
}: {
  eyebrow: string;
  titulo: string;
  texto: string;
  acao?: React.ReactNode;
}) {
  return (
    <article className="w-full rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/70">
      <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
            {eyebrow}
          </p>

          <h3 className="mt-4 text-3xl font-black leading-tight text-[#08163F]">
            {titulo}
          </h3>

          <p className="mt-4 max-w-none whitespace-pre-line text-base font-semibold leading-8 text-slate-500">
            {texto}
          </p>
        </div>

        {acao && <div className="flex shrink-0 xl:pl-8">{acao}</div>}
      </div>
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