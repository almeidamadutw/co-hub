"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";

type StatusMentorado = "Ativo" | "Pendente" | "Inativo";
type StatusCobranca = "Pago" | "Pendente" | "Atrasado" | "Cancelado";
type TipoAgenda = "Mentoria" | "Módulo" | "Reunião";
type StatusAgenda = "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";

type Mentorado = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  codigo_inscricao: string | null;
  status: StatusMentorado | null;
  role: string;
  created_at: string;
  updated_at: string | null;
};

type Cobranca = {
  id: string;
  mentorado_id: string;
  titulo: string;
  descricao: string | null;
  valor_total: number;
  quantidade_parcelas: number;
  parcela_atual: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: StatusCobranca;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

type EventoAgenda = {
  id: string;
  mentorado_id: string;
  titulo: string | null;
  tipo: TipoAgenda;
  data: string;
  horario: string;
  status: StatusAgenda;
  observacao: string | null;
  created_at: string;
};

type ModuloMentoria = {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string | null;
};

type AulaMentoria = {
  id: string;
  modulo_id: string;
  titulo: string;
  descricao: string | null;
  objetivo: string | null;
  duracao: string | null;
  video_url: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string | null;
};

type ProgressoAula = {
  id: string;
  mentorado_id: string;
  aula_id: string;
  concluida: boolean;
  concluida_em: string | null;
  created_at: string;
  updated_at: string | null;
};

type ModuloComProgresso = ModuloMentoria & {
  aulas: AulaMentoria[];
  totalAulasModulo: number;
  aulasConcluidasModulo: number;
  percentual: number;
  statusProgresso: string;
};

type LinhaEvolucao = {
  mes: string;
  progresso: number;
  aulas: number;
  encontros: number;
  pagamentos: number;
  atrasos: number;
};

export default function PerfilMentoradoPage() {
  const router = useRouter();
  const params = useParams();

  const mentoradoId = String(params.id);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorado, setMentorado] = useState<Mentorado | null>(null);

  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);

  const [modulos, setModulos] = useState<ModuloMentoria[]>([]);
  const [aulas, setAulas] = useState<AulaMentoria[]>([]);
  const [progressoAulas, setProgressoAulas] = useState<ProgressoAula[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentorado") {
      router.replace("/mentorado/dashboard");
      return;
    }

    if (user.role !== "mentor" && user.role !== "financeiro") {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);
    carregarPerfil();
  }, [router, mentoradoId]);

  async function carregarPerfil() {
    try {
      setCarregando(true);
      setErro("");

      const { data: mentoradoData, error: mentoradoError } = await supabase
        .from("profiles")
        .select(
          "id, nome, email, telefone, codigo_inscricao, status, role, created_at, updated_at"
        )
        .eq("id", mentoradoId)
        .eq("role", "mentorado")
        .single();

      if (mentoradoError) {
        throw new Error(mentoradoError.message);
      }

      setMentorado(mentoradoData as Mentorado);

      const { data: cobrancasData, error: cobrancasError } = await supabase
        .from("financeiro_cobrancas")
        .select(
          "id, mentorado_id, titulo, descricao, valor_total, quantidade_parcelas, parcela_atual, valor_parcela, data_vencimento, data_pagamento, forma_pagamento, status, observacao, created_at, updated_at"
        )
        .eq("mentorado_id", mentoradoId)
        .order("data_vencimento", { ascending: true });

      if (cobrancasError) {
        throw new Error(cobrancasError.message);
      }

      setCobrancas((cobrancasData ?? []) as Cobranca[]);

      const { data: eventosData, error: eventosError } = await supabase
        .from("agenda_eventos")
        .select(
          "id, mentorado_id, titulo, tipo, data, horario, status, observacao, created_at"
        )
        .eq("mentorado_id", mentoradoId)
        .order("data", { ascending: true })
        .order("horario", { ascending: true });

      if (eventosError) {
        throw new Error(eventosError.message);
      }

      setEventos((eventosData ?? []) as EventoAgenda[]);

      const { data: modulosData, error: modulosError } = await supabase
        .from("modulos")
        .select("id, titulo, descricao, ordem, ativo, created_at, updated_at")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (modulosError) {
        throw new Error(modulosError.message);
      }

      setModulos((modulosData ?? []) as ModuloMentoria[]);

      const { data: aulasData, error: aulasError } = await supabase
        .from("aulas")
        .select(
          "id, modulo_id, titulo, descricao, objetivo, duracao, video_url, ordem, ativo, created_at, updated_at"
        )
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (aulasError) {
        throw new Error(aulasError.message);
      }

      setAulas((aulasData ?? []) as AulaMentoria[]);

      const { data: progressoData, error: progressoError } = await supabase
        .from("progresso_aulas")
        .select(
          "id, mentorado_id, aula_id, concluida, concluida_em, created_at, updated_at"
        )
        .eq("mentorado_id", mentoradoId);

      if (progressoError) {
        throw new Error(progressoError.message);
      }

      setProgressoAulas((progressoData ?? []) as ProgressoAula[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o perfil do mentorado."
      );
    } finally {
      setCarregando(false);
    }
  }

  const resumoFinanceiro = useMemo(() => {
    const total = cobrancas.reduce(
      (acc, item) => acc + Number(item.valor_parcela || 0),
      0
    );

    const pago = cobrancas
      .filter((item) => item.status === "Pago")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const pendente = cobrancas
      .filter((item) => item.status === "Pendente")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const atrasado = cobrancas
      .filter((item) => item.status === "Atrasado")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const proximaCobranca = cobrancas
      .filter((item) => item.status !== "Pago" && item.status !== "Cancelado")
      .sort(
        (a, b) =>
          new Date(`${a.data_vencimento}T12:00:00`).getTime() -
          new Date(`${b.data_vencimento}T12:00:00`).getTime()
      )[0];

    const taxaPagamento = total === 0 ? 0 : Math.round((pago / total) * 100);

    return {
      total,
      pago,
      pendente,
      atrasado,
      taxaPagamento,
      quantidade: cobrancas.length,
      proximaCobranca,
    };
  }, [cobrancas]);

  const proximosEventos = useMemo<EventoAgenda[]>(() => {
    const agora = new Date();

    return eventos
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
      })
      .slice(0, 5);
  }, [eventos]);

  const resumoAgenda = useMemo(() => {
    const concluidos = eventos.filter((evento) => evento.status === "Concluída");
    const futuros = proximosEventos.length;
    const cancelados = eventos.filter((evento) => evento.status === "Cancelada");

    const taxaPresenca =
      eventos.length === 0
        ? 0
        : Math.round((concluidos.length / eventos.length) * 100);

    return {
      total: eventos.length,
      concluidos: concluidos.length,
      futuros,
      cancelados: cancelados.length,
      taxaPresenca,
    };
  }, [eventos, proximosEventos]);

  const resumoProgresso = useMemo(() => {
    const aulasAtivas = aulas.filter((aula) => aula.ativo);
    const idsAulasAtivas = aulasAtivas.map((aula) => aula.id);

    const aulasConcluidas = progressoAulas.filter(
      (item) => item.concluida && idsAulasAtivas.includes(item.aula_id)
    );

    const totalAulas = aulasAtivas.length;
    const totalConcluidas = aulasConcluidas.length;

    const percentual =
      totalAulas === 0 ? 0 : Math.round((totalConcluidas / totalAulas) * 100);

    const modulosComProgresso: ModuloComProgresso[] = modulos.map((modulo) => {
      const aulasDoModulo = aulasAtivas.filter(
        (aula) => aula.modulo_id === modulo.id
      );

      const concluidasDoModulo = aulasDoModulo.filter((aula) =>
        aulasConcluidas.some((item) => item.aula_id === aula.id)
      ).length;

      const percentualModulo =
        aulasDoModulo.length === 0
          ? 0
          : Math.round((concluidasDoModulo / aulasDoModulo.length) * 100);

      const statusProgresso =
        aulasDoModulo.length === 0
          ? "Sem aulas"
          : percentualModulo === 100
          ? "Concluído"
          : percentualModulo > 0
          ? "Em andamento"
          : "Não iniciado";

      return {
        ...modulo,
        aulas: aulasDoModulo,
        totalAulasModulo: aulasDoModulo.length,
        aulasConcluidasModulo: concluidasDoModulo,
        percentual: percentualModulo,
        statusProgresso,
      };
    });

    const modulosConcluidos = modulosComProgresso.filter(
      (modulo) => modulo.percentual === 100 && modulo.totalAulasModulo > 0
    ).length;

    const modulosEmAndamento = modulosComProgresso.filter(
      (modulo) => modulo.percentual > 0 && modulo.percentual < 100
    ).length;

    const ultimoAcesso = aulasConcluidas
      .filter((item) => item.concluida_em || item.updated_at || item.created_at)
      .sort(
        (a, b) =>
          new Date(
            b.concluida_em || b.updated_at || b.created_at
          ).getTime() -
          new Date(a.concluida_em || a.updated_at || a.created_at).getTime()
      )[0];

    return {
      totalAulas,
      totalConcluidas,
      percentual,
      modulosComProgresso,
      modulosConcluidos,
      modulosEmAndamento,
      ultimoAcesso:
        ultimoAcesso?.concluida_em ||
        ultimoAcesso?.updated_at ||
        ultimoAcesso?.created_at ||
        null,
    };
  }, [aulas, modulos, progressoAulas]);

  const evolucaoIndividual = useMemo<LinhaEvolucao[]>(() => {
    const meses = ultimosMeses(6);

    const progressoOrdenado = progressoAulas
      .filter((item) => item.concluida)
      .sort(
        (a, b) =>
          new Date(a.concluida_em || a.updated_at || a.created_at).getTime() -
          new Date(b.concluida_em || b.updated_at || b.created_at).getTime()
      );

    return meses.map((mesInfo) => {
      const fimMes = new Date(mesInfo.ano, mesInfo.mes + 1, 0, 23, 59, 59);

      const aulasAteMes = progressoOrdenado.filter((item) => {
        const dataConclusao = new Date(
          item.concluida_em || item.updated_at || item.created_at
        );

        return dataConclusao.getTime() <= fimMes.getTime();
      }).length;

      const progresso =
        resumoProgresso.totalAulas === 0
          ? 0
          : Math.round((aulasAteMes / resumoProgresso.totalAulas) * 100);

      const encontrosMes = eventos.filter((evento) => {
        const dataEvento = new Date(`${evento.data}T12:00:00`);
        return (
          dataEvento.getMonth() === mesInfo.mes &&
          dataEvento.getFullYear() === mesInfo.ano &&
          evento.status === "Concluída"
        );
      }).length;

      const pagamentosMes = cobrancas.filter((cobranca) => {
        if (!cobranca.data_pagamento || cobranca.status !== "Pago") return false;

        const dataPagamento = new Date(`${cobranca.data_pagamento}T12:00:00`);

        return (
          dataPagamento.getMonth() === mesInfo.mes &&
          dataPagamento.getFullYear() === mesInfo.ano
        );
      }).length;

      const atrasosMes = cobrancas.filter((cobranca) => {
        const dataVencimento = new Date(`${cobranca.data_vencimento}T12:00:00`);

        return (
          dataVencimento.getMonth() === mesInfo.mes &&
          dataVencimento.getFullYear() === mesInfo.ano &&
          cobranca.status === "Atrasado"
        );
      }).length;

      return {
        mes: mesInfo.label,
        progresso,
        aulas: aulasAteMes,
        encontros: encontrosMes,
        pagamentos: pagamentosMes,
        atrasos: atrasosMes,
      };
    });
  }, [cobrancas, eventos, progressoAulas, resumoProgresso.totalAulas]);

  const diagnostico = useMemo(() => {
    const alertas: string[] = [];
    const pontosFortes: string[] = [];

    if (resumoFinanceiro.atrasado > 0) {
      alertas.push("Existe valor em atraso no financeiro.");
    } else if (resumoFinanceiro.quantidade > 0) {
      pontosFortes.push("Financeiro sem parcelas em atraso.");
    }

    if (resumoProgresso.percentual < 25 && resumoProgresso.totalAulas > 0) {
      alertas.push("Progresso acadêmico ainda baixo.");
    }

    if (resumoProgresso.percentual >= 70) {
      pontosFortes.push("Progresso geral acima de 70%.");
    }

    if (resumoAgenda.total > 0 && resumoAgenda.taxaPresenca < 50) {
      alertas.push("Taxa de presença abaixo do ideal.");
    }

    if (resumoAgenda.taxaPresenca >= 70) {
      pontosFortes.push("Boa presença nos encontros registrados.");
    }

    if (!resumoProgresso.ultimoAcesso && resumoProgresso.totalAulas > 0) {
      alertas.push("Nenhuma aula concluída registrada até agora.");
    }

    return {
      alertas,
      pontosFortes,
      status:
        alertas.length > 1
          ? "Atenção"
          : alertas.length === 1
          ? "Acompanhar"
          : "Em dia",
    };
  }, [resumoAgenda, resumoFinanceiro, resumoProgresso]);

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] px-4 text-[#08163F]">
        <div className="w-full max-w-sm rounded-[24px] border border-white/60 bg-white/90 p-6 text-center shadow-xl shadow-slate-200/70 backdrop-blur-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-xs font-black text-white shadow-lg">
            CEO
          </div>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-slate-400">
            CEO Club
          </p>

          <h1 className="mt-2 break-words text-lg font-black leading-tight text-[#08163F] sm:text-xl">
            Carregando perfil do mentorado...
          </h1>

          <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#12317C]" />
          </div>
        </div>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
        <Sidebar nome={usuario.nome} role={usuario.role} />

        <section className="relative flex min-w-0 flex-1 items-center justify-center overflow-x-hidden p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-[24px] bg-white p-6 text-center shadow-xl shadow-slate-200/70 sm:p-8">
            <h1 className="break-words text-2xl font-black sm:text-3xl">
              Erro ao carregar perfil
            </h1>

            <p className="mt-3 break-words text-sm font-semibold leading-6 text-gray-500">
              {erro}
            </p>

            <button
              onClick={() => router.push("/mentorados")}
              className="mt-6 rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white"
            >
              Voltar para mentorados
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!mentorado) {
    return (
      <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
        <Sidebar nome={usuario.nome} role={usuario.role} />

        <section className="relative flex min-w-0 flex-1 items-center justify-center overflow-x-hidden p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-[24px] bg-white p-6 text-center shadow-xl shadow-slate-200/70 sm:p-8">
            <h1 className="break-words text-2xl font-black sm:text-3xl">
              Mentorado não encontrado
            </h1>

            <p className="mt-3 break-words text-sm font-semibold leading-6 text-gray-500">
              Esse perfil não foi encontrado no sistema.
            </p>

            <button
              onClick={() => router.push("/mentorados")}
              className="mt-6 rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white"
            >
              Voltar para mentorados
            </button>
          </div>
        </section>
      </main>
    );
  }

  const status = mentorado.status ?? "Ativo";

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.push("/mentorados")}
              className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
            >
              ← Voltar
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Perfil do mentorado
              </p>

              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">{mentorado.nome}</h1>
            </div>
          </div>

          <button
            onClick={sair}
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#D9DEE7] to-[#9CA3AF] text-2xl font-black uppercase text-white sm:h-16 sm:w-16 sm:text-3xl">
                    {mentorado.nome?.charAt(0) ?? "M"}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                    Código de inscrição
                  </p>

                  <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                    {mentorado.nome}
                  </h2>

                  <p className="mt-2 break-words text-sm font-semibold text-[#D9DEE7]">
                    Código:{" "}
                    <span className="font-bold text-white">
                      {mentorado.codigo_inscricao ?? "—"}
                    </span>
                  </p>

                  <p className="mt-2 break-words text-sm font-semibold text-blue-100">
                    Última evolução:{" "}
                    {resumoProgresso.ultimoAcesso
                      ? formatarData(resumoProgresso.ultimoAcesso)
                      : "sem registro"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={status} />
                <StatusBadge status={diagnostico.status} />
              </div>
            </div>
          </section>

          <section className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI titulo="Status" valor={status} destaque />

            <KPI
              titulo="Progresso"
              valor={`${resumoProgresso.percentual}%`}
              texto={`${resumoProgresso.totalConcluidas}/${resumoProgresso.totalAulas} aulas`}
            />

            <KPI
              titulo="Presença"
              valor={`${resumoAgenda.taxaPresenca}%`}
              texto={`${resumoAgenda.concluidos}/${resumoAgenda.total} encontros`}
            />

            <KPI
              titulo="Financeiro"
              valor={`${resumoFinanceiro.taxaPagamento}%`}
              texto="taxa de pagamento"
            />
          </section>

          <section className="mb-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <Card titulo="Evolução individual">
              <div className="h-[260px] min-w-0 sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={evolucaoIndividual}
                    margin={{ top: 12, right: 18, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "progresso") return [`${value}%`, "Progresso"];
                        if (name === "encontros") return [value, "Encontros concluídos"];
                        if (name === "pagamentos") return [value, "Pagamentos"];
                        if (name === "atrasos") return [value, "Atrasos"];
                        return [value, name];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="progresso"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="encontros"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pagamentos"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="atrasos"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid min-w-0 gap-3 md:grid-cols-4">
                <MiniBox
                  label="Aulas concluídas"
                  value={`${resumoProgresso.totalConcluidas}/${resumoProgresso.totalAulas}`}
                />
                <MiniBox
                  label="Módulos concluídos"
                  value={String(resumoProgresso.modulosConcluidos)}
                />
                <MiniBox
                  label="Encontros"
                  value={String(resumoAgenda.total)}
                />
                <MiniBox
                  label="Atrasos"
                  value={formatarMoeda(resumoFinanceiro.atrasado)}
                  alerta={resumoFinanceiro.atrasado > 0}
                />
              </div>
            </Card>

            <Card titulo="Diagnóstico da mentora">
              <div className="min-w-0 rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
                  Leitura rápida
                </p>

                <h3 className="mt-2 break-words text-xl font-black sm:text-2xl">
                  {diagnostico.status}
                </h3>

                <p className="mt-2 break-words text-sm font-semibold leading-6 text-blue-100">
                  Combina progresso, encontros e financeiro para indicar se o
                  mentorado está em bom ritmo ou precisa de acompanhamento.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                  Pontos de atenção
                </h4>

                {diagnostico.alertas.length === 0 ? (
                  <InfoBox
                    titulo="Sem alertas críticos"
                    texto="Nenhum ponto de atenção forte foi encontrado no momento."
                    tipo="positivo"
                  />
                ) : (
                  diagnostico.alertas.map((alerta) => (
                    <InfoBox
                      key={alerta}
                      titulo="Atenção"
                      texto={alerta}
                      tipo="alerta"
                    />
                  ))
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                  Pontos fortes
                </h4>

                {diagnostico.pontosFortes.length === 0 ? (
                  <InfoBox
                    titulo="Ainda sem destaque"
                    texto="Quando houver evolução consistente, ela aparecerá aqui."
                    tipo="neutro"
                  />
                ) : (
                  diagnostico.pontosFortes.map((ponto) => (
                    <InfoBox
                      key={ponto}
                      titulo="Bom sinal"
                      texto={ponto}
                      tipo="positivo"
                    />
                  ))
                )}
              </div>
            </Card>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-2">
            <Card titulo="Dados do mentorado">
              <Info label="Nome" value={mentorado.nome} />
              <Info label="E-mail" value={mentorado.email} />
              <Info
                label="Telefone"
                value={mentorado.telefone || "Telefone não informado"}
              />
              <Info
                label="Código de inscrição"
                value={mentorado.codigo_inscricao || "Código não gerado"}
              />
              <Info label="Status" value={status} />
            </Card>

            <Card titulo="Financeiro">
              <div className="grid min-w-0 gap-3 md:grid-cols-2">
                <MiniBox
                  label="Total lançado"
                  value={formatarMoeda(resumoFinanceiro.total)}
                  destaque
                />

                <MiniBox
                  label="Pago"
                  value={formatarMoeda(resumoFinanceiro.pago)}
                />

                <MiniBox
                  label="Pendente"
                  value={formatarMoeda(resumoFinanceiro.pendente)}
                />

                <MiniBox
                  label="Atrasado"
                  value={formatarMoeda(resumoFinanceiro.atrasado)}
                  alerta={resumoFinanceiro.atrasado > 0}
                />
              </div>

              <div className="mt-4 rounded-2xl bg-[#f9fafb] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                  Próxima cobrança
                </p>

                {resumoFinanceiro.proximaCobranca ? (
                  <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="break-words font-black text-[#08163F]">
                        {resumoFinanceiro.proximaCobranca.titulo}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        Parcela{" "}
                        {resumoFinanceiro.proximaCobranca.parcela_atual}/
                        {resumoFinanceiro.proximaCobranca.quantidade_parcelas} ·{" "}
                        {formatarData(
                          resumoFinanceiro.proximaCobranca.data_vencimento
                        )}
                      </p>
                    </div>

                    <StatusBadge
                      status={resumoFinanceiro.proximaCobranca.status}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-gray-500">
                    Nenhuma cobrança em aberto.
                  </p>
                )}
              </div>

              <div className="mt-5 grid gap-3">
                {cobrancas.slice(0, 5).map((cobranca) => (
                  <div
                    key={cobranca.id}
                    className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100 sm:p-4"
                  >
                    <div>
                      <p className="break-words font-black text-[#08163F]">
                        {cobranca.titulo}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Parcela {cobranca.parcela_atual}/
                        {cobranca.quantidade_parcelas} ·{" "}
                        {formatarData(cobranca.data_vencimento)}
                      </p>
                    </div>

                    <div className="min-w-0 text-left sm:text-right">
                      <p className="break-words font-black text-[#08163F]">
                        {formatarMoeda(Number(cobranca.valor_parcela))}
                      </p>

                      <div className="mt-1">
                        <StatusBadge status={cobranca.status} />
                      </div>
                    </div>
                  </div>
                ))}

                {cobrancas.length === 0 && (
                  <div className="rounded-2xl bg-[#f9fafb] p-5 text-sm font-semibold text-gray-500">
                    Nenhuma cobrança cadastrada para este mentorado.
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push("/financeiro")}
                className="mt-5 w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
              >
                Abrir financeiro geral →
              </button>
            </Card>

            <Card titulo="Próximos compromissos">
              <div className="space-y-3">
                {proximosEventos.length === 0 ? (
                  <div className="rounded-2xl bg-[#f9fafb] p-5 text-sm font-semibold text-gray-500">
                    Nenhum compromisso futuro cadastrado para este mentorado.
                  </div>
                ) : (
                  proximosEventos.map((evento) => (
                    <div
                      key={evento.id}
                      className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f9fafb] p-4"
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                          {formatarData(evento.data)} ·{" "}
                          {limparHorario(evento.horario)}
                        </p>

                        <p className="mt-2 font-black text-[#08163F]">
                          {evento.titulo || evento.tipo}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-500">
                          {evento.tipo}
                        </p>
                      </div>

                      <StatusBadge status={evento.status} />
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
                <ActionButton
                  label="Agendar sessão"
                  onClick={() => router.push("/agenda")}
                />

                <ActionButton
                  label="Abrir agenda"
                  onClick={() => router.push("/agenda")}
                />

                <ActionButton
                  label="Ver módulos"
                  onClick={() => router.push("/modulos")}
                />

                <ActionButton
                  label="Financeiro"
                  onClick={() => router.push("/financeiro")}
                />
              </div>
            </Card>

            <Card titulo="Progresso por módulo">
              <div className="min-w-0 rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                  Evolução individual
                </p>

                <div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-4">
                  <div>
                    <strong className="block break-words text-3xl font-black sm:text-4xl">
                      {resumoProgresso.percentual}%
                    </strong>

                    <p className="mt-2 text-sm font-bold text-blue-100">
                      {resumoProgresso.totalConcluidas}/
                      {resumoProgresso.totalAulas} aulas concluídas
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-left sm:text-right">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                      Módulos concluídos
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {resumoProgresso.modulosConcluidos}
                    </p>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${resumoProgresso.percentual}%` }}
                  />
                </div>
              </div>

              <div className="grid min-w-0 gap-3 md:grid-cols-2">
                <MiniBox
                  label="Em andamento"
                  value={String(resumoProgresso.modulosEmAndamento)}
                />

                <MiniBox
                  label="Aulas concluídas"
                  value={`${resumoProgresso.totalConcluidas}/${resumoProgresso.totalAulas}`}
                />
              </div>

              <div className="space-y-3">
                {resumoProgresso.modulosComProgresso.map((modulo) => (
                  <div
                    key={modulo.id}
                    className="min-w-0 rounded-2xl bg-[#f9fafb] p-4"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                          Módulo {modulo.ordem}
                        </p>

                        <h4 className="mt-1 break-words font-black text-[#08163F]">
                          {modulo.titulo}
                        </h4>

                        <p className="mt-1 text-xs font-bold text-gray-400">
                          {modulo.aulasConcluidasModulo}/
                          {modulo.totalAulasModulo} aulas
                        </p>
                      </div>

                      <StatusBadge status={modulo.statusProgresso} />
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C]"
                        style={{ width: `${modulo.percentual}%` }}
                      />
                    </div>
                  </div>
                ))}

                {resumoProgresso.modulosComProgresso.length === 0 && (
                  <div className="rounded-2xl bg-[#f9fafb] p-5 text-sm font-semibold text-gray-500">
                    Nenhum módulo disponível para calcular o progresso.
                  </div>
                )}
              </div>
            </Card>
          </section>
        </div>
      </section>
    </main>
  );
}

function formatarData(data?: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(data));
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function ultimosMeses(quantidade: number) {
  const hoje = new Date();

  return Array.from({ length: quantidade }, (_, index) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (quantidade - 1 - index), 1);

    return {
      ano: data.getFullYear(),
      mes: data.getMonth(),
      label: new Intl.DateTimeFormat("pt-BR", {
        month: "short",
      })
        .format(data)
        .replace(".", ""),
    };
  });
}

function KPI({
  titulo,
  valor,
  texto,
  destaque,
}: {
  titulo: string;
  valor: React.ReactNode;
  texto?: string;
  destaque?: boolean;
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

      <p className="mt-3 break-words text-2xl font-black leading-tight sm:text-3xl">{valor}</p>

      {texto && (
        <p
          className={`mt-2 break-words text-sm font-semibold ${
            destaque ? "text-blue-100" : "text-gray-400"
          }`}
        >
          {texto}
        </p>
      )}
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

      <div className="min-w-0 space-y-3 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 break-words font-black text-[#08163F]">{value}</p>
    </div>
  );
}

function MiniBox({
  label,
  value,
  destaque,
  alerta,
}: {
  label: string;
  value: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl p-4 ${
        destaque
          ? "bg-[#08163F] text-white"
          : alerta
          ? "bg-red-50 text-red-700"
          : "bg-[#f9fafb] text-[#08163F]"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.18em] ${
          destaque ? "text-blue-100" : alerta ? "text-red-600" : "text-gray-400"
        }`}
      >
        {label}
      </p>

      <p className="mt-2 break-words text-lg font-black sm:text-xl">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusLower = status.toLowerCase();

  const classe =
    statusLower === "ativo" ||
    statusLower === "pago" ||
    statusLower === "confirmada" ||
    statusLower === "concluído" ||
    statusLower === "concluido" ||
    statusLower === "em dia"
      ? "bg-emerald-50 text-emerald-700"
      : statusLower === "pendente" ||
        statusLower === "aguardando" ||
        statusLower === "em andamento" ||
        statusLower === "acompanhar"
      ? "bg-amber-50 text-amber-700"
      : statusLower === "inativo" ||
        statusLower === "cancelado" ||
        statusLower === "cancelada" ||
        statusLower === "não iniciado" ||
        statusLower === "nao iniciado"
      ? "bg-slate-100 text-slate-600"
      : statusLower === "atrasado" || statusLower === "atenção"
      ? "bg-red-50 text-red-700"
      : statusLower === "concluída" || statusLower === "concluida"
      ? "bg-blue-50 text-blue-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${classe}`}>
      {status}
    </span>
  );
}

function limparHorario(horario: string) {
  return horario?.slice(0, 5) || "";
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
      onClick={onClick}
      className="min-w-0 rounded-2xl bg-[#f9fafb] p-4 text-left text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
    >
      {label} →
    </button>
  );
}

function InfoBox({
  titulo,
  texto,
  tipo,
}: {
  titulo: string;
  texto: string;
  tipo: "positivo" | "alerta" | "neutro";
}) {
  const classe =
    tipo === "positivo"
      ? "bg-emerald-50 text-emerald-700"
      : tipo === "alerta"
      ? "bg-red-50 text-red-700"
      : "bg-slate-50 text-slate-600";

  return (
    <div className={`min-w-0 rounded-2xl p-4 ${classe}`}>
      <p className="break-words font-black">{titulo}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 opacity-80">{texto}</p>
    </div>
  );
}
