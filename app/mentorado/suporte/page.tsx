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
import MentoradoSidebar from "@/components/MentoradoSidebar";
import TicketMensagemBolha from "@/components/TicketMensagemBolha";
import {
  rotaInicialUsuario,
  sincronizarUsuarioComSessao,
  type User,
} from "@/utils/auth";
import { carregarTicketsApi, operarTicketApi } from "@/utils/ticketsClient";
import {
  categoriasTicket,
  formatarDataTicket,
  nomeCategoriaTicket,
  nomeStatusTicket,
  normalizarTicket,
  tempoDesdeTicket,
  ticketResolvido,
  type MensagemTicket,
  type Ticket,
  type TicketCategoria,
} from "@/utils/tickets";

const statusOptions = [
  { label: "Todos", value: "todos" },
  { label: "Aguardando suporte", value: "aberto" },
  { label: "Em análise", value: "em_analise" },
  { label: "Aguardando você", value: "respondido" },
  { label: "Resolvido", value: "resolvido" },
];

const perguntasFrequentes = [
  {
    pergunta: "Onde encontro os materiais das aulas?",
    resposta:
      "Abra Meus módulos, entre na aula desejada e consulte a seção de materiais. A Biblioteca também reúne os arquivos liberados para você.",
  },
  {
    pergunta: "Como faço os simulados?",
    resposta:
      "Acesse Praticar no menu lateral. Os simulados aparecem conforme os módulos liberados pela mentora.",
  },
  {
    pergunta: "Quando minha próxima mentoria aparece?",
    resposta:
      "Assim que a equipe ou a mentora registrar um encontro, ele aparecerá em Minha agenda.",
  },
  {
    pergunta: "Posso responder um chamado resolvido?",
    resposta:
      "Não. O histórico fica disponível, mas o chat é encerrado. Se surgiu outro problema, abra um novo chamado com os detalhes atualizados.",
  },
];

function nomeStatusMentorado(status: unknown) {
  return normalizarTicket(status) === "respondido"
    ? "Aguardando você"
    : nomeStatusTicket(status);
}

export default function SuporteMentoradoPage() {
  const router = useRouter();
  const requisicaoAtual = useRef(0);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSelecionado, setTicketSelecionado] = useState<Ticket | null>(null);
  const [mensagens, setMensagens] = useState<MensagemTicket[]>([]);

  const [categoria, setCategoria] = useState<TicketCategoria>("problema_tecnico");
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [novaResposta, setNovaResposta] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [faqAberto, setFaqAberto] = useState<number | null>(0);

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [criando, setCriando] = useState(false);
  const [respondendo, setRespondendo] = useState(false);
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
          setTicketSelecionado(
            lista.find((ticket) => ticket.id === ticketId) ?? null
          );
          setMensagens(payload.mensagens ?? []);
        }
      } catch (error) {
        if (identificador !== requisicaoAtual.current) return;
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar seus chamados."
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

      if (user.role !== "mentorado") {
        router.replace(rotaInicialUsuario(user));
        return;
      }

      setUsuario(user);
      const params = new URLSearchParams(window.location.search);
      await carregarDados(params.get("ticket") || undefined, "inicial");
    }

    void iniciar();

    return () => {
      ativo = false;
      requisicaoAtual.current += 1;
    };
  }, [carregarDados, router]);

  const ticketsFiltrados = useMemo(() => {
    const termo = normalizarTicket(busca);

    return tickets.filter((ticket) => {
      const passaStatus =
        statusFiltro === "todos" || normalizarTicket(ticket.status) === statusFiltro;
      const textoBusca = normalizarTicket(
        [ticket.assunto, ticket.mensagem, ticket.categoria, ticket.status]
          .filter(Boolean)
          .join(" ")
      );

      return passaStatus && (!termo || textoBusca.includes(termo));
    });
  }, [busca, statusFiltro, tickets]);

  const resumo = useMemo(
    () => ({
      ativos: tickets.filter((ticket) => normalizarTicket(ticket.status) !== "resolvido")
        .length,
      aguardandoSuporte: tickets.filter(
        (ticket) => normalizarTicket(ticket.status) === "aberto"
      ).length,
      aguardandoVoce: tickets.filter(
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
    setNovaResposta("");
    setErro("");
    setMensagemSucesso("");
    router.replace(`/mentorado/suporte?ticket=${ticket.id}`, { scroll: false });
    await carregarDados(ticket.id, "chat");
  }

  function aplicarRetorno(ticket: Ticket, conversa: MensagemTicket[]) {
    setTicketSelecionado(ticket);
    setMensagens(conversa);
    setTickets((atuais) => {
      const existe = atuais.some((item) => item.id === ticket.id);
      return existe
        ? atuais.map((item) => (item.id === ticket.id ? ticket : item))
        : [ticket, ...atuais];
    });
  }

  async function abrirTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const assuntoLimpo = assunto.trim();
    const descricaoLimpa = descricao.trim();

    if (assuntoLimpo.length < 3) {
      setErro("Escreva um assunto com pelo menos 3 caracteres.");
      return;
    }

    if (descricaoLimpa.length < 5) {
      setErro("Explique o que aconteceu com pelo menos 5 caracteres.");
      return;
    }

    requisicaoAtual.current += 1;
    setAtualizando(false);
    setCarregandoChat(false);
    setCriando(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const payload = await operarTicketApi({
        acao: "criar",
        categoria,
        assunto: assuntoLimpo,
        mensagem: descricaoLimpa,
      });

      if (!payload.ticket) throw new Error("O chamado não retornou após a criação.");

      aplicarRetorno(payload.ticket, payload.mensagens ?? []);
      setAssunto("");
      setDescricao("");
      setMensagemSucesso("Chamado aberto. A equipe de Suporte já consegue visualizá-lo.");
      router.replace(`/mentorado/suporte?ticket=${payload.ticket.id}`, { scroll: false });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível abrir o chamado.");
    } finally {
      setCriando(false);
    }
  }

  async function responderTicket() {
    if (!ticketSelecionado) return;
    const mensagem = novaResposta.trim();

    if (ticketResolvido(ticketSelecionado)) {
      setErro("Este chamado foi resolvido. Abra um novo se precisar de outro atendimento.");
      return;
    }

    if (!mensagem) {
      setErro("Digite uma resposta antes de enviar.");
      return;
    }

    requisicaoAtual.current += 1;
    setAtualizando(false);
    setCarregandoChat(false);
    setRespondendo(true);
    setErro("");
    setMensagemSucesso("");

    try {
      const payload = await operarTicketApi({
        acao: "responder_mentorado",
        ticket_id: ticketSelecionado.id,
        mensagem,
      });

      if (!payload.ticket) throw new Error("O chamado não retornou atualizado.");

      aplicarRetorno(payload.ticket, payload.mensagens ?? []);
      setNovaResposta("");
      setMensagemSucesso("Resposta enviada. O chamado voltou para a fila do Suporte.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível enviar a resposta.");
    } finally {
      setRespondendo(false);
    }
  }

  if (carregando || !usuario) {
    return <PageLoading pagina="suporte" />;
  }

  const resolvido = ticketResolvido(ticketSelecionado);
  const agora = atualizadoEm ? new Date(atualizadoEm).getTime() : 0;

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <MentoradoSidebar nome={usuario.nome} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/90 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
              Atendimento CEO Club
            </p>
            <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
              Suporte e meus chamados
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void carregarDados(ticketSelecionado?.id, "atualizar")}
            disabled={atualizando || criando || respondendo}
            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60 sm:text-sm"
          >
            {atualizando ? "Atualizando..." : "Atualizar"}
          </button>
        </header>

        <section className="mx-auto w-full max-w-[1460px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-xl lg:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#C9CED6]">
              Estamos por aqui
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Conte o que aconteceu e acompanhe tudo por aqui
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
              Um chamado mantém sua dúvida, as respostas e o andamento reunidos no mesmo lugar.
            </p>
          </section>

          <Mensagens sucesso={mensagemSucesso} erro={erro} />

          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CardResumo titulo="Em andamento" valor={resumo.ativos} />
            <CardResumo titulo="Aguardando suporte" valor={resumo.aguardandoSuporte} />
            <CardResumo titulo="Aguardando você" valor={resumo.aguardandoVoce} destaque />
            <CardResumo titulo="Resolvidos" valor={resumo.resolvidos} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]">
            <div className="space-y-4">
              <Card titulo="Abrir novo chamado">
                <form onSubmit={abrirTicket} className="space-y-3">
                  <Campo label="Categoria">
                    <select
                      value={categoria}
                      onChange={(event) => setCategoria(event.target.value as TicketCategoria)}
                      className={campoClasse}
                    >
                      {categoriasTicket.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Assunto">
                    <input
                      value={assunto}
                      onChange={(event) => setAssunto(event.target.value.slice(0, 160))}
                      placeholder="Ex.: Não consigo abrir o material"
                      className={campoClasse}
                    />
                    <Contador atual={assunto.length} maximo={160} />
                  </Campo>

                  <Campo label="O que aconteceu?">
                    <textarea
                      value={descricao}
                      onChange={(event) => setDescricao(event.target.value.slice(0, 5000))}
                      placeholder="Explique o que tentou fazer, o que apareceu na tela e quando começou."
                      rows={6}
                      className={`${campoClasse} resize-none font-semibold leading-6`}
                    />
                    <Contador atual={descricao.length} maximo={5000} />
                  </Campo>

                  <button
                    type="submit"
                    disabled={criando || assunto.trim().length < 3 || descricao.trim().length < 5}
                    className="w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {criando ? "Abrindo chamado..." : "Abrir chamado"}
                  </button>
                </form>
              </Card>

              <Card titulo="Perguntas frequentes">
                <div className="space-y-2">
                  {perguntasFrequentes.map((item, index) => (
                    <div key={item.pergunta} className="rounded-2xl border border-gray-100 bg-[#f9fafb]">
                      <button
                        type="button"
                        onClick={() => setFaqAberto(faqAberto === index ? null : index)}
                        aria-expanded={faqAberto === index}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-black text-[#08163F]"
                      >
                        <span>{item.pergunta}</span>
                        <span aria-hidden="true">{faqAberto === index ? "−" : "+"}</span>
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
              <section className="grid gap-3 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 md:grid-cols-[minmax(0,1fr)_220px]">
                <Campo label="Buscar chamado">
                  <input
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Assunto, mensagem ou categoria"
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
              </section>

              <section className="grid gap-4 2xl:grid-cols-[350px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
                  <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4">
                    <h3 className="text-xl font-black text-[#050816]">Meus chamados</h3>
                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      {ticketsFiltrados.length} chamado(s) encontrado(s)
                    </p>
                  </div>
                  <div className="max-h-[720px] divide-y divide-gray-100 overflow-y-auto">
                    {ticketsFiltrados.length === 0 && (
                      <EstadoVazio titulo="Nenhum chamado encontrado" texto="Você pode abrir um novo chamado ao lado." />
                    )}
                    {ticketsFiltrados.map((ticket) => {
                      const selecionado = ticketSelecionado?.id === ticket.id;
                      return (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => void selecionarTicket(ticket)}
                          className={`block w-full p-4 text-left transition [content-visibility:auto] [contain-intrinsic-size:0_180px] ${selecionado ? "bg-[#08163F] text-white" : "bg-white text-[#08163F] hover:bg-[#f9fafb]"}`}
                        >
                          <div className="flex flex-wrap gap-2">
                            <Pill selecionado={selecionado}>{nomeStatusMentorado(ticket.status)}</Pill>
                            <Pill selecionado={selecionado}>{nomeCategoriaTicket(ticket.categoria)}</Pill>
                          </div>
                          <h4 className="mt-3 line-clamp-2 text-base font-black">
                            {ticket.assunto || "Chamado sem assunto"}
                          </h4>
                          <p className={`mt-2 line-clamp-2 text-sm font-semibold ${selecionado ? "text-white/75" : "text-gray-500"}`}>
                            {ticket.mensagem || "Sem descrição"}
                          </p>
                          <div className={`mt-3 space-y-1 text-xs font-bold ${selecionado ? "text-white/70" : "text-gray-400"}`}>
                            <p>Atualizado {tempoDesdeTicket(ticket.updated_at, agora)}</p>
                            {ticket.responsavel_nome && <p>Atendimento: {ticket.responsavel_nome}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="min-h-[720px] overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
                  {!ticketSelecionado ? (
                    <div className="flex min-h-[720px] items-center justify-center p-8">
                      <EstadoVazio titulo="Selecione um chamado" texto="A conversa com o Suporte aparecerá aqui." />
                    </div>
                  ) : (
                    <div className="flex min-h-[720px] flex-col">
                      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Tag>{nomeStatusMentorado(ticketSelecionado.status)}</Tag>
                          <Tag>{nomeCategoriaTicket(ticketSelecionado.categoria)}</Tag>
                          {resolvido && <Tag verde>Histórico encerrado</Tag>}
                        </div>
                        <h3 className="break-words text-xl font-black text-[#08163F]">
                          {ticketSelecionado.assunto || "Chamado sem assunto"}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-gray-400">
                          <span>Aberto em {formatarDataTicket(ticketSelecionado.created_at)}</span>
                          {ticketSelecionado.responsavel_nome && (
                            <span>Atendimento: {ticketSelecionado.responsavel_nome}</span>
                          )}
                          {ticketSelecionado.resolvido_em && (
                            <span className="text-emerald-600">Resolvido em {formatarDataTicket(ticketSelecionado.resolvido_em)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] p-4">
                        <TicketMensagemBolha
                          lado="usuario"
                          nome={usuario.nome || "Você"}
                          role="Você"
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
                                : normalizarTicket(mensagem.autor_role) === "mentorado"
                                  ? "usuario"
                                  : "suporte"
                            }
                            nome={mensagem.autor_nome || mensagem.autor_email || "Equipe CEO Club"}
                            role={mensagem.tipo === "sistema" ? null : mensagem.autor_role}
                            data={mensagem.created_at}
                          >
                            {mensagem.mensagem}
                          </TicketMensagemBolha>
                        ))}
                      </div>

                      <div className="border-t border-gray-100 bg-white p-4">
                        {resolvido ? (
                          <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-black leading-6 text-emerald-700">
                            Este chamado foi resolvido. Se precisar de outro atendimento, abra um novo chamado.
                          </div>
                        ) : (
                          <>
                            <label className="block">
                              <span className="text-sm font-black text-gray-500">Responder ao Suporte</span>
                              <textarea
                                value={novaResposta}
                                onChange={(event) => setNovaResposta(event.target.value.slice(0, 5000))}
                                placeholder="Digite sua resposta..."
                                rows={4}
                                className={`${campoClasse} resize-none font-semibold leading-6`}
                              />
                            </label>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                              <Contador atual={novaResposta.length} maximo={5000} />
                              <button
                                type="button"
                                onClick={() => void responderTicket()}
                                disabled={respondendo || !novaResposta.trim()}
                                className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {respondendo ? "Enviando..." : "Enviar resposta"}
                              </button>
                            </div>
                          </>
                        )}
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

const campoClasse =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10";

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-black text-gray-500">{label}</span>
      {children}
    </label>
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

function CardResumo({ titulo, valor, destaque = false }: { titulo: string; valor: number; destaque?: boolean }) {
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

function Contador({ atual, maximo }: { atual: number; maximo: number }) {
  return <span className="mt-1 block text-right text-[11px] font-bold text-gray-400">{atual}/{maximo}</span>;
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
        <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700" role="alert">{erro}</div>
      )}
      {sucesso && (
        <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700" role="status">{sucesso}</div>
      )}
    </>
  );
}
