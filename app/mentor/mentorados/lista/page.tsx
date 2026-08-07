"use client";

import Link from "next/link";
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
  nome: string | null;
  email: string | null;
  telefone: string | null;
  codigo_inscricao: string | null;
  status: string | null;
  created_at: string | null;
};

type CobrancaFinanceira = {
  id: string;
  mentorado_id: string;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: "Pago" | "Pendente" | "Atrasado" | "Cancelado";
};

type EventoAgenda = {
  id: string;
  mentorado_id: string;
  titulo: string | null;
  tipo: string | null;
  data: string;
  horario: string;
  status: string | null;
};

type ModuloBanco = {
  id: string;
  ativo: boolean | null;
};

type AulaBanco = {
  id: string;
  modulo_id: string;
  ativo: boolean | null;
};

type ProgressoAula = {
  id: string;
  mentorado_id: string;
  aula_id: string;
  concluida: boolean | null;
};

type MentoradoResumo = Mentorado & {
  progresso: number;
  aulasConcluidas: number;
  totalAulas: number;
  cobrancasAtrasadas: number;
  encontrosAguardando: number;
  proximoEncontro: EventoAgenda | null;
  motivosAtencao: string[];
};

type FiltroAcompanhamento = "Todos" | "Ativos" | "Atenção" | "Inativos";

function normalizar(valor: string | null | undefined) {
  return String(valor ?? "").trim().toLowerCase();
}

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mentoradoAtivo(mentorado: Mentorado) {
  const status = normalizar(mentorado.status);
  return status === "" || status === "ativo";
}

function mentoradoInativo(mentorado: Mentorado) {
  const status = normalizar(mentorado.status);
  return ["inativo", "cancelado", "bloqueado", "suspenso"].includes(status);
}

function dataHoraEvento(evento: EventoAgenda) {
  const horario = evento.horario?.slice(0, 5) || "00:00";
  return new Date(`${evento.data}T${horario}:00`);
}

export default function MentorMentoradosListaPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [cobrancas, setCobrancas] = useState<CobrancaFinanceira[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [modulos, setModulos] = useState<ModuloBanco[]>([]);
  const [liberacoes, setLiberacoes] = useState<ModuloLiberacaoGlobal[]>([]);
  const [aulas, setAulas] = useState<AulaBanco[]>([]);
  const [progressoAulas, setProgressoAulas] = useState<ProgressoAula[]>([]);

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroAcompanhamento>("Todos");
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const carregarMentorados = useCallback(async (inicial = false) => {
    if (inicial) setCarregando(true);
    else setAtualizando(true);

    try {
      setErro("");

      const [
        mentoradosResposta,
        cobrancasResposta,
        eventosResposta,
        modulosResposta,
        liberacoesResposta,
        aulasResposta,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, nome, email, telefone, codigo_inscricao, status, created_at"
          )
          .is("excluido_em", null)
          .eq("role", "mentorado")
          .order("nome", { ascending: true }),
        supabase
          .from("financeiro_cobrancas")
          .select(
            "id, mentorado_id, valor_parcela, data_vencimento, data_pagamento, status"
          ),
        supabase
          .from("agenda_eventos")
          .select("id, mentorado_id, titulo, tipo, data, horario, status")
          .order("data", { ascending: true })
          .order("horario", { ascending: true }),
        supabase.from("modulos").select("id, ativo").eq("ativo", true),
        supabase
          .from("modulo_liberacoes")
          .select("modulo_id, status_liberacao, liberar_em"),
        supabase
          .from("aulas")
          .select("id, modulo_id, ativo")
          .eq("ativo", true),
      ]);

      const falha = [
        mentoradosResposta.error,
        cobrancasResposta.error,
        eventosResposta.error,
        modulosResposta.error,
        liberacoesResposta.error,
        aulasResposta.error,
      ].find(Boolean);

      if (falha) throw new Error(falha.message);

      const mentoradosData = (mentoradosResposta.data ?? []) as Mentorado[];
      const ids = mentoradosData.map((item) => item.id);

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

      if (ids.length === 0) {
        setProgressoAulas([]);
        return;
      }

      const { data: progressoData, error: progressoError } = await supabase
        .from("progresso_aulas")
        .select("id, mentorado_id, aula_id, concluida")
        .in("mentorado_id", ids);

      if (progressoError) throw new Error(progressoError.message);
      setProgressoAulas((progressoData ?? []) as ProgressoAula[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os mentorados."
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
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
      await carregarMentorados(true);
    }

    void iniciar();

    return () => {
      ativo = false;
    };
  }, [carregarMentorados, router]);

  const aulasLiberadas = useMemo(() => {
    const modulosAtivos = new Set(modulos.map((item) => item.id));
    const liberados = idsModulosLiberados(liberacoes);

    return aulas.filter(
      (aula) =>
        aula.ativo !== false &&
        modulosAtivos.has(aula.modulo_id) &&
        liberados.has(aula.modulo_id)
    );
  }, [aulas, liberacoes, modulos]);

  const mentoradosResumo = useMemo<MentoradoResumo[]>(() => {
    const idsAulasLiberadas = new Set(aulasLiberadas.map((aula) => aula.id));
    const totalAulas = aulasLiberadas.length;
    const agora = Date.now();

    return mentorados.map((mentorado) => {
      const concluidas = progressoAulas.filter(
        (progresso) =>
          progresso.mentorado_id === mentorado.id &&
          progresso.concluida === true &&
          idsAulasLiberadas.has(progresso.aula_id)
      ).length;

      const progresso =
        totalAulas > 0 ? Math.round((concluidas / totalAulas) * 100) : 0;

      const cobrancasAtrasadas = cobrancas.filter(
        (cobranca) =>
          cobranca.mentorado_id === mentorado.id &&
          cobranca.status === "Atrasado"
      ).length;

      const eventosFuturos = eventos
        .filter(
          (evento) =>
            evento.mentorado_id === mentorado.id &&
            !["Cancelada", "Concluída"].includes(evento.status || "") &&
            dataHoraEvento(evento).getTime() >= agora
        )
        .sort(
          (a, b) => dataHoraEvento(a).getTime() - dataHoraEvento(b).getTime()
        );

      const encontrosAguardando = eventosFuturos.filter(
        (evento) => evento.status === "Aguardando"
      ).length;

      const motivosAtencao: string[] = [];
      const status = normalizar(mentorado.status);

      if (status === "pendente") motivosAtencao.push("Acesso pendente");
      if (cobrancasAtrasadas > 0) motivosAtencao.push("Cobrança atrasada");
      if (encontrosAguardando > 0) motivosAtencao.push("Encontro aguardando");
      if (mentoradoAtivo(mentorado) && totalAulas > 0 && concluidas === 0) {
        motivosAtencao.push("Sem progresso registrado");
      }

      return {
        ...mentorado,
        progresso,
        aulasConcluidas: concluidas,
        totalAulas,
        cobrancasAtrasadas,
        encontrosAguardando,
        proximoEncontro: eventosFuturos[0] ?? null,
        motivosAtencao,
      };
    });
  }, [aulasLiberadas, cobrancas, eventos, mentorados, progressoAulas]);

  const resumo = useMemo(() => {
    const ativos = mentoradosResumo.filter(mentoradoAtivo);
    const emAtencao = ativos.filter((item) => item.motivosAtencao.length > 0);
    const comEncontro = ativos.filter((item) => Boolean(item.proximoEncontro));
    const progressoMedio =
      ativos.length > 0
        ? Math.round(
            ativos.reduce((total, item) => total + item.progresso, 0) /
              ativos.length
          )
        : 0;

    return {
      ativos: ativos.length,
      emAtencao: emAtencao.length,
      comEncontro: comEncontro.length,
      progressoMedio,
    };
  }, [mentoradosResumo]);

  const mentoradosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);

    return mentoradosResumo
      .filter((mentorado) => {
        if (filtro === "Ativos" && !mentoradoAtivo(mentorado)) return false;
        if (
          filtro === "Atenção" &&
          (!mentoradoAtivo(mentorado) || mentorado.motivosAtencao.length === 0)
        ) {
          return false;
        }
        if (filtro === "Inativos" && !mentoradoInativo(mentorado)) return false;

        if (!termo) return true;

        const texto = normalizarBusca(
          [
            mentorado.nome,
            mentorado.email,
            mentorado.telefone,
            mentorado.codigo_inscricao,
            mentorado.status,
            ...mentorado.motivosAtencao,
          ]
            .filter(Boolean)
            .join(" ")
        );

        return texto.includes(termo);
      })
      .sort((a, b) => {
        const prioridade = b.motivosAtencao.length - a.motivosAtencao.length;
        if (prioridade !== 0) return prioridade;
        return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
      });
  }, [busca, filtro, mentoradosResumo]);

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return <PageLoading pagina="mentorados" />;
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
            <button
              type="button"
              onClick={() => router.push("/mentor/dashboard")}
              className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
            >
              ← Voltar
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Gestão da mentoria
              </p>
              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
                Mentorados
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void carregarMentorados(false)}
              disabled={atualizando}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-lg transition hover:shadow-xl disabled:opacity-60 sm:text-sm"
            >
              {atualizando ? "Atualizando..." : "Atualizar"}
            </button>
            <button
              type="button"
              onClick={() => void sair()}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9CED6] sm:text-xs">
                  Acompanhamento CEO Club
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Jornada dos mentorados
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#D9DEE7]">
                  Veja quem está avançando, quem precisa da sua atenção e abra o histórico individual sem misturar gestão de usuários com mentoria.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/mentor/agenda")}
                className="w-fit rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:brightness-95"
              >
                + Agendar encontro
              </button>
            </div>
          </section>

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI titulo="Mentorados ativos" valor={resumo.ativos} destaque />
            <KPI
              titulo="Precisam de atenção"
              valor={resumo.emAtencao}
              alerta={resumo.emAtencao > 0}
            />
            <KPI titulo="Progresso médio" valor={`${resumo.progressoMedio}%`} />
            <KPI titulo="Com encontro futuro" valor={resumo.comEncontro} />
          </section>

          <section className="mb-4 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, e-mail, telefone, código ou alerta"
                className="ceo-field"
              />

              <select
                value={filtro}
                onChange={(event) =>
                  setFiltro(event.target.value as FiltroAcompanhamento)
                }
                className="ceo-field"
              >
                <option value="Todos">Todos os mentorados</option>
                <option value="Ativos">Somente ativos</option>
                <option value="Atenção">Precisam de atenção</option>
                <option value="Inativos">Inativos / encerrados</option>
              </select>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
              <span>{mentoradosFiltrados.length} resultado(s)</span>
              {(busca || filtro !== "Todos") && (
                <button
                  type="button"
                  onClick={() => {
                    setBusca("");
                    setFiltro("Todos");
                  }}
                  className="font-black text-[#12317C]"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </section>

          {mentoradosFiltrados.length === 0 ? (
            <section className="rounded-[24px] bg-white p-8 text-center shadow-lg shadow-slate-200/70">
              <p className="text-xl font-black text-[#08163F]">
                Nenhum mentorado encontrado
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Ajuste os filtros ou atualize os dados da página.
              </p>
            </section>
          ) : (
            <section className="grid gap-4 2xl:grid-cols-2">
              {mentoradosFiltrados.map((mentorado) => (
                <MentoradoCard key={mentorado.id} mentorado={mentorado} />
              ))}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function MentoradoCard({ mentorado }: { mentorado: MentoradoResumo }) {
  const status = mentorado.status || "Ativo";

  return (
    <article className="min-w-0 rounded-[24px] bg-white p-4 shadow-lg shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-xl sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Mentorado
            </p>
            <StatusBadge status={status} />
          </div>
          <h2 className="mt-2 break-words text-xl font-black text-[#08163F] sm:text-2xl">
            {mentorado.nome || "Mentorado sem nome"}
          </h2>
          <p className="mt-1 break-all text-sm font-semibold text-slate-500">
            {mentorado.email || "E-mail não informado"}
          </p>
        </div>

        <div className="shrink-0 rounded-2xl bg-[#f8fafc] px-4 py-3 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Progresso
          </p>
          <p className="mt-1 text-2xl font-black text-[#08163F]">
            {mentorado.progresso}%
          </p>
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#eef1f5]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
          style={{ width: `${Math.min(100, Math.max(0, mentorado.progresso))}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-bold text-slate-400">
        {mentorado.aulasConcluidas} de {mentorado.totalAulas} aulas liberadas concluídas
      </p>

      {mentorado.motivosAtencao.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {mentorado.motivosAtencao.map((motivo) => (
            <span
              key={motivo}
              className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700"
            >
              {motivo}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <InfoMini label="Telefone" value={mentorado.telefone || "—"} />
        <InfoMini
          label="Próximo encontro"
          value={
            mentorado.proximoEncontro
              ? `${formatarData(mentorado.proximoEncontro.data)} · ${limparHorario(
                  mentorado.proximoEncontro.horario
                )}`
              : "Sem encontro"
          }
        />
        <InfoMini
          label="Financeiro"
          value={
            mentorado.cobrancasAtrasadas > 0
              ? `${mentorado.cobrancasAtrasadas} atrasada(s)`
              : "Sem atraso"
          }
          alerta={mentorado.cobrancasAtrasadas > 0}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/mentor/mentorados/${mentorado.id}`}
          className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
        >
          Abrir acompanhamento
        </Link>
        <Link
          href={`/mentor/biblioteca?mentorado=${mentorado.id}`}
          className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
        >
          Biblioteca
        </Link>
      </div>
    </article>
  );
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
      className={`rounded-[20px] p-4 shadow-lg shadow-slate-200/70 sm:p-5 ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : alerta
          ? "bg-amber-50 text-amber-800"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`text-xs font-black sm:text-sm ${
          destaque
            ? "text-[#C9CED6]"
            : alerta
            ? "text-amber-600"
            : "text-slate-500"
        }`}
      >
        {titulo}
      </p>
      <p className="mt-3 text-2xl font-black sm:text-3xl">{valor}</p>
    </div>
  );
}

function InfoMini({
  label,
  value,
  alerta,
}: {
  label: string;
  value: string;
  alerta?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-2xl p-3 ${alerta ? "bg-red-50" : "bg-[#f8fafc]"}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${alerta ? "text-red-400" : "text-slate-400"}`}>
        {label}
      </p>
      <p className={`mt-1 break-words text-sm font-black ${alerta ? "text-red-700" : "text-[#08163F]"}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalizado = normalizar(status);
  const classes = ["inativo", "cancelado", "bloqueado", "suspenso"].includes(
    normalizado
  )
    ? "bg-slate-100 text-slate-500"
    : normalizado === "pendente"
    ? "bg-amber-50 text-amber-700"
    : "bg-emerald-50 text-emerald-700";

  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${classes}`}>
      {status}
    </span>
  );
}

function formatarData(data?: string | null) {
  if (!data) return "—";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return "—";
  return `${dia}/${mes}/${ano}`;
}

function limparHorario(horario?: string | null) {
  return horario?.slice(0, 5) || "—";
}
