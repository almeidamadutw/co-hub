"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import SuporteSidebar from "@/components/SuporteSidebar";

type Ticket = {
  id: string;
  usuario_id: string | null;
  nome_usuario: string | null;
  email_usuario: string | null;
  role_usuario: string | null;
  categoria: string | null;
  prioridade: string | null;
  status: string | null;
  assunto: string | null;
  mensagem: string | null;
  resposta: string | null;
  created_at: string | null;
  updated_at: string | null;
  resolvido_em: string | null;
};

type MensagemTicket = {
  id: string;
  ticket_id: string;
  autor_id: string | null;
  autor_nome: string | null;
  autor_email: string | null;
  autor_role: string | null;
  mensagem: string;
  tipo: string | null;
  created_at: string | null;
};

const statusOptions = [
  { label: "Todos", value: "todos" },
  { label: "Aberto", value: "aberto" },
  { label: "Em análise", value: "em_analise" },
  { label: "Respondido", value: "respondido" },
  { label: "Resolvido", value: "resolvido" },
];

const categoriaOptions = [
  { label: "Todas", value: "todas" },
  { label: "Problema técnico", value: "problema_tecnico" },
  { label: "Alteração de senha", value: "alteracao_senha" },
  { label: "Dúvida sobre aula", value: "duvida_aula" },
  { label: "Dúvida financeira", value: "duvida_financeira" },
  { label: "Dúvida sobre atividade", value: "duvida_atividade" },
  { label: "Outro", value: "outro" },
];

export default function TicketsSuportePage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSelecionado, setTicketSelecionado] = useState<Ticket | null>(
    null
  );

  const [mensagens, setMensagens] = useState<MensagemTicket[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");

  const [carregando, setCarregando] = useState(true);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = getUsuarioLogado();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (user.role !== "suporte") {
        logoutUsuario();
        router.replace("/login");
        return;
      }

      setUsuario(user);
      await carregarTickets();
      setCarregando(false);
    }

    carregar();
  }, [router]);

  async function carregarTickets() {
    setErro("");

    const { data, error } = await supabase
      .from("suporte_tickets")
      .select(
        "id, usuario_id, nome_usuario, email_usuario, role_usuario, categoria, prioridade, status, assunto, mensagem, resposta, created_at, updated_at, resolvido_em"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setErro(`Não foi possível carregar os tickets: ${error.message}`);
      return;
    }

    setTickets((data || []) as Ticket[]);
  }

  async function carregarMensagens(ticketId: string) {
    setCarregandoChat(true);
    setErro("");

    const { data, error } = await supabase
      .from("suporte_ticket_mensagens")
      .select(
        "id, ticket_id, autor_id, autor_nome, autor_email, autor_role, mensagem, tipo, created_at"
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .limit(100);

    setCarregandoChat(false);

    if (error) {
      setErro(`Não foi possível carregar o chat do ticket: ${error.message}`);
      return;
    }

    setMensagens((data || []) as MensagemTicket[]);
  }

  const ticketsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const passaStatus =
        statusFiltro === "todos" || normalizar(ticket.status) === statusFiltro;

      const passaCategoria =
        categoriaFiltro === "todas" ||
        normalizar(ticket.categoria) === categoriaFiltro;

      const textoBusca = [
        ticket.nome_usuario,
        ticket.email_usuario,
        ticket.assunto,
        ticket.mensagem,
        ticket.categoria,
        ticket.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const passaBusca = !termo || textoBusca.includes(termo);

      return passaStatus && passaCategoria && passaBusca;
    });
  }, [tickets, busca, statusFiltro, categoriaFiltro]);

  const resumo = useMemo(() => {
    return {
      total: tickets.length,
      abertos: tickets.filter((ticket) => normalizar(ticket.status) === "aberto")
        .length,
      emAnalise: tickets.filter(
        (ticket) => normalizar(ticket.status) === "em_analise"
      ).length,
      respondidos: tickets.filter(
        (ticket) => normalizar(ticket.status) === "respondido"
      ).length,
      resolvidos: tickets.filter(
        (ticket) => normalizar(ticket.status) === "resolvido"
      ).length,
    };
  }, [tickets]);

  function normalizar(valor: string | null) {
    return (valor || "").trim().toLowerCase();
  }

  function ticketEstaResolvido(ticket: Ticket | null) {
    return normalizar(ticket?.status || null) === "resolvido";
  }

  async function selecionarTicket(ticket: Ticket) {
    setTicketSelecionado(ticket);
    setNovaMensagem("");
    setMensagemSucesso("");
    setErro("");
    await carregarMensagens(ticket.id);
  }

  function nomeCategoria(categoria: string | null) {
    const categoriaAtual = normalizar(categoria);

    if (categoriaAtual === "problema_tecnico") return "Problema técnico";
    if (categoriaAtual === "alteracao_senha") return "Alteração de senha";
    if (categoriaAtual === "duvida_aula") return "Dúvida sobre aula";
    if (categoriaAtual === "duvida_financeira") return "Dúvida financeira";
    if (categoriaAtual === "duvida_atividade") return "Dúvida sobre atividade";

    return "Outro";
  }

  function nomeStatus(status: string | null) {
    const statusAtual = normalizar(status);

    if (statusAtual === "aberto") return "Aberto";
    if (statusAtual === "em_analise") return "Em análise";
    if (statusAtual === "respondido") return "Respondido";
    if (statusAtual === "resolvido") return "Resolvido";

    return "Aberto";
  }

  function formatarData(data: string | null) {
    if (!data) return "Sem data";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(data));
  }

  async function atualizarTicketComChat(
    novoStatus: "aberto" | "em_analise" | "respondido" | "resolvido",
    enviarTexto: boolean
  ) {
    if (!ticketSelecionado) return;

    if (novoStatus === "resolvido") {
      const confirmar = window.confirm(
        "Tem certeza que deseja resolver este ticket? Depois disso, o chat será bloqueado para novas mensagens."
      );

      if (!confirmar) return;
    }

    if (ticketEstaResolvido(ticketSelecionado)) {
      setErro(
        "Este ticket já foi resolvido. O chat está bloqueado para novas mensagens."
      );
      return;
    }

    setSalvando(true);
    setMensagemSucesso("");
    setErro("");

    const texto = enviarTexto ? novaMensagem.trim() : "";

    if (enviarTexto && !texto) {
      setSalvando(false);
      setErro("Digite uma mensagem antes de enviar.");
      return;
    }

    const { error } = await supabase.rpc("suporte_atualizar_ticket_com_chat", {
      p_ticket_id: ticketSelecionado.id,
      p_status: novoStatus,
      p_mensagem: texto || null,
    });

    setSalvando(false);

    if (error) {
      setErro(`Não foi possível atualizar o ticket: ${error.message}`);
      return;
    }

    const agora = new Date().toISOString();

    const ticketAtualizado: Ticket = {
      ...ticketSelecionado,
      status: novoStatus,
      resposta: texto || ticketSelecionado.resposta,
      updated_at: agora,
      resolvido_em: novoStatus === "resolvido" ? agora : null,
    };

    setTicketSelecionado(ticketAtualizado);
    setNovaMensagem("");
    setMensagemSucesso("Ticket atualizado, conversa salva e log registrado.");

    await carregarTickets();
    await carregarMensagens(ticketSelecionado.id);
  }

  if (carregando || !usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">
            CEO Club
          </p>

          <h1 className="mt-3 text-2xl font-black">Carregando tickets...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <SuporteSidebar nome={usuario.nome} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
              Suporte técnico
            </p>

            <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
              Tickets e conversas
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push("/suporte")}
            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
          >
            Voltar ao dashboard
          </button>
        </header>

        <section className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <div className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-xl lg:rounded-[26px] lg:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
              Central de chamados
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Atendimento técnico com chat
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
              Acompanhe os chamados, responda os usuários e mantenha o histórico
              da conversa dentro do próprio ticket.
            </p>
          </div>

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {erro}
            </div>
          )}

          {mensagemSucesso && (
            <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700">
              {mensagemSucesso}
            </div>
          )}

          <section className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <CardResumo titulo="Total" valor={resumo.total} />
            <CardResumo titulo="Abertos" valor={resumo.abertos} />
            <CardResumo titulo="Em análise" valor={resumo.emAnalise} />
            <CardResumo titulo="Respondidos" valor={resumo.respondidos} />
            <CardResumo titulo="Resolvidos" valor={resumo.resolvidos} />
          </section>

          <section className="mb-4 grid gap-3 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 lg:grid-cols-[minmax(0,1fr)_220px_240px]">
            <label>
              <span className="text-sm font-black text-gray-500">
                Buscar ticket
              </span>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, e-mail, assunto ou mensagem"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
              />
            </label>

            <label>
              <span className="text-sm font-black text-gray-500">Status</span>

              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
              >
                {statusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-black text-gray-500">
                Categoria
              </span>

              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
              >
                {categoriaOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="grid gap-4 xl:grid-cols-[430px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
              <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
                <h3 className="text-xl font-black text-[#050816]">Tickets</h3>

                <p className="mt-1 text-sm font-semibold text-gray-500">
                  {ticketsFiltrados.length} chamado(s) encontrado(s)
                </p>
              </div>

              <div className="max-h-[720px] divide-y divide-gray-100 overflow-y-auto">
                {ticketsFiltrados.length === 0 && (
                  <div className="p-6 text-sm font-bold text-gray-500">
                    Nenhum ticket encontrado.
                  </div>
                )}

                {ticketsFiltrados.map((ticket) => {
                  const selecionado = ticketSelecionado?.id === ticket.id;
                  const resolvido = ticketEstaResolvido(ticket);

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => selecionarTicket(ticket)}
                      className={`block w-full p-4 text-left transition sm:p-5 ${
                        selecionado
                          ? "bg-[#08163F] text-white"
                          : "bg-white text-[#08163F] hover:bg-[#f9fafb]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            resolvido
                              ? "bg-emerald-100 text-emerald-700"
                              : selecionado
                              ? "bg-white text-[#08163F]"
                              : "bg-[#f3f5f8] text-gray-500"
                          }`}
                        >
                          {nomeStatus(ticket.status)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            selecionado
                              ? "bg-white/10 text-white"
                              : "bg-[#f3f5f8] text-gray-500"
                          }`}
                        >
                          {nomeCategoria(ticket.categoria)}
                        </span>
                      </div>

                      <h4 className="mt-3 line-clamp-2 text-base font-black">
                        {ticket.assunto || "Ticket sem assunto"}
                      </h4>

                      <p
                        className={`mt-2 line-clamp-2 text-sm font-semibold ${
                          selecionado ? "text-white/75" : "text-gray-500"
                        }`}
                      >
                        {ticket.mensagem || "Sem descrição"}
                      </p>

                      <div
                        className={`mt-3 text-xs font-bold ${
                          selecionado ? "text-white/70" : "text-gray-400"
                        }`}
                      >
                        <p>{ticket.nome_usuario || "Usuário não informado"}</p>
                        <p className="break-all">
                          {ticket.email_usuario || "E-mail não informado"}
                        </p>
                        <p className="mt-1">
                          Aberto em {formatarData(ticket.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-[720px] overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
              {!ticketSelecionado ? (
                <div className="flex min-h-[720px] items-center justify-center p-8 text-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">
                      Nenhum ticket selecionado
                    </p>

                    <h3 className="mt-3 text-2xl font-black text-[#08163F]">
                      Selecione um chamado
                    </h3>

                    <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-gray-500">
                      Ao escolher um ticket, o histórico da conversa aparece
                      aqui.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[720px] flex-col">
                  <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Tag>{nomeStatus(ticketSelecionado.status)}</Tag>
                          <Tag>
                            {nomeCategoria(ticketSelecionado.categoria)}
                          </Tag>
                          <Tag>
                            Prioridade:{" "}
                            {ticketSelecionado.prioridade || "normal"}
                          </Tag>

                          {ticketEstaResolvido(ticketSelecionado) && (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                              Chat bloqueado
                            </span>
                          )}
                        </div>

                        <h3 className="break-words text-xl font-black text-[#08163F]">
                          {ticketSelecionado.assunto || "Ticket sem assunto"}
                        </h3>

                        <p className="mt-2 break-all text-sm font-bold text-gray-500">
                          {ticketSelecionado.nome_usuario ||
                            "Usuário não informado"}{" "}
                          •{" "}
                          {ticketSelecionado.email_usuario ||
                            "E-mail não informado"}
                        </p>

                        <p className="mt-1 text-xs font-bold text-gray-400">
                          Aberto em {formatarData(ticketSelecionado.created_at)}
                        </p>

                        {ticketSelecionado.resolvido_em && (
                          <p className="mt-1 text-xs font-bold text-emerald-600">
                            Resolvido em{" "}
                            {formatarData(ticketSelecionado.resolvido_em)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            atualizarTicketComChat("em_analise", false)
                          }
                          disabled={
                            salvando || ticketEstaResolvido(ticketSelecionado)
                          }
                          className="rounded-2xl bg-[#f3f5f8] px-4 py-2.5 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Em análise
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            atualizarTicketComChat("resolvido", false)
                          }
                          disabled={
                            salvando || ticketEstaResolvido(ticketSelecionado)
                          }
                          className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Resolver
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] p-4 sm:p-5">
                    <MensagemBolha
                      lado="usuario"
                      nome={ticketSelecionado.nome_usuario || "Usuário"}
                      role={ticketSelecionado.role_usuario || "mentorado"}
                      data={ticketSelecionado.created_at}
                    >
                      {ticketSelecionado.mensagem || "Mensagem não informada."}
                    </MensagemBolha>

                    {carregandoChat && (
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold text-gray-500 shadow-sm">
                        Carregando conversa...
                      </div>
                    )}

                    {!carregandoChat &&
                      mensagens.map((item) => (
                        <MensagemBolha
                          key={item.id}
                          lado={
                            normalizar(item.autor_role) === "suporte"
                              ? "suporte"
                              : "usuario"
                          }
                          nome={item.autor_nome || item.autor_email || "Usuário"}
                          role={
                            item.tipo === "sistema"
                              ? "sistema"
                              : item.autor_role
                          }
                          data={item.created_at}
                        >
                          {item.mensagem}
                        </MensagemBolha>
                      ))}
                  </div>

                  <div className="border-t border-gray-100 bg-white p-4 sm:p-5">
                    {ticketEstaResolvido(ticketSelecionado) && (
                      <div className="mb-3 rounded-2xl bg-emerald-50 p-4 text-sm font-black leading-6 text-emerald-700">
                        Este ticket foi resolvido. O chat está bloqueado para
                        novas mensagens.
                      </div>
                    )}

                    <label>
                      <span className="text-sm font-black text-gray-500">
                        Responder no chat
                      </span>

                      <textarea
                        value={novaMensagem}
                        onChange={(e) => setNovaMensagem(e.target.value)}
                        placeholder={
                          ticketEstaResolvido(ticketSelecionado)
                            ? "Ticket resolvido. Chat bloqueado."
                            : "Digite a resposta para o usuário..."
                        }
                        disabled={ticketEstaResolvido(ticketSelecionado)}
                        rows={4}
                        className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-semibold leading-6 text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </label>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          atualizarTicketComChat("resolvido", true)
                        }
                        disabled={
                          salvando || ticketEstaResolvido(ticketSelecionado)
                        }
                        className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {salvando ? "Salvando..." : "Responder e resolver"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          atualizarTicketComChat("respondido", true)
                        }
                        disabled={
                          salvando || ticketEstaResolvido(ticketSelecionado)
                        }
                        className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {salvando ? "Enviando..." : "Enviar resposta"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function CardResumo({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-[22px] bg-white p-5 shadow-lg shadow-slate-200/70">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
        {titulo}
      </p>

      <p className="mt-3 text-4xl font-black text-[#08163F]">{valor}</p>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black text-gray-500">
      {children}
    </span>
  );
}

function MensagemBolha({
  lado,
  nome,
  role,
  data,
  children,
}: {
  lado: "usuario" | "suporte";
  nome: string;
  role: string | null;
  data: string | null;
  children: ReactNode;
}) {
  const ehSuporte = lado === "suporte";

  return (
    <div className={`flex ${ehSuporte ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-[22px] p-4 shadow-sm ${
          ehSuporte ? "bg-[#08163F] text-white" : "bg-white text-[#08163F]"
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p
            className={`text-xs font-black uppercase tracking-[0.16em] ${
              ehSuporte ? "text-white/70" : "text-gray-400"
            }`}
          >
            {nome}
          </p>

          {role && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                ehSuporte
                  ? "bg-white/10 text-white/80"
                  : "bg-[#f3f5f8] text-gray-500"
              }`}
            >
              {role}
            </span>
          )}
        </div>

        <div className="whitespace-pre-wrap text-sm font-semibold leading-6">
          {children}
        </div>

        <p
          className={`mt-3 text-[11px] font-bold ${
            ehSuporte ? "text-white/60" : "text-gray-400"
          }`}
        >
          {formatarDataBolha(data)}
        </p>
      </div>
    </div>
  );
}

function formatarDataBolha(data: string | null) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}