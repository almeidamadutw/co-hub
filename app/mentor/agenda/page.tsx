"use client";

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
import { baixarArquivoICS, EventoAgendaICS } from "@/utils/ics";
import { supabase } from "@/utils/supabase";

type TipoAgenda = "Mentoria" | "Módulo" | "Reunião" | "Presencial";
type StatusAgenda = "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";

type PerfilMentorado = {
  id: string;
  nome: string;
  email: string | null;
  codigo_inscricao: string | null;
  status: string | null;
};

type EventoAgenda = {
  id: string;
  mentorado_id: string;
  titulo: string | null;
  data: string;
  horario: string;
  tipo: TipoAgenda;
  status: StatusAgenda;
  observacao: string | null;
  criado_por: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type EventoComMentorado = EventoAgenda & {
  mentoradoNome: string;
  mentoradoEmail: string | null;
  codigoInscricao: string | null;
};

type FormAgenda = {
  mentorado_id: string;
  titulo: string;
  data: string;
  horario: string;
  tipo: TipoAgenda;
  status: StatusAgenda;
  observacao: string;
};

const formInicial: FormAgenda = {
  mentorado_id: "",
  titulo: "",
  data: "",
  horario: "",
  tipo: "Mentoria",
  status: "Confirmada",
  observacao: "",
};

function normalizar(valor: string | null | undefined) {
  return String(valor ?? "").trim().toLowerCase();
}

function mentoradoPodeReceberAgenda(mentorado: PerfilMentorado) {
  const status = normalizar(mentorado.status);
  return status === "" || status === "ativo";
}

export default function AgendaMentorPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [mentorados, setMentorados] = useState<PerfilMentorado[]>([]);

  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"Todos" | TipoAgenda>("Todos");
  const [statusFiltro, setStatusFiltro] = useState<"Todos" | StatusAgenda>(
    "Todos"
  );

  const [mesAtual, setMesAtual] = useState(() => new Date());
  const [eventoSelecionado, setEventoSelecionado] =
    useState<EventoComMentorado | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState<FormAgenda>(formInicial);
  const [eventoEditandoId, setEventoEditandoId] = useState<string | null>(null);

  const carregarAgenda = useCallback(async (inicial = false) => {
    if (inicial) {
      setCarregandoInicial(true);
    } else {
      setAtualizando(true);
    }

    try {
      setErro("");

      const [mentoradosResposta, eventosResposta] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nome, email, codigo_inscricao, status")
          .is("excluido_em", null)
          .eq("role", "mentorado")
          .order("nome", { ascending: true }),
        supabase
          .from("agenda_eventos")
          .select(
            "id, mentorado_id, titulo, data, horario, tipo, status, observacao, criado_por, created_at, updated_at"
          )
          .order("data", { ascending: true })
          .order("horario", { ascending: true }),
      ]);

      if (mentoradosResposta.error) {
        throw new Error(mentoradosResposta.error.message);
      }

      if (eventosResposta.error) {
        throw new Error(eventosResposta.error.message);
      }

      setMentorados((mentoradosResposta.data ?? []) as PerfilMentorado[]);
      setEventos((eventosResposta.data ?? []) as EventoAgenda[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a agenda."
      );

      if (inicial) {
        setMentorados([]);
        setEventos([]);
      }
    } finally {
      setCarregandoInicial(false);
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
      await carregarAgenda(true);
    }

    void iniciar();

    return () => {
      ativo = false;
    };
  }, [carregarAgenda, router]);

  const mentoradosAtivos = useMemo(
    () => mentorados.filter(mentoradoPodeReceberAgenda),
    [mentorados]
  );

  const mentoradosParaFormulario = useMemo(() => {
    if (!eventoEditandoId || !form.mentorado_id) return mentoradosAtivos;

    return mentorados.filter(
      (mentorado) =>
        mentoradoPodeReceberAgenda(mentorado) ||
        mentorado.id === form.mentorado_id
    );
  }, [eventoEditandoId, form.mentorado_id, mentorados, mentoradosAtivos]);

  const eventosComMentorado = useMemo<EventoComMentorado[]>(() => {
    return eventos.map((evento) => {
      const mentorado = mentorados.find(
        (item) => item.id === evento.mentorado_id
      );

      return {
        ...evento,
        mentoradoNome: mentorado?.nome || "Mentorado não encontrado",
        mentoradoEmail: mentorado?.email || null,
        codigoInscricao: mentorado?.codigo_inscricao || null,
      };
    });
  }, [eventos, mentorados]);

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return eventosComMentorado.filter((evento) => {
      const passaTipo = tipoFiltro === "Todos" || evento.tipo === tipoFiltro;
      const passaStatus =
        statusFiltro === "Todos" || evento.status === statusFiltro;

      const textoBusca = [
        evento.titulo,
        evento.mentoradoNome,
        evento.mentoradoEmail,
        evento.codigoInscricao,
        evento.tipo,
        evento.status,
        evento.observacao,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const passaBusca = !termo || textoBusca.includes(termo);
      return passaTipo && passaStatus && passaBusca;
    });
  }, [eventosComMentorado, busca, tipoFiltro, statusFiltro]);

  const proximosEventos = useMemo(() => {
    const agora = new Date();

    return eventosFiltrados
      .filter(
        (evento) =>
          !["Cancelada", "Concluída"].includes(evento.status) &&
          dataHoraEvento(evento).getTime() >= agora.getTime()
      )
      .sort(
        (a, b) => dataHoraEvento(a).getTime() - dataHoraEvento(b).getTime()
      );
  }, [eventosFiltrados]);

  const resumo = useMemo(() => {
    const agora = new Date();
    const hoje = formatarDataISO(agora);
    const seteDias = new Date(agora);
    seteDias.setDate(seteDias.getDate() + 7);

    const eventosAtivos = eventos.filter(
      (evento) => evento.status !== "Cancelada"
    );

    const hojeTotal = eventosAtivos.filter(
      (evento) => evento.data === hoje
    ).length;

    const proximosSeteDias = eventosAtivos.filter((evento) => {
      if (evento.status === "Concluída") return false;
      const dataEvento = dataHoraEvento(evento);
      return (
        dataEvento.getTime() >= agora.getTime() &&
        dataEvento.getTime() <= seteDias.getTime()
      );
    }).length;

    const aguardando = eventosAtivos.filter(
      (evento) =>
        evento.status === "Aguardando" &&
        dataHoraEvento(evento).getTime() >= agora.getTime()
    ).length;

    const proximo = [...eventosAtivos]
      .filter(
        (evento) =>
          evento.status !== "Concluída" &&
          dataHoraEvento(evento).getTime() >= agora.getTime()
      )
      .sort(
        (a, b) => dataHoraEvento(a).getTime() - dataHoraEvento(b).getTime()
      )[0];

    return {
      hoje: hojeTotal,
      proximosSeteDias,
      aguardando,
      proximo,
    };
  }, [eventos]);

  const diasDoMes = useMemo(() => montarDiasDoMes(mesAtual), [mesAtual]);

  const eventosMes = useMemo(() => {
    return eventosFiltrados
      .filter((evento) => {
        const [ano, mes] = evento.data.split("-").map(Number);
        return ano === mesAtual.getFullYear() && mes - 1 === mesAtual.getMonth();
      })
      .sort(
        (a, b) => dataHoraEvento(a).getTime() - dataHoraEvento(b).getTime()
      );
  }, [eventosFiltrados, mesAtual]);

  const filtrosAtivos =
    Boolean(busca.trim()) || tipoFiltro !== "Todos" || statusFiltro !== "Todos";

  function eventosDoDia(dataISO: string) {
    return eventosFiltrados
      .filter((evento) => evento.data === dataISO)
      .sort((a, b) =>
        limparHorario(a.horario).localeCompare(limparHorario(b.horario))
      );
  }

  function mudarMes(direcao: "anterior" | "proximo") {
    setMesAtual((dataAtual) => {
      const novaData = new Date(dataAtual);
      novaData.setMonth(
        novaData.getMonth() + (direcao === "anterior" ? -1 : 1)
      );
      return novaData;
    });
  }

  function limparFiltros() {
    setBusca("");
    setTipoFiltro("Todos");
    setStatusFiltro("Todos");
  }

  function abrirNovoEvento(data?: string) {
    setEventoSelecionado(null);
    setEventoEditandoId(null);
    setForm({
      ...formInicial,
      data: data || "",
    });
    setErro("");
    setSucesso("");
    setFormAberto(true);
  }

  function editarEvento(evento: EventoComMentorado) {
    setEventoSelecionado(null);
    setEventoEditandoId(evento.id);
    setForm({
      mentorado_id: evento.mentorado_id,
      titulo: evento.titulo || "",
      data: evento.data,
      horario: limparHorario(evento.horario),
      tipo: evento.tipo,
      status: evento.status,
      observacao: evento.observacao || "",
    });
    setErro("");
    setSucesso("");
    setFormAberto(true);
  }

  function fecharFormulario() {
    if (salvando) return;
    setFormAberto(false);
    setEventoEditandoId(null);
    setForm(formInicial);
  }

  function atualizarForm(campo: keyof FormAgenda, valor: string) {
    setForm((dadosAtuais) => ({
      ...dadosAtuais,
      [campo]: valor,
    }));
  }

  async function salvarEvento(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!usuario || salvando) return;

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      if (!form.mentorado_id) {
        throw new Error("Selecione o mentorado.");
      }

      if (!form.data) {
        throw new Error("Informe a data do compromisso.");
      }

      if (!form.horario) {
        throw new Error("Informe o horário do compromisso.");
      }

      const conflito = eventos.some((evento) => {
        if (eventoEditandoId && evento.id === eventoEditandoId) return false;
        if (evento.status === "Cancelada") return false;

        return (
          evento.data === form.data &&
          limparHorario(evento.horario) === limparHorario(form.horario)
        );
      });

      if (conflito) {
        throw new Error(
          "Já existe um compromisso nesse mesmo dia e horário."
        );
      }

      const payload = {
        mentorado_id: form.mentorado_id,
        titulo: form.titulo.trim() || form.tipo,
        data: form.data,
        horario: form.horario,
        tipo: form.tipo,
        status: form.status,
        observacao: form.observacao.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (eventoEditandoId) {
        const { error } = await supabase
          .from("agenda_eventos")
          .update(payload)
          .eq("id", eventoEditandoId);

        if (error) throw new Error(error.message);
        setSucesso("Compromisso atualizado com sucesso.");
      } else {
        const { error } = await supabase.from("agenda_eventos").insert({
          ...payload,
          criado_por: usuario.id,
        });

        if (error) throw new Error(error.message);
        setSucesso("Compromisso cadastrado com sucesso.");
      }

      setFormAberto(false);
      setEventoEditandoId(null);
      setForm(formInicial);
      await carregarAgenda(false);
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

  async function alterarStatusEvento(id: string, status: StatusAgenda) {
    if (salvando) return;

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const { error } = await supabase
        .from("agenda_eventos")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw new Error(error.message);

      setEventoSelecionado(null);
      setSucesso(
        status === "Concluída"
          ? "Compromisso marcado como concluído."
          : status === "Cancelada"
          ? "Compromisso cancelado."
          : "Status atualizado."
      );
      await carregarAgenda(false);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o compromisso."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirEvento(id: string) {
    const confirmou = window.confirm(
      "Excluir definitivamente este registro da agenda? Use cancelar se quiser manter o histórico."
    );

    if (!confirmou || salvando) return;

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const { error } = await supabase
        .from("agenda_eventos")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);

      setEventoSelecionado(null);
      setSucesso("Registro excluído da agenda.");
      await carregarAgenda(false);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o compromisso."
      );
    } finally {
      setSalvando(false);
    }
  }

  function exportarAgenda() {
    const eventosExportaveis = eventosComMentorado.filter(
      (evento) => evento.status !== "Cancelada"
    );

    if (eventosExportaveis.length === 0) {
      setErro("Não há compromissos para exportar.");
      return;
    }

    const eventosICS: EventoAgendaICS[] = eventosExportaveis.map((evento) => {
      const inicio = dataHoraEvento(evento);
      const fim = new Date(inicio.getTime() + 60 * 60 * 1000);

      return {
        id: evento.id,
        titulo: `${evento.titulo || evento.tipo} - ${evento.mentoradoNome}`,
        descricao: [
          `Mentorado: ${evento.mentoradoNome}`,
          `Tipo: ${evento.tipo}`,
          `Status: ${evento.status}`,
          evento.observacao ? `Observação: ${evento.observacao}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        inicio,
        fim,
      };
    });

    baixarArquivoICS(eventosICS);
    setErro("");
    setSucesso("Agenda exportada em formato .ics.");
  }

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregandoInicial) {
    return <PageLoading pagina="agenda da mentora" />;
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
                Agenda
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              disabled={atualizando}
              onClick={() => void carregarAgenda(false)}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
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

        <div className="relative min-w-0 overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px] lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9CED6] sm:text-xs">
                  Calendário CEO Club
                </p>
                <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">
                  Agenda da mentoria
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#D9DEE7]">
                  Organize mentorias, reuniões, módulos e encontros presenciais sem misturar a agenda com outras áreas do sistema.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => abrirNovoEvento()}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:brightness-95"
                >
                  + Novo compromisso
                </button>

                <button
                  type="button"
                  onClick={exportarAgenda}
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
                >
                  Exportar .ics
                </button>
              </div>
            </div>
          </section>

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mb-4 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
              {sucesso}
            </div>
          )}

          <section className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI titulo="Compromissos hoje" valor={resumo.hoje} destaque />
            <KPI titulo="Próximos 7 dias" valor={resumo.proximosSeteDias} />
            <KPI
              titulo="Aguardando confirmação"
              valor={resumo.aguardando}
              alerta={resumo.aguardando > 0}
            />
            <KPI
              titulo="Próximo compromisso"
              valor={
                resumo.proximo
                  ? `${formatarDataCurta(resumo.proximo.data)} · ${limparHorario(
                      resumo.proximo.horario
                    )}`
                  : "Sem agenda"
              }
              subtexto={
                resumo.proximo
                  ? mentorados.find(
                      (item) => item.id === resumo.proximo?.mentorado_id
                    )?.nome || "Mentorado"
                  : "nenhum compromisso futuro"
              }
            />
          </section>

          <section className="mb-4 rounded-[22px] border border-gray-200 bg-white p-4 shadow-lg shadow-slate-200/70 sm:rounded-[24px] sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <label className="min-w-0 flex-1">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                  Buscar compromisso
                </span>
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Mentorado, título, inscrição ou observação"
                  className="input-ceo mt-2"
                />
              </label>

              <label className="xl:w-48">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                  Tipo
                </span>
                <select
                  value={tipoFiltro}
                  onChange={(e) =>
                    setTipoFiltro(e.target.value as "Todos" | TipoAgenda)
                  }
                  className="input-ceo mt-2"
                >
                  <option value="Todos">Todos</option>
                  <option value="Mentoria">Mentoria</option>
                  <option value="Módulo">Módulo</option>
                  <option value="Reunião">Reunião</option>
                  <option value="Presencial">Presencial</option>
                </select>
              </label>

              <label className="xl:w-52">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                  Status
                </span>
                <select
                  value={statusFiltro}
                  onChange={(e) =>
                    setStatusFiltro(e.target.value as "Todos" | StatusAgenda)
                  }
                  className="input-ceo mt-2"
                >
                  <option value="Todos">Todos</option>
                  <option value="Confirmada">Confirmada</option>
                  <option value="Aguardando">Aguardando</option>
                  <option value="Concluída">Concluída</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </label>

              {filtrosAtivos && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
            <div className="min-w-0 overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-lg shadow-slate-200/70 sm:rounded-[24px]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">
                    Calendário mensal
                  </p>
                  <h3 className="mt-1 break-words text-xl font-black capitalize text-[#050816] sm:text-2xl">
                    {formatarMesAno(mesAtual)}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => mudarMes("anterior")}
                    className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setMesAtual(new Date())}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#08163F] shadow-sm ring-1 ring-slate-100 transition hover:shadow-md sm:text-sm"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => mudarMes("proximo")}
                    className="rounded-xl bg-[#08163F] px-3 py-2 text-xs font-black text-white transition hover:brightness-110 sm:text-sm"
                  >
                    Próximo →
                  </button>
                </div>
              </div>

              <div className="hidden md:block">
                <div className="grid grid-cols-7 border-b border-gray-100 bg-[#f9fafb] text-center text-[10px] font-black uppercase tracking-[0.12em] text-gray-400 sm:text-xs">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                    (dia) => (
                      <div key={dia} className="p-3">
                        {dia}
                      </div>
                    )
                  )}
                </div>

                <div className="grid grid-cols-7">
                  {diasDoMes.map((dia) => {
                    const eventosDia = eventosDoDia(dia.dataISO);
                    const ehHoje = dia.dataISO === formatarDataISO(new Date());

                    return (
                      <div
                        key={dia.dataISO}
                        className={`min-h-[122px] border-b border-r border-gray-100 p-2 lg:min-h-[136px] lg:p-3 ${
                          dia.ehMesAtual
                            ? "bg-white"
                            : "bg-[#f9fafb] text-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => abrirNovoEvento(dia.dataISO)}
                            className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black transition hover:bg-[#EEF2FF] ${
                              ehHoje
                                ? "bg-[#08163F] text-white hover:bg-[#08163F]"
                                : dia.ehMesAtual
                                ? "text-[#08163F]"
                                : "text-gray-300"
                            }`}
                            title="Adicionar compromisso neste dia"
                          >
                            {dia.numero}
                          </button>

                          {eventosDia.length > 0 && (
                            <span className="rounded-full bg-[#EEF2FF] px-2 py-1 text-[10px] font-black text-[#08163F]">
                              {eventosDia.length}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 space-y-1.5">
                          {eventosDia.slice(0, 3).map((evento) => (
                            <button
                              key={evento.id}
                              type="button"
                              onClick={() => setEventoSelecionado(evento)}
                              className={`block w-full rounded-lg px-2 py-1.5 text-left text-[10px] font-black transition ${classeEventoCalendario(
                                evento.status
                              )}`}
                            >
                              <span className="block truncate">
                                {limparHorario(evento.horario)} · {evento.mentoradoNome}
                              </span>
                            </button>
                          ))}

                          {eventosDia.length > 3 && (
                            <p className="text-[11px] font-bold text-gray-400">
                              +{eventosDia.length - 3} compromisso(s)
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 md:hidden">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-[#08163F]">
                    Agenda do mês
                  </p>
                  <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black text-gray-500">
                    {eventosMes.length} evento(s)
                  </span>
                </div>

                {eventosMes.length === 0 ? (
                  <EmptyState
                    titulo="Nenhum compromisso neste mês"
                    texto="Use Novo compromisso para adicionar um encontro à agenda."
                  />
                ) : (
                  <div className="space-y-3">
                    {eventosMes.map((evento) => (
                      <EventoLista
                        key={evento.id}
                        evento={evento}
                        onClick={() => setEventoSelecionado(evento)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside className="min-w-0 space-y-4">
              <Card
                titulo="Próximos compromissos"
                subtitulo="Somente eventos futuros e ainda ativos."
              >
                {proximosEventos.length === 0 ? (
                  <EmptyState
                    titulo="Agenda livre"
                    texto="Nenhum compromisso futuro encontrado com os filtros atuais."
                    botao="Novo compromisso"
                    onClick={() => abrirNovoEvento()}
                  />
                ) : (
                  <div className="space-y-3">
                    {proximosEventos.slice(0, 7).map((evento) => (
                      <EventoLista
                        key={evento.id}
                        evento={evento}
                        onClick={() => setEventoSelecionado(evento)}
                      />
                    ))}
                  </div>
                )}
              </Card>

              <Card titulo="Legenda">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status="Confirmada" />
                  <StatusBadge status="Aguardando" />
                  <StatusBadge status="Concluída" />
                  <StatusBadge status="Cancelada" />
                </div>
                <p className="mt-4 text-xs font-semibold leading-5 text-gray-500">
                  Cancelar mantém o compromisso no histórico. Excluir deve ser usado apenas para registros criados por engano.
                </p>
              </Card>
            </aside>
          </section>
        </div>
      </section>

      {formAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-4">
          <div className="max-h-[94vh] w-full max-w-[min(96vw,46rem)] overflow-y-auto rounded-[24px] bg-white shadow-2xl sm:rounded-[30px]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9CED6]">
                  {eventoEditandoId ? "Editar compromisso" : "Novo compromisso"}
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  {eventoEditandoId ? "Atualizar agenda" : "Marcar encontro"}
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharFormulario}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20"
              >
                ×
              </button>
            </div>

            <form onSubmit={salvarEvento} className="p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                    Mentorado
                  </span>
                  <select
                    value={form.mentorado_id}
                    onChange={(e) =>
                      atualizarForm("mentorado_id", e.target.value)
                    }
                    className="input-ceo mt-2"
                  >
                    <option value="">Selecione o mentorado</option>
                    {mentoradosParaFormulario.map((mentorado) => (
                      <option key={mentorado.id} value={mentorado.id}>
                        {mentorado.nome}
                        {!mentoradoPodeReceberAgenda(mentorado)
                          ? " (inativo)"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                    Título
                  </span>
                  <input
                    value={form.titulo}
                    onChange={(e) => atualizarForm("titulo", e.target.value)}
                    placeholder="Ex: Reunião de alinhamento"
                    className="input-ceo mt-2"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                    Data
                  </span>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => atualizarForm("data", e.target.value)}
                    className="input-ceo mt-2"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                    Horário
                  </span>
                  <input
                    type="time"
                    step="1800"
                    value={form.horario}
                    onChange={(e) => atualizarForm("horario", e.target.value)}
                    className="input-ceo mt-2"
                  />
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                    Tipo
                  </span>
                  <select
                    value={form.tipo}
                    onChange={(e) =>
                      atualizarForm("tipo", e.target.value as TipoAgenda)
                    }
                    className="input-ceo mt-2"
                  >
                    <option value="Mentoria">Mentoria</option>
                    <option value="Módulo">Módulo</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Presencial">Presencial</option>
                  </select>
                </label>

                <label>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                    Status
                  </span>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      atualizarForm("status", e.target.value as StatusAgenda)
                    }
                    className="input-ceo mt-2"
                  >
                    <option value="Confirmada">Confirmada</option>
                    <option value="Aguardando">Aguardando</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </label>

                <label className="md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                    Observação
                  </span>
                  <textarea
                    value={form.observacao}
                    onChange={(e) =>
                      atualizarForm("observacao", e.target.value)
                    }
                    placeholder="Pauta, contexto ou observações importantes"
                    rows={4}
                    className="input-ceo mt-2 resize-none"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando
                    ? "Salvando..."
                    : eventoEditandoId
                    ? "Salvar alteração"
                    : "Cadastrar compromisso"}
                </button>

                <button
                  type="button"
                  disabled={salvando}
                  onClick={fecharFormulario}
                  className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {eventoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-4">
          <div className="max-h-[94vh] w-full max-w-[min(96vw,44rem)] overflow-y-auto rounded-[24px] bg-white shadow-2xl sm:rounded-[30px]">
            <div className="bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9CED6]">
                    Detalhes do compromisso
                  </p>
                  <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">
                    {eventoSelecionado.titulo || eventoSelecionado.tipo}
                  </h2>
                  <p className="mt-2 break-words text-sm font-bold text-[#D9DEE7]">
                    {eventoSelecionado.mentoradoNome}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEventoSelecionado(null)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <TipoBadge tipo={eventoSelecionado.tipo} />
                <StatusBadge status={eventoSelecionado.status} />
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
              <InfoBox
                label="Data"
                value={formatarDataLonga(eventoSelecionado.data)}
              />
              <InfoBox
                label="Horário"
                value={limparHorario(eventoSelecionado.horario)}
              />
              <InfoBox label="Tipo" value={eventoSelecionado.tipo} />
              <InfoBox label="Status" value={eventoSelecionado.status} />
              <InfoBox
                label="Mentorado"
                value={eventoSelecionado.mentoradoNome}
              />
              <InfoBox
                label="Inscrição"
                value={eventoSelecionado.codigoInscricao || "Não informada"}
              />

              <div className="rounded-2xl bg-[#f9fafb] p-5 md:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                  Observação
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7 text-gray-600">
                  {eventoSelecionado.observacao ||
                    "Nenhuma observação adicionada."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                {!["Concluída", "Cancelada"].includes(
                  eventoSelecionado.status
                ) && (
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() =>
                      void alterarStatusEvento(
                        eventoSelecionado.id,
                        "Concluída"
                      )
                    }
                    className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Marcar como concluída
                  </button>
                )}

                {eventoSelecionado.status !== "Cancelada" && (
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() =>
                      void alterarStatusEvento(
                        eventoSelecionado.id,
                        "Cancelada"
                      )
                    }
                    className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                  >
                    Cancelar compromisso
                  </button>
                )}

                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => editarEvento(eventoSelecionado)}
                  className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
                >
                  Editar
                </button>

                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void excluirEvento(eventoSelecionado.id)}
                  className="ml-auto rounded-2xl px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  Excluir registro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function dataHoraEvento(evento: Pick<EventoAgenda, "data" | "horario">) {
  return new Date(`${evento.data}T${limparHorario(evento.horario)}:00`);
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
  fimCalendario.setDate(ultimoDiaMes.getDate() + (6 - ultimoDiaMes.getDay()));

  const dias: { dataISO: string; numero: number; ehMesAtual: boolean }[] = [];
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

function formatarDataCurta(data: string) {
  if (!data) return "Sem data";
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

function formatarDataLonga(data: string) {
  if (!data) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${data}T12:00:00`));
}

function limparHorario(horario: string) {
  return horario?.slice(0, 5) || "";
}

function classeEventoCalendario(status: StatusAgenda) {
  if (status === "Cancelada") {
    return "bg-red-50 text-red-600 line-through hover:bg-red-100";
  }

  if (status === "Concluída") {
    return "bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
  }

  if (status === "Aguardando") {
    return "bg-amber-50 text-amber-700 hover:bg-amber-100";
  }

  return "bg-[#EEF2FF] text-[#08163F] hover:bg-[#08163F] hover:text-white";
}

function KPI({
  titulo,
  valor,
  subtexto,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: React.ReactNode;
  subtexto?: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-[20px] p-4 shadow-lg shadow-slate-200/70 sm:p-5 ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : alerta
          ? "bg-amber-50 text-amber-800"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`break-words text-xs font-black sm:text-sm ${
          destaque
            ? "text-[#C9CED6]"
            : alerta
            ? "text-amber-600"
            : "text-gray-500"
        }`}
      >
        {titulo}
      </p>
      <p className="mt-3 break-words text-xl font-black leading-tight sm:text-2xl lg:text-3xl">
        {valor}
      </p>
      {subtexto && (
        <p
          className={`mt-2 break-words text-xs font-semibold ${
            destaque ? "text-[#D9DEE7]" : "text-gray-400"
          }`}
        >
          {subtexto}
        </p>
      )}
    </div>
  );
}

function Card({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-lg shadow-slate-200/70 sm:rounded-[24px]">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
        <h3 className="break-words text-lg font-black text-[#050816] sm:text-xl">
          {titulo}
        </h3>
        {subtitulo && (
          <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
            {subtitulo}
          </p>
        )}
      </div>
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function EventoLista({
  evento,
  onClick,
}: {
  evento: EventoComMentorado;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-w-0 rounded-2xl border border-gray-100 bg-[#f9fafb] p-3 text-left transition hover:border-[#12317C]/15 hover:bg-white hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">
            {formatarDataCurta(evento.data)} · {limparHorario(evento.horario)}
          </p>
          <p className="mt-1 break-words text-sm font-black text-[#08163F]">
            {evento.mentoradoNome}
          </p>
          <p className="mt-1 break-words text-xs font-semibold text-gray-500">
            {evento.titulo || evento.tipo}
          </p>
        </div>
        <StatusBadge status={evento.status} compacta />
      </div>
    </button>
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
    <div className="rounded-[20px] bg-[#f9fafb] p-5 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
        ✦
      </div>
      <p className="mt-3 text-sm font-black text-[#08163F]">{titulo}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
        {texto}
      </p>
      {botao && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-4 rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-sm transition hover:shadow-md"
        >
          {botao}
        </button>
      )}
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black capitalize text-[#08163F] sm:text-base">
        {value}
      </p>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: TipoAgenda }) {
  const classes: Record<TipoAgenda, string> = {
    Mentoria: "bg-blue-100 text-blue-700",
    Módulo: "bg-purple-100 text-purple-700",
    Reunião: "bg-yellow-100 text-yellow-700",
    Presencial: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes[tipo]}`}>
      {tipo}
    </span>
  );
}

function StatusBadge({
  status,
  compacta,
}: {
  status: StatusAgenda;
  compacta?: boolean;
}) {
  const classes: Record<StatusAgenda, string> = {
    Confirmada: "bg-green-100 text-green-700",
    Aguardando: "bg-yellow-100 text-yellow-700",
    Concluída: "bg-blue-100 text-blue-700",
    Cancelada: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`shrink-0 rounded-full font-black ${classes[status]} ${
        compacta ? "px-2 py-1 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      {status}
    </span>
  );
}
