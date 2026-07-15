"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import MentoradoLoading from "@/components/MentoradoLoading";

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

const categorias = [
  { label: "Problema técnico", value: "problema_tecnico" },
  { label: "Alteração de senha", value: "alteracao_senha" },
  { label: "Dúvida sobre aula", value: "duvida_aula" },
  { label: "Dúvida financeira", value: "duvida_financeira" },
  { label: "Dúvida sobre atividade", value: "duvida_atividade" },
  { label: "Outro", value: "outro" },
];

const statusFiltroOpcoes = [
  { label: "Todos", value: "todos" },
  { label: "Aberto", value: "aberto" },
  { label: "Em análise", value: "em_analise" },
  { label: "Respondido", value: "respondido" },
  { label: "Resolvido", value: "resolvido" },
];

const perguntasFrequentes = [
  {
    pergunta: "Onde encontro os materiais das aulas?",
    resposta:
      "Dentro da tela de aula, clique em arquivos disponíveis. Se a aula possuir materiais, eles aparecerão para download.",
  },
  {
    pergunta: "Como faço os simulados?",
    resposta:
      "Acesse Praticar no menu lateral. Os simulados aparecem conforme os módulos liberados pela mentora.",
  },
  {
    pergunta: "Quando minha próxima mentoria aparece?",
    resposta:
      "Assim que a equipe ou a mentora registrar um encontro, ele aparecerá na sua agenda.",
  },
  {
    pergunta: "Posso responder um ticket resolvido?",
    resposta:
      "Não. Quando o suporte marca um ticket como resolvido, o chat fica bloqueado para manter o histórico fechado.",
  },
];

export default function SuporteMentoradoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSelecionado, setTicketSelecionado] = useState<Ticket | null>(
    null
  );
  const [mensagens, setMensagens] = useState<MensagemTicket[]>([]);

  const [categoria, setCategoria] = useState("problema_tecnico");
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [novaResposta, setNovaResposta] = useState("");
  const [faqAberto, setFaqAberto] = useState<number | null>(0);

  const [carregando, setCarregando] = useState(true);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [criando, setCriando] = useState(false);
  const [respondendo, setRespondendo] = useState(false);

  const [erro, setErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  const carregarTickets = useCallback(async (usuarioId?: string) => {
    if (!usuarioId) return [];

    setErro("");

    const { data, error } = await supabase
      .from("suporte_tickets")
      .select(
        "id, usuario_id, nome_usuario, email_usuario, role_usuario, categoria, prioridade, status, assunto, mensagem, resposta, created_at, updated_at, resolvido_em"
      )
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setErro(`Não foi possível carregar seus tickets: ${error.message}`);
      return [];
    }

    const lista = (data || []) as Ticket[];
    setTickets(lista);
    return lista;
  }, []);

  useEffect(() => {
    async function carregar() {
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
      await carregarTickets(user.id);
      setCarregando(false);
    }

    void carregar();
  }, [carregarTickets, router]);

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
      setErro(`Não foi possível carregar a conversa: ${error.message}`);
      return;
    }

    setMensagens((data || []) as MensagemTicket[]);
  }

  const ticketsFiltrados = (() => {
    const termo = busca.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const passaStatus =
        statusFiltro === "todos" || normalizar(ticket.status) === statusFiltro;

      const textoBusca = [
        ticket.assunto,
        ticket.mensagem,
        ticket.categoria,
        ticket.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const passaBusca = !termo || textoBusca.includes(termo);

      return passaStatus && passaBusca;
    });
  })();

  const resumo = (() => {
    return {
      total: tickets.length,
      abertos: tickets.filter((ticket) => normalizar(ticket.status) === "aberto")
        .length,
      emAnalise: tickets.filter(
        (ticket) => normalizar(ticket.status) === "em_analise"
      ).length,
      resolvidos: tickets.filter(
        (ticket) => normalizar(ticket.status) === "resolvido"
      ).length,
    };
  })();

  function normalizar(valor: string | null) {
    return (valor || "").trim().toLowerCase();
  }

  function ticketEstaResolvido(ticket: Ticket | null) {
    return normalizar(ticket?.status || null) === "resolvido";
  }

  function nomeStatus(status: string | null) {
    const atual = normalizar(status);

    if (atual === "aberto") return "Aberto";
    if (atual === "em_analise") return "Em análise";
    if (atual === "respondido") return "Respondido";
    if (atual === "resolvido") return "Resolvido";

    return "Aberto";
  }

  function nomeCategoria(categoriaAtual: string | null) {
    const atual = normalizar(categoriaAtual);

    return categorias.find((item) => item.value === atual)?.label || "Outro";
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

  async function selecionarTicket(ticket: Ticket) {
    setTicketSelecionado(ticket);
    setNovaResposta("");
    setMensagemSucesso("");
    setErro("");
    await carregarMensagens(ticket.id);
  }

  async function abrirTicket(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setMensagemSucesso("");

    if (!usuario) return;

    if (!assunto.trim() || !descricao.trim()) {
      setErro("Preencha o assunto e a mensagem antes de abrir o chamado.");
      return;
    }

    setCriando(true);

    const { data, error } = await supabase.rpc("mentorado_criar_ticket", {
      p_categoria: categoria,
      p_assunto: assunto.trim(),
      p_mensagem: descricao.trim(),
      p_prioridade: "normal",
    });

    setCriando(false);

    if (error) {
      setErro(`Não foi possível abrir o chamado: ${error.message}`);
      return;
    }

    setAssunto("");
    setDescricao("");
    setMensagemSucesso("Chamado aberto com sucesso. O suporte já pode visualizar.");

    const lista = await carregarTickets(usuario.id);
    const criado = lista.find((ticket) => ticket.id === data);

    if (criado) {
      await selecionarTicket(criado);
    }
  }

  async function responderTicket() {
    if (!ticketSelecionado) return;

    setErro("");
    setMensagemSucesso("");

    if (ticketEstaResolvido(ticketSelecionado)) {
      setErro("Este ticket foi resolvido. O chat está bloqueado.");
      return;
    }

    if (!novaResposta.trim()) {
      setErro("Digite uma mensagem antes de responder.");
      return;
    }

    setRespondendo(true);

    const { error } = await supabase.rpc("mentorado_responder_ticket", {
      p_ticket_id: ticketSelecionado.id,
      p_mensagem: novaResposta.trim(),
    });

    setRespondendo(false);

    if (error) {
      setErro(`Não foi possível enviar sua resposta: ${error.message}`);
      return;
    }

    setNovaResposta("");
    setMensagemSucesso("Mensagem enviada para o suporte.");

    const ticketAtualizado = {
      ...ticketSelecionado,
      status: "aberto",
      updated_at: new Date().toISOString(),
    };

    setTicketSelecionado(ticketAtualizado);
    await carregarTickets(usuario?.id);
    await carregarMensagens(ticketSelecionado.id);
  }

  if (carregando || !usuario) {
    return <MentoradoLoading mensagem="Carregando suporte..." />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <MentoradoSidebar nome={usuario.nome} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/mentorado/dashboard")}
              className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
            >
              ← Voltar
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Central de apoio
              </p>

              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
                Suporte CEO Club
              </h1>
            </div>
          </div>
        </header>

        <section className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <div className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px] lg:p-6">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                  Suporte
                </p>

                <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                  Como podemos te ajudar?
                </h2>

                <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-[#D9DEE7]">
                  Abra chamados, acompanhe respostas e converse com o suporte
                  dentro do próprio ticket.
                </p>
              </div>

              <div className="rounded-[20px] bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-bold text-[#C9CED6]">
                  Tempo médio de resposta
                </p>
                <p className="mt-2 text-2xl font-black sm:text-3xl">24h</p>
              </div>
            </div>
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

          <section className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CardResumo titulo="Total" valor={resumo.total} />
            <CardResumo titulo="Abertos" valor={resumo.abertos} />
            <CardResumo titulo="Em análise" valor={resumo.emAnalise} />
            <CardResumo titulo="Resolvidos" valor={resumo.resolvidos} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="space-y-4">
              <Card titulo="Abrir chamado">
                <form onSubmit={abrirTicket} className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-black text-gray-500">
                      Categoria
                    </span>

                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
                    >
                      {categorias.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-gray-500">
                      Assunto
                    </span>

                    <input
                      value={assunto}
                      onChange={(e) => setAssunto(e.target.value)}
                      placeholder="Ex: Não consigo acessar o material da aula"
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-gray-500">
                      Mensagem
                    </span>

                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Explique o que aconteceu com o máximo de detalhes."
                      rows={5}
                      className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-semibold leading-6 text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={criando}
                    className="w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {criando ? "Abrindo chamado..." : "Abrir chamado"}
                  </button>
                </form>
              </Card>

              <Card titulo="Perguntas frequentes">
                <div className="space-y-2">
                  {perguntasFrequentes.map((item, index) => (
                    <div
                      key={item.pergunta}
                      className="rounded-2xl border border-gray-100 bg-[#f9fafb]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setFaqAberto(faqAberto === index ? null : index)
                        }
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-black text-[#08163F]"
                      >
                        <span>{item.pergunta}</span>
                        <span>{faqAberto === index ? "−" : "+"}</span>
                      </button>

                      {faqAberto === index && (
                        <p className="px-4 pb-4 text-sm font-semibold leading-6 text-gray-500">
                          {item.resposta}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <section className="grid gap-3 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 lg:grid-cols-[minmax(0,1fr)_220px]">
                <label>
                  <span className="text-sm font-black text-gray-500">
                    Buscar ticket
                  </span>

                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Assunto, mensagem, categoria ou status"
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                  />
                </label>

                <label>
                  <span className="text-sm font-black text-gray-500">
                    Status
                  </span>

                  <select
                    value={statusFiltro}
                    onChange={(e) => setStatusFiltro(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                  >
                    {statusFiltroOpcoes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
                  <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4">
                    <h3 className="text-xl font-black text-[#050816]">
                      Meus chamados
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      {ticketsFiltrados.length} ticket(s) encontrado(s)
                    </p>
                  </div>

                  <div className="max-h-[680px] divide-y divide-gray-100 overflow-y-auto">
                    {ticketsFiltrados.length === 0 && (
                      <div className="p-6 text-sm font-bold text-gray-500">
                        Nenhum chamado encontrado.
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
                          className={`block w-full p-4 text-left transition ${
                            selecionado
                              ? "bg-[#08163F] text-white"
                              : "bg-white text-[#08163F] hover:bg-[#f9fafb]"
                          }`}
                        >
                          <div className="flex flex-wrap gap-2">
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

                          <p
                            className={`mt-3 text-xs font-bold ${
                              selecionado ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            Criado em {formatarData(ticket.created_at)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="min-h-[680px] overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
                  {!ticketSelecionado ? (
                    <div className="flex min-h-[680px] items-center justify-center p-8 text-center">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">
                          Nenhum ticket selecionado
                        </p>

                        <h3 className="mt-3 text-2xl font-black text-[#08163F]">
                          Selecione um chamado
                        </h3>

                        <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-gray-500">
                          Ao escolher um ticket, a conversa com o suporte
                          aparece aqui.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[680px] flex-col">
                      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Tag>{nomeStatus(ticketSelecionado.status)}</Tag>
                          <Tag>{nomeCategoria(ticketSelecionado.categoria)}</Tag>

                          {ticketEstaResolvido(ticketSelecionado) && (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                              Chat bloqueado
                            </span>
                          )}
                        </div>

                        <h3 className="break-words text-xl font-black text-[#08163F]">
                          {ticketSelecionado.assunto || "Ticket sem assunto"}
                        </h3>

                        <p className="mt-2 text-xs font-bold text-gray-400">
                          Aberto em {formatarData(ticketSelecionado.created_at)}
                        </p>

                        {ticketSelecionado.resolvido_em && (
                          <p className="mt-1 text-xs font-bold text-emerald-600">
                            Resolvido em{" "}
                            {formatarData(ticketSelecionado.resolvido_em)}
                          </p>
                        )}
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] p-4">
                        <MensagemBolha
                          lado="usuario"
                          nome={usuario.nome || "Você"}
                          role="Você"
                          data={ticketSelecionado.created_at}
                        >
                          {ticketSelecionado.mensagem ||
                            "Mensagem não informada."}
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
                                normalizar(item.autor_role) === "mentorado"
                                  ? "usuario"
                                  : "suporte"
                              }
                              nome={
                                item.autor_nome ||
                                item.autor_email ||
                                "Usuário"
                              }
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

                      <div className="border-t border-gray-100 bg-white p-4">
                        {ticketEstaResolvido(ticketSelecionado) && (
                          <div className="mb-3 rounded-2xl bg-emerald-50 p-4 text-sm font-black leading-6 text-emerald-700">
                            Este ticket foi resolvido. O chat está bloqueado
                            para novas mensagens.
                          </div>
                        )}

                        <label>
                          <span className="text-sm font-black text-gray-500">
                            Responder ao suporte
                          </span>

                          <textarea
                            value={novaResposta}
                            onChange={(e) => setNovaResposta(e.target.value)}
                            placeholder={
                              ticketEstaResolvido(ticketSelecionado)
                                ? "Ticket resolvido. Chat bloqueado."
                                : "Digite sua resposta..."
                            }
                            disabled={ticketEstaResolvido(ticketSelecionado)}
                            rows={4}
                            className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-semibold leading-6 text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </label>

                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={responderTicket}
                            disabled={
                              respondendo || ticketEstaResolvido(ticketSelecionado)
                            }
                            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {respondendo ? "Enviando..." : "Enviar resposta"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function Card({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5">
      <h3 className="mb-4 text-xl font-black text-[#050816]">{titulo}</h3>
      {children}
    </div>
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
  const ehUsuario = lado === "usuario";

  return (
    <div className={`flex ${ehUsuario ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-[22px] p-4 shadow-sm ${
          ehUsuario ? "bg-[#08163F] text-white" : "bg-white text-[#08163F]"
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p
            className={`text-xs font-black uppercase tracking-[0.16em] ${
              ehUsuario ? "text-white/70" : "text-gray-400"
            }`}
          >
            {nome}
          </p>

          {role && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                ehUsuario
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
            ehUsuario ? "text-white/60" : "text-gray-400"
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
