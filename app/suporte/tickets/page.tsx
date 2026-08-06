"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import PageLoading from "@/components/PageLoading";
import SuporteSidebar from "@/components/SuporteSidebar";
import TicketMensagemBolha from "@/components/TicketMensagemBolha";
import {
  rotaInicialUsuario,
  sincronizarUsuarioComSessao,
  usuarioTemAcessoSuporte,
  type User,
} from "@/utils/auth";
import { carregarTicketsApi, operarTicketApi } from "@/utils/ticketsClient";
import {
  categoriasTicket,
  formatarDataTicket,
  nomeCategoriaTicket,
  nomePrioridadeTicket,
  nomeStatusTicket,
  normalizarTicket,
  pontuacaoPrioridadeTicket,
  prioridadesTicket,
  tempoDesdeTicket,
  ticketResolvido,
  type MensagemTicket,
  type Ticket,
  type TicketPrioridade,
} from "@/utils/tickets";

const statusOptions = [
  { label: "Todos", value: "todos" },
  { label: "Aguardando suporte", value: "aberto" },
  { label: "Em análise", value: "em_analise" },
  { label: "Aguardando usuário", value: "respondido" },
  { label: "Resolvido", value: "resolvido" },
];

function statusOrdenacao(status: unknown) {
  const valor = normalizarTicket(status);
  if (valor === "aberto") return 1;
  if (valor === "em_analise") return 2;
  if (valor === "respondido") return 3;
  return 4;
}

export default function TicketsSuportePage() {
  const router = useRouter();
  const requisicaoAtual = useRef(0);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSelecionado, setTicketSelecionado] = useState<Ticket | null>(null);
  const [mensagens, setMensagens] = useState<MensagemTicket[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState("todas");
  const [responsavelFiltro, setResponsavelFiltro] = useState("todos");

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);

  const carregarDados = useCallback(
    async (ticketId?: string, modo: "inicial" | "atualizar" | "chat" = "atualizar") => {
      const identificador = ++requisicaoAtual.current;

      if (modo === "inicial") setCarregando(true);
      if (modo === "atualizar") setAtualizando(true);
      if (modo === "chat") setCarregandoChat(true);

      setErro("");

      try {
        const payload = await carregarTicketsApi(ticketId);
        if (identificador !== requisicaoAtual.current) return;

        const lista = payload.tickets ?? [];
        setTickets(lista);
        setAtualizadoEm(new Date().toISOString());

        if (ticketId) {
          const selecionado = lista.find((ticket) => ticket.id === ticketId) ?? null;
          setTicketSelecionado(selecionado);
          setMensagens(payload.mensagens ?? []);
        }
      } catch (error) {
        if (identificador !== requisicaoAtual.current) return;
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os chamados."
        );
      } finally {
        if (identificador === requisicaoAtual.current) {
          setCarregando(false);
          setAtualizando(false);
          setCarregandoChat(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      const user = await sincronizarUsuarioComSessao();
      if (!ativo) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!usuarioTemAcessoSuporte(user)) {
        router.replace(rotaInicialUsuario(user));
        return;
      }

      setUsuario(user);

      const params = new URLSearchParams(window.location.search);
      const ticketId = params.get("ticket") || undefined;
      const usuarioBusca = params.get("usuario");
      if (usuarioBusca) setBusca(usuarioBusca);

      await carregarDados(ticketId, "inicial");
    }

    void iniciar();

    return () => {
      ativo = false;
      requisicaoAtual.current += 1;
    };
  }, [carregarDados, router]);

  const ticketsFiltrados = useMemo(() => {
    const termo = normalizarTicket(busca);

    return tickets
      .filter((ticket) => {
        const passaStatus =
          statusFiltro === "todos" || normalizarTicket(ticket.status) === statusFiltro;
        const passaCategoria =
          categoriaFiltro === "todas" ||
          normalizarTicket(ticket.categoria) === categoriaFiltro;
        const prioridade = normalizarTicket(ticket.prioridade) === "normal"
          ? "media"
          : normalizarTicket(ticket.prioridade);
        const passaPrioridade =
          prioridadeFiltro === "todas" || prioridade === prioridadeFiltro;
        const passaResponsavel =
          responsavelFiltro === "todos" ||
          (responsavelFiltro === "meus" && ticket.responsavel_id === usuario?.id) ||
          (responsavelFiltro === "sem_responsavel" && !ticket.responsavel_id);
        const textoBusca = normalizarTicket(
          [
            ticket.nome_usuario,
            ticket.email_usuario,
            ticket.assunto,
            ticket.mensagem,
            ticket.categoria,
            ticket.status,
            ticket.responsavel_nome,
          ]
            .filter(Boolean)
            .join(" ")
        );

        return (
          passaStatus &&
          passaCategoria &&
          passaPrioridade &&
          passaResponsavel &&
          (!termo || textoBusca.includes(termo))
        );
      })
      .sort((a, b) => {
        const status = statusOrdenacao(a.status) - statusOrdenacao(b.status);
        if (status !== 0) return status;

        const prioridade =
          pontuacaoPrioridadeTicket(b.prioridade) -
          pontuacaoPrioridadeTicket(a.prioridade);
        if (prioridade !== 0) return prioridade;

        return (
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
        );
      });
  }, [
    busca,
    categoriaFiltro,
    prioridadeFiltro,
    responsavelFiltro,
    statusFiltro,
    tickets,
    usuario?.id,
  ]);

  const resumo = useMemo(
    () => ({
      total: tickets.length,
      abertos: tickets.filter((ticket) => normalizarTicket(ticket.status) === "aberto")
        .length,
      emAnalise: tickets.filter(
        (ticket) => normalizarTicket(ticket.status) === "em_analise"
      ).length,
      aguardandoUsuario: tickets.filter(
        (ticket) => normalizarTicket(ticket.status) === "respondido"
      ).length,
      resolvidos: tickets.filter(
        (ticket) => normalizarTicket(ticket.status) === "resolvido"
      ).length,
    }),
    [tickets]
  );

  async function selecionarTicket(ticket: Ticket) {
    setTicketSelecionado(ticket);
    setMensagens([]);
    setNovaMensagem("");
    setErro("");
    setMensagemSucesso("");
    router.replace(`/suporte/tickets?ticket=${ticket.id}`, { scroll: false });
    await carregarDados(ticket.id, "chat");
  }

  function aplicarRetorno(ticket: Ticket, conversa: MensagemTicket[]) {
    setTicketSelecionado(ticket);
    setMensagens(conversa);
    setTickets((atuais) => {
      const existe = atuais.some((item) => item.id === ticket.id);
      const lista = existe
        ? atuais.map((item) => (item.id === ticket.id ? ticket : item))
        : [ticket, ...atuais];
      return lista;
    });
    setAtualizadoEm(new Date().toISOString());
  }

  async function operar(
    acao: "assumir" | "prioridade" | "em_analise" | "responder" | "resolver",
    extras: Record<string, unknown> = {}
  ) {
    if (!ticketSelecionado) return;

    requisicaoAtual.current += 1;
    setAtualizando(false);
    setCarregandoChat(false);

    if (acao === "resolver") {
      const semMensagem = !novaMensagem.trim();
      const jaRespondido = normalizarTicket(ticketSelecionado.status) === "respondido";

      if (semMensagem && !jaRespondido) {
        setErro("Escreva uma orientação antes de resolver o chamado.");
        return;
      }

      const confirmar = window.confirm(
        semMensagem
          ? "Encerrar este chamado após a resposta que já foi enviada?"
          : "Enviar esta resposta e marcar o chamado como resolvido?"
      );
      if (!confirmar) return;
    }

    if (acao === "responder" && !novaMensagem.trim()) {
      setErro("Digite uma resposta antes de enviar.");
      return;
    }

    setSalvando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const payload = await operarTicketApi({
        acao,
        ticket_id: ticketSelecionado.id,
        mensagem:
          acao === "responder" || acao === "resolver"
            ? novaMensagem.trim()
            : undefined,
        ...extras,
      });

      if (!payload.ticket) throw new Error("O chamado não retornou atualizado.");

      aplicarRetorno(payload.ticket, payload.mensagens ?? []);
      setNovaMensagem("");

      const mensagensSucesso: Record<string, string> = {
        assumir: "Chamado atribuído a você.",
        prioridade: "Prioridade atualizada e registrada no histórico.",
        em_analise: "Chamado movido para análise.",
        responder: "Resposta enviada. Agora o chamado aguarda o usuário.",
        resolver: "Chamado resolvido e histórico encerrado.",
      };
      setMensagemSucesso(mensagensSucesso[acao]);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar o chamado.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando || !usuario) {
    return <PageLoading pagina="chamados" />;
  }

  const resolvido = ticketResolvido(ticketSelecionado);
  const responsavelAtualEhUsuario = ticketSelecionado?.responsavel_id === usuario.id;
  const agora = atualizadoEm ? new Date(atualizadoEm).getTime() : 0;
  const operacaoBloqueada = salvando || carregandoChat;

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <SuporteSidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/90 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
              Suporte técnico
            </p>
            <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
              Central de chamados
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {atualizadoEm && (
              <span className="hidden text-xs font-bold text-gray-400 sm:block">
                Atualizado às{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(atualizadoEm))}
              </span>
            )}
            <button
              type="button"
              onClick={() => void carregarDados(ticketSelecionado?.id, "atualizar")}
              disabled={atualizando || salvando}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60 sm:text-sm"
            >
              {atualizando ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </header>

        <section className="mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-xl lg:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#C9CED6]">
              Fila operacional
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Cada chamado com dono, prioridade e histórico
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
              Assuma o atendimento antes de agir, registre a orientação e encerre somente
              quando o usuário já tiver uma resposta clara.
            </p>
          </section>

          <Mensagens sucesso={mensagemSucesso} erro={erro} />

          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <CardResumo titulo="Total" valor={resumo.total} />
            <CardResumo titulo="Aguardando suporte" valor={resumo.abertos} destaque />
            <CardResumo titulo="Em análise" valor={resumo.emAnalise} />
            <CardResumo titulo="Aguardando usuário" valor={resumo.aguardandoUsuario} />
            <CardResumo titulo="Resolvidos" valor={resumo.resolvidos} />
          </section>

          <section className="mb-4 grid gap-3 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_210px_160px_190px]">
            <Campo label="Buscar chamado">
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Nome, e-mail, assunto ou mensagem"
                className={campoClasse}
              />
            </Campo>
            <Campo label="Status">
              <select
                value={statusFiltro}
                onChange={(event) => setStatusFiltro(event.target.value)}
                className={campoClasse}
              >
                {statusOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Categoria">
              <select
                value={categoriaFiltro}
                onChange={(event) => setCategoriaFiltro(event.target.value)}
                className={campoClasse}
              >
                <option value="todas">Todas</option>
                {categoriasTicket.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Prioridade">
              <select
                value={prioridadeFiltro}
                onChange={(event) => setPrioridadeFiltro(event.target.value)}
                className={campoClasse}
              >
                <option value="todas">Todas</option>
                {prioridadesTicket.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Responsável">
              <select
                value={responsavelFiltro}
                onChange={(event) => setResponsavelFiltro(event.target.value)}
                className={campoClasse}
              >
                <option value="todos">Todos</option>
                <option value="meus">Meus chamados</option>
                <option value="sem_responsavel">Sem responsável</option>
              </select>
            </Campo>
          </section>

          <section className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
              <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
                <h3 className="text-xl font-black text-[#050816]">Fila de atendimento</h3>
                <p className="mt-1 text-sm font-semibold text-gray-500">
                  {ticketsFiltrados.length} chamado(s) encontrado(s)
                </p>
              </div>

              <div className="max-h-[760px] divide-y divide-gray-100 overflow-y-auto">
                {ticketsFiltrados.length === 0 && (
                  <EstadoVazio titulo="Nenhum chamado encontrado" texto="Altere os filtros ou atualize a fila." />
                )}

                {ticketsFiltrados.map((ticket) => {
                  const selecionado = ticketSelecionado?.id === ticket.id;

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => void selecionarTicket(ticket)}
                      className={`block w-full p-4 text-left transition [content-visibility:auto] [contain-intrinsic-size:0_210px] sm:p-5 ${
                        selecionado
                          ? "bg-[#08163F] text-white"
                          : "bg-white text-[#08163F] hover:bg-[#f9fafb]"
                      }`}
                    >
                      <div className="flex flex-wrap gap-2">
                        <Pill selecionado={selecionado}>{nomeStatusTicket(ticket.status)}</Pill>
                        <Pill selecionado={selecionado}>{nomePrioridadeTicket(ticket.prioridade)}</Pill>
                        <Pill selecionado={selecionado}>{nomeCategoriaTicket(ticket.categoria)}</Pill>
                      </div>
                      <h4 className="mt-3 line-clamp-2 text-base font-black">
                        {ticket.assunto || "Chamado sem assunto"}
                      </h4>
                      <p className={`mt-2 line-clamp-2 text-sm font-semibold ${selecionado ? "text-white/75" : "text-gray-500"}`}>
                        {ticket.mensagem || "Sem descrição"}
                      </p>
                      <div className={`mt-3 space-y-1 text-xs font-bold ${selecionado ? "text-white/70" : "text-gray-400"}`}>
                        <p>{ticket.nome_usuario || "Usuário não informado"}</p>
                        <p className="break-all">{ticket.email_usuario || "E-mail não informado"}</p>
                        <p>{ticket.responsavel_nome ? `Responsável: ${ticket.responsavel_nome}` : "Sem responsável"}</p>
                        <p>Atualizado {tempoDesdeTicket(ticket.updated_at, agora)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-[760px] overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
              {!ticketSelecionado ? (
                <div className="flex min-h-[760px] items-center justify-center p-8">
                  <EstadoVazio titulo="Selecione um chamado" texto="A conversa e as ações do atendimento aparecerão aqui." />
                </div>
              ) : (
                <div className="flex min-h-[760px] flex-col">
                  <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Tag>{nomeStatusTicket(ticketSelecionado.status)}</Tag>
                          <Tag>{nomeCategoriaTicket(ticketSelecionado.categoria)}</Tag>
                          {resolvido && <Tag verde>Histórico encerrado</Tag>}
                        </div>
                        <h3 className="break-words text-xl font-black text-[#08163F]">
                          {ticketSelecionado.assunto || "Chamado sem assunto"}
                        </h3>
                        <p className="mt-2 break-all text-sm font-bold text-gray-500">
                          {ticketSelecionado.nome_usuario || "Usuário não informado"} •{" "}
                          {ticketSelecionado.email_usuario || "E-mail não informado"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-gray-400">
                          <span>Aberto em {formatarDataTicket(ticketSelecionado.created_at)}</span>
                          <span>Última interação {tempoDesdeTicket(ticketSelecionado.updated_at, agora)}</span>
                          {ticketSelecionado.resolvido_em && (
                            <span className="text-emerald-600">
                              Resolvido por {ticketSelecionado.resolvido_por_nome || "Suporte"} em {formatarDataTicket(ticketSelecionado.resolvido_em)}
                            </span>
                          )}
                        </div>
                      </div>

                      {!resolvido && (
                        <div className="grid min-w-[240px] gap-2 sm:grid-cols-2 lg:grid-cols-1">
                          <select
                            aria-label="Prioridade do chamado"
                            value={normalizarTicket(ticketSelecionado.prioridade) === "normal" ? "media" : normalizarTicket(ticketSelecionado.prioridade)}
                            onChange={(event) =>
                              void operar("prioridade", {
                                prioridade: event.target.value as TicketPrioridade,
                              })
                            }
                            disabled={operacaoBloqueada}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-[#08163F] outline-none disabled:opacity-60"
                          >
                            {prioridadesTicket.map((item) => (
                              <option key={item.value} value={item.value}>Prioridade: {item.label}</option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => void operar("assumir")}
                            disabled={operacaoBloqueada || responsavelAtualEhUsuario}
                            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {responsavelAtualEhUsuario ? "Atribuído a você" : "Assumir chamado"}
                          </button>

                          {normalizarTicket(ticketSelecionado.status) !== "em_analise" && (
                            <button
                              type="button"
                              onClick={() => void operar("em_analise")}
                              disabled={operacaoBloqueada}
                              className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-[#08163F] transition hover:bg-slate-200 disabled:opacity-60 sm:col-span-2 lg:col-span-1"
                            >
                              Mover para análise
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600">
                      {ticketSelecionado.responsavel_nome
                        ? `Responsável: ${ticketSelecionado.responsavel_nome}${ticketSelecionado.assumido_em ? ` desde ${formatarDataTicket(ticketSelecionado.assumido_em)}` : ""}`
                        : "Este chamado ainda não possui responsável."}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] p-4 sm:p-5">
                    <TicketMensagemBolha
                      lado="usuario"
                      nome={ticketSelecionado.nome_usuario || "Usuário"}
                      role={ticketSelecionado.role_usuario || "mentorado"}
                      data={ticketSelecionado.created_at}
                    >
                      {ticketSelecionado.mensagem || "Mensagem não informada."}
                    </TicketMensagemBolha>

                    {carregandoChat && (
                      <div className="rounded-2xl bg-white p-4 text-sm font-bold text-gray-500 shadow-sm">
                        Carregando conversa...
                      </div>
                    )}

                    {!carregandoChat && mensagens.map((mensagem) => (
                      <TicketMensagemBolha
                        key={mensagem.id}
                        lado={
                          mensagem.tipo === "sistema"
                            ? "sistema"
                            : normalizarTicket(mensagem.autor_role) === "suporte"
                              ? "suporte"
                              : "usuario"
                        }
                        nome={mensagem.autor_nome || mensagem.autor_email || "Usuário"}
                        role={mensagem.tipo === "sistema" ? null : mensagem.autor_role}
                        data={mensagem.created_at}
                      >
                        {mensagem.mensagem}
                      </TicketMensagemBolha>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 bg-white p-4 sm:p-5">
                    {resolvido ? (
                      <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-black leading-6 text-emerald-700">
                        Chamado resolvido. O histórico permanece disponível, mas não aceita novas mensagens.
                      </div>
                    ) : (
                      <>
                        <label className="block">
                          <span className="text-sm font-black text-gray-500">Resposta ao usuário</span>
                          <textarea
                            value={novaMensagem}
                            onChange={(event) => setNovaMensagem(event.target.value.slice(0, 5000))}
                            placeholder="Explique o que foi verificado e qual é o próximo passo."
                            rows={4}
                            className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-semibold leading-6 text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                          />
                        </label>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs font-bold text-gray-400">{novaMensagem.length}/5000</span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void operar("resolver")}
                              disabled={operacaoBloqueada}
                              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
                            >
                              {salvando ? "Salvando..." : novaMensagem.trim() ? "Responder e resolver" : "Marcar resolvido"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void operar("responder")}
                              disabled={operacaoBloqueada || !novaMensagem.trim()}
                              className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {salvando ? "Enviando..." : "Enviar resposta"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
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

const campoClasse =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10";

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="min-w-0">
      <span className="text-sm font-black text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function CardResumo({
  titulo,
  valor,
  destaque = false,
}: {
  titulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className={`rounded-[22px] p-5 shadow-lg shadow-slate-200/70 ${destaque && valor > 0 ? "bg-amber-50" : "bg-white"}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">{titulo}</p>
      <p className="mt-3 text-4xl font-black text-[#08163F]">{valor}</p>
    </div>
  );
}

function Pill({ selecionado, children }: { selecionado: boolean; children: ReactNode }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${selecionado ? "bg-white/10 text-white" : "bg-[#f3f5f8] text-gray-500"}`}>
      {children}
    </span>
  );
}

function Tag({ children, verde = false }: { children: ReactNode; verde?: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${verde ? "bg-emerald-100 text-emerald-700" : "bg-[#f3f5f8] text-gray-500"}`}>
      {children}
    </span>
  );
}

function EstadoVazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="p-7 text-center">
      <h3 className="text-lg font-black text-[#08163F]">{titulo}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">{texto}</p>
    </div>
  );
}

function Mensagens({ sucesso, erro }: { sucesso: string; erro: string }) {
  return (
    <>
      {erro && (
        <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700" role="alert">
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700" role="status">
          {sucesso}
        </div>
      )}
    </>
  );
}
