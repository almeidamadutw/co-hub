"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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

type StatusCobranca = "Pago" | "Pendente" | "Atrasado" | "Cancelado";
type StatusFiltro = "Todos" | StatusCobranca;
type PeriodoFiltro = "Todos" | "30" | "90" | "180" | "365";

type Mentorado = {
  id: string;
  nome: string;
  email: string;
  codigo_inscricao: string | null;
  status?: string | null;
  role: string;
  created_at: string | null;
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

type AgendaEvento = {
  id: string;
  mentorado_id: string | null;
  titulo: string;
  tipo: string | null;
  data: string;
  horario: string | null;
  status: string | null;
  observacao: string | null;
  created_at: string | null;
};

type ModuloMentoria = {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number | null;
  ativo: boolean | null;
  created_at: string | null;
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
  ordem: number | null;
  ativo: boolean | null;
  created_at: string | null;
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

type CobrancaComMentorado = Cobranca & {
  mentoradoNome: string;
  mentoradoEmail: string;
  mentoradoCodigo: string;
};

type MentoradosComProgresso = {
  mentorado_id: string;
  nome: string;
  email: string;
  codigo: string;
  progresso: number;
  aulasConcluidas: number;
  totalAulas: number;
  eventosConcluidos: number;
  atrasado: number;
  status: string;
};

const mesesAbreviados = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const statusOptions: StatusFiltro[] = [
  "Todos",
  "Pago",
  "Pendente",
  "Atrasado",
  "Cancelado",
];

const periodoOptions: { label: string; value: PeriodoFiltro }[] = [
  { label: "Todo o período", value: "Todos" },
  { label: "Últimos 30 dias", value: "30" },
  { label: "Últimos 90 dias", value: "90" },
  { label: "Últimos 180 dias", value: "180" },
  { label: "Últimos 12 meses", value: "365" },
];

export default function RelatoriosPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [agenda, setAgenda] = useState<AgendaEvento[]>([]);
  const [modulos, setModulos] = useState<ModuloMentoria[]>([]);
  const [aulas, setAulas] = useState<AulaMentoria[]>([]);
  const [progressoAulas, setProgressoAulas] = useState<ProgressoAula[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>("Todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<PeriodoFiltro>("365");
  const [filtroMentorado, setFiltroMentorado] = useState("Todos");

  const iniciarTela = useCallback(async () => {
    setCarregando(true);
    setErro("");
    setAvisos([]);

    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentorado") {
      router.replace("/mentorado/dashboard");
      return;
    }

    if (user.role !== "mentor" && user.role !== "financeiro" && user.role !== "suporte") {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);

    const avisosTemporarios: string[] = [];

    const { data: mentoradosData, error: mentoradosError } = await supabase
      .from("profiles")
      .select("id, nome, email, codigo_inscricao, status, role, created_at")
      .eq("role", "mentorado")
      .order("created_at", { ascending: false });

    if (mentoradosError) {
      setErro(mentoradosError.message);
      setCarregando(false);
      return;
    }

    const { data: cobrancasData, error: cobrancasError } = await supabase
      .from("financeiro_cobrancas")
      .select(
        "id, mentorado_id, titulo, descricao, valor_total, quantidade_parcelas, parcela_atual, valor_parcela, data_vencimento, data_pagamento, forma_pagamento, status, observacao, created_at, updated_at"
      )
      .order("data_vencimento", { ascending: true });

    if (cobrancasError) {
      setErro(cobrancasError.message);
      setCarregando(false);
      return;
    }

    const { data: agendaData, error: agendaError } = await supabase
      .from("agenda_eventos")
      .select("id, mentorado_id, titulo, tipo, data, horario, status, observacao, created_at")
      .order("data", { ascending: true });

    if (agendaError) {
      avisosTemporarios.push(
        "Agenda ainda não entrou nos relatórios. Quando a tabela agenda_eventos estiver disponível com permissão de leitura, esses dados aparecem aqui."
      );
      setAgenda([]);
    } else {
      setAgenda((agendaData ?? []) as AgendaEvento[]);
    }

    const { data: modulosData, error: modulosError } = await supabase
      .from("modulos")
      .select("id, titulo, descricao, ordem, ativo, created_at, updated_at")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (modulosError) {
      avisosTemporarios.push(
        "Módulos ainda não entraram nos relatórios. Verifique a tabela modulos e as permissões de leitura."
      );
      setModulos([]);
    } else {
      setModulos((modulosData ?? []) as ModuloMentoria[]);
    }

    const { data: aulasData, error: aulasError } = await supabase
      .from("aulas")
      .select("id, modulo_id, titulo, descricao, objetivo, duracao, video_url, ordem, ativo, created_at, updated_at")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (aulasError) {
      avisosTemporarios.push(
        "Aulas ainda não entraram nos relatórios. Verifique a tabela aulas e as permissões de leitura."
      );
      setAulas([]);
    } else {
      setAulas((aulasData ?? []) as AulaMentoria[]);
    }

    const { data: progressoData, error: progressoError } = await supabase
      .from("progresso_aulas")
      .select("id, mentorado_id, aula_id, concluida, concluida_em, created_at, updated_at");

    if (progressoError) {
      avisosTemporarios.push(
        "Progresso das aulas ainda não entrou nos relatórios. Verifique a tabela progresso_aulas e as permissões de leitura."
      );
      setProgressoAulas([]);
    } else {
      setProgressoAulas((progressoData ?? []) as ProgressoAula[]);
    }

    setMentorados((mentoradosData ?? []) as Mentorado[]);
    setCobrancas((cobrancasData ?? []) as Cobranca[]);
    setAvisos(avisosTemporarios);
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    const iniciarCarregamento = window.setTimeout(() => {
      void iniciarTela();
    }, 0);

    return () => window.clearTimeout(iniciarCarregamento);
  }, [iniciarTela]);

  const mentoradosFiltrados = useMemo(() => {
    if (filtroMentorado === "Todos") return mentorados;

    return mentorados.filter((mentorado) => mentorado.id === filtroMentorado);
  }, [mentorados, filtroMentorado]);

  const idsMentoradosFiltrados = useMemo(() => {
    return new Set(mentoradosFiltrados.map((mentorado) => mentorado.id));
  }, [mentoradosFiltrados]);

  const cobrancasComMentorado = useMemo<CobrancaComMentorado[]>(() => {
    return cobrancas.map((cobranca) => {
      const mentorado = mentorados.find((item) => item.id === cobranca.mentorado_id);

      return {
        ...cobranca,
        mentoradoNome: mentorado?.nome ?? "Mentorado não encontrado",
        mentoradoEmail: mentorado?.email ?? "",
        mentoradoCodigo: mentorado?.codigo_inscricao ?? "",
      };
    });
  }, [cobrancas, mentorados]);

  const cobrancasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);
    const dataMinima = obterDataMinima(filtroPeriodo);

    return cobrancasComMentorado.filter((item) => {
      const textoBusca = normalizarTexto(
        [
          item.mentoradoNome,
          item.mentoradoEmail,
          item.mentoradoCodigo,
          item.titulo,
          item.descricao,
          item.status,
          item.forma_pagamento,
        ].join(" ")
      );

      const bateBusca = !termo || textoBusca.includes(termo);
      const bateStatus = filtroStatus === "Todos" || item.status === filtroStatus;
      const bateMentorado = idsMentoradosFiltrados.has(item.mentorado_id);
      const batePeriodo = !dataMinima || item.data_vencimento >= dataMinima;

      return bateBusca && bateStatus && bateMentorado && batePeriodo;
    });
  }, [
    cobrancasComMentorado,
    busca,
    filtroStatus,
    idsMentoradosFiltrados,
    filtroPeriodo,
  ]);

  const agendaFiltrada = useMemo(() => {
    return agenda.filter((evento) => {
      if (!evento.mentorado_id) return filtroMentorado === "Todos";
      return idsMentoradosFiltrados.has(evento.mentorado_id);
    });
  }, [agenda, idsMentoradosFiltrados, filtroMentorado]);

  const progressoFiltrado = useMemo(() => {
    return progressoAulas.filter((item) =>
      idsMentoradosFiltrados.has(item.mentorado_id)
    );
  }, [progressoAulas, idsMentoradosFiltrados]);

  const resumoFinanceiro = useMemo(() => {
    const previsto = somarPorStatus(cobrancasFiltradas, [
      "Pago",
      "Pendente",
      "Atrasado",
      "Cancelado",
    ]);
    const recebido = somarPorStatus(cobrancasFiltradas, ["Pago"]);
    const aberto = somarPorStatus(cobrancasFiltradas, ["Pendente", "Atrasado"]);
    const atrasado = somarPorStatus(cobrancasFiltradas, ["Atrasado"]);
    const cancelado = somarPorStatus(cobrancasFiltradas, ["Cancelado"]);
    const taxaRecebimento = previsto > 0 ? Math.round((recebido / previsto) * 100) : 0;

    const mentoradosComAtraso = new Set(
      cobrancasFiltradas
        .filter((item) => item.status === "Atrasado")
        .map((item) => item.mentorado_id)
    ).size;

    const mentoradosComCobranca = new Set(
      cobrancasFiltradas.map((item) => item.mentorado_id)
    ).size;

    const proximosVencimentos = [...cobrancasFiltradas]
      .filter((item) => item.status === "Pendente" || item.status === "Atrasado")
      .sort((a, b) => compararDatas(a.data_vencimento, b.data_vencimento))
      .slice(0, 6);

    const atrasadas = [...cobrancasFiltradas]
      .filter((item) => item.status === "Atrasado")
      .sort((a, b) => compararDatas(a.data_vencimento, b.data_vencimento));

    return {
      previsto,
      recebido,
      aberto,
      atrasado,
      cancelado,
      taxaRecebimento,
      mentoradosComAtraso,
      mentoradosComCobranca,
      proximosVencimentos,
      atrasadas,
    };
  }, [cobrancasFiltradas]);

  const resumoProgresso = useMemo(() => {
    const aulasAtivas = aulas.filter((aula) => aula.ativo !== false);
    const idsAulasAtivas = new Set(aulasAtivas.map((aula) => aula.id));

    const progressoConcluido = progressoFiltrado.filter(
      (item) => item.concluida && idsAulasAtivas.has(item.aula_id)
    );

    const totalPossivel = mentoradosFiltrados.length * aulasAtivas.length;
    const percentualMedio =
      totalPossivel === 0
        ? 0
        : Math.round((progressoConcluido.length / totalPossivel) * 100);

    const mentoradosComAlgumProgresso = new Set(
      progressoConcluido.map((item) => item.mentorado_id)
    ).size;

    const semProgresso =
      mentoradosFiltrados.length - mentoradosComAlgumProgresso;

    const aulasConcluidasMedia =
      mentoradosFiltrados.length === 0
        ? 0
        : Math.round(progressoConcluido.length / mentoradosFiltrados.length);

    const modulosComProgresso = modulos.map((modulo) => {
      const aulasDoModulo = aulasAtivas.filter((aula) => aula.modulo_id === modulo.id);
      const idsAulasModulo = new Set(aulasDoModulo.map((aula) => aula.id));

      const conclusoes = progressoConcluido.filter((item) =>
        idsAulasModulo.has(item.aula_id)
      ).length;

      const totalModuloPossivel = mentoradosFiltrados.length * aulasDoModulo.length;
      const percentual =
        totalModuloPossivel === 0
          ? 0
          : Math.round((conclusoes / totalModuloPossivel) * 100);

      return {
        id: modulo.id,
        titulo: modulo.titulo,
        ordem: modulo.ordem,
        totalAulas: aulasDoModulo.length,
        conclusoes,
        percentual,
      };
    });

    const melhorModulo = [...modulosComProgresso].sort(
      (a, b) => b.percentual - a.percentual
    )[0];

    const moduloMaisDificil = [...modulosComProgresso]
      .filter((modulo) => modulo.totalAulas > 0)
      .sort((a, b) => a.percentual - b.percentual)[0];

    return {
      totalAulas: aulasAtivas.length,
      totalConclusoes: progressoConcluido.length,
      percentualMedio,
      aulasConcluidasMedia,
      mentoradosComAlgumProgresso,
      semProgresso,
      modulosComProgresso,
      melhorModulo,
      moduloMaisDificil,
    };
  }, [aulas, modulos, progressoFiltrado, mentoradosFiltrados]);

  const resumoAgenda = useMemo(() => {
    const hoje = formatarDataISO(new Date());

    const proximos = [...agendaFiltrada]
      .filter((item) => item.data >= hoje)
      .sort((a, b) => compararDatas(a.data, b.data))
      .slice(0, 5);

    const concluidos = agendaFiltrada.filter(
      (item) => normalizarTexto(item.status ?? "") === "concluida"
    ).length;

    const confirmados = agendaFiltrada.filter(
      (item) => normalizarTexto(item.status ?? "") === "confirmada"
    ).length;

    const cancelados = agendaFiltrada.filter(
      (item) => normalizarTexto(item.status ?? "") === "cancelada"
    ).length;

    const taxaPresenca =
      agendaFiltrada.length === 0
        ? 0
        : Math.round((concluidos / agendaFiltrada.length) * 100);

    return {
      proximos,
      concluidos,
      confirmados,
      cancelados,
      total: agendaFiltrada.length,
      taxaPresenca,
    };
  }, [agendaFiltrada]);

  const acompanhamentoMentorados = useMemo<MentoradosComProgresso[]>(() => {
    const aulasAtivas = aulas.filter((aula) => aula.ativo !== false);
    const idsAulasAtivas = new Set(aulasAtivas.map((aula) => aula.id));

    return mentoradosFiltrados
      .map((mentorado) => {
        const progressoDoMentorado = progressoAulas.filter(
          (item) =>
            item.mentorado_id === mentorado.id &&
            item.concluida &&
            idsAulasAtivas.has(item.aula_id)
        );

        const progresso =
          aulasAtivas.length === 0
            ? 0
            : Math.round((progressoDoMentorado.length / aulasAtivas.length) * 100);

        const eventosConcluidos = agenda.filter(
          (evento) =>
            evento.mentorado_id === mentorado.id &&
            normalizarTexto(evento.status ?? "") === "concluida"
        ).length;

        const atrasado = cobrancas
          .filter(
            (cobranca) =>
              cobranca.mentorado_id === mentorado.id &&
              cobranca.status === "Atrasado"
          )
          .reduce((acc, cobranca) => acc + Number(cobranca.valor_parcela || 0), 0);

        const status =
          atrasado > 0
            ? "Financeiro"
            : progresso < 25 && aulasAtivas.length > 0
            ? "Progresso"
            : eventosConcluidos === 0 && agenda.length > 0
            ? "Presença"
            : "Em dia";

        return {
          mentorado_id: mentorado.id,
          nome: mentorado.nome,
          email: mentorado.email,
          codigo: mentorado.codigo_inscricao ?? "",
          progresso,
          aulasConcluidas: progressoDoMentorado.length,
          totalAulas: aulasAtivas.length,
          eventosConcluidos,
          atrasado,
          status,
        };
      })
      .sort((a, b) => {
        const prioridade = ordemPrioridade(a.status) - ordemPrioridade(b.status);
        if (prioridade !== 0) return prioridade;
        return a.progresso - b.progresso;
      });
  }, [agenda, aulas, cobrancas, mentoradosFiltrados, progressoAulas]);

  const graficoFinanceiro = useMemo(() => {
    const mapa = new Map<
      string,
      {
        mes: string;
        chave: string;
        previsto: number;
        recebido: number;
        aberto: number;
        atrasado: number;
      }
    >();

    const base = criarUltimosMeses(12);

    base.forEach((item) => {
      mapa.set(item.chave, {
        mes: item.label,
        chave: item.chave,
        previsto: 0,
        recebido: 0,
        aberto: 0,
        atrasado: 0,
      });
    });

    cobrancasFiltradas.forEach((item) => {
      const chave = item.data_vencimento.slice(0, 7);

      if (!mapa.has(chave)) {
        const [ano, mes] = chave.split("-");
        mapa.set(chave, {
          chave,
          mes: `${mesesAbreviados[Number(mes) - 1]}/${ano.slice(2)}`,
          previsto: 0,
          recebido: 0,
          aberto: 0,
          atrasado: 0,
        });
      }

      const atual = mapa.get(chave);
      if (!atual) return;

      const valor = Number(item.valor_parcela || 0);
      atual.previsto += valor;

      if (item.status === "Pago") atual.recebido += valor;
      if (item.status === "Pendente") atual.aberto += valor;
      if (item.status === "Atrasado") {
        atual.aberto += valor;
        atual.atrasado += valor;
      }
    });

    return Array.from(mapa.values()).sort((a, b) => a.chave.localeCompare(b.chave));
  }, [cobrancasFiltradas]);

  const graficoProgressoGeral = useMemo(() => {
    const aulasAtivas = aulas.filter((aula) => aula.ativo !== false);
    const idsAulasAtivas = new Set(aulasAtivas.map((aula) => aula.id));
    const base = criarUltimosMeses(12);

    return base.map((mesInfo) => {
      const [anoTexto, mesTexto] = mesInfo.chave.split("-");
      const ano = Number(anoTexto);
      const mes = Number(mesTexto) - 1;
      const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59);

      const conclusoesAteMes = progressoFiltrado.filter((item) => {
        if (!item.concluida || !idsAulasAtivas.has(item.aula_id)) return false;

        const dataConclusao = new Date(
          item.concluida_em || item.updated_at || item.created_at
        );

        return dataConclusao.getTime() <= fimMes.getTime();
      }).length;

      const conclusoesNoMes = progressoFiltrado.filter((item) => {
        if (!item.concluida || !idsAulasAtivas.has(item.aula_id)) return false;

        const dataConclusao = new Date(
          item.concluida_em || item.updated_at || item.created_at
        );

        return (
          dataConclusao.getMonth() === mes &&
          dataConclusao.getFullYear() === ano
        );
      }).length;

      const totalPossivel = mentoradosFiltrados.length * aulasAtivas.length;

      return {
        mes: mesInfo.label,
        chave: mesInfo.chave,
        progresso:
          totalPossivel === 0
            ? 0
            : Math.round((conclusoesAteMes / totalPossivel) * 100),
        conclusoes: conclusoesNoMes,
      };
    });
  }, [aulas, progressoFiltrado, mentoradosFiltrados]);

  const graficoMentorados = useMemo(() => {
    const mapa = new Map<string, { mes: string; chave: string; novos: number; acumulado: number }>();
    const base = criarUltimosMeses(12);

    base.forEach((item) => {
      mapa.set(item.chave, {
        mes: item.label,
        chave: item.chave,
        novos: 0,
        acumulado: 0,
      });
    });

    mentorados.forEach((item) => {
      if (!item.created_at) return;
      const chave = item.created_at.slice(0, 7);

      if (!mapa.has(chave)) {
        const [ano, mes] = chave.split("-");
        mapa.set(chave, {
          chave,
          mes: `${mesesAbreviados[Number(mes) - 1]}/${ano.slice(2)}`,
          novos: 0,
          acumulado: 0,
        });
      }

      const atual = mapa.get(chave);
      if (atual) atual.novos += 1;
    });

    return Array.from(mapa.values())
      .sort((a, b) => a.chave.localeCompare(b.chave))
      .map((item, indice, itens) => ({
        ...item,
        acumulado: itens
          .slice(0, indice + 1)
          .reduce((total, atual) => total + atual.novos, 0),
      }));
  }, [mentorados]);

  const distribuicaoStatus = useMemo(() => {
    const total = cobrancasFiltradas.length || 1;

    return statusOptions
      .filter((status): status is StatusCobranca => status !== "Todos")
      .map((status) => {
        const quantidade = cobrancasFiltradas.filter((item) => item.status === status).length;
        const valor = somarPorStatus(cobrancasFiltradas, [status]);

        return {
          status,
          quantidade,
          valor,
          percentual: Math.round((quantidade / total) * 100),
        };
      });
  }, [cobrancasFiltradas]);

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
            Carregando relatórios...
          </h1>

          <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#12317C]" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} acessoSuporte={usuario.role === "suporte"} />

      <section className="ceo-content no-scrollbar !p-4 sm:!p-5 lg:!p-6">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#12317C]/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-slate-300/30 blur-3xl" />

        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#07122F] to-[#12317C] text-xs font-black text-white shadow-lg">
              CC
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Área da mentora
              </p>
              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">Relatórios estratégicos</h1>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 sm:gap-3">
            <button
              onClick={iniciarTela}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#08163F] shadow-sm transition hover:bg-slate-50 sm:text-sm"
            >
              Atualizar
            </button>

            <button
              onClick={() => router.push("/mentor/financeiro")}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
            >
              Abrir financeiro
            </button>
          </div>
        </header>

        <div className="ceo-stack !max-w-7xl">
          <section className="relative min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl shadow-[#07122F]/20 sm:p-5">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-32 left-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />

            <div className="relative flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200 sm:text-xs">
                  Inteligência da mentoria
                </p>

                <h2 className="mt-3 max-w-5xl break-words text-xl font-black leading-tight sm:text-2xl lg:text-3xl">
                  Relatórios para cruzar financeiro, progresso, mentorados e agenda.
                </h2>

                <p className="mt-3 max-w-3xl break-words text-sm font-semibold leading-6 text-blue-100">
                  Um painel geral para entender a saúde da turma, a evolução dos módulos, presença em encontros e sinais de atenção.
                </p>
              </div>

              <div className="min-w-0 rounded-[20px] border border-white/15 bg-white/10 p-4 backdrop-blur-md sm:max-w-[280px]">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">
                  Progresso médio
                </p>
                <p className="mt-2 break-words text-2xl font-black sm:text-3xl">{resumoProgresso.percentualMedio}%</p>
                <p className="mt-1 text-sm font-semibold text-blue-100">
                  {resumoProgresso.totalConclusoes} conclusões registradas
                </p>
              </div>
            </div>
          </section>

          <section className="mt-3 min-w-0 rounded-[20px] border border-white/50 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-5">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(180px,0.8fr)_minmax(160px,0.7fr)_minmax(170px,0.7fr)]">
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por mentorado, código, e-mail ou cobrança"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#08163F] outline-none placeholder:text-slate-400 focus:border-[#12317C]"
              />

              <select
                value={filtroMentorado}
                onChange={(event) => setFiltroMentorado(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#08163F] outline-none focus:border-[#12317C]"
              >
                <option value="Todos">Todos os mentorados</option>
                {mentorados.map((mentorado) => (
                  <option key={mentorado.id} value={mentorado.id}>
                    {mentorado.codigo_inscricao || "—"} · {mentorado.nome}
                  </option>
                ))}
              </select>

              <select
                value={filtroStatus}
                onChange={(event) => setFiltroStatus(event.target.value as StatusFiltro)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#08163F] outline-none focus:border-[#12317C]"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "Todos" ? "Todos os status" : status}
                  </option>
                ))}
              </select>

              <select
                value={filtroPeriodo}
                onChange={(event) => setFiltroPeriodo(event.target.value as PeriodoFiltro)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#08163F] outline-none focus:border-[#12317C]"
              >
                {periodoOptions.map((periodo) => (
                  <option key={periodo.value} value={periodo.value}>
                    {periodo.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {erro && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          {avisos.map((aviso) => (
            <div key={aviso} className="mt-4 rounded-2xl bg-yellow-50 p-4 text-sm font-bold text-yellow-700">
              {aviso}
            </div>
          ))}

          <section className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI titulo="Progresso médio" valor={`${resumoProgresso.percentualMedio}%`} texto={`${resumoProgresso.aulasConcluidasMedia} aulas por mentorado em média.`} destaque />
            <KPI titulo="Mentorados" valor={String(mentoradosFiltrados.length)} texto={`${resumoProgresso.semProgresso} sem progresso registrado.`} alerta={resumoProgresso.semProgresso > 0} />
            <KPI titulo="Presença" valor={`${resumoAgenda.taxaPresenca}%`} texto={`${resumoAgenda.concluidos}/${resumoAgenda.total} eventos concluídos.`} />
            <KPI titulo="Recebimento" valor={`${resumoFinanceiro.taxaRecebimento}%`} texto={`${formatarMoeda(resumoFinanceiro.recebido)} recebidos.`} />
          </section>

          <section className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI titulo="Receita prevista" valor={formatarMoeda(resumoFinanceiro.previsto)} texto="Soma das parcelas dentro dos filtros." />
            <KPI titulo="Em aberto" valor={formatarMoeda(resumoFinanceiro.aberto)} texto="Pendentes e atrasadas." />
            <KPI titulo="Atrasado" valor={formatarMoeda(resumoFinanceiro.atrasado)} texto={`${resumoFinanceiro.mentoradosComAtraso} mentorado(s) com atraso.`} alerta={resumoFinanceiro.atrasado > 0} />
            <KPI titulo="Módulo difícil" valor={resumoProgresso.moduloMaisDificil?.titulo ?? "—"} texto={`${resumoProgresso.moduloMaisDificil?.percentual ?? 0}% de progresso médio.`} alerta />
          </section>

          <section className="mt-3 grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <Card
              etiqueta="Gráfico de linha"
              titulo="Evolução geral da turma"
              descricao="Mostra o progresso médio acumulado da turma e quantas conclusões aconteceram em cada mês."
            >
              <div className="h-[260px] min-w-0 sm:h-[300px] lg:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graficoProgressoGeral} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value, name) => {
                      if (name === "progresso") return [`${value}%`, "Progresso médio"];
                      if (name === "conclusoes") return [value, "Conclusões no mês"];
                      return [value, name];
                    }} />
                    <Line type="monotone" dataKey="progresso" name="Progresso médio" stroke="#08163F" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="conclusoes" name="Conclusões" stroke="#12317C" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              etiqueta="Módulos"
              titulo="Progresso por módulo"
              descricao="Ajuda a identificar onde a turma está avançando e onde está travando."
            >
              <div className="h-[260px] min-w-0 sm:h-[300px] lg:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resumoProgresso.modulosComProgresso} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="ordem" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value, name) => {
                      if (name === "percentual") return [`${value}%`, "Progresso médio"];
                      return [value, name];
                    }} labelFormatter={(label) => `Módulo ${label}`} />
                    <Bar dataKey="percentual" name="Progresso médio" fill="#08163F" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="mt-3 grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <Card
              etiqueta="Financeiro"
              titulo="Evolução financeira mensal"
              descricao="Compara previsto, recebido, em aberto e atrasado mês a mês."
            >
              <div className="h-[260px] min-w-0 sm:h-[300px] lg:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graficoFinanceiro} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatarMoedaCurta(Number(value))} />
                    <Tooltip formatter={(value) => formatarMoeda(Number(value))} labelFormatter={(label) => `Mês: ${label}`} />
                    <Line type="monotone" dataKey="previsto" name="Previsto" stroke="#08163F" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="recebido" name="Recebido" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="aberto" name="Em aberto" stroke="#D97706" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="atrasado" name="Atrasado" stroke="#DC2626" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              etiqueta="Crescimento"
              titulo="Entrada de mentorados"
              descricao="Mostra quantos mentorados entraram por mês e o acumulado no período."
            >
              <div className="h-[260px] min-w-0 sm:h-[300px] lg:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graficoMentorados} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke="#08163F" fill="#08163F" fillOpacity={0.12} strokeWidth={3} />
                    <Line type="monotone" dataKey="novos" name="Novos" stroke="#12317C" strokeWidth={3} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="mt-3 grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <Card
              etiqueta="Acompanhamento"
              titulo="Mentorados em atenção"
              descricao="Cruza atraso financeiro, pouco progresso e presença para priorizar acompanhamento."
            >
              {acompanhamentoMentorados.length === 0 ? (
                <EmptyState titulo="Nenhum mentorado encontrado" texto="Ajuste os filtros ou cadastre mentorados para visualizar este painel." />
              ) : (
                <div className="min-w-0 overflow-x-auto rounded-[22px] border border-slate-100">
                  <div className="grid min-w-[820px] grid-cols-[1.2fr_0.5fr_0.5fr_0.65fr_0.55fr] bg-[#08163F] p-3 text-[10px] font-black uppercase tracking-[0.12em] text-white sm:text-xs">
                    <span>Mentorado</span>
                    <span>Prog.</span>
                    <span>Eventos</span>
                    <span>Atraso</span>
                    <span>Status</span>
                  </div>

                  <div className="max-h-[430px] divide-y divide-slate-100 overflow-y-auto">
                    {acompanhamentoMentorados.slice(0, 10).map((item) => (
                      <button
                        key={item.mentorado_id}
                        type="button"
                        onClick={() => router.push(`/mentorados/${item.mentorado_id}`)}
                        className="grid w-full min-w-[820px] grid-cols-[1.2fr_0.5fr_0.5fr_0.65fr_0.55fr] items-center p-3 text-left text-sm transition hover:bg-slate-50 sm:p-4"
                      >
                        <span>
                          <strong className="block break-words text-[#08163F]">{item.nome}</strong>
                          <small className="break-all text-xs font-semibold text-slate-400">{item.codigo || "—"} · {item.email}</small>
                        </span>
                        <strong>{item.progresso}%</strong>
                        <strong>{item.eventosConcluidos}</strong>
                        <strong className={item.atrasado > 0 ? "text-red-600" : "text-slate-500"}>{formatarMoeda(item.atrasado)}</strong>
                        <StatusBadge status={item.status} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card
              etiqueta="Status"
              titulo="Distribuição das cobranças"
              descricao="Quantidade e valor total por status dentro dos filtros aplicados."
            >
              <div className="grid gap-4">
                {distribuicaoStatus.map((item) => (
                  <div key={item.status} className="min-w-0 rounded-2xl bg-[#f9fafb] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <StatusBadge status={item.status} />
                      <strong className="text-sm text-[#08163F]">{formatarMoeda(item.valor)}</strong>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-[#08163F]" style={{ width: `${item.percentual}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      {item.quantidade} lançamento(s), {item.percentual}% do total filtrado
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-3 grid min-w-0 gap-3 xl:grid-cols-2">
            <Card
              etiqueta="Agenda"
              titulo="Próximos encontros"
              descricao="Puxa compromissos da agenda para cruzar operação, presença e acompanhamento."
            >
              {resumoAgenda.proximos.length === 0 ? (
                <EmptyState titulo="Nenhum evento próximo encontrado" texto="Quando houver eventos futuros na agenda, eles aparecem aqui." />
              ) : (
                <div className="grid gap-3">
                  {resumoAgenda.proximos.map((evento) => (
                    <div key={evento.id} className="min-w-0 rounded-2xl bg-[#f9fafb] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[#08163F]">{evento.titulo}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {formatarData(evento.data)} {evento.horario ? `às ${limparHorario(evento.horario)}` : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                          {evento.status || evento.tipo || "Agenda"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              etiqueta="Vencimentos"
              titulo="Próximas cobranças"
              descricao="Lista rápida das próximas parcelas pendentes ou atrasadas."
            >
              {resumoFinanceiro.proximosVencimentos.length === 0 ? (
                <EmptyState titulo="Nenhuma cobrança em aberto" texto="Não há vencimentos pendentes dentro dos filtros atuais." />
              ) : (
                <div className="grid gap-3">
                  {resumoFinanceiro.proximosVencimentos.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push("/mentor/financeiro")}
                      className="min-w-0 rounded-2xl bg-[#f9fafb] p-4 text-left transition hover:bg-slate-100"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[#08163F]">{item.mentoradoNome}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {item.titulo} · parcela {item.parcela_atual}/{item.quantidade_parcelas}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-[#08163F]">{formatarMoeda(Number(item.valor_parcela))}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">{formatarData(item.data_vencimento)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section className="mt-3 min-w-0 rounded-[20px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:rounded-[22px]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Cobranças atrasadas
                </p>

                <h3 className="mt-1 break-words text-xl font-black sm:text-2xl">Acompanhamento prioritário</h3>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                  Use esta lista para organizar contato, renegociação ou conferência de baixa no financeiro.
                </p>
              </div>

              <button
                onClick={() => router.push("/mentor/financeiro")}
                className="rounded-2xl bg-[#08163F] px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:brightness-110"
              >
                Gerenciar cobranças
              </button>
            </div>

            {resumoFinanceiro.atrasadas.length === 0 ? (
              <div className="mt-5">
                <EmptyState titulo="Nenhuma parcela atrasada" texto="O filtro atual não encontrou cobranças atrasadas." />
              </div>
            ) : (
              <div className="mt-5 min-w-0 overflow-x-auto rounded-[22px] border border-slate-100">
                <div className="grid min-w-[820px] grid-cols-[1.1fr_1fr_0.6fr_0.7fr_0.6fr] bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C] p-3 text-[10px] font-black uppercase tracking-[0.12em] text-white sm:text-xs">
                  <span>Mentorado</span>
                  <span>Cobrança</span>
                  <span>Valor</span>
                  <span>Vencimento</span>
                  <span>Status</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {resumoFinanceiro.atrasadas.map((item) => (
                    <div key={item.id} className="grid min-w-[820px] grid-cols-[1.1fr_1fr_0.6fr_0.7fr_0.6fr] items-center p-3 text-sm sm:p-4">
                      <span>
                        <strong className="block text-[#08163F]">{item.mentoradoNome}</strong>
                        <small className="text-xs font-semibold text-slate-400">{item.mentoradoCodigo || "—"} · {item.mentoradoEmail}</small>
                      </span>
                      <span className="font-bold text-slate-600">{item.titulo}</span>
                      <strong>{formatarMoeda(Number(item.valor_parcela))}</strong>
                      <span className="font-bold text-slate-600">{formatarData(item.data_vencimento)}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function KPI({
  titulo,
  valor,
  texto,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: React.ReactNode;
  texto: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <article
      className={`min-w-0 overflow-hidden rounded-[20px] p-4 shadow-xl sm:p-5 ${
        destaque
          ? "bg-[#071A55] text-white shadow-[#071A55]/20"
          : alerta
          ? "bg-rose-50 text-rose-700 shadow-slate-200/70"
          : "bg-white text-[#07122F] shadow-slate-200/70"
      }`}
    >
      <p
        className={`break-words text-xs font-black sm:text-sm ${
          destaque ? "text-blue-100" : alerta ? "text-rose-700" : "text-slate-500"
        }`}
      >
        {titulo}
      </p>

      <strong className="mt-3 block break-words text-2xl font-black sm:text-3xl">{valor}</strong>

      <p
        className={`mt-2 break-words text-sm font-medium leading-6 ${
          destaque ? "text-blue-100" : alerta ? "text-rose-600" : "text-slate-500"
        }`}
      >
        {texto}
      </p>
    </article>
  );
}

function Card({
  etiqueta,
  titulo,
  descricao,
  children,
}: {
  etiqueta: string;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[20px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:rounded-[22px]">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
        {etiqueta}
      </p>

      <h3 className="mt-1 break-words text-base font-black sm:text-lg">{titulo}</h3>

      <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-500">
        {descricao}
      </p>

      <div className="mt-3 min-w-0">{children}</div>
    </section>
  );
}

function EmptyState({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="min-w-0 rounded-[22px] border border-dashed border-slate-200 bg-[#f9fafb] p-5 text-center sm:p-6">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-xl shadow-sm sm:h-14 sm:w-14">
        ◌
      </div>

      <h4 className="mt-4 break-words text-base font-black sm:text-lg">{titulo}</h4>

      <p className="mx-auto mt-2 max-w-md break-words text-sm font-semibold leading-6 text-slate-500">
        {texto}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusLower = normalizarTexto(status);

  const classe =
    statusLower === "pago" ||
    statusLower === "em dia" ||
    statusLower === "confirmada" ||
    statusLower === "concluida"
      ? "bg-emerald-100 text-emerald-700"
      : statusLower === "pendente" ||
        statusLower === "progresso" ||
        statusLower === "presenca" ||
        statusLower === "aguardando"
      ? "bg-yellow-100 text-yellow-700"
      : statusLower === "atrasado" ||
        statusLower === "financeiro"
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-black ${classe}`}
    >
      {status}
    </span>
  );
}

function somarPorStatus(cobrancas: CobrancaComMentorado[], status: StatusCobranca[]) {
  return cobrancas
    .filter((item) => status.includes(item.status))
    .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);
}

function compararDatas(a: string, b: string) {
  return new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime();
}

function obterDataMinima(periodo: PeriodoFiltro) {
  if (periodo === "Todos") return null;

  const data = new Date();
  data.setDate(data.getDate() - Number(periodo));

  return formatarDataISO(data);
}

function criarUltimosMeses(quantidade: number) {
  const hoje = new Date();

  return Array.from({ length: quantidade }, (_, index) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (quantidade - 1 - index), 1);
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");

    return {
      chave: `${ano}-${mes}`,
      label: `${mesesAbreviados[data.getMonth()]}/${String(ano).slice(2)}`,
    };
  });
}

function ordemPrioridade(status: string) {
  if (status === "Financeiro") return 1;
  if (status === "Progresso") return 2;
  if (status === "Presença") return 3;
  return 4;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function formatarMoedaCurta(valor: number) {
  if (valor >= 1000000) return `${Math.round(valor / 1000000)} mi`;
  if (valor >= 1000) return `${Math.round(valor / 1000)} mil`;
  return String(Math.round(valor || 0));
}

function formatarData(data: string) {
  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) return "—";

  return `${dia}/${mes}/${ano}`;
}

function formatarDataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function limparHorario(horario: string) {
  return horario?.slice(0, 5) || "";
}

function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
