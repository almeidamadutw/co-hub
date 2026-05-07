"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";

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

        const { data: perfilData, error: perfilError } = await supabase
          .from("profiles")
          .select("id, nome, email, codigo_inscricao")
          .eq("email", usuarioAtual.email)
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
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando sua jornada...
      </main>
    );
  }

  const nomeExibido = perfil?.nome || usuario.nome;
  const inicial = nomeExibido?.charAt(0)?.toUpperCase() || "M";

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <aside className="hidden min-h-screen w-[310px] flex-col border-r border-black/5 bg-white p-5 shadow-[10px_0_40px_rgba(15,23,42,0.04)] lg:flex">
        <div className="mb-8 flex items-center gap-3 rounded-[24px] bg-[#f8fafc] p-3">
          <div className="h-14 w-14 overflow-hidden rounded-2xl bg-[#08163F] p-1">
            <img
              src="/images/logo.jpeg"
              alt="CEO Club"
              className="h-full w-full rounded-xl object-cover"
            />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">
              Curso
            </p>
            <h1 className="text-lg font-black text-[#08163F]">CEO Club</h1>
          </div>
        </div>

        <nav className="space-y-2">
          <MenuItem
            ativo
            label="Início"
            onClick={() => router.push("/mentorado/dashboard")}
          />
          <MenuItem
            label="Minha agenda"
            onClick={() => router.push("/mentorado/agenda")}
          />
          <MenuItem
            label="Meus módulos"
            onClick={() => router.push("/mentorado/modulos")}
          />
          <MenuItem
            label="Praticar"
            onClick={() => router.push("/mentorado/praticar")}
          />
          <MenuItem
            label="Meu progresso"
            onClick={() => router.push("/mentorado/progresso")}
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

        <div className="mt-auto rounded-[24px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9CED6]">
            Mentorado
          </p>

          <p className="mt-2 font-black">{nomeExibido}</p>

          {perfil?.codigo_inscricao && (
            <p className="mt-1 text-xs font-bold text-blue-100">
              Inscrição {perfil.codigo_inscricao}
            </p>
          )}

          <button
            onClick={sair}
            className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#08163F] transition hover:brightness-95"
          >
            Sair
          </button>
        </div>
      </aside>

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-6 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08163F] text-sm font-black text-white shadow-lg">
              CC
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
                Área do mentorado
              </p>
              <h1 className="text-xl font-black">Minha jornada</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/mentorado/suporte")}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Suporte
            </button>

            <button
              onClick={sair}
              className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-6 py-10 md:px-8">
          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          <section className="mb-8 overflow-hidden rounded-[34px] bg-white p-8 shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-white bg-gradient-to-br from-[#E5E7EB] to-[#BFC3C9] text-4xl font-black text-white shadow-xl">
                  {inicial}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-gray-400">
                    Bem-vindo(a) ao CEO Club
                  </p>

                  <h2 className="mt-3 text-4xl font-black text-[#050816]">
                    Olá, {nomeExibido}
                  </h2>

                  <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-gray-500">
                    Acompanhe sua evolução na mentoria, seus compromissos,
                    módulos liberados, atividades e práticas em um só lugar.
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push("/mentorado/suporte")}
                className="rounded-2xl bg-[#08163F] px-6 py-4 font-black text-white shadow-lg transition hover:brightness-110"
              >
                Falar com suporte →
              </button>
            </div>
          </section>

          <section className="mb-8 grid gap-5 xl:grid-cols-4">
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
            />
          </section>

          <section className="mb-8 rounded-[26px] bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-500">
                Evolução da sua mentoria
              </p>

              <p className="text-sm font-black text-[#08163F]">
                {resumo.progressoGeral}%
              </p>
            </div>

            <div className="h-5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                style={{ width: `${resumo.progressoGeral}%` }}
              />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="space-y-6">
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
                        className="rounded-2xl bg-[#f9fafb] p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="font-black text-[#08163F]">
                              {modulo.titulo}
                            </h3>

                            <p className="mt-1 text-sm font-semibold text-gray-500">
                              {modulo.descricao || "Módulo liberado."}
                            </p>

                            <p className="mt-2 text-xs font-bold text-gray-400">
                              {modulo.aulasConcluidas}/{modulo.totalAulas} aulas
                              concluídas
                            </p>
                          </div>

                          <span className="w-fit rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-black text-[#08163F]">
                            {modulo.status}
                          </span>
                        </div>

                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
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
                <div className="rounded-[26px] bg-gradient-to-br from-[#f9fafb] to-white p-8 text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#EEF2FF] text-5xl">
                    🎯
                  </div>

                  <h3 className="mt-5 text-2xl font-black text-[#050816]">
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
                    className="mt-6 rounded-2xl bg-[#08163F] px-6 py-4 font-black text-white shadow-lg transition hover:brightness-110"
                  >
                    Ir para prática →
                  </button>
                </div>
              </Card>
            </div>

            <aside className="space-y-6">
              <Card titulo="Financeiro">
                <div className="rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-6 text-white">
                  <p className="text-sm font-bold text-[#C9CED6]">
                    Situação financeira
                  </p>

                  <p className="mt-3 text-3xl font-black">
                    {formatarMoeda(resumoFinanceiro.totalAberto)}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#D9DEE7]">
                    {resumoFinanceiro.quantidadeAberta} cobrança(s) em aberto.
                  </p>

                  {resumoFinanceiro.proximaCobranca && (
                    <div className="mt-5 rounded-2xl bg-white/10 p-4">
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
                    className="mt-6 rounded-2xl bg-white px-5 py-3 font-black text-[#08163F] transition hover:brightness-95"
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
                        className="w-full rounded-2xl bg-[#f9fafb] p-4 text-left transition hover:bg-white hover:shadow-md"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                          {formatarData(evento.data)} ·{" "}
                          {limparHorario(evento.horario)}
                        </p>

                        <p className="mt-1 font-black text-[#08163F]">
                          {evento.titulo || evento.tipo}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-500">
                          {evento.status}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card titulo="Próximo encontro">
                <div className="rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-6 text-white">
                  <p className="text-sm font-bold text-[#C9CED6]">
                    Agenda da mentoria
                  </p>

                  <p className="mt-3 text-3xl font-black">
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
                    className="mt-6 rounded-2xl bg-white px-5 py-3 font-black text-[#08163F] transition hover:brightness-95"
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

function MenuItem({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
        ativo
          ? "bg-[#EEF2FF] text-[#08163F]"
          : "text-gray-500 hover:bg-[#f8fafc] hover:text-[#08163F]"
      }`}
    >
      <span>{label}</span>
      <span>→</span>
    </button>
  );
}

function KPI({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-[26px] p-6 shadow-lg ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          destaque ? "text-[#C9CED6]" : "text-gray-500"
        }`}
      >
        {titulo}
      </p>

      <p className="mt-4 text-3xl font-black">{valor}</p>
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
    <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-6">
        <h3 className="text-2xl font-black text-[#050816]">{titulo}</h3>
      </div>

      <div className="p-6">{children}</div>
    </div>
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
    <div className="rounded-[26px] bg-[#f9fafb] p-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-4xl shadow-sm">
        ✦
      </div>

      <h3 className="mt-5 text-xl font-black text-[#08163F]">{titulo}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-gray-500">
        {texto}
      </p>

      {botao && onClick && (
        <button
          onClick={onClick}
          className="mt-6 rounded-2xl bg-white px-6 py-3 font-black text-[#08163F] shadow-sm transition hover:shadow-md"
        >
          {botao} →
        </button>
      )}
    </div>
  );
}