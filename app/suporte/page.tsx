"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageLoading from "@/components/PageLoading";
import SuporteSidebar from "@/components/SuporteSidebar";
import {
  rotaInicialUsuario,
  sincronizarUsuarioComSessao,
  User,
  usuarioTemAcessoSuporte,
} from "@/utils/auth";
import { supabase } from "@/utils/supabase";

type PerfilResumo = {
  id: string;
  nome: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
};

type TicketResumo = {
  id: string;
  nome_usuario: string | null;
  email_usuario: string | null;
  categoria: string | null;
  prioridade: string | null;
  status: string | null;
  assunto: string | null;
  mensagem: string | null;
  created_at: string | null;
  updated_at: string | null;
  resolvido_em: string | null;
};

type LogResumo = {
  id: string;
  acao: string;
  entidade: string | null;
  descricao: string;
  suporte_nome: string | null;
  created_at: string | null;
};

type FontesDashboard = {
  perfis: boolean;
  tickets: boolean;
  logs: boolean;
};

const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

function normalizar(valor: string | null) {
  return (valor || "").trim().toLowerCase();
}

function ticketEstaPendente(ticket: TicketResumo) {
  return normalizar(ticket.status) !== "resolvido";
}

function ticketEstaAtrasado(ticket: TicketResumo, agora: number) {
  if (!ticketEstaPendente(ticket) || !ticket.created_at || !agora) return false;

  const criadoEm = new Date(ticket.created_at).getTime();
  return !Number.isNaN(criadoEm) && agora - criadoEm >= UM_DIA_EM_MS;
}

function ticketTemPrioridadeCritica(ticket: TicketResumo) {
  const prioridade = normalizar(ticket.prioridade);
  return prioridade === "urgente" || prioridade === "critica";
}

function pontuacaoPrioridade(ticket: TicketResumo) {
  const prioridade = normalizar(ticket.prioridade);

  if (prioridade === "urgente" || prioridade === "critica") return 3;
  if (prioridade === "alta") return 2;
  return 1;
}

function formatarData(data: string | null, comHora = true) {
  if (!data) return "Sem data";

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(comHora
      ? {
          hour: "2-digit" as const,
          minute: "2-digit" as const,
        }
      : {}),
  }).format(valor);
}

function formatarStatus(status: string | null) {
  const valor = normalizar(status);

  if (valor === "em_analise") return "Em análise";
  if (valor === "respondido") return "Respondido";
  if (valor === "resolvido") return "Resolvido";
  if (valor === "ativo") return "Ativo";
  if (valor === "inativo") return "Inativo";
  if (valor === "bloqueado") return "Bloqueado";
  if (valor === "suspenso") return "Suspenso";
  if (valor === "cancelado") return "Cancelado";
  if (!valor) return "Sem status";

  return "Aberto";
}

function formatarPerfil(role: string | null) {
  const valor = normalizar(role);

  if (valor === "mentor") return "Mentor";
  if (valor === "mentorado") return "Mentorado";
  if (valor === "financeiro") return "Financeiro";
  if (valor === "suporte") return "Suporte";

  return "Sem perfil";
}

function formatarPrioridade(prioridade: string | null) {
  const valor = normalizar(prioridade);

  if (valor === "urgente" || valor === "critica") return "Urgente";
  if (valor === "alta") return "Alta";
  if (valor === "baixa") return "Baixa";

  return "Normal";
}

function formatarAcao(acao: string) {
  if (acao === "criacao_usuario") return "Usuário criado";
  if (acao === "exclusao_usuario") return "Usuário excluído";
  if (acao === "atualizacao_usuario") return "Usuário atualizado";
  if (acao === "reset_senha") return "Reset de senha";
  if (acao === "ticket_respondido") return "Chamado respondido";
  if (acao === "ticket_resolvido") return "Chamado resolvido";
  if (acao === "alteracao_status") return "Status alterado";

  return acao.replaceAll("_", " ");
}

function limparDescricao(descricao: string) {
  return descricao
    .replace(/\brole\b/gi, "perfil de acesso")
    .replace(/\blogs?\b/gi, "histórico")
    .replace(/\btickets?\b/gi, "chamado")
    .replace(/p_profile_id/gi, "referência do usuário")
    .replace(/p_status/gi, "status")
    .replace(/p_role/gi, "perfil de acesso");
}

export default function SuportePage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfis, setPerfis] = useState<PerfilResumo[]>([]);
  const [tickets, setTickets] = useState<TicketResumo[]>([]);
  const [logs, setLogs] = useState<LogResumo[]>([]);
  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [fontes, setFontes] = useState<FontesDashboard>({
    perfis: false,
    tickets: false,
    logs: false,
  });
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarDashboard = useCallback(async () => {
    const user = await sincronizarUsuarioComSessao();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!usuarioTemAcessoSuporte(user)) {
      router.replace(rotaInicialUsuario(user));
      return;
    }

    setCarregando(true);
    setErro("");
    setUsuario(user);

    const [perfisResposta, ticketsResposta, logsResposta] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, nome, email, role, status, created_at")
        .is("excluido_em", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("suporte_tickets")
        .select(
          "id, nome_usuario, email_usuario, categoria, prioridade, status, assunto, mensagem, created_at, updated_at, resolvido_em"
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("suporte_logs")
        .select(
          "id, acao, entidade, descricao, suporte_nome, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setPerfis((perfisResposta.data || []) as PerfilResumo[]);
    setTickets((ticketsResposta.data || []) as TicketResumo[]);
    setLogs((logsResposta.data || []) as LogResumo[]);

    setFontes({
      perfis: !perfisResposta.error,
      tickets: !ticketsResposta.error,
      logs: !logsResposta.error,
    });

    const fontesComErro = [
      perfisResposta.error ? "usuários" : null,
      ticketsResposta.error ? "chamados" : null,
      logsResposta.error ? "histórico técnico" : null,
    ].filter(Boolean);

    if (fontesComErro.length > 0) {
      setErro(
        `Algumas informações não puderam ser atualizadas: ${fontesComErro.join(
          ", "
        )}.`
      );
    }

    setAtualizadoEm(new Date().toISOString());
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregarDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [carregarDashboard]);

  const resumo = useMemo(() => {
    const agora = atualizadoEm ? new Date(atualizadoEm).getTime() : 0;
    const hoje = atualizadoEm?.slice(0, 10) || "";

    const ticketsPendentes = tickets.filter(ticketEstaPendente);

    return {
      aguardando: ticketsPendentes.filter(
        (ticket) => normalizar(ticket.status) === "aberto"
      ).length,
      emAnalise: ticketsPendentes.filter(
        (ticket) => normalizar(ticket.status) === "em_analise"
      ).length,
      urgentesOuAtrasados: ticketsPendentes.filter(
        (ticket) =>
          ticketTemPrioridadeCritica(ticket) ||
          ticketEstaAtrasado(ticket, agora)
      ).length,
      problemasAcesso: ticketsPendentes.filter((ticket) => {
        const texto = [
          ticket.categoria,
          ticket.assunto,
          ticket.mensagem,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          normalizar(ticket.categoria) === "alteracao_senha" ||
          texto.includes("senha") ||
          texto.includes("login") ||
          texto.includes("acesso")
        );
      }).length,
      resolvidosHoje: tickets.filter(
        (ticket) =>
          normalizar(ticket.status) === "resolvido" &&
          Boolean(hoje && ticket.resolvido_em?.startsWith(hoje))
      ).length,
      usuariosSemPerfil: perfis.filter((perfil) => !normalizar(perfil.role))
        .length,
      usuariosSemStatus: perfis.filter((perfil) => !normalizar(perfil.status))
        .length,
    };
  }, [atualizadoEm, perfis, tickets]);

  const filaPrioritaria = useMemo(() => {
    const agora = atualizadoEm ? new Date(atualizadoEm).getTime() : 0;

    return tickets
      .filter(ticketEstaPendente)
      .sort((a, b) => {
        const atrasoA = ticketEstaAtrasado(a, agora) ? 1 : 0;
        const atrasoB = ticketEstaAtrasado(b, agora) ? 1 : 0;
        const prioridade =
          pontuacaoPrioridade(b) +
          atrasoB -
          (pontuacaoPrioridade(a) + atrasoA);

        if (prioridade !== 0) return prioridade;

        return (
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
        );
      })
      .slice(0, 6);
  }, [atualizadoEm, tickets]);

  const usuariosEncontrados = useMemo(() => {
    const termo = buscaUsuario.trim().toLowerCase();
    if (termo.length < 2) return [];

    return perfis
      .filter((perfil) =>
        [perfil.nome, perfil.email, perfil.role, perfil.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(termo)
      )
      .slice(0, 5);
  }, [buscaUsuario, perfis]);

  const nomeCurto = usuario?.nome?.trim().split(/\s+/)[0] || "Suporte";

  if (carregando && !usuario) {
    return <PageLoading pagina="central de T.I" />;
  }

  if (!usuario) return null;

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <SuporteSidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/90 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
              Área técnica
            </p>
            <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
              Central de Atendimento e T.I.
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {atualizadoEm && (
              <p className="hidden text-xs font-bold text-gray-400 sm:block">
                Atualizado às{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(atualizadoEm))}
              </p>
            )}

            <button
              type="button"
              onClick={() => void carregarDashboard()}
              disabled={carregando}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60 sm:text-sm"
            >
              {carregando ? "Atualizando..." : "Atualizar dados"}
            </button>
          </div>
        </header>

        <section className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-xl lg:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#C9CED6]">
                    Operação CEO Club
                  </p>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                    {usuario.role === "mentor"
                      ? "Mentoria + Suporte T.I."
                      : "Suporte e T.I."}
                  </span>
                </div>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Olá, {nomeCurto}. O que precisa de atenção agora?
                </h2>

                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
                  Chamados, falhas, senhas e acessos reunidos numa visão
                  operacional para você agir sem precisar caçar informação.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <AcaoRapida
                  label="Abrir chamados"
                  onClick={() => router.push("/suporte/tickets")}
                />
                <AcaoRapida
                  label="Resetar senha"
                  onClick={() => router.push("/suporte/reset-senha")}
                  secundario
                />
                <AcaoRapida
                  label="Gerenciar acessos"
                  onClick={() => router.push("/suporte/usuarios")}
                  secundario
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-4 text-xs font-bold text-white/75">
              <span>{resumo.resolvidosHoje} resolvido(s) hoje</span>
              <span aria-hidden="true">•</span>
              <span>{tickets.length} chamado(s) consultado(s)</span>
              <span aria-hidden="true">•</span>
              <span>{perfis.length} usuário(s) monitorado(s)</span>
            </div>
          </section>

          {erro && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
              {erro}
            </div>
          )}

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CardIndicador
              titulo="Aguardando atendimento"
              valor={resumo.aguardando}
              descricao="Chamados que ainda não foram assumidos"
              tom="azul"
            />
            <CardIndicador
              titulo="Em análise"
              valor={resumo.emAnalise}
              descricao="Atendimentos que estão sendo investigados"
              tom="amarelo"
            />
            <CardIndicador
              titulo="Urgentes ou atrasados"
              valor={resumo.urgentesOuAtrasados}
              descricao="Prioridade crítica ou mais de 24h em aberto"
              tom="vermelho"
            />
            <CardIndicador
              titulo="Acesso e senha"
              valor={resumo.problemasAcesso}
              descricao="Chamados ativos relacionados a login e senha"
              tom="roxo"
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="overflow-hidden rounded-[24px] bg-white shadow-lg shadow-slate-200/70">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                    Prioridade operacional
                  </p>
                  <h3 className="mt-1 text-xl font-black text-[#050816]">
                    Fila de chamados
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/suporte/tickets")}
                  className="rounded-xl bg-[#eef2ff] px-4 py-2 text-xs font-black text-[#12317C] transition hover:bg-[#e0e7ff]"
                >
                  Ver fila completa →
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {filaPrioritaria.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-lg font-black text-[#08163F]">
                      Nenhum chamado pendente
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      A fila está limpa neste momento.
                    </p>
                  </div>
                )}

                {filaPrioritaria.map((ticket) => {
                  const atrasado = ticketEstaAtrasado(
                    ticket,
                    atualizadoEm ? new Date(atualizadoEm).getTime() : 0
                  );

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() =>
                        router.push(`/suporte/tickets?ticket=${ticket.id}`)
                      }
                      className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-[#f9fafb] sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${
                              ticketTemPrioridadeCritica(ticket)
                                ? "bg-red-100 text-red-700"
                                : normalizar(ticket.prioridade) === "alta"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {formatarPrioridade(ticket.prioridade)}
                          </span>
                          <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#12317C]">
                            {formatarStatus(ticket.status)}
                          </span>
                          {atrasado && (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-red-600">
                              +24h
                            </span>
                          )}
                        </div>

                        <h4 className="mt-2 line-clamp-1 text-base font-black text-[#08163F]">
                          {ticket.assunto || "Chamado sem assunto"}
                        </h4>
                        <p className="mt-1 line-clamp-1 text-sm font-semibold text-gray-500">
                          {ticket.nome_usuario || "Usuário não informado"} •{" "}
                          {ticket.email_usuario || "Sem e-mail"}
                        </p>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-xs font-bold text-gray-400">
                          {formatarData(ticket.created_at)}
                        </p>
                        <p className="mt-1 text-xs font-black text-[#12317C]">
                          Abrir chamado →
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] bg-white p-5 shadow-lg shadow-slate-200/70">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                  Checagem desta tela
                </p>
                <h3 className="mt-1 text-xl font-black text-[#050816]">
                  Saúde do sistema
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
                  Status real das consultas usadas pela operação neste painel.
                </p>

                <div className="mt-4 space-y-3">
                  <StatusOperacao
                    label="Banco e usuários"
                    online={fontes.perfis}
                  />
                  <StatusOperacao
                    label="Central de chamados"
                    online={fontes.tickets}
                  />
                  <StatusOperacao
                    label="Histórico técnico"
                    online={fontes.logs}
                  />
                </div>
              </div>

              <div className="rounded-[24px] bg-white p-5 shadow-lg shadow-slate-200/70">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                      Acesso rápido
                    </p>
                    <h3 className="mt-1 text-xl font-black text-[#050816]">
                      Buscar usuário
                    </h3>
                  </div>
                  <div className="text-right text-xs font-bold text-gray-400">
                    <p>{resumo.usuariosSemPerfil} sem perfil</p>
                    <p>{resumo.usuariosSemStatus} sem status</p>
                  </div>
                </div>

                <input
                  value={buscaUsuario}
                  onChange={(evento) => setBuscaUsuario(evento.target.value)}
                  placeholder="Nome, e-mail, perfil ou status"
                  className="mt-4 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                />

                {buscaUsuario.trim().length > 0 &&
                  buscaUsuario.trim().length < 2 && (
                    <p className="mt-3 text-xs font-bold text-gray-400">
                      Digite pelo menos 2 caracteres.
                    </p>
                  )}

                {buscaUsuario.trim().length >= 2 &&
                  usuariosEncontrados.length === 0 && (
                    <p className="mt-3 text-sm font-bold text-gray-500">
                      Nenhum usuário encontrado.
                    </p>
                  )}

                {usuariosEncontrados.length > 0 && (
                  <div className="mt-3 divide-y divide-gray-100">
                    {usuariosEncontrados.map((perfil) => (
                      <button
                        key={perfil.id}
                        type="button"
                        onClick={() =>
                          router.push(
                            `/suporte/usuarios?busca=${encodeURIComponent(
                              perfil.email || perfil.nome || ""
                            )}`
                          )
                        }
                        className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:opacity-70"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[#08163F]">
                            {perfil.nome || "Usuário sem nome"}
                          </p>
                          <p className="truncate text-xs font-semibold text-gray-500">
                            {perfil.email || "E-mail não informado"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-black text-[#12317C]">
                            {formatarPerfil(perfil.role)}
                          </p>
                          <p className="text-[11px] font-bold text-gray-400">
                            {formatarStatus(perfil.status)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => router.push("/suporte/usuarios")}
                  className="mt-4 w-full rounded-2xl bg-[#08163F] px-4 py-3 text-sm font-black text-white transition hover:brightness-110"
                >
                  Gerenciar usuários e acessos
                </button>
              </div>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-[24px] bg-white shadow-lg shadow-slate-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                  Auditoria operacional
                </p>
                <h3 className="mt-1 text-xl font-black text-[#050816]">
                  Atividade técnica recente
                </h3>
              </div>

              <button
                type="button"
                onClick={() => router.push("/suporte/logs")}
                className="rounded-xl bg-[#eef2ff] px-4 py-2 text-xs font-black text-[#12317C] transition hover:bg-[#e0e7ff]"
              >
                Ver histórico completo →
              </button>
            </div>

            <div className="grid divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {logs.length === 0 && (
                <div className="p-6 text-sm font-bold text-gray-500 lg:col-span-2">
                  Nenhuma atividade técnica registrada.
                </div>
              )}

              {logs.slice(0, 6).map((log) => (
                <div key={log.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#12317C]">
                      {formatarAcao(log.acao)}
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      {formatarData(log.created_at)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold leading-6 text-[#08163F]">
                    {limparDescricao(log.descricao)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-400">
                    {log.suporte_nome || "Sistema CEO Club"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function CardIndicador({
  titulo,
  valor,
  descricao,
  tom,
}: {
  titulo: string;
  valor: number;
  descricao: string;
  tom: "azul" | "amarelo" | "vermelho" | "roxo";
}) {
  const cores = {
    azul: "border-blue-500 bg-blue-50 text-blue-700",
    amarelo: "border-amber-500 bg-amber-50 text-amber-700",
    vermelho: "border-red-500 bg-red-50 text-red-700",
    roxo: "border-violet-500 bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-[22px] bg-white p-5 shadow-lg shadow-slate-200/70">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
          {titulo}
        </p>
        <span
          className={`h-3 w-3 shrink-0 rounded-full border-4 ${cores[tom]}`}
        />
      </div>
      <p className="mt-3 text-4xl font-black text-[#08163F]">{valor}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
        {descricao}
      </p>
    </div>
  );
}

function AcaoRapida({
  label,
  onClick,
  secundario = false,
}: {
  label: string;
  onClick: () => void;
  secundario?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-xs font-black transition sm:text-sm ${
        secundario
          ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
          : "bg-white text-[#08163F] shadow-lg hover:bg-[#f3f5f8]"
      }`}
    >
      {label}
    </button>
  );
}

function StatusOperacao({
  label,
  online,
}: {
  label: string;
  online: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f9fafb] p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`h-3 w-3 shrink-0 rounded-full ${
            online ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        <p className="truncate text-sm font-black text-[#08163F]">{label}</p>
      </div>
      <p
        className={`shrink-0 text-xs font-black ${
          online ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {online ? "Operacional" : "Falha na consulta"}
      </p>
    </div>
  );
}
