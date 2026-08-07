"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageLoading from "@/components/PageLoading";
import Sidebar from "@/components/Sidebar";
import {
  logoutUsuario,
  rotaInicialUsuario,
  sincronizarUsuarioComSessao,
  User,
} from "@/utils/auth";
import { aplicarStatusFinanceiroEfetivo } from "@/utils/financeiroStatus";
import {
  idsModulosLiberados,
  moduloEstaLiberado,
  ModuloLiberacaoGlobal,
} from "@/utils/moduloLiberacoes";
import { supabase } from "@/utils/supabase";

type Mentorado = {
  id: string;
  nome: string;
  email: string | null;
  role: string | null;
  telefone: string | null;
  status: string | null;
  created_at: string | null;
};

type CobrancaFinanceira = {
  id: string;
  mentorado_id: string;
  titulo: string;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: "Pago" | "Pendente" | "Atrasado" | "Cancelado";
};

type EventoAgenda = {
  id: string;
  mentorado_id: string;
  titulo: string | null;
  tipo: "Mentoria" | "Módulo" | "Reunião" | "Presencial";
  data: string;
  horario: string;
  status: "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";
  observacao: string | null;
};

type ModuloBanco = {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number | null;
  ativo: boolean | null;
};

type AulaBanco = {
  id: string;
  modulo_id: string;
  titulo: string;
  ordem: number | null;
  ativo: boolean | null;
};

type ProgressoAula = {
  id: string;
  mentorado_id: string;
  aula_id: string;
  concluida: boolean | null;
};

type Simulado = {
  id: string;
  titulo: string;
  ativo: boolean | null;
  status: string | null;
  created_at: string;
};

type EventoComMentorado = EventoAgenda & {
  mentoradoNome: string;
};

type MentoradoResumo = Mentorado & {
  progresso: number;
  aulasConcluidas: number;
  totalAulas: number;
  financeiroAberto: number;
  cobrancasAtrasadas: number;
};

function normalizar(valor: string | null | undefined) {
  return String(valor ?? "").trim().toLowerCase();
}

function mentoradoEstaAtivo(mentorado: Mentorado) {
  const status = normalizar(mentorado.status);
  return status === "" || status === "ativo";
}

function mentoradoEmAcompanhamento(mentorado: Mentorado) {
  const status = normalizar(mentorado.status);
  return !["inativo", "cancelado", "bloqueado", "suspenso"].includes(status);
}

export default function DashboardPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [cobrancas, setCobrancas] = useState<CobrancaFinanceira[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [modulos, setModulos] = useState<ModuloBanco[]>([]);
  const [aulas, setAulas] = useState<AulaBanco[]>([]);
  const [liberacoes, setLiberacoes] = useState<ModuloLiberacaoGlobal[]>([]);
  const [progressoAulas, setProgressoAulas] = useState<ProgressoAula[]>([]);
  const [simulados, setSimulados] = useState<Simulado[]>([]);

  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState("");

  const carregarDashboard = useCallback(async () => {
    try {
      setCarregandoDados(true);
      setErro("");

      const [
        mentoradosResposta,
        cobrancasResposta,
        eventosResposta,
        modulosResposta,
        liberacoesResposta,
        aulasResposta,
        simuladosResposta,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nome, email, role, telefone, status, created_at")
          .is("excluido_em", null)
          .eq("role", "mentorado")
          .order("nome", { ascending: true }),
        supabase
          .from("financeiro_cobrancas")
          .select(
            "id, mentorado_id, titulo, valor_parcela, data_vencimento, data_pagamento, status"
          )
          .order("data_vencimento", { ascending: true }),
        supabase
          .from("agenda_eventos")
          .select(
            "id, mentorado_id, titulo, tipo, data, horario, status, observacao"
          )
          .order("data", { ascending: true })
          .order("horario", { ascending: true }),
        supabase
          .from("modulos")
          .select("id, titulo, descricao, ordem, ativo")
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
        supabase
          .from("modulo_liberacoes")
          .select("modulo_id, status_liberacao, liberar_em"),
        supabase
          .from("aulas")
          .select("id, modulo_id, titulo, ordem, ativo")
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
        supabase
          .from("simulados")
          .select("id, titulo, ativo, status, created_at")
          .eq("ativo", true)
          .order("created_at", { ascending: false }),
      ]);

      const primeiraFalha = [
        mentoradosResposta.error,
        cobrancasResposta.error,
        eventosResposta.error,
        modulosResposta.error,
        liberacoesResposta.error,
        aulasResposta.error,
        simuladosResposta.error,
      ].find(Boolean);

      if (primeiraFalha) {
        throw new Error(primeiraFalha.message);
      }

      const mentoradosData = (mentoradosResposta.data ?? []) as Mentorado[];
      const mentoradoIds = mentoradosData.map((item) => item.id);

      setMentorados(mentoradosData);
      setCobrancas(
        aplicarStatusFinanceiroEfetivo(
          (cobrancasResposta.data ?? []) as CobrancaFinanceira[]
        )
      );
      setEventos((eventosResposta.data ?? []) as EventoAgenda[]);
      setModulos((modulosResposta.data ?? []) as ModuloBanco[]);
      setLiberacoes(
        (liberacoesResposta.data ?? []) as ModuloLiberacaoGlobal[]
      );
      setAulas((aulasResposta.data ?? []) as AulaBanco[]);
      setSimulados((simuladosResposta.data ?? []) as Simulado[]);

      if (mentoradoIds.length === 0) {
        setProgressoAulas([]);
        return;
      }

      const { data: progressoData, error: progressoError } = await supabase
        .from("progresso_aulas")
        .select("id, mentorado_id, aula_id, concluida")
        .in("mentorado_id", mentoradoIds);

      if (progressoError) {
        throw new Error(progressoError.message);
      }

      setProgressoAulas((progressoData ?? []) as ProgressoAula[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados do painel."
      );
    } finally {
      setCarregandoDados(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      const user = await sincronizarUsuarioComSessao();

      if (!ativo) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      if (user.role !== "mentor") {
        router.replace(rotaInicialUsuario(user));
        return;
      }

      setUsuario(user);
      await carregarDashboard();
    }

    void iniciar();

    return () => {
      ativo = false;
    };
  }, [carregarDashboard, router]);

  const mentoradosAtivos = useMemo(
    () => mentorados.filter(mentoradoEstaAtivo),
    [mentorados]
  );

  const mentoradosAcompanhados = useMemo(
    () => mentorados.filter(mentoradoEmAcompanhamento),
    [mentorados]
  );

  const modulosLiberadosIds = useMemo(
    () => idsModulosLiberados(liberacoes),
    [liberacoes]
  );

  const modulosLiberados = useMemo(
    () => modulos.filter((modulo) => modulosLiberadosIds.has(modulo.id)),
    [modulos, modulosLiberadosIds]
  );

  const aulasLiberadas = useMemo(
    () =>
      aulas.filter(
        (aula) =>
          aula.ativo !== false && modulosLiberadosIds.has(aula.modulo_id)
      ),
    [aulas, modulosLiberadosIds]
  );

  const aulasLiberadasIds = useMemo(
    () => new Set(aulasLiberadas.map((aula) => aula.id)),
    [aulasLiberadas]
  );

  const calcularProgressoMentorado = useCallback(
    (mentoradoId: string) => {
      const totalAulas = aulasLiberadas.length;

      if (totalAulas === 0) {
        return {
          progresso: 0,
          aulasConcluidas: 0,
          totalAulas: 0,
        };
      }

      const aulasConcluidas = progressoAulas.filter(
        (item) =>
          item.mentorado_id === mentoradoId &&
          item.concluida === true &&
          aulasLiberadasIds.has(item.aula_id)
      ).length;

      return {
        progresso: Math.round((aulasConcluidas / totalAulas) * 100),
        aulasConcluidas,
        totalAulas,
      };
    },
    [aulasLiberadas.length, aulasLiberadasIds, progressoAulas]
  );

  const mentoradosComResumo = useMemo<MentoradoResumo[]>(() => {
    return mentoradosAcompanhados.map((mentorado) => {
      const progresso = calcularProgressoMentorado(mentorado.id);
      const cobrancasDoMentorado = cobrancas.filter(
        (item) => item.mentorado_id === mentorado.id
      );

      const financeiroAberto = cobrancasDoMentorado
        .filter(
          (item) => item.status !== "Pago" && item.status !== "Cancelado"
        )
        .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

      const cobrancasAtrasadas = cobrancasDoMentorado.filter(
        (item) => item.status === "Atrasado"
      ).length;

      return {
        ...mentorado,
        progresso: progresso.progresso,
        aulasConcluidas: progresso.aulasConcluidas,
        totalAulas: progresso.totalAulas,
        financeiroAberto,
        cobrancasAtrasadas,
      };
    });
  }, [mentoradosAcompanhados, calcularProgressoMentorado, cobrancas]);

  const resumoFinanceiro = useMemo(() => {
    const emAberto = cobrancas.filter(
      (item) => item.status !== "Pago" && item.status !== "Cancelado"
    );
    const atrasadas = cobrancas.filter((item) => item.status === "Atrasado");

    return {
      totalAberto: emAberto.reduce(
        (acc, item) => acc + Number(item.valor_parcela || 0),
        0
      ),
      totalAtrasado: atrasadas.reduce(
        (acc, item) => acc + Number(item.valor_parcela || 0),
        0
      ),
      quantidadeAberta: emAberto.length,
      quantidadeAtrasada: atrasadas.length,
    };
  }, [cobrancas]);

  const progressoMedio = useMemo(() => {
    if (mentoradosAtivos.length === 0) return 0;

    const resumosAtivos = mentoradosAtivos.map((mentorado) =>
      calcularProgressoMentorado(mentorado.id)
    );

    return Math.round(
      resumosAtivos.reduce((acc, item) => acc + item.progresso, 0) /
        resumosAtivos.length
    );
  }, [mentoradosAtivos, calcularProgressoMentorado]);

  const proximosEventos = useMemo<EventoComMentorado[]>(() => {
    const agora = new Date();

    return eventos
      .filter((evento) => {
        if (["Cancelada", "Concluída"].includes(evento.status)) return false;

        const dataEvento = new Date(
          `${evento.data}T${limparHorario(evento.horario)}:00`
        );

        return dataEvento.getTime() >= agora.getTime();
      })
      .sort((a, b) => {
        const dataA = new Date(
          `${a.data}T${limparHorario(a.horario)}:00`
        ).getTime();
        const dataB = new Date(
          `${b.data}T${limparHorario(b.horario)}:00`
        ).getTime();

        return dataA - dataB;
      })
      .slice(0, 5)
      .map((evento) => ({
        ...evento,
        mentoradoNome:
          mentorados.find((item) => item.id === evento.mentorado_id)?.nome ??
          "Mentorado",
      }));
  }, [eventos, mentorados]);

  const pendencias = useMemo(() => {
    return {
      mentoradosPendentes: mentorados.filter(
        (item) => normalizar(item.status) === "pendente"
      ).length,
      cobrancasAtrasadas: resumoFinanceiro.quantidadeAtrasada,
      eventosAguardando: eventos.filter(
        (evento) =>
          evento.status === "Aguardando" && eventoNoFuturo(evento)
      ).length,
    };
  }, [mentorados, eventos, resumoFinanceiro.quantidadeAtrasada]);

  const totalPendencias =
    pendencias.mentoradosPendentes +
    pendencias.cobrancasAtrasadas +
    pendencias.eventosAguardando;

  const mentoradosOrdenados = useMemo(() => {
    return [...mentoradosComResumo]
      .sort((a, b) => {
        if (b.cobrancasAtrasadas !== a.cobrancasAtrasadas) {
          return b.cobrancasAtrasadas - a.cobrancasAtrasadas;
        }

        if (a.progresso !== b.progresso) {
          return a.progresso - b.progresso;
        }

        return a.nome.localeCompare(b.nome, "pt-BR");
      })
      .slice(0, 6);
  }, [mentoradosComResumo]);

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregandoDados) {
    return <PageLoading pagina="painel da mentora" />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar
        nome={usuario.nome}
        role={usuario.role}
        acessoSuporte={Boolean(usuario.acesso_suporte)}
      />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#07122F] to-[#12317C] text-xs font-black text-white shadow-lg">
              CC
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Área da mentora
              </p>
              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
                Painel estratégico
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void sair()}
            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
          >
            Sair
          </button>
        </header>

        <div className="relative min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px] lg:p-6">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-lg sm:h-24 sm:w-24">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#D9DEE7] to-[#9CA3AF] text-2xl font-black uppercase text-white sm:h-16 sm:w-16">
                    {usuario.nome.charAt(0)}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                    CEO Club
                  </p>
                  <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                    Olá, {usuario.nome}
                  </h2>
                  <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-[#D9DEE7]">
                    Acompanhe mentorados, progresso, encontros, financeiro e conteúdo da mentoria em uma visão única.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/mentor/mentorados/lista")}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:brightness-95"
                >
                  Ver mentorados
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/mentor/agenda")}
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
                >
                  + Agendar encontro
                </button>
              </div>
            </div>
          </section>

          {erro && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <span>Não foi possível carregar todos os dados: {erro}</span>
              <button
                type="button"
                onClick={() => void carregarDashboard()}
                className="shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-black text-red-700 shadow-sm transition hover:shadow-md"
              >
                Tentar novamente
              </button>
            </div>
          )}

          <section className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KPI titulo="Mentorados ativos" valor={mentoradosAtivos.length} destaque />
            <KPI titulo="Progresso médio" valor={`${progressoMedio}%`} />
            <KPI titulo="Em aberto" valor={formatarMoeda(resumoFinanceiro.totalAberto)} />
            <KPI
              titulo="Cobranças atrasadas"
              valor={resumoFinanceiro.quantidadeAtrasada}
              alerta={resumoFinanceiro.quantidadeAtrasada > 0}
            />
            <KPI
              titulo="Pendências"
              valor={totalPendencias}
              alerta={totalPendencias > 0}
            />
          </section>

          <section className="mb-4 min-w-0 rounded-[20px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-gray-500">
                Evolução geral dos mentorados ativos
              </p>
              <p className="text-sm font-black text-[#08163F]">{progressoMedio}%</p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                style={{ width: `${Math.min(100, Math.max(0, progressoMedio))}%` }}
              />
            </div>

            <p className="mt-3 break-words text-sm font-semibold text-gray-500">
              Média baseada apenas nas aulas dos módulos já liberados aos mentorados.
            </p>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <Card titulo="Mentorados em acompanhamento">
              {mentoradosOrdenados.length === 0 ? (
                <EmptyState
                  titulo="Nenhum mentorado em acompanhamento"
                  texto="Quando houver mentorados ativos ou pendentes, eles aparecerão aqui. Os acessos são administrados pela área de Suporte."
                  botao="Ver mentorados"
                  onClick={() => router.push("/mentor/mentorados/lista")}
                />
              ) : (
                <div className="space-y-4">
                  {mentoradosOrdenados.map((mentorado) => (
                    <button
                      key={mentorado.id}
                      type="button"
                      onClick={() =>
                        router.push(`/mentor/mentorados/${mentorado.id}`)
                      }
                      className="w-full min-w-0 rounded-2xl border border-gray-100 bg-[#f9fafb] p-3 text-left transition hover:border-[#12317C]/20 hover:bg-white hover:shadow-md sm:p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="break-words font-black text-[#08163F]">
                              {mentorado.nome}
                            </p>
                            <StatusBadge status={mentorado.status || "Ativo"} />
                          </div>

                          <p className="mt-1 break-words text-sm font-medium text-gray-500">
                            {mentorado.email || "E-mail não informado"}
                          </p>

                          <p className="mt-2 text-xs font-bold text-gray-400">
                            {mentorado.aulasConcluidas}/{mentorado.totalAulas} aulas · {mentorado.progresso}% concluído
                          </p>

                          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, mentorado.progresso)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="min-w-0 text-left md:text-right">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                            Em aberto
                          </p>
                          <p className="mt-1 break-words text-sm font-black text-[#08163F]">
                            {formatarMoeda(mentorado.financeiroAberto)}
                          </p>

                          {mentorado.cobrancasAtrasadas > 0 && (
                            <p className="mt-1 text-xs font-black text-red-600">
                              {mentorado.cobrancasAtrasadas} atrasada(s)
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <div className="min-w-0 space-y-4">
              <Card titulo="Financeiro">
                <div className="min-w-0 rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white sm:p-5">
                  <p className="text-sm font-bold text-[#C9CED6]">Em aberto</p>
                  <p className="mt-2 break-words text-xl font-black leading-tight sm:text-2xl">
                    {formatarMoeda(resumoFinanceiro.totalAberto)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#D9DEE7]">
                    {resumoFinanceiro.quantidadeAberta} cobrança(s) em aberto.
                  </p>

                  {resumoFinanceiro.quantidadeAtrasada > 0 && (
                    <div className="mt-4 rounded-2xl bg-red-500/15 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-100">
                        Atenção
                      </p>
                      <p className="mt-2 font-black">
                        {resumoFinanceiro.quantidadeAtrasada} cobrança(s) atrasada(s), totalizando {formatarMoeda(resumoFinanceiro.totalAtrasado)}.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => router.push("/mentor/financeiro")}
                    className="mt-5 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-[#08163F] transition hover:brightness-95"
                  >
                    Abrir financeiro →
                  </button>
                </div>
              </Card>

              <Card titulo="Próximos encontros">
                {proximosEventos.length === 0 ? (
                  <EmptyState
                    titulo="Nenhum encontro futuro"
                    texto="Quando houver encontros futuros e não cancelados, eles aparecerão aqui."
                    botao="Abrir agenda"
                    onClick={() => router.push("/mentor/agenda")}
                  />
                ) : (
                  <div className="space-y-3">
                    {proximosEventos.map((evento) => (
                      <button
                        key={evento.id}
                        type="button"
                        onClick={() => router.push("/mentor/agenda")}
                        className="w-full min-w-0 rounded-2xl bg-[#f9fafb] p-3 text-left transition hover:bg-white hover:shadow-md"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                          {formatarData(evento.data)} · {limparHorario(evento.horario)}
                        </p>
                        <p className="mt-1 break-words text-sm font-black text-[#08163F]">
                          {evento.titulo || evento.tipo}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-500">
                          {evento.mentoradoNome} · {evento.status}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card titulo="Módulos e aulas">
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ResumoBox titulo="Módulos ativos" valor={String(modulos.length)} />
                <ResumoBox titulo="Módulos liberados" valor={String(modulosLiberados.length)} />
                <ResumoBox titulo="Aulas liberadas" valor={String(aulasLiberadas.length)} />
                <ResumoBox titulo="Simulados ativos" valor={String(simulados.length)} />
              </div>

              <div className="mt-5 space-y-3">
                {modulos.slice(0, 4).map((modulo) => {
                  const aulasDoModulo = aulas.filter(
                    (aula) => aula.modulo_id === modulo.id && aula.ativo !== false
                  );
                  const liberacao = liberacoes.find(
                    (item) => item.modulo_id === modulo.id
                  );

                  return (
                    <button
                      key={modulo.id}
                      type="button"
                      onClick={() => router.push("/mentor/modulos")}
                      className="w-full min-w-0 rounded-2xl bg-[#f9fafb] p-4 text-left transition hover:bg-white hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                          Módulo {modulo.ordem ?? "—"}
                        </p>
                        <LiberacaoBadge liberacao={liberacao} />
                      </div>
                      <p className="mt-1 break-words text-sm font-black text-[#08163F]">
                        {modulo.titulo}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        {aulasDoModulo.length} aula(s) ativa(s)
                      </p>
                    </button>
                  );
                })}

                {modulos.length === 0 && (
                  <EmptyState
                    titulo="Nenhum módulo cadastrado"
                    texto="Crie módulos e aulas para liberar conteúdo aos mentorados."
                    botao="Gerenciar módulos"
                    onClick={() => router.push("/mentor/modulos")}
                  />
                )}
              </div>
            </Card>

            <div className="min-w-0 space-y-4">
              <Card titulo="Pendências prioritárias">
                <div className="space-y-3">
                  <PendenciaItem
                    titulo="Cobranças atrasadas"
                    valor={pendencias.cobrancasAtrasadas}
                    texto="Acompanhar valores em atraso."
                    alerta={pendencias.cobrancasAtrasadas > 0}
                    onClick={() => router.push("/mentor/financeiro")}
                  />
                  <PendenciaItem
                    titulo="Encontros aguardando"
                    valor={pendencias.eventosAguardando}
                    texto="Eventos futuros aguardando confirmação."
                    alerta={pendencias.eventosAguardando > 0}
                    onClick={() => router.push("/mentor/agenda")}
                  />
                  <PendenciaItem
                    titulo="Mentorados pendentes"
                    valor={pendencias.mentoradosPendentes}
                    texto="Acessos pendentes são regularizados pelo Suporte."
                    alerta={pendencias.mentoradosPendentes > 0}
                    onClick={() => router.push("/mentor/mentorados/lista")}
                  />
                </div>
              </Card>

              <Card titulo="Ações rápidas">
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <ActionButton
                    label="Ver mentorados"
                    onClick={() => router.push("/mentor/mentorados/lista")}
                  />
                  <ActionButton
                    label="Agenda"
                    onClick={() => router.push("/mentor/agenda")}
                  />
                  <ActionButton
                    label="Módulos"
                    onClick={() => router.push("/mentor/modulos")}
                  />
                  <ActionButton
                    label="Simulados"
                    onClick={() => router.push("/mentor/simulados")}
                  />
                  <ActionButton
                    label="Biblioteca"
                    onClick={() => router.push("/mentor/biblioteca")}
                  />
                  <ActionButton
                    label="Relatórios"
                    onClick={() => router.push("/mentor/relatorios")}
                  />
                </div>
              </Card>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function formatarData(data: string) {
  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function limparHorario(horario: string) {
  return horario?.slice(0, 5) || "";
}

function eventoNoFuturo(evento: EventoAgenda, agora = new Date()) {
  if (["Cancelada", "Concluída"].includes(evento.status)) return false;

  const dataEvento = new Date(
    `${evento.data}T${limparHorario(evento.horario)}:00`
  );

  return dataEvento.getTime() >= agora.getTime();
}

function KPI({
  titulo,
  valor,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: React.ReactNode;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-[20px] p-4 shadow-lg shadow-slate-200/70 sm:p-5 ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : alerta
          ? "bg-yellow-50 text-yellow-800"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`break-words text-xs font-black sm:text-sm ${
          destaque
            ? "text-[#C9CED6]"
            : alerta
            ? "text-yellow-600"
            : "text-gray-500"
        }`}
      >
        {titulo}
      </p>
      <p className="mt-3 break-words text-xl font-black leading-tight sm:text-2xl lg:text-3xl">
        {valor}
      </p>
    </div>
  );
}

function Card({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-lg shadow-slate-200/70 sm:rounded-[24px]">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
        <h3 className="break-words text-lg font-black text-[#050816] sm:text-xl">
          {titulo}
        </h3>
      </div>
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function EmptyState({
  titulo,
  texto,
  botao,
  onClick,
}: {
  titulo: string;
  texto: string;
  botao?: string;
  onClick?: () => void;
}) {
  return (
    <div className="min-w-0 rounded-[22px] bg-[#f9fafb] p-4 text-center sm:p-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-white text-2xl shadow-sm sm:h-16 sm:w-16 sm:text-3xl">
        ✦
      </div>
      <h3 className="mt-4 break-words text-base font-black text-[#08163F] sm:text-lg">
        {titulo}
      </h3>
      <p className="mx-auto mt-2 max-w-md break-words text-sm font-semibold leading-relaxed text-gray-500">
        {texto}
      </p>

      {botao && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-5 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-[#08163F] shadow-sm transition hover:shadow-md"
        >
          {botao} →
        </button>
      )}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-2xl bg-[#f9fafb] p-4 text-left text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
    >
      {label} →
    </button>
  );
}

function PendenciaItem({
  titulo,
  valor,
  texto,
  alerta,
  onClick,
}: {
  titulo: string;
  valor: number;
  texto: string;
  alerta: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition hover:bg-white hover:shadow-md ${
        alerta
          ? "border-amber-200 bg-amber-50/70"
          : "border-gray-100 bg-[#f9fafb]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-[#08163F]">{titulo}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            alerta
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {valor}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
        {texto}
      </p>
    </button>
  );
}

function ResumoBox({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
        {titulo}
      </p>
      <p className="mt-2 break-words text-xl font-black text-[#08163F]">
        {valor}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusLower = normalizar(status);

  const classe =
    statusLower === "ativo"
      ? "bg-emerald-50 text-emerald-700"
      : statusLower === "pendente"
      ? "bg-amber-50 text-amber-700"
      : statusLower === "inativo"
      ? "bg-slate-100 text-slate-600"
      : statusLower === "cancelado" || statusLower === "bloqueado"
      ? "bg-red-50 text-red-700"
      : "bg-blue-50 text-blue-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classe}`}>
      {status}
    </span>
  );
}

function LiberacaoBadge({
  liberacao,
}: {
  liberacao: ModuloLiberacaoGlobal | undefined;
}) {
  const liberado = moduloEstaLiberado(liberacao);
  const agendado =
    !liberado &&
    liberacao?.status_liberacao === "agendado" &&
    Boolean(liberacao.liberar_em);

  const texto = liberado ? "Liberado" : agendado ? "Agendado" : "Fechado";
  const classe = liberado
    ? "bg-emerald-50 text-emerald-700"
    : agendado
    ? "bg-blue-50 text-blue-700"
    : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${classe}`}>
      {texto}
    </span>
  );
}
