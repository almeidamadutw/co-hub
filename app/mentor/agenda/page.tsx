"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";

type TipoAgenda = "Mentoria" | "Módulo" | "Reunião" | "Presencial";
type StatusAgenda = "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";

type PerfilMentorado = {
  id: string;
  nome: string;
  email: string | null;
  codigo_inscricao: string | null;
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
  created_at: string | null;
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

export default function AgendaMentorPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [mentorados, setMentorados] = useState<PerfilMentorado[]>([]);

  const [carregando, setCarregando] = useState(true);
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

  const [form, setForm] = useState<FormAgenda>(formInicial);
  const [eventoEditandoId, setEventoEditandoId] = useState<string | null>(null);

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentorado") {
      router.replace("/mentorado/agenda");
      return;
    }

    if (user.role !== "mentor" && user.role !== "suporte") {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);
    carregarAgenda();
  }, [router]);

  async function carregarAgenda() {
    try {
      setCarregando(true);
      setErro("");

      const { data: mentoradosData, error: mentoradosError } = await supabase
        .from("profiles")
        .select("id, nome, email, codigo_inscricao")
        .eq("role", "mentorado")
        .order("nome", { ascending: true });

      if (mentoradosError) {
        throw new Error(mentoradosError.message);
      }

      const { data: eventosData, error: eventosError } = await supabase
        .from("agenda_eventos")
        .select(
          "id, mentorado_id, titulo, data, horario, tipo, status, observacao, created_at"
        )
        .order("data", { ascending: true })
        .order("horario", { ascending: true });

      if (eventosError) {
        throw new Error(eventosError.message);
      }

      setMentorados((mentoradosData ?? []) as PerfilMentorado[]);
      setEventos((eventosData ?? []) as EventoAgenda[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a agenda."
      );
      setMentorados([]);
      setEventos([]);
    } finally {
      setCarregando(false);
    }
  }

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  function limparFormulario() {
    setForm(formInicial);
    setEventoEditandoId(null);
    setErro("");
    setSucesso("");
  }

  function atualizarForm(campo: keyof FormAgenda, valor: string) {
    setForm((dadosAtuais) => ({
      ...dadosAtuais,
      [campo]: valor,
    }));
  }

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

  const hoje = formatarDataISO(new Date());

  const resumo = useMemo(() => {
    return {
      total: eventos.length,
      hoje: eventos.filter((evento) => evento.data === hoje).length,
      futuros: eventos.filter((evento) => evento.data >= hoje).length,
      aguardando: eventos.filter((evento) => evento.status === "Aguardando")
        .length,
    };
  }, [eventos, hoje]);

  const proximosEventos = useMemo(() => {
    return eventosFiltrados
      .filter((evento) => evento.data >= hoje)
      .sort((a, b) => {
        const dataA = new Date(`${a.data}T${limparHorario(a.horario)}:00`);
        const dataB = new Date(`${b.data}T${limparHorario(b.horario)}:00`);

        return dataA.getTime() - dataB.getTime();
      });
  }, [eventosFiltrados, hoje]);

  const diasDoMes = useMemo(() => montarDiasDoMes(mesAtual), [mesAtual]);

  const proximoEvento = useMemo(() => proximosEventos[0] ?? null, [
    proximosEventos,
  ]);

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

      if (direcao === "anterior") {
        novaData.setMonth(novaData.getMonth() - 1);
      } else {
        novaData.setMonth(novaData.getMonth() + 1);
      }

      return novaData;
    });
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

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirEvento(id: string) {
    const confirmou = window.confirm(
      "Tem certeza que deseja excluir este compromisso da agenda?"
    );

    if (!confirmou) return;

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const { error } = await supabase.from("agenda_eventos").delete().eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      setEventoSelecionado(null);
      setSucesso("Compromisso excluído da agenda.");
      await carregarAgenda();
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

  async function salvarEvento(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        const mesmoEvento = eventoEditandoId && evento.id === eventoEditandoId;

        if (mesmoEvento) return false;
        if (evento.status === "Cancelada") return false;

        return (
          evento.data === form.data &&
          limparHorario(evento.horario) === limparHorario(form.horario)
        );
      });

      if (conflito) {
        throw new Error(
          "Já existe compromisso nesse mesmo dia e horário. Confira antes de salvar."
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
      };

      if (eventoEditandoId) {
        const { error } = await supabase
          .from("agenda_eventos")
          .update(payload)
          .eq("id", eventoEditandoId);

        if (error) {
          throw new Error(error.message);
        }

        setSucesso("Compromisso atualizado com sucesso.");
      } else {
        const { error } = await supabase.from("agenda_eventos").insert(payload);

        if (error) {
          throw new Error(error.message);
        }

        setSucesso("Compromisso cadastrado com sucesso.");
      }

      limparFormulario();
      await carregarAgenda();
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

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">
            CEO Club
          </p>

          <h1 className="mt-3 text-2xl font-black">Carregando agenda...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} />

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
              onClick={carregarAgenda}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:text-sm"
            >
              Atualizar
            </button>

            <button
              type="button"
              onClick={sair}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="relative min-w-0 overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white shadow-xl sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-[#C9CED6]">
                  Calendário CEO Club
                </p>

                <h2 className="mt-2 break-words text-3xl font-black sm:text-4xl">
                  Agenda da mentoria
                </h2>

                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
                  Cadastre reuniões, mentorias, módulos e encontros presenciais
                  para cada mentorado. A Mirelen pode organizar os compromissos
                  da mentora por aqui.
                </p>
              </div>

              <div className="rounded-[22px] bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-bold text-[#C9CED6]">
                  Próximo compromisso
                </p>

                <p className="mt-2 break-words text-2xl font-black leading-tight">
                  {proximoEvento ? formatarDataCurta(proximoEvento.data) : "—"}
                </p>

                {proximoEvento && (
                  <p className="mt-1 text-sm font-bold text-blue-100">
                    {limparHorario(proximoEvento.horario)} ·{" "}
                    {proximoEvento.mentoradoNome}
                  </p>
                )}
              </div>
            </div>
          </section>

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mb-4 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
              {sucesso}
            </div>
          )}

          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI titulo="Eventos" valor={carregando ? "..." : resumo.total} destaque />
            <KPI titulo="Hoje" valor={carregando ? "..." : resumo.hoje} />
            <KPI titulo="Futuros" valor={carregando ? "..." : resumo.futuros} />
            <KPI
              titulo="Aguardando"
              valor={carregando ? "..." : resumo.aguardando}
              alerta={resumo.aguardando > 0}
            />
          </section>

          <section className="mb-4 grid gap-4 xl:grid-cols-[minmax(360px,430px)_minmax(0,1fr)]">
            <form
              onSubmit={salvarEvento}
              className="rounded-[26px] bg-white p-5 shadow-lg shadow-slate-200/70"
            >
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">
                  {eventoEditandoId ? "Editar compromisso" : "Novo compromisso"}
                </p>

                <h3 className="mt-1 text-2xl font-black text-[#050816]">
                  {eventoEditandoId ? "Atualizar agenda" : "Marcar reunião"}
                </h3>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-black text-gray-500">
                    Mentorado
                  </span>

                  <select
                    value={form.mentorado_id}
                    onChange={(e) =>
                      atualizarForm("mentorado_id", e.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                  >
                    <option value="">Selecione o mentorado</option>

                    {mentorados.map((mentorado) => (
                      <option key={mentorado.id} value={mentorado.id}>
                        {mentorado.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-black text-gray-500">
                    Título
                  </span>

                  <input
                    value={form.titulo}
                    onChange={(e) => atualizarForm("titulo", e.target.value)}
                    placeholder="Ex: Reunião de alinhamento"
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-gray-500">
                      Data
                    </span>

                    <input
                      type="date"
                      value={form.data}
                      onChange={(e) => atualizarForm("data", e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-gray-500">
                      Horário
                    </span>

                    <input
                      type="time"
                      value={form.horario}
                      onChange={(e) =>
                        atualizarForm("horario", e.target.value)
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-gray-500">
                      Tipo
                    </span>

                    <select
                      value={form.tipo}
                      onChange={(e) =>
                        atualizarForm("tipo", e.target.value as TipoAgenda)
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                    >
                      <option value="Mentoria">Mentoria</option>
                      <option value="Módulo">Módulo</option>
                      <option value="Reunião">Reunião</option>
                      <option value="Presencial">Presencial</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-gray-500">
                      Status
                    </span>

                    <select
                      value={form.status}
                      onChange={(e) =>
                        atualizarForm("status", e.target.value as StatusAgenda)
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                    >
                      <option value="Confirmada">Confirmada</option>
                      <option value="Aguardando">Aguardando</option>
                      <option value="Concluída">Concluída</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-black text-gray-500">
                    Observação
                  </span>

                  <textarea
                    value={form.observacao}
                    onChange={(e) =>
                      atualizarForm("observacao", e.target.value)
                    }
                    placeholder="Observações importantes para a reunião"
                    rows={4}
                    className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
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

                  {eventoEditandoId && (
                    <button
                      type="button"
                      onClick={limparFormulario}
                      className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>
              </div>
            </form>

            <section className="rounded-[26px] bg-white p-5 shadow-lg shadow-slate-200/70">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">
                  Filtros
                </p>

                <h3 className="mt-1 text-2xl font-black text-[#050816]">
                  Buscar compromisso
                </h3>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
                <label>
                  <span className="text-sm font-black text-gray-500">
                    Buscar
                  </span>

                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome, e-mail, inscrição, título ou observação"
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                  />
                </label>

                <label>
                  <span className="text-sm font-black text-gray-500">
                    Tipo
                  </span>

                  <select
                    value={tipoFiltro}
                    onChange={(e) =>
                      setTipoFiltro(e.target.value as "Todos" | TipoAgenda)
                    }
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Mentoria">Mentoria</option>
                    <option value="Módulo">Módulo</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Presencial">Presencial</option>
                  </select>
                </label>

                <label>
                  <span className="text-sm font-black text-gray-500">
                    Status
                  </span>

                  <select
                    value={statusFiltro}
                    onChange={(e) =>
                      setStatusFiltro(
                        e.target.value as "Todos" | StatusAgenda
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Confirmada">Confirmada</option>
                    <option value="Aguardando">Aguardando</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 rounded-[22px] bg-[#f9fafb] p-4">
                <p className="text-sm font-black text-[#08163F]">
                  Dica da agenda
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
                  O sistema bloqueia cadastro no mesmo dia e horário para evitar
                  choque de compromissos.
                </p>
              </div>
            </section>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
            <div className="min-w-0 overflow-hidden rounded-[22px] bg-white shadow-lg sm:rounded-[24px]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">
                    Calendário mensal
                  </p>

                  <h3 className="mt-1 break-words text-xl font-black text-[#050816] sm:text-2xl">
                    {formatarMesAno(mesAtual)}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => mudarMes("anterior")}
                    className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
                  >
                    ← Mês anterior
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
                    Próximo mês →
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="grid min-w-[760px] grid-cols-7 border-b border-gray-100 bg-[#f9fafb] text-center text-[10px] font-black uppercase tracking-[0.12em] text-gray-400 sm:text-xs">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                    (dia) => (
                      <div key={dia} className="p-3">
                        {dia}
                      </div>
                    )
                  )}
                </div>

                <div className="grid min-w-[760px] grid-cols-7">
                  {diasDoMes.map((dia) => {
                    const eventosDia = eventosDoDia(dia.dataISO);
                    const ehMesAtual = dia.ehMesAtual;
                    const ehHoje =
                      dia.dataISO === formatarDataISO(new Date());

                    return (
                      <div
                        key={dia.dataISO}
                        className={`min-h-[115px] border-b border-r border-gray-100 p-2 sm:min-h-[132px] sm:p-3 ${
                          ehMesAtual
                            ? "bg-white"
                            : "bg-[#f9fafb] text-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${
                              ehHoje
                                ? "bg-[#08163F] text-white"
                                : ehMesAtual
                                ? "text-[#08163F]"
                                : "text-gray-300"
                            }`}
                          >
                            {dia.numero}
                          </span>

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
                              className="block w-full rounded-lg bg-[#F3F5FF] px-2 py-1.5 text-left text-[10px] font-black text-[#08163F] transition hover:bg-[#08163F] hover:text-white"
                            >
                              <span className="block truncate">
                                {limparHorario(evento.horario)} ·{" "}
                                {evento.mentoradoNome}
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
            </div>

            <aside className="min-w-0 space-y-4">
              <Card titulo="Próximo compromisso">
                {proximoEvento ? (
                  <div className="min-w-0 rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white sm:p-5">
                    <TipoBadge tipo={proximoEvento.tipo} />

                    <p className="mt-4 text-sm font-bold text-[#C9CED6]">
                      {proximoEvento.titulo || proximoEvento.tipo}
                    </p>

                    <p className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">
                      {formatarDataCurta(proximoEvento.data)}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#D9DEE7]">
                      Às {limparHorario(proximoEvento.horario)}
                    </p>

                    <p className="mt-3 break-words text-sm font-bold text-white">
                      {proximoEvento.mentoradoNome}
                    </p>

                    <button
                      type="button"
                      onClick={() => setEventoSelecionado(proximoEvento)}
                      className="mt-5 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-[#08163F] transition hover:brightness-95"
                    >
                      Ver detalhes →
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-semibold leading-relaxed text-gray-500">
                    Nenhum compromisso cadastrado ainda.
                  </p>
                )}
              </Card>

              <Card titulo="Lista rápida">
                <div className="space-y-3">
                  {carregando && (
                    <p className="text-sm font-semibold leading-relaxed text-gray-500">
                      Carregando compromissos...
                    </p>
                  )}

                  {!carregando && proximosEventos.length === 0 && (
                    <p className="text-sm font-semibold leading-relaxed text-gray-500">
                      Nenhum compromisso encontrado.
                    </p>
                  )}

                  {!carregando &&
                    proximosEventos.slice(0, 8).map((evento) => (
                      <button
                        key={evento.id}
                        type="button"
                        onClick={() => setEventoSelecionado(evento)}
                        className="w-full min-w-0 rounded-2xl bg-[#f9fafb] p-3 text-left transition hover:bg-white hover:shadow-md"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                          {formatarData(evento.data)} ·{" "}
                          {limparHorario(evento.horario)}
                        </p>

                        <p className="mt-1 break-words font-black text-[#08163F]">
                          {evento.mentoradoNome}
                        </p>

                        <p className="mt-1 break-words text-xs font-bold text-gray-500">
                          {evento.titulo || evento.tipo}
                        </p>
                      </button>
                    ))}
                </div>
              </Card>
            </aside>
          </section>
        </div>
      </section>

      {eventoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[min(96vw,42rem)] overflow-hidden rounded-[24px] bg-white shadow-2xl sm:rounded-[30px]">
            <div className="bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                    Detalhes do compromisso
                  </p>

                  <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">
                    {eventoSelecionado.titulo || eventoSelecionado.tipo}
                  </h2>

                  <p className="mt-2 break-words text-sm font-bold text-blue-100">
                    {eventoSelecionado.mentoradoNome}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEventoSelecionado(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <TipoBadge tipo={eventoSelecionado.tipo} />
                <StatusBadge status={eventoSelecionado.status} />
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
              <InfoBox
                label="Data"
                value={formatarData(eventoSelecionado.data)}
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

                <p className="mt-2 text-sm font-semibold leading-7 text-gray-600">
                  {eventoSelecionado.observacao ||
                    "Nenhuma observação adicionada."}
                </p>
              </div>

              <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => editarEvento(eventoSelecionado)}
                  className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                >
                  Editar compromisso
                </button>

                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => excluirEvento(eventoSelecionado.id)}
                  className="rounded-2xl bg-red-50 px-5 py-3 text-sm font-black text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Excluir compromisso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
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
  fimCalendario.setDate(ultimoDiaMes.getDate() + (6 - ultimoDiaMes.getDay()));

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

function formatarData(data: string) {
  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataCurta(data: string) {
  if (!data) return "—";

  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

function limparHorario(horario: string) {
  return horario?.slice(0, 5) || "";
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
      className={`min-w-0 overflow-hidden rounded-[20px] p-4 shadow-lg shadow-slate-200/70 sm:p-5 ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : alerta
          ? "bg-yellow-50 text-yellow-800"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`break-words text-xs font-black sm:text-sm ${
          destaque
            ? "text-[#C9CED6]"
            : alerta
            ? "text-yellow-600"
            : "text-gray-500"
        }`}
      >
        {titulo}
      </p>

      <p className="mt-3 break-words text-2xl font-black leading-tight sm:text-3xl">
        {valor}
      </p>
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
        <h3 className="break-words text-lg font-black text-[#050816] sm:text-xl">
          {titulo}
        </h3>
      </div>

      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
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

      <p className="mt-2 break-words text-base font-black text-[#08163F]">
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

function StatusBadge({ status }: { status: StatusAgenda }) {
  const classes: Record<StatusAgenda, string> = {
    Confirmada: "bg-green-100 text-green-700",
    Aguardando: "bg-yellow-100 text-yellow-700",
    Concluída: "bg-blue-100 text-blue-700",
    Cancelada: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}
    >
      {status}
    </span>
  );
}