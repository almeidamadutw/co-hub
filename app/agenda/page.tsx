"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import CalendarSyncButtons from "@/components/CalendarSyncButtons";
import { useLocalStorage } from "@/utils/useLocalStorage";
import { useMentorados } from "@/utils/useMentorados";

import {
  getUsuarioLogado,
  usuarioTemPermissao,
  User,
} from "@/utils/auth";

type EventoAgenda = {
  id: number;
  mentoradoId: string;
  mentoradoCodigo: string;
  mentorado: string;
  mentoradoEmail: string;
  data: string;
  horario: string;
  tipo: "Mentoria" | "Módulo" | "Reunião";
  status: "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";
  observacao: string;
};

const STORAGE_KEY_AGENDA = "ceoclub_agenda_v3";

const horarios = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

const eventoInicial: EventoAgenda = {
  id: 0,
  mentoradoId: "",
  mentoradoCodigo: "",
  mentorado: "",
  mentoradoEmail: "",
  data: "",
  horario: "",
  tipo: "Mentoria",
  status: "Confirmada",
  observacao: "",
};

const eventosIniciais: EventoAgenda[] = [];

export default function AgendaPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);

  const {
    mentorados,
    carregando: carregandoMentorados,
    erro: erroMentorados,
  } = useMentorados();

  const [modoVisualizacao, setModoVisualizacao] = useState<
    "lista" | "calendario" | "semanal"
  >("lista");

  const [diaSelecionado, setDiaSelecionado] = useState(() =>
    formatarDataISO(new Date())
  );

  const [busca, setBusca] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [erroFormulario, setErroFormulario] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [novoEvento, setNovoEvento] = useState<EventoAgenda>({
    ...eventoInicial,
    id: Date.now(),
  });

  const [eventos, setEventos, carregouEventos] =
    useLocalStorage<EventoAgenda[]>(STORAGE_KEY_AGENDA, eventosIniciais);

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

  function limparFormulario() {
    setNovoEvento({
      ...eventoInicial,
      id: Date.now(),
    });

    setEditandoId(null);
    setErroFormulario("");
  }

  function abrirNovoEvento() {
    limparFormulario();
    setMostrarFormulario((atual) => !atual);
  }

  function selecionarMentorado(mentoradoId: string) {
    const mentoradoSelecionado = mentorados.find(
      (mentorado) => mentorado.id === mentoradoId
    );

    setNovoEvento({
      ...novoEvento,
      mentoradoId: mentoradoSelecionado?.id ?? "",
      mentoradoCodigo: mentoradoSelecionado?.codigoInscricao ?? "",
      mentorado: mentoradoSelecionado?.nome ?? "",
      mentoradoEmail: mentoradoSelecionado?.email ?? "",
    });
  }

  function existeConflito(evento: EventoAgenda) {
    return eventos.some(
      (item: EventoAgenda) =>
        item.id !== evento.id &&
        item.data === evento.data &&
        item.horario === evento.horario
    );
  }

  function salvarEvento(e: React.FormEvent) {
    e.preventDefault();
    setErroFormulario("");

    if (
      !novoEvento.mentoradoId ||
      !novoEvento.data ||
      !novoEvento.horario ||
      !novoEvento.tipo
    ) {
      setErroFormulario("Preencha todos os campos obrigatórios.");
      return;
    }

    if (existeConflito(novoEvento)) {
      setErroFormulario("Já existe um compromisso nesse mesmo dia e horário.");
      return;
    }

    if (editandoId !== null) {
      setEventos((estadoAtual: EventoAgenda[]) =>
        estadoAtual.map((evento: EventoAgenda) =>
          evento.id === editandoId ? novoEvento : evento
        )
      );
    } else {
      setEventos((estadoAtual: EventoAgenda[]) => [
        { ...novoEvento, id: Date.now() },
        ...estadoAtual,
      ]);
    }

    limparFormulario();
    setMostrarFormulario(false);
  }

  function editarEvento(evento: EventoAgenda) {
    setNovoEvento(evento);
    setEditandoId(evento.id);
    setMostrarFormulario(true);
    setErroFormulario("");
  }

  function excluirEvento(id: number) {
    setEventos((estadoAtual: EventoAgenda[]) =>
      estadoAtual.filter((evento: EventoAgenda) => evento.id !== id)
    );
  }

  function imprimirAgenda() {
    window.print();
  }

  const eventosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();

    return eventos.filter((evento: EventoAgenda) => {
      return (
        evento.mentorado.toLowerCase().includes(termo) ||
        evento.mentoradoEmail.toLowerCase().includes(termo) ||
        evento.mentoradoCodigo.toLowerCase().includes(termo)
      );
    });
  }, [eventos, busca]);

  const eventosDoDia = useMemo(() => {
    return eventos
      .filter((evento: EventoAgenda) => evento.data === diaSelecionado)
      .sort((a: EventoAgenda, b: EventoAgenda) =>
        a.horario.localeCompare(b.horario)
      );
  }, [eventos, diaSelecionado]);

  const diasSemana = useMemo(() => {
    const base = new Date(`${diaSelecionado}T12:00:00`);
    const diaDaSemana = base.getDay();
    const diferencaParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;

    const segunda = new Date(base);
    segunda.setDate(base.getDate() + diferencaParaSegunda);

    return Array.from({ length: 7 }, (_, index) => {
      const dia = new Date(segunda);
      dia.setDate(segunda.getDate() + index);
      return formatarDataISO(dia);
    });
  }, [diaSelecionado]);

  const eventosSemana = useMemo(() => {
    return eventos.filter((evento: EventoAgenda) =>
      diasSemana.includes(evento.data)
    );
  }, [eventos, diasSemana]);

  const eventosParaCalendario = useMemo(() => {
    return eventos
      .filter(
        (evento) =>
          evento.data &&
          evento.horario &&
          evento.mentorado &&
          evento.tipo
      )
      .map((evento) => {
        const inicio = new Date(`${evento.data}T${evento.horario}:00`);
        const fim = new Date(inicio.getTime() + 60 * 60 * 1000);

        return {
          id: String(evento.id),
          titulo: `${evento.tipo} com ${evento.mentorado}`,
          descricao: evento.observacao || "",
          local: "",
          inicio,
          fim,
        };
      });
  }, [eventos]);

  if (!usuario || !carregouEventos) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#0B1D59]">
        Carregando agenda...
      </main>
    );
  }

  const totalEventos = eventos.length;

  const confirmados = eventos.filter(
    (evento: EventoAgenda) => evento.status === "Confirmada"
  ).length;

  const aguardando = eventos.filter(
    (evento: EventoAgenda) => evento.status === "Aguardando"
  ).length;

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#0B1D59]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative flex-1 overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(191,195,201,0.18),transparent)]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(18,49,124,0.08),transparent)]" />

        <div className="relative z-10">
          <div className="print-title hidden">
            <h1 className="text-2xl font-bold">Agenda</h1>

            <p className="mt-1 text-sm text-slate-600">
              Data selecionada: {formatarData(diaSelecionado)}
            </p>
          </div>

          <div className="mb-8 rounded-[28px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white shadow-[0_24px_60px_rgba(8,22,63,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-[#C9CED6]">
                  Agenda
                </p>

                <h1 className="text-3xl font-bold">
                  Mentorias, módulos e reuniões
                </h1>

                <p className="mt-2 text-[#D9DEE7]">
                  Organize os compromissos cadastrados e exporte para
                  calendários externos.
                </p>
              </div>

              <div className="no-print flex flex-wrap gap-3">
                <button
                  onClick={() => setModoVisualizacao("lista")}
                  className={`rounded-2xl px-4 py-3 font-bold transition ${
                    modoVisualizacao === "lista"
                      ? "bg-white text-[#08163F]"
                      : "border border-white/20 bg-white/10 text-white"
                  }`}
                >
                  Lista
                </button>

                <button
                  onClick={() => setModoVisualizacao("calendario")}
                  className={`rounded-2xl px-4 py-3 font-bold transition ${
                    modoVisualizacao === "calendario"
                      ? "bg-white text-[#08163F]"
                      : "border border-white/20 bg-white/10 text-white"
                  }`}
                >
                  Calendário
                </button>

                <button
                  onClick={() => setModoVisualizacao("semanal")}
                  className={`rounded-2xl px-4 py-3 font-bold transition ${
                    modoVisualizacao === "semanal"
                      ? "bg-white text-[#08163F]"
                      : "border border-white/20 bg-white/10 text-white"
                  }`}
                >
                  Semanal
                </button>

                <button
                  onClick={imprimirAgenda}
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/15"
                >
                  Imprimir
                </button>

                <button
                  onClick={abrirNovoEvento}
                  className="rounded-2xl px-5 py-3 font-bold text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105"
                  style={{
                    background:
                      "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
                  }}
                >
                  {mostrarFormulario ? "Fechar formulário" : "Novo compromisso"}
                </button>
              </div>
            </div>
          </div>

          <div className="no-print mb-8">
            <CalendarSyncButtons eventos={eventosParaCalendario} />
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <ResumoCard
              titulo="Total de compromissos"
              valor={String(totalEventos)}
            />

            <ResumoCard titulo="Confirmados" valor={String(confirmados)} />

            <ResumoCard titulo="Aguardando" valor={String(aguardando)} />
          </div>

          <div className="no-print mb-6 rounded-[24px] border border-white/50 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou inscrição"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59] outline-none placeholder:text-slate-400 focus:border-[#12317C]"
            />
          </div>

          {mostrarFormulario && (
            <form
              onSubmit={salvarEvento}
              className="no-print mb-6 rounded-[28px] border border-white/50 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm"
            >
              <h2 className="mb-4 text-xl font-semibold text-[#08163F]">
                {editandoId !== null
                  ? "Editar compromisso"
                  : "Cadastrar novo compromisso"}
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <select
                  value={novoEvento.mentoradoId}
                  onChange={(e) => selecionarMentorado(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59]"
                >
                  <option value="">
                    {carregandoMentorados
                      ? "Carregando mentorados..."
                      : "Selecione o mentorado"}
                  </option>

                  {mentorados.map((mentorado) => (
                    <option key={mentorado.id} value={mentorado.id}>
                      {mentorado.codigoInscricao} · {mentorado.nome} ·{" "}
                      {mentorado.email}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={novoEvento.data}
                  onChange={(e) =>
                    setNovoEvento({ ...novoEvento, data: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59]"
                />

                <select
                  value={novoEvento.horario}
                  onChange={(e) =>
                    setNovoEvento({ ...novoEvento, horario: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59]"
                >
                  <option value="">Selecione o horário</option>

                  {horarios.map((hora: string) => (
                    <option key={hora} value={hora}>
                      {hora}
                    </option>
                  ))}
                </select>

                <select
                  value={novoEvento.tipo}
                  onChange={(e) =>
                    setNovoEvento({
                      ...novoEvento,
                      tipo: e.target.value as EventoAgenda["tipo"],
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59]"
                >
                  <option>Mentoria</option>
                  <option>Módulo</option>
                  <option>Reunião</option>
                </select>

                <select
                  value={novoEvento.status}
                  onChange={(e) =>
                    setNovoEvento({
                      ...novoEvento,
                      status: e.target.value as EventoAgenda["status"],
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59]"
                >
                  <option>Confirmada</option>
                  <option>Aguardando</option>
                  <option>Concluída</option>
                  <option>Cancelada</option>
                </select>

                <textarea
                  placeholder="Observação"
                  value={novoEvento.observacao}
                  onChange={(e) =>
                    setNovoEvento({
                      ...novoEvento,
                      observacao: e.target.value,
                    })
                  }
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59] md:col-span-2"
                />
              </div>

              {novoEvento.mentoradoId && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                  Inscrição: {novoEvento.mentoradoCodigo} ·{" "}
                  {novoEvento.mentorado} · {novoEvento.mentoradoEmail}
                </div>
              )}

              {erroMentorados && (
                <p className="mt-4 text-sm font-bold text-red-600">
                  {erroMentorados}
                </p>
              )}

              {erroFormulario && (
                <p className="mt-4 text-sm font-medium text-red-600">
                  {erroFormulario}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-2xl bg-[#08163F] px-5 py-3 font-bold text-white transition hover:brightness-110"
                >
                  {editandoId !== null
                    ? "Salvar alterações"
                    : "Salvar compromisso"}
                </button>

                <button
                  type="button"
                  onClick={limparFormulario}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-[#0B1D59] transition hover:bg-slate-50"
                >
                  Limpar
                </button>
              </div>
            </form>
          )}

          {modoVisualizacao === "lista" && (
            <div className="overflow-hidden rounded-[28px] border border-white/50 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <div className="grid grid-cols-6 bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 font-semibold text-white">
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
                eventosFiltrados.map((evento: EventoAgenda) => (
                  <div
                    key={evento.id}
                    className="grid grid-cols-6 items-center border-t border-slate-200 p-4 text-sm"
                  >
                    <span>
                      <strong className="block">{evento.mentorado}</strong>
                      <small className="text-xs text-slate-400">
                        {evento.mentoradoCodigo} · {evento.mentoradoEmail}
                      </small>
                    </span>

                    <span>{formatarData(evento.data)}</span>
                    <span>{evento.horario}</span>
                    <span>{evento.tipo}</span>

                    <span>
                      <StatusBadge status={evento.status} />
                    </span>

                    <div className="flex gap-4">
                      <button
                        onClick={() => editarEvento(evento)}
                        className="font-semibold text-[#0B1D59] hover:underline"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => excluirEvento(evento.id)}
                        className="font-semibold text-red-600 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {modoVisualizacao === "calendario" && (
            <div className="rounded-[28px] border border-white/50 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#08163F]">
                    Visão do dia
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Visualize os compromissos do dia por horário.
                  </p>
                </div>

                <input
                  type="date"
                  value={diaSelecionado}
                  onChange={(e) => setDiaSelecionado(e.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[#0B1D59]"
                />
              </div>

              <div className="space-y-3">
                {horarios.map((hora: string) => {
                  const eventoNoHorario = eventosDoDia.find(
                    (evento: EventoAgenda) => evento.horario === hora
                  );

                  return (
                    <div
                      key={hora}
                      className="grid grid-cols-[120px_1fr] gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="font-semibold text-[#08163F]">{hora}</div>

                      <div>
                        {eventoNoHorario ? (
                          <div
                            className={`rounded-2xl border-l-4 p-4 ${estiloCardCalendario(
                              eventoNoHorario.status
                            )}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-bold text-[#08163F]">
                                  {eventoNoHorario.mentorado}
                                </h3>

                                <p className="mt-1 text-sm text-slate-600">
                                  {eventoNoHorario.mentoradoCodigo} ·{" "}
                                  {eventoNoHorario.tipo}
                                </p>

                                {eventoNoHorario.observacao && (
                                  <p className="mt-2 text-sm text-slate-500">
                                    {eventoNoHorario.observacao}
                                  </p>
                                )}
                              </div>

                              <StatusBadge status={eventoNoHorario.status} />
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400">
                            Horário livre
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {modoVisualizacao === "semanal" && (
            <div className="rounded-[28px] border border-white/50 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#08163F]">
                    Visão semanal
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Veja a semana inteira de forma rápida.
                  </p>
                </div>

                <input
                  type="date"
                  value={diaSelecionado}
                  onChange={(e) => setDiaSelecionado(e.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[#0B1D59]"
                />
              </div>

              <div className="overflow-x-auto rounded-[22px] border border-slate-200">
                <div
                  className="grid min-w-[1200px] bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C] font-semibold text-white"
                  style={{
                    gridTemplateColumns: `100px repeat(${diasSemana.length}, minmax(160px, 1fr))`,
                  }}
                >
                  <div className="border-r border-white/10 p-4">Horário</div>

                  {diasSemana.map((dia: string) => (
                    <div key={dia} className="border-l border-white/10 p-4">
                      {formatarDiaSemana(dia)}

                      <div className="mt-1 text-xs font-normal">
                        {formatarData(dia)}
                      </div>
                    </div>
                  ))}
                </div>

                {horarios.map((hora: string) => (
                  <div
                    key={hora}
                    className="grid min-w-[1200px] border-t border-slate-200"
                    style={{
                      gridTemplateColumns: `100px repeat(${diasSemana.length}, minmax(160px, 1fr))`,
                    }}
                  >
                    <div className="border-r border-slate-200 bg-slate-50 p-4 text-sm font-medium">
                      {hora}
                    </div>

                    {diasSemana.map((dia: string) => {
                      const eventosNoSlot = eventosSemana.filter(
                        (evento: EventoAgenda) =>
                          evento.data === dia && evento.horario === hora
                      );

                      return (
                        <div
                          key={`${dia}-${hora}`}
                          className="min-h-[120px] space-y-2 border-l border-slate-200 p-2"
                        >
                          {eventosNoSlot.length > 0 ? (
                            eventosNoSlot.map((evento: EventoAgenda) => (
                              <div
                                key={evento.id}
                                className={`rounded-xl border-l-4 p-3 ${estiloCardCalendario(
                                  evento.status
                                )}`}
                              >
                                <h3 className="text-xs font-bold">
                                  {evento.mentorado}
                                </h3>

                                <p className="mt-1 text-xs text-slate-600">
                                  {evento.mentoradoCodigo} · {evento.tipo}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="flex h-full items-center text-xs text-slate-400">
                              Livre
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          <style jsx global>{`
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
    </main>
  );
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-[24px] border border-white/50 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-[#08163F]">{titulo}</h2>
      <p className="mt-3 text-2xl font-bold text-[#12317C]">{valor}</p>
    </div>
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
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
        estilos[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function formatarData(data: string) {
  if (!data) return "";

  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

function formatarDataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarDiaSemana(data: string) {
  const dias = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];

  const dia = new Date(`${data}T12:00:00`).getDay();

  return dias[dia];
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