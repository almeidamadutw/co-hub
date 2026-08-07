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
  cobrancasAtrasadas: number;
  encontrosAguardando: number;
};

type MentoradoPrioritario = MentoradoResumo & {
  motivos: string[];
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

  const eventosAguardandoPorMentorado = useMemo(() => {
    const mapa = new Map<string, number>();

    eventos.forEach((evento) => {
      if (evento.status !== "Aguardando" || !eventoNoFuturo(evento)) return;

      mapa.set(
        evento.mentorado_id,
        (mapa.get(evento.mentorado_id) ?? 0) + 1
      );
    });

    return mapa;
  }, [eventos]);

  const mentoradosComResumo = useMemo<MentoradoResumo[]>(() => {
    return mentoradosAcompanhados.map((mentorado) => {
      const progresso = calcularProgressoMentorado(mentorado.id);
      const cobrancasDoMentorado = cobrancas.filter(
        (item) => item.mentorado_id === mentorado.id
      );

      return {
        ...mentorado,
        progresso: progresso.progresso,
        aulasConcluidas: progresso.aulasConcluidas,
        totalAulas: progresso.totalAulas,
        cobrancasAtrasadas: cobrancasDoMentorado.filter(
          (item) => item.status === "Atrasado"
        ).length,
        encontrosAguardando:
          eventosAguardandoPorMentorado.get(mentorado.id) ?? 0,
      };
    });
  }, [
    mentoradosAcompanhados,
    calcularProgressoMentorado,
    cobrancas,
    eventosAguardandoPorMentorado,
  ]);

  const mentoradosAtivosComResumo = useMemo(
    () =>
      mentoradosComResumo.filter((mentorado) =>
        mentoradoEstaAtivo(mentorado)
      ),
    [mentoradosComResumo]
  );

  const resumoFinanceiro = useMemo(() => {
    const atrasadas = cobrancas.filter((item) => item.status === "Atrasado");

    return {
      quantidadeAtrasada: atrasadas.length,
      totalAtrasado: atrasadas.reduce(
        (acc, item) => acc + Number(item.valor_parcela || 0),
        0
      ),
    };
  }, [cobrancas]);

  const progressoMedio = useMemo(() => {
    if (mentoradosAtivosComResumo.length === 0) return 0;

    return Math.round(
      mentoradosAtivosComResumo.reduce(
        (acc, item) => acc + item.progresso,
        0
      ) / mentoradosAtivosComResumo.length
    );
  }, [mentoradosAtivosComResumo]);

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
      .slice(0, 4)
      .map((evento) => ({
        ...evento,
        mentoradoNome:
          mentorados.find((item) => item.id === evento.mentorado_id)?.nome ??
          "Mentorado",
      }));
  }, [eventos, mentorados]);

  const mentoradosPrioritarios = useMemo<MentoradoPrioritario[]>(() => {
    return mentoradosComResumo
      .map((mentorado) => {
        const motivos: string[] = [];
        const status = normalizar(mentorado.status);

        if (status === "pendente") {
          motivos.push("Acesso pendente");
        }

        if (mentorado.cobrancasAtrasadas > 0) {
          motivos.push(
            mentorado.cobrancasAtrasadas === 1
              ? "1 cobrança atrasada"
              : `${mentorado.cobrancasAtrasadas} cobranças atrasadas`
          );
        }

        if (mentorado.encontrosAguardando > 0) {
          motivos.push(
            mentorado.encontrosAguardando === 1
              ? "Encontro aguardando"
              : `${mentorado.encontrosAguardando} encontros aguardando`
          );
        }

        if (
          mentoradoEstaAtivo(mentorado) &&
          mentorado.totalAulas > 0 &&
          mentorado.progresso === 0
        ) {
          motivos.push("Sem progresso registrado");
        }

        return {
          ...mentorado,
          motivos,
        };
      })
      .filter((mentorado) => mentorado.motivos.length > 0)
      .sort((a, b) => {
        if (b.cobrancasAtrasadas !== a.cobrancasAtrasadas) {
          return b.cobrancasAtrasadas - a.cobrancasAtrasadas;
        }

        if (b.motivos.length !== a.motivos.length) {
          return b.motivos.length - a.motivos.length;
        }

        if (a.progresso !== b.progresso) {
          return a.progresso - b.progresso;
        }

        return a.nome.localeCompare(b.nome, "pt-BR");
      })
      .slice(0, 5);
  }, [mentoradosComResumo]);

  const resumoJornada = useMemo(() => {
    return mentoradosAtivosComResumo.reduce(
      (resumo, mentorado) => {
        if (mentorado.progresso <= 0) {
          resumo.semProgresso += 1;
        } else if (mentorado.progresso >= 100) {
          resumo.concluidos += 1;
        } else {
          resumo.emAndamento += 1;
        }

        return resumo;
      },
      {
        semProgresso: 0,
        emAndamento: 0,
        concluidos: 0,
      }
    );
  }, [mentoradosAtivosComResumo]);

  const encontrosAguardando = useMemo(
    () =>
      eventos.filter(
        (evento) =>
          evento.status === "Aguardando" && eventoNoFuturo(evento)
      ).length,
    [eventos]
  );

  const proximaLiberacaoAgendada = useMemo(() => {
    const agora = Date.now();

    const liberacao = liberacoes
      .filter(
        (item) =>
          item.status_liberacao === "agendado" &&
          item.liberar_em &&
          new Date(item.liberar_em).getTime() > agora
      )
      .sort(
        (a, b) =>
          new Date(a.liberar_em as string).getTime() -
          new Date(b.liberar_em as string).getTime()
      )[0];

    if (!liberacao?.liberar_em) return null;

    return {
      data: liberacao.liberar_em,
      modulo:
        modulos.find((item) => item.id === liberacao.modulo_id)?.titulo ??
        "Módulo",
    };
  }, [liberacoes, modulos]);

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregandoDados) {
    return <PageLoading pagina="painel da mentora" />;
  }

  const proximoEvento = proximosEventos[0] ?? null;

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
          <section className="mb-4 min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px]">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9CED6] sm:text-xs">
                  CEO Club
                </p>
                <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">
                  Olá, {usuario.nome}
                </h2>
                <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-[#D9DEE7]">
                  O que precisa da sua atenção hoje, sem repetir as telas de gestão.
                </p>
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
            <KPI
              titulo="Mentorados ativos"
              valor={mentoradosAtivos.length}
              subtexto="em acompanhamento"
              destaque
              onClick={() => router.push("/mentor/mentorados/lista")}
            />

            <KPI
              titulo="Progresso médio"
              valor={`${progressoMedio}%`}
              subtexto={`${resumoJornada.emAndamento} em andamento`}
              onClick={() => router.push("/mentor/relatorios")}
            />

            <KPI
              titulo="Próximo encontro"
              valor={
                proximoEvento
                  ? `${formatarData(proximoEvento.data)} · ${limparHorario(
                      proximoEvento.horario
                    )}`
                  : "Sem agenda"
              }
              subtexto={proximoEvento?.mentoradoNome ?? "nenhum encontro futuro"}
              onClick={() => router.push("/mentor/agenda")}
            />

            <KPI
              titulo="Mentorados em atenção"
              valor={mentoradosPrioritarios.length}
              subtexto="com sinal para acompanhar"
              alerta={mentoradosPrioritarios.length > 0}
              onClick={() => router.push("/mentor/mentorados/lista")}
            />

            <KPI
              titulo="Cobranças atrasadas"
              valor={resumoFinanceiro.quantidadeAtrasada}
              subtexto={
                resumoFinanceiro.quantidadeAtrasada > 0
                  ? formatarMoeda(resumoFinanceiro.totalAtrasado)
                  : "nenhuma pendência"
              }
              alerta={resumoFinanceiro.quantidadeAtrasada > 0}
              onClick={() => router.push("/mentor/financeiro")}
            />
          </section>

          <section className="mb-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <Card
              titulo="Mentorados que pedem atenção"
              subtitulo="Sinais objetivos do sistema para você decidir onde acompanhar primeiro."
              acao="Ver todos"
              onAcao={() => router.push("/mentor/mentorados/lista")}
            >
              {mentoradosPrioritarios.length === 0 ? (
                <EmptyState
                  titulo="Nenhum sinal prioritário agora"
                  texto="Quando houver acesso pendente, cobrança atrasada, encontro aguardando ou ausência de progresso registrado, o mentorado aparecerá aqui."
                />
              ) : (
                <div className="space-y-3">
                  {mentoradosPrioritarios.map((mentorado) => (
                    <button
                      key={mentorado.id}
                      type="button"
                      onClick={() =>
                        router.push(`/mentor/mentorados/${mentorado.id}`)
                      }
                      className="w-full min-w-0 rounded-2xl border border-gray-100 bg-[#f9fafb] p-4 text-left transition hover:border-[#12317C]/20 hover:bg-white hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words text-sm font-black text-[#08163F] sm:text-base">
                              {mentorado.nome}
                            </p>
                            <StatusBadge status={mentorado.status || "Ativo"} />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {mentorado.motivos.map((motivo) => (
                              <span
                                key={motivo}
                                className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700"
                              >
                                {motivo}
                              </span>
                            ))}
                          </div>

                          <div className="mt-4 flex items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
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
                            <span className="shrink-0 text-xs font-black text-gray-500">
                              {mentorado.progresso}%
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-xs font-black text-[#12317C]">
                          Abrir perfil →
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card
              titulo="Próximos encontros"
              subtitulo={
                encontrosAguardando > 0
                  ? `${encontrosAguardando} aguardando confirmação`
                  : "Agenda futura da mentoria"
              }
              acao="Abrir agenda"
              onAcao={() => router.push("/mentor/agenda")}
            >
              {proximosEventos.length === 0 ? (
                <EmptyState
                  titulo="Nenhum encontro futuro"
                  texto="Os próximos encontros confirmados ou aguardando aparecerão aqui."
                  botao="Agendar encontro"
                  onClick={() => router.push("/mentor/agenda")}
                />
              ) : (
                <div className="space-y-3">
                  {proximosEventos.map((evento, index) => (
                    <button
                      key={evento.id}
                      type="button"
                      onClick={() => router.push("/mentor/agenda")}
                      className={`w-full min-w-0 rounded-2xl p-3 text-left transition hover:bg-white hover:shadow-md ${
                        index === 0
                          ? "border border-[#12317C]/15 bg-[#eef3ff]"
                          : "bg-[#f9fafb]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">
                            {formatarData(evento.data)} ·{" "}
                            {limparHorario(evento.horario)}
                          </p>
                          <p className="mt-1 break-words text-sm font-black text-[#08163F]">
                            {evento.titulo || evento.tipo}
                          </p>
                          <p className="mt-1 break-words text-xs font-semibold text-gray-500">
                            {evento.mentoradoNome}
                          </p>
                        </div>

                        <StatusAgenda status={evento.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card
              titulo="Jornada dos mentorados"
              subtitulo="Distribuição dos mentorados ativos pelas etapas de progresso."
              acao="Abrir relatórios"
              onAcao={() => router.push("/mentor/relatorios")}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <ResumoBox
                  titulo="Sem progresso"
                  valor={String(resumoJornada.semProgresso)}
                  descricao="ainda sem aula concluída"
                  alerta={resumoJornada.semProgresso > 0}
                />
                <ResumoBox
                  titulo="Em andamento"
                  valor={String(resumoJornada.emAndamento)}
                  descricao="entre 1% e 99%"
                />
                <ResumoBox
                  titulo="Concluídos"
                  valor={String(resumoJornada.concluidos)}
                  descricao="100% das aulas liberadas"
                />
              </div>

              <div className="mt-4 rounded-2xl bg-[#f9fafb] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-gray-500">
                    Progresso médio
                  </p>
                  <p className="text-sm font-black text-[#08163F]">
                    {progressoMedio}%
                  </p>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, progressoMedio)
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-xs font-semibold leading-5 text-gray-500">
                  O cálculo considera somente aulas de módulos já liberados aos mentorados.
                </p>
              </div>
            </Card>

            <Card
              titulo="Conteúdo da mentoria"
              subtitulo="Resumo operacional, sem repetir a tela de Módulos."
              acao="Gerenciar módulos"
              onAcao={() => router.push("/mentor/modulos")}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <ResumoBox
                  titulo="Módulos liberados"
                  valor={`${modulosLiberados.length}/${modulos.length}`}
                  descricao="ativos e disponíveis"
                />
                <ResumoBox
                  titulo="Aulas liberadas"
                  valor={String(aulasLiberadas.length)}
                  descricao="conteúdo disponível"
                />
                <ResumoBox
                  titulo="Simulados ativos"
                  valor={String(simulados.length)}
                  descricao="para prática"
                />
              </div>

              <div className="mt-4 rounded-2xl border border-[#D9DEE7] bg-[#f9fafb] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                  Próxima liberação
                </p>

                {proximaLiberacaoAgendada ? (
                  <>
                    <p className="mt-2 break-words text-sm font-black text-[#08163F]">
                      {proximaLiberacaoAgendada.modulo}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      {formatarDataHora(proximaLiberacaoAgendada.data)}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-gray-500">
                    Nenhum módulo com liberação futura agendada.
                  </p>
                )}
              </div>
            </Card>
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

function formatarDataHora(data: string) {
  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(valor);
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
  subtexto,
  destaque,
  alerta,
  onClick,
}: {
  titulo: string;
  valor: React.ReactNode;
  subtexto?: string;
  destaque?: boolean;
  alerta?: boolean;
  onClick?: () => void;
}) {
  const conteudo = (
    <>
      <p
        className={`break-words text-xs font-black sm:text-sm ${
          destaque
            ? "text-[#C9CED6]"
            : alerta
            ? "text-amber-600"
            : "text-gray-500"
        }`}
      >
        {titulo}
      </p>
      <p className="mt-2 break-words text-xl font-black leading-tight sm:text-2xl">
        {valor}
      </p>
      {subtexto && (
        <p
          className={`mt-2 line-clamp-2 text-xs font-semibold leading-5 ${
            destaque ? "text-[#D9DEE7]" : "text-gray-400"
          }`}
        >
          {subtexto}
        </p>
      )}
    </>
  );

  const classe = `min-w-0 overflow-hidden rounded-[20px] p-4 text-left shadow-lg shadow-slate-200/70 transition sm:p-5 ${
    destaque
      ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
      : alerta
      ? "border border-amber-200 bg-amber-50/80 text-amber-900"
      : "bg-white text-[#08163F]"
  } ${onClick ? "hover:-translate-y-0.5 hover:shadow-xl" : ""}`;

  if (!onClick) {
    return <div className={classe}>{conteudo}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={classe}>
      {conteudo}
    </button>
  );
}

function Card({
  titulo,
  subtitulo,
  acao,
  onAcao,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: string;
  onAcao?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-lg shadow-slate-200/70 sm:rounded-[24px]">
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-black text-[#050816] sm:text-xl">
            {titulo}
          </h3>
          {subtitulo && (
            <p className="mt-1 break-words text-xs font-semibold leading-5 text-gray-500">
              {subtitulo}
            </p>
          )}
        </div>

        {acao && onAcao && (
          <button
            type="button"
            onClick={onAcao}
            className="shrink-0 self-start rounded-xl bg-white px-3 py-2 text-xs font-black text-[#12317C] shadow-sm transition hover:shadow-md sm:self-auto"
          >
            {acao} →
          </button>
        )}
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
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-xl shadow-sm">
        ✦
      </div>
      <h3 className="mt-3 break-words text-base font-black text-[#08163F]">
        {titulo}
      </h3>
      <p className="mx-auto mt-2 max-w-md break-words text-sm font-semibold leading-relaxed text-gray-500">
        {texto}
      </p>

      {botao && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-4 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-[#08163F] shadow-sm transition hover:shadow-md"
        >
          {botao} →
        </button>
      )}
    </div>
  );
}

function ResumoBox({
  titulo,
  valor,
  descricao,
  alerta,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl p-4 ${
        alerta ? "border border-amber-200 bg-amber-50/70" : "bg-[#f9fafb]"
      }`}
    >
      <p
        className={`text-[10px] font-black uppercase tracking-[0.16em] ${
          alerta ? "text-amber-600" : "text-gray-400"
        }`}
      >
        {titulo}
      </p>
      <p className="mt-2 break-words text-xl font-black text-[#08163F]">
        {valor}
      </p>
      <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
        {descricao}
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
    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${classe}`}>
      {status}
    </span>
  );
}

function StatusAgenda({ status }: { status: EventoAgenda["status"] }) {
  const classe =
    status === "Confirmada"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Aguardando"
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${classe}`}>
      {status}
    </span>
  );
}
