"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import {
  AulaModulo,
  ModuloMentoria,
  getModuloDescricaoCurta,
  getModuloExplicativo,
  getModuloPremium,
  useModulosSupabase,
} from "@/utils/useModulosSupabase";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import MentoradoLoading from "@/components/MentoradoLoading";

type AtividadePersonalizadaMentorado = {
  id: string;
  modulo_id: string;
  mentorado_id: string;
  atividade: string;
  observacao_mentor: string | null;
  resposta_mentorado: string | null;
  status: string;
};

type StatusLiberacaoModulo = "aberto" | "fechado" | "agendado";

type ModuloLiberacaoGlobal = {
  modulo_id: string;
  status_liberacao: StatusLiberacaoModulo | null;
  liberar_em: string | null;
};

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

function converterYoutubeParaEmbed(url: string) {
  if (!url?.trim()) return "";

  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes("youtube.com")) {
      const videoId = urlObj.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      if (urlObj.pathname.startsWith("/embed/")) return url;

      if (urlObj.pathname.startsWith("/shorts/")) {
        const videoIdShorts = urlObj.pathname
          .split("/shorts/")[1]
          ?.split("/")[0];

        if (videoIdShorts) return `https://www.youtube.com/embed/${videoIdShorts}`;
      }
    }

    if (urlObj.hostname.includes("youtu.be")) {
      const videoId = urlObj.pathname.replace("/", "");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
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
  const [atividadesPersonalizadas, setAtividadesPersonalizadas] = useState<
    AtividadePersonalizadaMentorado[]
  >([]);
  const [liberacoesGlobais, setLiberacoesGlobais] = useState<
    ModuloLiberacaoGlobal[]
  >([]);
  const [erro, setErro] = useState("");

  const { carregando, modulos } = useModulosSupabase();

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentor") {
      router.replace("/mentor/dashboard");
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

      setMentoradoId(perfil.id);

      const { data, error } = await supabase
        .from("progresso_aulas")
        .select("aula_id")
        .eq("mentorado_id", perfil.id)
        .eq("concluida", true);

      if (error) {
        setErro(error.message);
        setCarregandoProgresso(false);
        return;
      }

      setAulasConcluidas((data ?? []).map((item) => item.aula_id));

      const { data: atividades, error: erroAtividades } = await supabase
        .from("modulo_atividades_mentorados")
        .select(
          "id, modulo_id, mentorado_id, atividade, observacao_mentor, resposta_mentorado, status"
        )
        .eq("mentorado_id", perfil.id);

      if (erroAtividades) {
        setErro(erroAtividades.message);
        setCarregandoProgresso(false);
        return;
      }

      setAtividadesPersonalizadas(
        (atividades ?? []) as AtividadePersonalizadaMentorado[]
      );

      const { data: liberacoes, error: erroLiberacoes } = await supabase
        .from("modulo_liberacoes")
        .select("modulo_id, status_liberacao, liberar_em");

      if (erroLiberacoes) {
        setErro(erroLiberacoes.message);
        setCarregandoProgresso(false);
        return;
      }

      setLiberacoesGlobais((liberacoes ?? []) as ModuloLiberacaoGlobal[]);

      setCarregandoProgresso(false);
    }

    carregarPerfilEProgresso();
  }, [usuario]);

  const modulosVisiveis = useMemo(() => {
    return modulos
      .filter((modulo) => modulo.ativo)
      .map((modulo) => ({
        ...modulo,
        aulas: modulo.aulas.filter((aula) => aula.ativo),
      }));
  }, [modulos]);

  const obterLiberacaoModulo = useCallback((moduloId: string) => {
    return (
      liberacoesGlobais.find((liberacao) => liberacao.modulo_id === moduloId) ??
      null
    );
  }, [liberacoesGlobais]);

  const moduloLiberado = useCallback((moduloId: string) => {
    const liberacao = obterLiberacaoModulo(moduloId);
    if (!liberacao) return false;

    const status = liberacao.status_liberacao ?? "fechado";

    if (status === "aberto") return true;

    if (status === "agendado" && liberacao.liberar_em) {
      return new Date(liberacao.liberar_em).getTime() <= Date.now();
    }

    return false;
  }, [obterLiberacaoModulo]);

  function textoBloqueioModulo(moduloId: string) {
    const liberacao = obterLiberacaoModulo(moduloId);

    if (
      liberacao?.status_liberacao === "agendado" &&
      liberacao.liberar_em &&
      new Date(liberacao.liberar_em).getTime() > Date.now()
    ) {
      return `Libera em ${formatarDataHora(liberacao.liberar_em)}`;
    }

    return "Aguardando liberação da mentora";
  }

  const modulosDisponiveis = useMemo(() => {
    return modulosVisiveis.filter((modulo) => moduloLiberado(modulo.id));
  }, [modulosVisiveis, moduloLiberado]);

  const modulosBloqueados = useMemo(() => {
    return modulosVisiveis.filter((modulo) => !moduloLiberado(modulo.id));
  }, [modulosVisiveis, moduloLiberado]);

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

  const progressoModuloSelecionado = useMemo(() => {
    if (!moduloSelecionado) {
      return { total: 0, concluidas: 0, percentual: 0, status: "Não iniciado" };
    }

    const total = moduloSelecionado.aulas.length;
    const concluidas = moduloSelecionado.aulas.filter((aula) =>
      aulasConcluidas.includes(aula.id)
    ).length;

    const percentual = total === 0 ? 0 : Math.round((concluidas / total) * 100);

    const status =
      total === 0
        ? "Não iniciado"
        : percentual === 100
        ? "Concluído"
        : percentual > 0
        ? "Em andamento"
        : "Não iniciado";

    return { total, concluidas, percentual, status };
  }, [moduloSelecionado, aulasConcluidas]);

  const atividadePersonalizadaModulo = useMemo(() => {
    if (!moduloSelecionado) return null;

    return (
      atividadesPersonalizadas.find(
        (atividade) => atividade.modulo_id === moduloSelecionado.id
      ) ?? null
    );
  }, [atividadesPersonalizadas, moduloSelecionado]);

  const arquivosDaAula = aulaSelecionada?.materiais_aula ?? [];

  const embedUrl = aulaSelecionada?.video_url
    ? converterYoutubeParaEmbed(aulaSelecionada.video_url)
    : "";

  function selecionarModulo(moduloId: string) {
    if (!moduloLiberado(moduloId)) {
      window.alert(textoBloqueioModulo(moduloId));
      return;
    }

    const modulo = modulosDisponiveis.find((item) => item.id === moduloId);
    const primeiraAula = modulo?.aulas[0];

    setModuloSelecionadoId(moduloId);
    setAulaSelecionadaId(primeiraAula?.id || "");
    setModalArquivosAberto(false);
  }

  function selecionarAula(moduloId: string, aulaId: string) {
    if (!moduloLiberado(moduloId)) {
      window.alert(textoBloqueioModulo(moduloId));
      return;
    }

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
        { onConflict: "mentorado_id,aula_id" }
      );

      if (error) throw new Error(error.message);

      setAulasConcluidas((estadoAtual) => {
        if (jaConcluida) return estadoAtual.filter((id) => id !== aulaId);
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
    await logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando || carregandoProgresso) {
    return <MentoradoLoading mensagem="Carregando módulos..." />;
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
                  Jornada CEO Club
                </p>

                <h2 className="line-clamp-1 text-base font-black sm:text-lg md:text-xl">
                  {moduloSelecionado ? getModuloPremium(moduloSelecionado) : "Módulos"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
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

        <div className="px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          {erro && (
            <section className="mb-4">
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                {erro}
              </div>
            </section>
          )}

          {modulosDisponiveis.length === 0 ? (
            <section>
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/70 sm:p-8">
                <h1 className="break-words text-xl font-black sm:text-2xl">
                  Nenhum módulo liberado ainda
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                  Seus próximos módulos ficam bloqueados até a mentora liberar a nova etapa da sua jornada.
                </p>
              </div>
            </section>
          ) : (
            <div className="min-w-0 space-y-5">
              {moduloSelecionado && (
                <section className="min-w-0 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-2xl shadow-[#07122F]/20 sm:p-5 lg:rounded-[28px] lg:p-6">
                  <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-200">
                        Módulo {moduloSelecionado.ordem}
                      </p>

                      <h1 className="mt-2 break-words text-xl font-black leading-tight sm:text-2xl lg:text-3xl">
                        {getModuloPremium(moduloSelecionado)}
                      </h1>

                      <p className="mt-2 break-words text-sm font-black text-blue-100">
                        {getModuloExplicativo(moduloSelecionado)}
                      </p>

                      <p className="mt-3 max-w-4xl break-words text-sm font-semibold leading-6 text-[#D9DEE7]">
                        {getModuloDescricaoCurta(moduloSelecionado) ||
                          "Este módulo ainda não possui descrição curta."}
                      </p>
                    </div>

                    <div className="w-full rounded-[20px] border border-white/15 bg-white/10 p-3 backdrop-blur-sm lg:max-w-[240px]">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
                        Status do mentorado
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <StatusMentoradoBadge status={progressoModuloSelecionado.status} />
                        <strong className="text-xl font-black">
                          {progressoModuloSelecionado.percentual}%
                        </strong>
                      </div>

                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/15">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{ width: `${progressoModuloSelecionado.percentual}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs font-bold text-blue-100">
                        {progressoModuloSelecionado.concluidas}/
                        {progressoModuloSelecionado.total} aula(s)
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start 2xl:grid-cols-[minmax(0,1fr)_430px]">
                <section className="min-w-0 space-y-4">
                  <section className="min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] shadow-2xl shadow-[#07122F]/20 sm:rounded-[24px]">
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
                            Aula CEO Club
                          </p>

                          <h1 className="mt-3 break-words text-xl font-black sm:text-2xl lg:text-3xl">
                            {aulaSelecionada?.titulo ?? "Aula"}
                          </h1>

                          <p className="mx-auto mt-4 max-w-xl text-sm font-bold text-blue-100">
                            Vídeo ainda não disponível para esta aula.
                          </p>
                        </div>
                      </div>
                    )}
                  </section>

                  <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <h2 className="max-w-3xl break-words text-xl font-black leading-tight text-[#050816] sm:text-2xl">
                        {aulaSelecionada?.titulo ||
                          getModuloPremium(moduloSelecionado as ModuloMentoria)}
                      </h2>

                      <div className="mt-3 flex flex-wrap gap-3">
                        {aulaSelecionada?.duracao && (
                          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm sm:text-sm">
                            ▶ {aulaSelecionada.duracao}
                          </span>
                        )}

                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm sm:text-sm">
                          {arquivosDaAula.length} material(is)
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <button
                        onClick={() => setModalArquivosAberto(true)}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-[#08163F] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        📄 Arquivos disponíveis
                      </button>

                      {aulaSelecionada && (
                        <button
                          disabled={salvandoProgresso}
                          onClick={() => alternarConclusao(aulaSelecionada.id)}
                          className={`rounded-2xl px-4 py-2.5 text-sm font-black shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
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

                  <section className="grid min-w-0 gap-3 md:grid-cols-2">
                    <InfoModuloCard
                      titulo="Objetivo do módulo"
                      texto={
                        moduloSelecionado?.objetivo_modulo ||
                        "A mentora ainda não adicionou o objetivo deste módulo."
                      }
                    />

                    <InfoModuloCard
                      titulo="Aula principal / encontros"
                      texto={
                        moduloSelecionado?.aula_principal ||
                        moduloSelecionado?.encontros ||
                        "A mentora ainda não adicionou a aula principal ou encontros."
                      }
                    />

                    <InfoModuloCard
                      titulo="Materiais"
                      texto={
                        moduloSelecionado?.materiais ||
                        "Os materiais principais ainda não foram descritos."
                      }
                    />

                    <AtividadePersonalizadaCard
                      atividade={atividadePersonalizadaModulo}
                    />
                  </section>

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
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
                      >
                        Praticar conteúdo →
                      </button>
                    }
                  />
                </section>

                <aside className="min-w-0 lg:sticky lg:top-[84px] lg:max-h-[calc(100vh-100px)]">
                  <section className="min-w-0 rounded-[22px] bg-white p-4 shadow-xl shadow-slate-200/70 sm:rounded-[24px]">
                    <div className="rounded-[20px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white sm:p-5">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                        Progresso do curso
                      </p>

                      <strong className="mt-4 block text-2xl font-black sm:text-3xl">
                        {aulasConcluidas.length}/{totalAulas}
                      </strong>

                      <p className="mt-2 text-sm font-bold text-blue-100">
                        {progressoGeral}% concluído
                      </p>

                      <p className="mt-1 text-xs font-bold text-blue-100">
                        {modulosBloqueados.length} módulo(s) bloqueado(s)
                      </p>

                      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full rounded-full bg-white" style={{ width: `${progressoGeral}%` }} />
                      </div>
                    </div>

                    <div className="mt-4 max-h-[calc(100vh-300px)] space-y-3 overflow-y-auto overflow-x-hidden pr-2">
                      {modulosVisiveis.map((modulo) => {
                        const bloqueado = !moduloLiberado(modulo.id);
                        const aulasConcluidasModulo = modulo.aulas.filter((aula) =>
                          aulasConcluidas.includes(aula.id)
                        ).length;

                        const percentualModulo =
                          modulo.aulas.length === 0
                            ? 0
                            : Math.round((aulasConcluidasModulo / modulo.aulas.length) * 100);

                        const statusModulo = bloqueado
                          ? "Bloqueado"
                          : modulo.aulas.length === 0
                          ? "Não iniciado"
                          : percentualModulo === 100
                          ? "Concluído"
                          : percentualModulo > 0
                          ? "Em andamento"
                          : "Não iniciado";

                        return (
                          <div key={modulo.id} className="min-w-0 overflow-hidden rounded-[20px] border border-slate-100">
                            <button
                              type="button"
                              onClick={() => selecionarModulo(modulo.id)}
                              className={`w-full px-4 py-3 text-left transition ${
                                bloqueado
                                  ? "cursor-not-allowed bg-slate-100 opacity-75"
                                  : moduloSelecionado?.id === modulo.id
                                  ? "bg-[#EEF2FF]"
                                  : "bg-[#f9fafb] hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="rounded-full bg-[#08163F] px-3 py-1.5 text-[11px] font-black text-white">
                                    Módulo {modulo.ordem}
                                  </span>

                                  <h3 className="mt-3 break-words text-base font-black leading-tight">
                                    {getModuloPremium(modulo)}
                                  </h3>

                                  <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-500">
                                    {getModuloExplicativo(modulo)}
                                  </p>
                                </div>

                                <span className="shrink-0 text-sm font-black text-slate-500">
                                  {aulasConcluidasModulo}/{modulo.aulas.length}
                                </span>
                              </div>

                              <div className="mt-2 flex items-center justify-between gap-3">
                                <StatusMentoradoBadge status={statusModulo} />
                                <span className="text-xs font-black text-slate-400">
                                  {percentualModulo}%
                                </span>
                              </div>

                              {bloqueado && (
                                <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-black text-slate-500">
                                  {textoBloqueioModulo(modulo.id)}
                                </p>
                              )}
                            </button>

                            {!bloqueado && moduloSelecionado?.id === modulo.id && (
                              <div className="divide-y divide-slate-100">
                                {modulo.aulas.length === 0 ? (
                                  <div className="px-4 py-4 text-sm font-bold text-slate-400">
                                    Nenhuma aula cadastrada neste módulo.
                                  </div>
                                ) : (
                                  modulo.aulas.map((aula) => {
                                    const concluida = aulasConcluidas.includes(aula.id);
                                    const selecionada = aulaSelecionada?.id === aula.id;

                                    return (
                                      <AulaListaButton
                                        key={aula.id}
                                        aula={aula}
                                        concluida={concluida}
                                        selecionada={selecionada}
                                        onClick={() => selecionarAula(modulo.id, aula.id)}
                                      />
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          )}
        </div>
      </section>

      {modalArquivosAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[min(96vw,52rem)] rounded-[24px] bg-white p-4 shadow-2xl sm:rounded-[30px] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Materiais da aula
                </p>

                <h2 className="break-words text-xl font-black text-[#050816] sm:text-2xl lg:text-3xl">
                  Arquivos disponíveis
                </h2>
              </div>

              <button
                onClick={() => setModalArquivosAberto(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f5f8] text-xl font-black text-[#08163F] transition hover:bg-gray-200"
              >
                ×
              </button>
            </div>

            {arquivosDaAula.length > 0 ? (
              <div className="space-y-4">
                {arquivosDaAula.map((arquivo) => (
                  <div key={arquivo.id} className="flex min-w-0 flex-col gap-3 rounded-[20px] bg-[#f9fafb] p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-base font-black text-[#08163F] sm:text-lg">
                        📄 {arquivo.nome}
                      </p>

                      <p className="mt-1 max-w-xl text-sm font-bold text-gray-500">
                        Material disponível para abrir em nova aba.
                      </p>
                    </div>

                    <a href={arquivo.url} target="_blank" rel="noreferrer" className="rounded-2xl bg-gradient-to-b from-[#F3F4F6] via-[#D1D5DB] to-[#9CA3AF] px-5 py-3 text-center text-sm font-black text-[#08163F] shadow-lg transition hover:brightness-105">
                      Abrir material →
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] bg-[#f9fafb] p-6 text-center">
                <p className="text-xl font-black text-[#08163F]">
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

function AulaListaButton({
  aula,
  concluida,
  selecionada,
  onClick,
}: {
  aula: AulaModulo;
  concluida: boolean;
  selecionada: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition sm:gap-4 ${
        selecionada ? "bg-[#EEF2FF]" : "bg-white hover:bg-slate-50"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${
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
        <span className="block truncate font-black">{aula.titulo}</span>

        <span className="mt-1 block text-xs font-bold text-slate-400">
          {aula.duracao
            ? `▶ ${aula.duracao}`
            : aula.video_url
            ? "Vídeo disponível"
            : "Sem vídeo"}
        </span>
      </span>

      <span className="text-xl text-slate-400">{selecionada ? "•" : "›"}</span>
    </button>
  );
}

function InfoModuloCard({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <article className="min-w-0 rounded-[20px] bg-white p-4 shadow-xl shadow-slate-200/70">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {titulo}
      </p>

      <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6 text-slate-600">
        {texto}
      </p>
    </article>
  );
}

function AtividadePersonalizadaCard({
  atividade,
}: {
  atividade: AtividadePersonalizadaMentorado | null;
}) {
  return (
    <article className="min-w-0 rounded-[20px] bg-white p-4 shadow-xl shadow-slate-200/70 md:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Sua atividade prática
          </p>

          <h3 className="mt-2 break-words text-base font-black text-[#08163F] sm:text-lg">
            Plano personalizado para este módulo
          </h3>
        </div>

        {atividade && <StatusMentoradoBadge status={atividade.status} />}
      </div>

      {atividade ? (
        <div className="mt-4 space-y-3">
          <p className="whitespace-pre-line break-words text-sm font-semibold leading-6 text-slate-600">
            {atividade.atividade}
          </p>

          {atividade.observacao_mentor && (
            <p className="whitespace-pre-line break-words rounded-2xl bg-[#f9fafb] p-3 text-sm font-semibold leading-6 text-slate-500">
              Orientação da mentora: {atividade.observacao_mentor}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 break-words text-sm font-semibold leading-7 text-slate-500">
          A mentora ainda não personalizou uma atividade prática para você neste
          módulo. Quando ela adaptar a tarefa para sua dor atual, ela aparecerá
          aqui.
        </p>
      )}
    </article>
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
    <article className="w-full min-w-0 rounded-[20px] bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            {eyebrow}
          </p>

          <h3 className="mt-2 break-words text-lg font-black leading-tight text-[#08163F] sm:text-xl">
            {titulo}
          </h3>

          <p className="mt-3 max-w-none whitespace-pre-line break-words text-sm font-semibold leading-6 text-slate-500">
            {texto}
          </p>
        </div>

        {acao && <div className="flex shrink-0 xl:pl-6">{acao}</div>}
      </div>
    </article>
  );
}

function StatusMentoradoBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    "Não iniciado": "bg-slate-100 text-slate-600",
    "Não iniciada": "bg-slate-100 text-slate-600",
    "Em andamento": "bg-blue-100 text-blue-700",
    Entregue: "bg-purple-100 text-purple-700",
    Concluído: "bg-emerald-100 text-emerald-700",
    Concluída: "bg-emerald-100 text-emerald-700",
    Revisar: "bg-yellow-100 text-yellow-700",
    Bloqueado: "bg-slate-200 text-slate-600",
  };

  return (
    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${classes[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}
