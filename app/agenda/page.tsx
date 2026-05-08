"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import CalendarSyncButtons from "@/components/CalendarSyncButtons";
import { supabase } from "@/utils/supabase";

import {
  getUsuarioLogado,
  usuarioTemPermissao,
  User,
} from "@/utils/auth";

type TipoAgenda = "Mentoria" | "Módulo" | "Reunião";
type StatusAgenda = "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";

type Mentorado = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  codigo_inscricao: string | null;
  status: string | null;
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
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

type EventoComMentorado = EventoAgenda & {
  mentoradoNome: string;
  mentoradoEmail: string;
  mentoradoCodigo: string;
  mentoradoTelefone: string;
};

type EventoFormulario = {
  mentorado_id: string;
  titulo: string;
  tipo: TipoAgenda;
  data: string;
  horario: string;
  status: StatusAgenda;
  observacao: string;
};

const eventoInicial: EventoFormulario = {
  mentorado_id: "",
  titulo: "",
  tipo: "Mentoria",
  data: "",
  horario: "",
  status: "Confirmada",
  observacao: "",
};

export default function AgendaPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [modoVisualizacao, setModoVisualizacao] = useState<
    "mes" | "lista" | "dia"
  >("mes");

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusAgenda | "Todos">(
    "Todos"
  );
  const [filtroTipo, setFiltroTipo] = useState<TipoAgenda | "Todos">("Todos");
  const [filtroMentorado, setFiltroMentorado] = useState("Todos");

  const [diaSelecionado, setDiaSelecionado] = useState(() =>
    formatarDataISO(new Date())
  );
  const [mesAtual, setMesAtual] = useState(() => new Date());

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoEvento, setNovoEvento] =
    useState<EventoFormulario>(eventoInicial);

  const [eventoSelecionado, setEventoSelecionado] =
    useState<EventoComMentorado | null>(null);

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

    if (!usuarioTemPermissao(usuarioLogado, ["mentor"])) {
      router.push("/dashboard");
      return;
    }

    setUsuario(usuarioLogado);
  }, [router]);

  useEffect(() => {
    if (!usuario) return;

    carregarDados();
  }, [usuario]);

  async function carregarDados() {
    setCarregando(true);
    setErro("");
    setSucesso("");

    const { data: mentoradosData, error: mentoradosError } = await supabase
      .from("profiles")
      .select("id, nome, email, telefone, codigo_inscricao, status")
      .eq("role", "mentorado")
      .order("created_at", { ascending: false });

    if (mentoradosError) {
      setErro(mentoradosError.message);
      setCarregando(false);
      return;
    }

    const { data: eventosData, error: eventosError } = await supabase
      .from("agenda_eventos")
      .select(
        "id, mentorado_id, titulo, tipo, data, horario, status, observacao, criado_por, created_at, updated_at"
      )
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (eventosError) {
      setErro(eventosError.message);
      setCarregando(false);
      return;
    }

    setMentorados((mentoradosData ?? []) as Mentorado[]);
    setEventos((eventosData ?? []) as EventoAgenda[]);
    setCarregando(false);
  }

  const eventosComMentorado = useMemo<EventoComMentorado[]>(() => {
    return eventos.map((evento) => {
      const mentorado = mentorados.find(
        (item) => item.id === evento.mentorado_id
      );

      return {
        ...evento,
        mentoradoNome: mentorado?.nome ?? "Mentorado não encontrado",
        mentoradoEmail: mentorado?.email ?? "",
        mentoradoCodigo: mentorado?.codigo_inscricao ?? "",
        mentoradoTelefone: mentorado?.telefone ?? "",
      };
    });
  }, [eventos, mentorados]);

  const eventosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return eventosComMentorado.filter((evento) => {
      const bateBusca =
        !termo ||
        evento.mentoradoNome.toLowerCase().includes(termo) ||
        evento.mentoradoEmail.toLowerCase().includes(termo) ||
        evento.mentoradoCodigo.toLowerCase().includes(termo) ||
        evento.tipo.toLowerCase().includes(termo) ||
        evento.status.toLowerCase().includes(termo) ||
        (evento.titulo ?? "").toLowerCase().includes(termo) ||
        (evento.observacao ?? "").toLowerCase().includes(termo);

      const bateStatus =
        filtroStatus === "Todos" || evento.status === filtroStatus;

      const bateTipo = filtroTipo === "Todos" || evento.tipo === filtroTipo;

      const bateMentorado =
        filtroMentorado === "Todos" || evento.mentorado_id === filtroMentorado;

      return bateBusca && bateStatus && bateTipo && bateMentorado;
    });
  }, [eventosComMentorado, busca, filtroStatus, filtroTipo, filtroMentorado]);

  const eventosDoDia = useMemo(() => {
    return eventosFiltrados
      .filter((evento) => evento.data === diaSelecionado)
      .sort((a, b) =>
        limparHorario(a.horario).localeCompare(limparHorario(b.horario))
      );
  }, [eventosFiltrados, diaSelecionado]);

  const diasDoMes = useMemo(() => {
    return montarDiasDoMes(mesAtual);
  }, [mesAtual]);

  const resumo = useMemo(() => {
    const hoje = formatarDataISO(new Date());

    const futuros = eventos.filter((evento) => {
      const dataEvento = new Date(
        `${evento.data}T${limparHorario(evento.horario)}:00`
      );

      return dataEvento.getTime() >= new Date().getTime();
    });

    const concluidos = eventos.filter((evento) => evento.status === "Concluída").length;
    const taxaConclusao =
      eventos.length === 0 ? 0 : Math.round((concluidos / eventos.length) * 100);

    return {
      total: eventos.length,
      hoje: eventos.filter((evento) => evento.data === hoje).length,
      futuros: futuros.length,
      confirmados: eventos.filter((evento) => evento.status === "Confirmada")
        .length,
      aguardando: eventos.filter((evento) => evento.status === "Aguardando")
        .length,
      concluidos,
      cancelados: eventos.filter((evento) => evento.status === "Cancelada")
        .length,
      taxaConclusao,
    };
  }, [eventos]);

  const proximoEvento = useMemo(() => {
    const agora = new Date();

    return (
      eventosComMentorado
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
  }, [eventosComMentorado]);

  const eventosParaCalendario = useMemo(() => {
    return eventosComMentorado.map((evento) => {
      const inicio = new Date(
        `${evento.data}T${limparHorario(evento.horario)}:00`
      );
      const fim = new Date(inicio.getTime() + 60 * 60 * 1000);

      return {
        id: evento.id,
        titulo: `${evento.titulo || evento.tipo} com ${evento.mentoradoNome}`,
        descricao: evento.observacao || "",
        local: "CEO Club",
        inicio,
        fim,
      };
    });
  }, [eventosComMentorado]);

  function limparFormulario() {
    setNovoEvento(eventoInicial);
    setEditandoId(null);
    setErro("");
  }

  function abrirNovoEvento() {
    limparFormulario();
    setMostrarFormulario(true);
    setEventoSelecionado(null);
  }

  function fecharFormulario() {
    limparFormulario();
    setMostrarFormulario(false);
  }

  function eventosDoDiaNoMes(dataISO: string) {
    return eventosFiltrados
      .filter((evento) => evento.data === dataISO)
      .sort((a, b) =>
        limparHorario(a.horario).localeCompare(limparHorario(b.horario))
      );
  }

  function mudarMes(direcao: "anterior" | "proximo") {
    setMesAtual((dataAtual) => {
      const novaData = new Date(dataAtual);

      if (direcao === "anterior") {
        novaData.setMonth(novaData.getMonth() - 1);
      } else {
        novaData.setMonth(novaData.getMonth() + 1);
      }

      return novaData;
    });
  }

  function irParaHoje() {
    const hoje = new Date();
    setMesAtual(hoje);
    setDiaSelecionado(formatarDataISO(hoje));
  }

  function existeConflito(evento: EventoFormulario) {
    return eventos.find((item) => {
      return (
        item.id !== editandoId &&
        item.data === evento.data &&
        limparHorario(item.horario) === limparHorario(evento.horario) &&
        item.status !== "Cancelada"
      );
    });
  }

  async function salvarEvento(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (
      !novoEvento.mentorado_id ||
      !novoEvento.data ||
      !novoEvento.horario ||
      !novoEvento.tipo
    ) {
      setErro("Preencha mentorado, data, horário e tipo do compromisso.");
      return;
    }

    const conflito = existeConflito(novoEvento);

    if (conflito) {
      const mentoradoConflito = mentorados.find(
        (item) => item.id === conflito.mentorado_id
      );

      setErro(
        `Já existe um compromisso nesse mesmo dia e horário com ${
          mentoradoConflito?.nome ?? "outro mentorado"
        }.`
      );
      return;
    }

    try {
      setSalvando(true);

      const payload = {
        mentorado_id: novoEvento.mentorado_id,
        titulo: novoEvento.titulo.trim() || novoEvento.tipo,
        tipo: novoEvento.tipo,
        data: novoEvento.data,
        horario: novoEvento.horario,
        status: novoEvento.status,
        observacao: novoEvento.observacao.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editandoId) {
        const { error: updateError } = await supabase
          .from("agenda_eventos")
          .update(payload)
          .eq("id", editandoId);

        if (updateError) throw new Error(updateError.message);

        setSucesso("Compromisso atualizado com sucesso.");
      } else {
        const usuarioId = (usuario as User & { id?: string })?.id ?? null;

        const { error: insertError } = await supabase
          .from("agenda_eventos")
          .insert({
            ...payload,
            criado_por: usuarioId,
          });

        if (insertError) throw new Error(insertError.message);

        setSucesso("Compromisso criado com sucesso.");
      }

      await carregarDados();

      limparFormulario();
      setMostrarFormulario(false);
      setEventoSelecionado(null);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o compromisso."
      );
    } finally {
      setSalvando(false);
    }
  }

  function editarEvento(evento: EventoComMentorado) {
    setNovoEvento({
      mentorado_id: evento.mentorado_id,
      titulo: evento.titulo ?? "",
      tipo: evento.tipo,
      data: evento.data,
      horario: limparHorario(evento.horario),
      status: evento.status,
      observacao: evento.observacao ?? "",
    });

    setEditandoId(evento.id);
    setMostrarFormulario(true);
    setEventoSelecionado(null);
  }

  async function atualizarStatusEvento(id: string, status: StatusAgenda) {
    try {
      setErro("");
      setSucesso("");

      const { error } = await supabase
        .from("agenda_eventos")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await carregarDados();
      setEventoSelecionado(null);
      setSucesso(`Compromisso marcado como ${status.toLowerCase()}.`);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o compromisso."
      );
    }
  }

  async function excluirEvento(id: string) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este compromisso?"
    );

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      const { error } = await supabase
        .from("agenda_eventos")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);

      await carregarDados();
      setEventoSelecionado(null);
      setSucesso("Compromisso excluído com sucesso.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o compromisso."
      );
    }
  }

  function imprimirAgenda() {
    window.print();
  }

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#0B1D59]">
        Carregando agenda...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#0B1D59]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative flex-1 overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(191,195,201,0.18),transparent)]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(18,49,124,0.08),transparent)]" />

        <div className="relative z-10">
          <div className="print-title hidden">
            <h1 className="text-2xl font-bold">Agenda CEO Club</h1>
            <p className="mt-1 text-sm text-slate-600">
              Mês: {formatarMesAno(mesAtual)}
            </p>
          </div>

          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-[0_24px_60px_rgba(8,22,63,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.32em] text-[#C9CED6]">
                  Agenda da mentora
                </p>

                <h1 className="max-w-4xl text-4xl font-black leading-tight">
                  Organize mentorias, reuniões e compromissos da jornada.
                </h1>

                <p className="mt-3 max-w-2xl text-[#D9DEE7]">
                  Cadastre encontros, acompanhe status, filtre por mentorado e
                  mantenha a rotina da mentoria em ordem.
                </p>
              </div>

              <div className="no-print flex flex-wrap gap-3">
                <button
                  onClick={abrirNovoEvento}
                  className="rounded-2xl px-5 py-3 font-black text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105"
                  style={{
                    background:
                      "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
                  }}
                >
                  Novo compromisso
                </button>

                <button
                  onClick={imprimirAgenda}
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/15"
                >
                  Imprimir
                </button>
              </div>
            </div>

            {proximoEvento && (
              <div className="mt-7 rounded-[26px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
                  Próximo compromisso
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xl font-black">
                      {proximoEvento.titulo || proximoEvento.tipo}
                    </p>

                    <p className="mt-1 text-sm font-bold text-blue-100">
                      {formatarData(proximoEvento.data)} às{" "}
                      {limparHorario(proximoEvento.horario)} ·{" "}
                      {proximoEvento.mentoradoNome}
                    </p>
                  </div>

                  <button
                    onClick={() => setEventoSelecionado(proximoEvento)}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] transition hover:brightness-95"
                  >
                    Abrir detalhes →
                  </button>
                </div>
              </div>
            )}
          </section>

          <div className="no-print mb-8">
            <CalendarSyncButtons eventos={eventosParaCalendario} />
          </div>

          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ResumoCard
              titulo="Total"
              valor={String(resumo.total)}
              texto="Compromissos cadastrados."
              destaque
            />

            <ResumoCard
              titulo="Hoje"
              valor={String(resumo.hoje)}
              texto="Eventos marcados para hoje."
            />

            <ResumoCard
              titulo="Aguardando"
              valor={String(resumo.aguardando)}
              texto="Compromissos que pedem atenção."
              alerta={resumo.aguardando > 0}
            />

            <ResumoCard
              titulo="Concluídos"
              valor={String(resumo.concluidos)}
              texto="Compromissos já finalizados."
            />

            <ResumoCard
              titulo="Conclusão"
              valor={`${resumo.taxaConclusao}%`}
              texto="Taxa de compromissos concluídos."
            />
          </section>

          <section className="no-print mb-6 rounded-[28px] border border-white/50 bg-white/85 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.6fr_0.6fr_0.8fr]">
              <CampoFiltro label="Busca">
                <input
                  type="text"
                  placeholder="Nome, e-mail, inscrição, tipo, título ou observação"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="input-agenda"
                />
              </CampoFiltro>

              <CampoFiltro label="Mentorado">
                <select
                  value={filtroMentorado}
                  onChange={(e) => setFiltroMentorado(e.target.value)}
                  className="input-agenda"
                >
                  <option value="Todos">Todos os mentorados</option>
                  {mentorados.map((mentorado) => (
                    <option key={mentorado.id} value={mentorado.id}>
                      {mentorado.codigo_inscricao ?? "—"} · {mentorado.nome}
                    </option>
                  ))}
                </select>
              </CampoFiltro>

              <CampoFiltro label="Tipo">
                <select
                  value={filtroTipo}
                  onChange={(e) =>
                    setFiltroTipo(e.target.value as TipoAgenda | "Todos")
                  }
                  className="input-agenda"
                >
                  <option>Todos</option>
                  <option>Mentoria</option>
                  <option>Módulo</option>
                  <option>Reunião</option>
                </select>
              </CampoFiltro>

              <CampoFiltro label="Status">
                <select
                  value={filtroStatus}
                  onChange={(e) =>
                    setFiltroStatus(e.target.value as StatusAgenda | "Todos")
                  }
                  className="input-agenda"
                >
                  <option>Todos</option>
                  <option>Confirmada</option>
                  <option>Aguardando</option>
                  <option>Concluída</option>
                  <option>Cancelada</option>
                </select>
              </CampoFiltro>

              <CampoFiltro label="Visualização">
                <div className="grid grid-cols-3 gap-2">
                  <ModoButton
                    label="Mês"
                    ativo={modoVisualizacao === "mes"}
                    onClick={() => setModoVisualizacao("mes")}
                  />
                  <ModoButton
                    label="Lista"
                    ativo={modoVisualizacao === "lista"}
                    onClick={() => setModoVisualizacao("lista")}
                  />
                  <ModoButton
                    label="Dia"
                    ativo={modoVisualizacao === "dia"}
                    onClick={() => setModoVisualizacao("dia")}
                  />
                </div>
              </CampoFiltro>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-500">
                Exibindo {eventosFiltrados.length} de {eventos.length} compromisso(s).
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setBusca("");
                    setFiltroStatus("Todos");
                    setFiltroTipo("Todos");
                    setFiltroMentorado("Todos");
                  }}
                  className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                >
                  Limpar filtros
                </button>

                <button
                  onClick={irParaHoje}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#08163F] shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
                >
                  Hoje
                </button>

                <button
                  onClick={carregarDados}
                  className="rounded-2xl bg-[#08163F] px-4 py-3 text-sm font-black text-white transition hover:brightness-110"
                >
                  Atualizar
                </button>
              </div>
            </div>
          </section>

          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              {sucesso}
            </div>
          )}

          {mostrarFormulario && (
            <form
              onSubmit={salvarEvento}
              className="no-print mb-6 rounded-[28px] border border-white/50 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm"
            >
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    {editandoId ? "Editar compromisso" : "Novo compromisso"}
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-[#08163F]">
                    {editandoId
                      ? "Atualizar compromisso"
                      : "Cadastrar compromisso"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    Defina o mentorado, data, horário e contexto do encontro.
                    O compromisso aparecerá também nas telas do mentorado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharFormulario}
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-slate-200"
                >
                  Fechar
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <CampoAgenda
                  label="Mentorado"
                  ajuda="Pessoa vinculada ao compromisso. O evento aparecerá na jornada dela."
                >
                  <select
                    value={novoEvento.mentorado_id}
                    onChange={(e) =>
                      setNovoEvento({
                        ...novoEvento,
                        mentorado_id: e.target.value,
                      })
                    }
                    className="input-agenda"
                  >
                    <option value="">Selecione o mentorado</option>

                    {mentorados.map((mentorado) => (
                      <option key={mentorado.id} value={mentorado.id}>
                        {mentorado.codigo_inscricao ?? "—"} · {mentorado.nome} ·{" "}
                        {mentorado.email}
                      </option>
                    ))}
                  </select>
                </CampoAgenda>

                <CampoAgenda
                  label="Título"
                  ajuda="Nome do compromisso. Ex: Mentoria individual, Reunião de alinhamento."
                >
                  <input
                    type="text"
                    placeholder="Ex: Mentoria individual"
                    value={novoEvento.titulo}
                    onChange={(e) =>
                      setNovoEvento({ ...novoEvento, titulo: e.target.value })
                    }
                    className="input-agenda"
                  />
                </CampoAgenda>

                <CampoAgenda
                  label="Data"
                  ajuda="Dia em que o compromisso acontecerá."
                >
                  <input
                    type="date"
                    value={novoEvento.data}
                    onChange={(e) =>
                      setNovoEvento({ ...novoEvento, data: e.target.value })
                    }
                    className="input-agenda"
                  />
                </CampoAgenda>

                <CampoAgenda
                  label="Horário"
                  ajuda="Horário de início do compromisso. O sistema evita conflito no mesmo horário."
                >
                  <input
                    type="time"
                    value={novoEvento.horario}
                    onChange={(e) =>
                      setNovoEvento({ ...novoEvento, horario: e.target.value })
                    }
                    className="input-agenda"
                  />
                </CampoAgenda>

                <CampoAgenda
                  label="Tipo"
                  ajuda="Categoria do compromisso para organizar a agenda."
                >
                  <select
                    value={novoEvento.tipo}
                    onChange={(e) =>
                      setNovoEvento({
                        ...novoEvento,
                        tipo: e.target.value as TipoAgenda,
                      })
                    }
                    className="input-agenda"
                  >
                    <option>Mentoria</option>
                    <option>Módulo</option>
                    <option>Reunião</option>
                  </select>
                </CampoAgenda>

                <CampoAgenda
                  label="Status"
                  ajuda="Situação atual do compromisso."
                >
                  <select
                    value={novoEvento.status}
                    onChange={(e) =>
                      setNovoEvento({
                        ...novoEvento,
                        status: e.target.value as StatusAgenda,
                      })
                    }
                    className="input-agenda"
                  >
                    <option>Confirmada</option>
                    <option>Aguardando</option>
                    <option>Concluída</option>
                    <option>Cancelada</option>
                  </select>
                </CampoAgenda>

                <div className="md:col-span-2">
                  <CampoAgenda
                    label="Observação"
                    ajuda="Detalhes do encontro, link, orientação, pauta ou combinados importantes."
                  >
                    <textarea
                      placeholder="Ex: Enviar link do Meet, revisar metas da semana, alinhar plano comercial..."
                      value={novoEvento.observacao}
                      onChange={(e) =>
                        setNovoEvento({
                          ...novoEvento,
                          observacao: e.target.value,
                        })
                      }
                      className="input-agenda min-h-[120px]"
                    />
                  </CampoAgenda>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-2xl bg-[#08163F] px-5 py-3 font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando
                    ? "Salvando..."
                    : editandoId
                    ? "Salvar alterações"
                    : "Salvar compromisso"}
                </button>

                <button
                  type="button"
                  onClick={limparFormulario}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-black text-[#0B1D59] transition hover:bg-slate-50"
                >
                  Limpar
                </button>
              </div>
            </form>
          )}

          {modoVisualizacao === "mes" && (
            <section className="overflow-hidden rounded-[30px] bg-white shadow-xl shadow-slate-200/70">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-[#f9fafb] to-white p-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Calendário mensal
                  </p>

                  <h3 className="mt-1 text-2xl font-black text-[#050816]">
                    {formatarMesAno(mesAtual)}
                  </h3>
                </div>

                <div className="no-print flex flex-wrap gap-3">
                  <button
                    onClick={() => mudarMes("anterior")}
                    className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                  >
                    ← Mês anterior
                  </button>

                  <button
                    onClick={irParaHoje}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#08163F] shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
                  >
                    Hoje
                  </button>

                  <button
                    onClick={() => mudarMes("proximo")}
                    className="rounded-2xl bg-[#08163F] px-4 py-3 text-sm font-black text-white transition hover:brightness-110"
                  >
                    Próximo mês →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b border-slate-100 bg-[#f9fafb] text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                  (dia) => (
                    <div key={dia} className="p-4">
                      {dia}
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-7">
                {diasDoMes.map((dia) => {
                  const eventosDia = eventosDoDiaNoMes(dia.dataISO);
                  const ehHoje = dia.dataISO === formatarDataISO(new Date());

                  return (
                    <div
                      key={dia.dataISO}
                      className={`min-h-[150px] border-b border-r border-slate-100 p-3 ${
                        dia.ehMesAtual
                          ? "bg-white"
                          : "bg-[#f9fafb] text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setDiaSelecionado(dia.dataISO);
                            setModoVisualizacao("dia");
                          }}
                          className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${
                            ehHoje
                              ? "bg-[#08163F] text-white"
                              : dia.ehMesAtual
                              ? "text-[#08163F] hover:bg-[#EEF2FF]"
                              : "text-slate-300"
                          }`}
                        >
                          {dia.numero}
                        </button>

                        {eventosDia.length > 0 && (
                          <span className="rounded-full bg-[#EEF2FF] px-2 py-1 text-[10px] font-black text-[#08163F]">
                            {eventosDia.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-2">
                        {eventosDia.slice(0, 3).map((evento) => (
                          <button
                            key={evento.id}
                            type="button"
                            onClick={() => setEventoSelecionado(evento)}
                            className={`block w-full rounded-xl px-3 py-2 text-left text-[11px] font-black transition ${classeEventoMini(
                              evento.status
                            )}`}
                          >
                            <span className="block truncate">
                              {limparHorario(evento.horario)} ·{" "}
                              {evento.mentoradoNome}
                            </span>
                          </button>
                        ))}

                        {eventosDia.length > 3 && (
                          <button
                            type="button"
                            onClick={() => {
                              setDiaSelecionado(dia.dataISO);
                              setModoVisualizacao("dia");
                            }}
                            className="text-[11px] font-bold text-slate-400 hover:text-[#08163F]"
                          >
                            +{eventosDia.length - 3} compromisso(s)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {modoVisualizacao === "lista" && (
            <section className="overflow-x-auto rounded-[30px] border border-white/50 bg-white/85 shadow-xl shadow-slate-200/70 backdrop-blur-sm">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[1.2fr_0.7fr_0.5fr_0.6fr_0.7fr_0.6fr] bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 font-semibold text-white">
                  <span>Mentorado</span>
                  <span>Data</span>
                  <span>Horário</span>
                  <span>Tipo</span>
                  <span>Status</span>
                  <span>Ações</span>
                </div>

                {eventosFiltrados.length === 0 ? (
                  <div className="p-10 text-center text-sm font-semibold text-slate-500">
                    Nenhum compromisso encontrado.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {eventosFiltrados.map((evento) => (
                      <div
                        key={evento.id}
                        className="grid grid-cols-[1.2fr_0.7fr_0.5fr_0.6fr_0.7fr_0.6fr] items-center p-4 text-sm"
                      >
                        <span>
                          <strong className="block">
                            {evento.mentoradoNome}
                          </strong>
                          <small className="text-xs text-slate-400">
                            {evento.mentoradoCodigo || "—"} ·{" "}
                            {evento.mentoradoEmail}
                          </small>
                        </span>

                        <span>{formatarData(evento.data)}</span>
                        <span>{limparHorario(evento.horario)}</span>
                        <span>{evento.tipo}</span>

                        <span>
                          <StatusBadge status={evento.status} />
                        </span>

                        <div className="flex gap-4">
                          <button
                            onClick={() => setEventoSelecionado(evento)}
                            className="font-black text-[#0B1D59] hover:underline"
                          >
                            Abrir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {modoVisualizacao === "dia" && (
            <section className="rounded-[30px] border border-white/50 bg-white/85 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-sm">
              <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#08163F]">
                    Visão do dia
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {formatarData(diaSelecionado)} · {eventosDoDia.length} compromisso(s)
                  </p>
                </div>

                <input
                  type="date"
                  value={diaSelecionado}
                  onChange={(e) => setDiaSelecionado(e.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[#0B1D59]"
                />
              </div>

              {eventosDoDia.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                  Nenhum compromisso neste dia.
                </div>
              ) : (
                <div className="space-y-3">
                  {eventosDoDia.map((evento) => (
                    <button
                      key={evento.id}
                      type="button"
                      onClick={() => setEventoSelecionado(evento)}
                      className={`w-full rounded-2xl border-l-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${estiloCardCalendario(
                        evento.status
                      )}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="font-black text-[#08163F]">
                            {limparHorario(evento.horario)} ·{" "}
                            {evento.titulo || evento.tipo}
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            {evento.mentoradoCodigo || "—"} ·{" "}
                            {evento.mentoradoNome}
                          </p>

                          {evento.observacao && (
                            <p className="mt-2 text-sm text-slate-500">
                              {evento.observacao}
                            </p>
                          )}
                        </div>

                        <StatusBadge status={evento.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          <style jsx global>{`
            .input-agenda {
              width: 100%;
              border-radius: 1rem;
              border: 1px solid #e2e8f0;
              background: white;
              padding: 0.85rem 1rem;
              color: #0b1d59;
              font-weight: 700;
              outline: none;
              transition: 0.2s ease;
            }

            .input-agenda::placeholder {
              color: #94a3b8;
            }

            .input-agenda:focus {
              border-color: #12317c;
              box-shadow: 0 0 0 4px rgba(18, 49, 124, 0.1);
            }

            @media print {
              aside,
              button,
              input,
              select,
              textarea,
              form,
              .no-print {
                display: none !important;
              }

              body,
              main,
              section {
                background: white !important;
              }

              section {
                padding: 0 !important;
                width: 100% !important;
              }

              .print-title {
                display: block !important;
                margin-bottom: 20px;
                color: #0b1d59;
              }
            }
          `}</style>
        </div>
      </section>

      {eventoSelecionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => setEventoSelecionado(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[34px] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                    Detalhes do compromisso
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    {eventoSelecionado.titulo ||
                      `${eventoSelecionado.tipo} com ${eventoSelecionado.mentoradoNome}`}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-blue-100">
                    {eventoSelecionado.mentoradoCodigo || "—"} ·{" "}
                    {eventoSelecionado.mentoradoEmail}
                  </p>
                </div>

                <button
                  onClick={() => setEventoSelecionado(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <StatusBadge status={eventoSelecionado.status} />
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">
                  {eventoSelecionado.tipo}
                </span>
              </div>
            </div>

            <div className="overflow-y-auto p-7">
              <div className="grid gap-4 md:grid-cols-2">
              <InfoBox label="Mentorado" value={eventoSelecionado.mentoradoNome} />
              <InfoBox
                label="Inscrição"
                value={eventoSelecionado.mentoradoCodigo || "—"}
              />
              <InfoBox label="Data" value={formatarData(eventoSelecionado.data)} />
              <InfoBox
                label="Horário"
                value={limparHorario(eventoSelecionado.horario)}
              />
              <InfoBox
                label="Telefone"
                value={eventoSelecionado.mentoradoTelefone || "—"}
              />
              <InfoBox label="Status" value={eventoSelecionado.status} />

              <div className="rounded-2xl bg-[#f9fafb] p-5 md:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Observação
                </p>

                <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                  {eventoSelecionado.observacao ||
                    "Nenhuma observação adicionada."}
                </p>
              </div>

              </div>
            </div>

            <div className="sticky bottom-0 z-10 border-t border-slate-100 bg-white p-5">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => editarEvento(eventoSelecionado)}
                  className="rounded-2xl bg-[#08163F] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                >
                  Editar compromisso
                </button>

                <button
                  onClick={() =>
                    atualizarStatusEvento(eventoSelecionado.id, "Concluída")
                  }
                  className="rounded-2xl bg-blue-50 px-5 py-4 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                >
                  Marcar concluída
                </button>

                <button
                  onClick={() =>
                    atualizarStatusEvento(eventoSelecionado.id, "Cancelada")
                  }
                  className="rounded-2xl bg-yellow-50 px-5 py-4 text-sm font-black text-yellow-700 transition hover:bg-yellow-100"
                >
                  Cancelar
                </button>

                <button
                  onClick={() => excluirEvento(eventoSelecionado.id)}
                  className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-black text-red-600 transition hover:bg-red-100"
                >
                  Excluir
                </button>

                <button
                  onClick={() => setEventoSelecionado(null)}
                  className="ml-auto rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-black text-[#08163F] transition hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CampoAgenda({
  label,
  ajuda,
  children,
}: {
  label: string;
  ajuda: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#08163F]">{label}</span>

      <p className="mt-1 min-h-[38px] text-xs font-semibold leading-5 text-slate-500">
        {ajuda}
      </p>

      <div className="mt-2">{children}</div>
    </label>
  );
}

function CampoFiltro({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>

      <div className="mt-2">{children}</div>
    </label>
  );
}

function ResumoCard({
  titulo,
  valor,
  texto,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: string;
  texto: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border border-white/50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm ${
        destaque
          ? "bg-[#071A55] text-white"
          : alerta
          ? "bg-yellow-50 text-yellow-700"
          : "bg-white/85 text-[#08163F]"
      }`}
    >
      <h2
        className={`text-sm font-black ${
          destaque
            ? "text-blue-100"
            : alerta
            ? "text-yellow-700"
            : "text-slate-500"
        }`}
      >
        {titulo}
      </h2>

      <p className="mt-3 text-3xl font-black">{valor}</p>

      <p
        className={`mt-2 text-sm font-semibold leading-5 ${
          destaque
            ? "text-blue-100"
            : alerta
            ? "text-yellow-700"
            : "text-slate-500"
        }`}
      >
        {texto}
      </p>
    </div>
  );
}

function ModoButton({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
        ativo
          ? "bg-[#08163F] text-white shadow-lg"
          : "bg-white text-slate-500 hover:text-[#08163F] hover:shadow-md"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    Confirmada: "bg-emerald-100 text-emerald-700",
    Aguardando: "bg-yellow-100 text-yellow-700",
    Concluída: "bg-blue-100 text-blue-700",
    Cancelada: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-black ${
        estilos[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-[#08163F]">{value}</p>
    </div>
  );
}

function montarDiasDoMes(dataBase: Date) {
  const ano = dataBase.getFullYear();
  const mes = dataBase.getMonth();

  const primeiroDiaMes = new Date(ano, mes, 1);
  const ultimoDiaMes = new Date(ano, mes + 1, 0);

  const inicioCalendario = new Date(primeiroDiaMes);
  inicioCalendario.setDate(
    primeiroDiaMes.getDate() - primeiroDiaMes.getDay()
  );

  const fimCalendario = new Date(ultimoDiaMes);
  fimCalendario.setDate(
    ultimoDiaMes.getDate() + (6 - ultimoDiaMes.getDay())
  );

  const dias = [];
  const cursor = new Date(inicioCalendario);

  while (cursor <= fimCalendario) {
    dias.push({
      dataISO: formatarDataISO(cursor),
      numero: cursor.getDate(),
      ehMesAtual: cursor.getMonth() === mes,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return dias;
}

function formatarData(data: string) {
  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarMesAno(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(data);
}

function limparHorario(horario: string) {
  return horario?.slice(0, 5) || "";
}

function estiloCardCalendario(status: string) {
  const estilos: Record<string, string> = {
    Confirmada: "bg-emerald-50 border-emerald-500",
    Aguardando: "bg-yellow-50 border-yellow-500",
    Concluída: "bg-blue-50 border-blue-500",
    Cancelada: "bg-red-50 border-red-500",
  };

  return estilos[status] || "bg-slate-50 border-slate-400";
}

function classeEventoMini(status: string) {
  const estilos: Record<string, string> = {
    Confirmada: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    Aguardando: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
    Concluída: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    Cancelada: "bg-red-50 text-red-700 hover:bg-red-100",
  };

  return estilos[status] || "bg-[#F3F5FF] text-[#08163F] hover:bg-[#08163F] hover:text-white";
}