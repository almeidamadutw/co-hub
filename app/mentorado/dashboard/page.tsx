"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import MentoradoLoading from "@/components/MentoradoLoading";

type PerfilMentorado = {
  id: string;
  nome: string;
  email: string;
  codigo_inscricao: string | null;
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
  aula_id: string;
  mentorado_id: string;
  concluida: boolean | null;
};

type EventoAgenda = {
  id: string;
  titulo: string | null;
  tipo: "Mentoria" | "Módulo" | "Reunião";
  data: string;
  horario: string;
  status: "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";
  observacao: string | null;
};

type Simulado = {
  id: string;
  titulo: string;
  ativo: boolean | null;
};

type ResultadoSimulado = {
  id: string;
  percentual: number | null;
  created_at: string;
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

type ModuloMentorado = {
  id: string;
  titulo: string;
  descricao: string;
  status: "Disponível" | "Em andamento" | "Concluído";
  progresso: number;
  totalAulas: number;
  aulasConcluidas: number;
};

export default function DashboardMentoradoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilMentorado | null>(null);

  const [modulos, setModulos] = useState<ModuloMentorado[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [resultados, setResultados] = useState<ResultadoSimulado[]>([]);
  const [cobrancas, setCobrancas] = useState<CobrancaFinanceira[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

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

    const usuarioAtual = usuario;

    async function carregarDashboard() {
      try {
        setCarregando(true);
        setErro("");

        const usuarioId = (usuarioAtual as User & { id?: string })?.id;

if (!usuarioId) {
  throw new Error("Não foi possível identificar o usuário logado.");
}

const { data: perfilData, error: perfilError } = await supabase
  .from("profiles")
  .select("id, nome, email, codigo_inscricao")
  .eq("id", usuarioId)
  .eq("role", "mentorado")
  .single();

        if (perfilError || !perfilData) {
          throw new Error(
            perfilError?.message ||
              "Não foi possível encontrar o perfil do mentorado."
          );
        }

        const perfilEncontrado = perfilData as PerfilMentorado;
        setPerfil(perfilEncontrado);

        const mentoradoId = perfilEncontrado.id;

        const { data: agendaData, error: agendaError } = await supabase
          .from("agenda_eventos")
          .select("id, titulo, tipo, data, horario, status, observacao")
          .eq("mentorado_id", mentoradoId)
          .order("data", { ascending: true })
          .order("horario", { ascending: true });

        if (agendaError) {
          throw new Error(agendaError.message);
        }

        setEventos((agendaData ?? []) as EventoAgenda[]);

        const { data: modulosData, error: modulosError } = await supabase
          .from("modulos")
          .select("id, titulo, descricao, ordem, ativo")
          .eq("ativo", true)
          .order("ordem", { ascending: true });

        if (modulosError) {
          throw new Error(modulosError.message);
        }

        const modulosBanco = (modulosData ?? []) as ModuloBanco[];

        const { data: aulasData, error: aulasError } = await supabase
          .from("aulas")
          .select("id, modulo_id, titulo, ordem, ativo")
          .eq("ativo", true)
          .order("ordem", { ascending: true });

        if (aulasError) {
          throw new Error(aulasError.message);
        }

        const { data: progressoData, error: progressoError } = await supabase
          .from("progresso_aulas")
          .select("id, aula_id, mentorado_id, concluida")
          .eq("mentorado_id", mentoradoId);

        if (progressoError) {
          throw new Error(progressoError.message);
        }

        const aulasBanco = (aulasData ?? []) as AulaBanco[];
        const progressoBanco = (progressoData ?? []) as ProgressoAula[];

        const modulosTratados: ModuloMentorado[] = modulosBanco.map(
          (modulo) => {
            const aulasDoModulo = aulasBanco.filter(
              (aula) => aula.modulo_id === modulo.id
            );

            const totalAulas = aulasDoModulo.length;

            const aulasConcluidas = aulasDoModulo.filter((aula) =>
              progressoBanco.some(
                (progresso) =>
                  progresso.aula_id === aula.id &&
                  progresso.concluida === true
              )
            ).length;

            const progresso =
              totalAulas > 0
                ? Math.round((aulasConcluidas / totalAulas) * 100)
                : 0;

            const status: ModuloMentorado["status"] =
              progresso >= 100
                ? "Concluído"
                : progresso > 0
                ? "Em andamento"
                : "Disponível";

            return {
              id: modulo.id,
              titulo: modulo.titulo,
              descricao: modulo.descricao ?? "",
              status,
              progresso,
              totalAulas,
              aulasConcluidas,
            };
          }
        );

        setModulos(modulosTratados);

        const { data: simuladosData, error: simuladosError } = await supabase
          .from("simulados")
          .select("id, titulo, ativo")
          .eq("ativo", true)
          .order("created_at", { ascending: false });

        if (simuladosError) {
          setSimulados([]);
        } else {
          setSimulados((simuladosData ?? []) as Simulado[]);
        }

        const { data: resultadosData, error: resultadosError } = await supabase
          .from("resultados_simulado")
          .select("id, percentual, created_at")
          .eq("mentorado_id", mentoradoId)
          .order("created_at", { ascending: false });

        if (resultadosError) {
          setResultados([]);
        } else {
          setResultados((resultadosData ?? []) as ResultadoSimulado[]);
        }

        const { data: cobrancasData, error: cobrancasError } = await supabase
          .from("financeiro_cobrancas")
          .select(
            "id, mentorado_id, titulo, valor_parcela, data_vencimento, data_pagamento, status"
          )
          .eq("mentorado_id", mentoradoId)
          .order("data_vencimento", { ascending: true });

        if (cobrancasError) {
          setCobrancas([]);
        } else {
          setCobrancas((cobrancasData ?? []) as CobrancaFinanceira[]);
        }
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar sua jornada."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarDashboard();
  }, [usuario]);

  const resumo = useMemo(() => {
    const totalModulos = modulos.length;

    const progressoGeral =
      totalModulos > 0
        ? Math.round(
            modulos.reduce((acc, modulo) => acc + modulo.progresso, 0) /
              totalModulos
          )
        : 0;

    return {
      totalModulos,
      emAndamento: modulos.filter((m) => m.status === "Em andamento").length,
      concluidos: modulos.filter((m) => m.status === "Concluído").length,
      progressoGeral,
      compromissos: eventos.length,
      compromissosAguardando: eventos.filter(
        (evento) => evento.status === "Aguardando"
      ).length,
      simuladosDisponiveis: simulados.length,
    };
  }, [modulos, eventos, simulados]);

  const resumoFinanceiro = useMemo(() => {
    const emAberto = cobrancas.filter(
      (cobranca) =>
        cobranca.status !== "Pago" && cobranca.status !== "Cancelado"
    );

    const pagos = cobrancas.filter((cobranca) => cobranca.status === "Pago");

    const totalAberto = emAberto.reduce(
      (acc, cobranca) => acc + Number(cobranca.valor_parcela || 0),
      0
    );

    const totalPago = pagos.reduce(
      (acc, cobranca) => acc + Number(cobranca.valor_parcela || 0),
      0
    );

    const proximaCobranca =
      [...emAberto].sort(
        (a, b) =>
          new Date(a.data_vencimento).getTime() -
          new Date(b.data_vencimento).getTime()
      )[0] ?? null;

    return {
      totalAberto,
      totalPago,
      quantidadeAberta: emAberto.length,
      proximaCobranca,
    };
  }, [cobrancas]);

  const proximoEvento = useMemo(() => {
    const agora = new Date();

    return (
      eventos
        .filter((evento) => {
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
        })[0] ?? null
    );
  }, [eventos]);

  const ultimoResultado = resultados[0] ?? null;

  async function sair() {
    logoutUsuario();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return <MentoradoLoading mensagem="Carregando dashboard..." />;
  }

  const nomeExibido = perfil?.nome || usuario.nome;
  const inicial = nomeExibido?.charAt(0)?.toUpperCase() || "M";

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <MentoradoSidebar nome={nomeExibido} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#08163F] text-xs font-black text-white shadow-lg">
              CC
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Área do mentorado
              </p>
              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">Minha jornada</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/mentorado/suporte")}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:text-sm"
            >
              Suporte
            </button>

            <button
              onClick={sair}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
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

          <section className="mb-4 min-w-0 overflow-hidden rounded-[22px] bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5 lg:rounded-[26px] lg:p-6">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[7px] border-white bg-gradient-to-br from-[#E5E7EB] to-[#BFC3C9] text-3xl font-black text-white shadow-xl sm:h-24 sm:w-24 sm:border-[8px]">
                  {inicial}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-gray-400">
                    Bem-vindo(a) ao CEO Club
                  </p>

                  <h2 className="mt-2 break-words text-2xl font-black leading-tight text-[#050816] sm:text-3xl lg:text-4xl">
                    Olá, {nomeExibido}
                  </h2>

                  <p className="mt-2 max-w-3xl break-words text-sm font-semibold leading-6 text-gray-500">
                    Acompanhe sua evolução na mentoria, seus compromissos,
                    módulos liberados, atividades e práticas em um só lugar.
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push("/mentorado/suporte")}
                className="w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 sm:w-auto"
              >
                Falar com suporte →
              </button>
            </div>
          </section>

          <section className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI
              titulo="Progresso geral"
              valor={`${resumo.progressoGeral}%`}
              destaque
            />
            <KPI titulo="Módulos liberados" valor={resumo.totalModulos} />
            <KPI titulo="Em andamento" valor={resumo.emAndamento} />
            <KPI
              titulo="Financeiro em aberto"
              valor={formatarMoeda(resumoFinanceiro.totalAberto)}
              valorCompacto
            />
          </section>

          <section className="mb-4 min-w-0 rounded-[20px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-500">
                Evolução da sua mentoria
              </p>

              <p className="text-sm font-black text-[#08163F]">
                {resumo.progressoGeral}%
              </p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                style={{ width: `${resumo.progressoGeral}%` }}
              />
            </div>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,390px)]">
            <div className="min-w-0 space-y-4">
              <Card titulo="Meus módulos">
                {modulos.length === 0 ? (
                  <EmptyState
                    titulo="Nenhum módulo liberado ainda"
                    texto="Quando sua mentora liberar conteúdos, eles aparecerão aqui."
                    botao="Ver meus módulos"
                    onClick={() => router.push("/mentorado/modulos")}
                  />
                ) : (
                  <div className="space-y-4">
                    {modulos.slice(0, 4).map((modulo) => (
                      <div
                        key={modulo.id}
                        className="min-w-0 rounded-2xl bg-[#f9fafb] p-4"
                      >
                        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <h3 className="break-words font-black text-[#08163F]">
                              {modulo.titulo}
                            </h3>

                            <p className="mt-1 break-words text-sm font-semibold text-gray-500">
                              {modulo.descricao || "Módulo liberado."}
                            </p>

                            <p className="mt-2 text-xs font-bold text-gray-400">
                              {modulo.aulasConcluidas}/{modulo.totalAulas} aulas
                              concluídas
                            </p>
                          </div>

                          <span className="w-fit shrink-0 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-black text-[#08163F]">
                            {modulo.status}
                          </span>
                        </div>

                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                            style={{ width: `${modulo.progresso}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card titulo="Praticar meus conhecimentos">
                <div className="min-w-0 rounded-[22px] bg-gradient-to-br from-[#f9fafb] to-white p-4 text-center sm:p-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#EEF2FF] text-3xl sm:h-20 sm:w-20 sm:rounded-[24px] sm:text-4xl">
                    🎯
                  </div>

                  <h3 className="mt-4 break-words text-lg font-black leading-tight text-[#050816] sm:text-xl">
                    {simulados.length > 0
                      ? `${simulados.length} simulado(s) disponível(is)`
                      : "Nenhum simulado liberado ainda"}
                  </h3>

                  <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-relaxed text-gray-500">
                    {ultimoResultado
                      ? `Seu último resultado foi ${
                          ultimoResultado.percentual ?? 0
                        }%.`
                      : "Quando houver simulados disponíveis, eles aparecerão na área de prática."}
                  </p>

                  <button
                    onClick={() => router.push("/mentorado/praticar")}
                    className="mt-5 rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                  >
                    Ir para prática →
                  </button>
                </div>
              </Card>
            </div>

            <aside className="min-w-0 space-y-4">
              <Card titulo="Financeiro">
                <div className="min-w-0 rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white sm:p-5">
                  <p className="text-sm font-bold text-[#C9CED6]">
                    Situação financeira
                  </p>

                  <p className="mt-2 break-words text-xl font-black leading-tight sm:text-2xl">
                    {formatarMoeda(resumoFinanceiro.totalAberto)}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#D9DEE7]">
                    {resumoFinanceiro.quantidadeAberta} cobrança(s) em aberto.
                  </p>

                  {resumoFinanceiro.proximaCobranca && (
                    <div className="mt-4 rounded-2xl bg-white/10 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
                        Próximo vencimento
                      </p>

                      <p className="mt-2 font-black">
                        {resumoFinanceiro.proximaCobranca.titulo}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-blue-100">
                        {formatarData(
                          resumoFinanceiro.proximaCobranca.data_vencimento
                        )}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => router.push("/mentorado/financeiro")}
                    className="mt-5 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-[#08163F] transition hover:brightness-95"
                  >
                    Ver financeiro →
                  </button>
                </div>
              </Card>

              <Card titulo="Plano da semana">
                {eventos.length === 0 ? (
                  <EmptyState
                    titulo="Nenhum compromisso no momento"
                    texto="Quando sua mentora definir encontros ou atividades, eles aparecerão aqui."
                  />
                ) : (
                  <div className="space-y-3">
                    {eventos.slice(0, 5).map((evento) => (
                      <button
                        key={evento.id}
                        onClick={() => router.push("/mentorado/agenda")}
                        className="w-full min-w-0 rounded-2xl bg-[#f9fafb] p-3 text-left transition hover:bg-white hover:shadow-md"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                          {formatarData(evento.data)} ·{" "}
                          {limparHorario(evento.horario)}
                        </p>

                        <p className="mt-1 break-words font-black text-[#08163F]">
                          {evento.titulo || evento.tipo}
                        </p>

                        <p className="mt-1 break-words text-sm font-semibold text-gray-500">
                          {evento.status}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card titulo="Próximo encontro">
                <div className="min-w-0 rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white sm:p-5">
                  <p className="text-sm font-bold text-[#C9CED6]">
                    Central de agenda
                  </p>

                  <p className="mt-2 break-words text-xl font-black leading-tight sm:text-2xl">
                    {proximoEvento
                      ? formatarDataCurta(proximoEvento.data)
                      : "Em breve"}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#D9DEE7]">
                    {proximoEvento
                      ? `Às ${limparHorario(proximoEvento.horario)} · ${
                          proximoEvento.titulo || proximoEvento.tipo
                        }`
                      : "Assim que um encontro for marcado, ele aparecerá aqui."}
                  </p>

                  <button
                    onClick={() => router.push("/mentorado/agenda")}
                    className="mt-5 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-[#08163F] transition hover:brightness-95"
                  >
                    Ver agenda →
                  </button>
                </div>
              </Card>
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
}

function limparHorario(horario: string) {
  return horario?.slice(0, 5) || "";
}

function formatarData(data: string) {
  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataCurta(data: string) {
  if (!data) return "—";

  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function KPI({
  titulo,
  valor,
  destaque,
  valorCompacto,
}: {
  titulo: string;
  valor: React.ReactNode;
  destaque?: boolean;
  valorCompacto?: boolean;
}) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-[20px] p-4 shadow-lg shadow-slate-200/70 sm:p-5 ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`break-words text-xs font-black sm:text-sm ${
          destaque ? "text-[#C9CED6]" : "text-gray-500"
        }`}
      >
        {titulo}
      </p>

      <p
        className={`mt-3 break-words font-black leading-tight ${
          valorCompacto
            ? "text-lg sm:text-xl lg:text-2xl"
            : "text-2xl sm:text-3xl lg:text-4xl"
        }`}
      >
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
        <h3 className="break-words text-lg font-black text-[#050816] sm:text-xl">{titulo}</h3>
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

      <h3 className="mt-4 break-words text-base font-black text-[#08163F] sm:text-lg">{titulo}</h3>

      <p className="mx-auto mt-2 max-w-md break-words text-sm font-semibold leading-relaxed text-gray-500">
        {texto}
      </p>

      {botao && onClick && (
        <button
          onClick={onClick}
          className="mt-5 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-[#08163F] shadow-sm transition hover:shadow-md"
        >
          {botao} →
        </button>
      )}
    </div>
  );
}