"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import MentoradoLoading from "@/components/MentoradoLoading";

type TipoAgenda = "Mentoria" | "Módulo" | "Reunião";
type StatusAgenda = "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";

type PerfilMentorado = {
  id: string;
  nome: string;
  email: string;
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
  created_at: string;
};

export default function AgendaMentoradoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilMentorado | null>(null);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [filtro, setFiltro] = useState<"Todos" | TipoAgenda>("Todos");
  const [mesAtual, setMesAtual] = useState(() => new Date());
  const [eventoSelecionado, setEventoSelecionado] =
    useState<EventoAgenda | null>(null);

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentor") {
      router.replace("/dashboard");
      return;
    }

    if (user.role !== "mentorado") {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);
  }, [router]);

  useEffect(() => {
  if (!usuario) return;

  async function carregarAgenda() {
    setCarregando(true);
    setErro("");

    const usuarioId = (usuario as User & { id?: string })?.id;

    if (!usuarioId) {
      setErro("Não foi possível identificar o usuário logado.");
      setEventos([]);
      setCarregando(false);
      return;
    }

    const { data: perfilData, error: perfilError } = await supabase
      .from("profiles")
      .select("id, nome, email, codigo_inscricao")
      .eq("id", usuarioId)
      .eq("role", "mentorado")
      .single();

    if (perfilError || !perfilData) {
      setErro(
        perfilError?.message ||
          "Não foi possível encontrar o perfil do mentorado."
      );
      setEventos([]);
      setCarregando(false);
      return;
    }

    setPerfil(perfilData as PerfilMentorado);

    const { data: eventosData, error: eventosError } = await supabase
      .from("agenda_eventos")
      .select(
        "id, mentorado_id, titulo, data, horario, tipo, status, observacao, created_at"
      )
      .eq("mentorado_id", perfilData.id)
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (eventosError) {
      setErro(eventosError.message);
      setEventos([]);
      setCarregando(false);
      return;
    }

    setEventos((eventosData ?? []) as EventoAgenda[]);
    setCarregando(false);
  }

  carregarAgenda();
}, [usuario]);

  const eventosFiltrados = useMemo(() => {
    if (filtro === "Todos") return eventos;

    return eventos.filter((evento) => evento.tipo === filtro);
  }, [filtro, eventos]);

  const resumo = useMemo(() => {
    return {
      total: eventos.length,
      mentorias: eventos.filter((evento) => evento.tipo === "Mentoria").length,
      aguardando: eventos.filter((evento) => evento.status === "Aguardando")
        .length,
      confirmados: eventos.filter((evento) => evento.status === "Confirmada")
        .length,
    };
  }, [eventos]);

  const proximoEvento = useMemo(() => {
    const agora = new Date();

    return (
      eventos
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
  }, [eventos]);

  const diasDoMes = useMemo(() => {
    return montarDiasDoMes(mesAtual);
  }, [mesAtual]);

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

  function eventosDoDia(dataISO: string) {
    return eventosFiltrados
      .filter((evento) => evento.data === dataISO)
      .sort((a, b) =>
        limparHorario(a.horario).localeCompare(limparHorario(b.horario))
      );
  }

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return <MentoradoLoading mensagem="Carregando agenda..." />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <MentoradoSidebar nome={perfil?.nome || usuario.nome} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.push("/mentorado/dashboard")}
              className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
            >
              ← Voltar
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Área do mentorado
              </p>
              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">Minha agenda</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/mentorado/suporte")}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:text-sm"
            >
              Suporte
            </button>

            <button
              onClick={sair}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="relative min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px] lg:p-6">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                  Compromissos da jornada
                </p>

                <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                  Sua agenda CEO Club
                </h2>

              <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-[#D9DEE7]">
  Veja seus compromissos em visão mensal, com detalhes ao clicar em cada evento.
</p>
              </div>

              <div className="rounded-[20px] bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-bold text-[#C9CED6]">
                  Próximo compromisso
                </p>

                <p className="mt-2 break-words text-2xl font-black leading-tight">
                  {proximoEvento ? formatarDataCurta(proximoEvento.data) : "—"}
                </p>

                {proximoEvento && (
                  <p className="mt-1 text-sm font-bold text-blue-100">
                    {limparHorario(proximoEvento.horario)}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI titulo="Eventos" valor={resumo.total} destaque />
            <KPI titulo="Mentorias" valor={resumo.mentorias} />
            <KPI titulo="Aguardando" valor={resumo.aguardando} />
            <KPI titulo="Confirmados" valor={resumo.confirmados} />
          </section>

          <section className="mb-4 flex flex-wrap gap-2">
            {["Todos", "Mentoria", "Módulo", "Reunião"].map((item) => (
              <button
                key={item}
                onClick={() => setFiltro(item as "Todos" | TipoAgenda)}
                className={`rounded-xl px-4 py-2.5 text-xs font-black transition sm:text-sm ${
                  filtro === item
                    ? "bg-[#08163F] text-white shadow-lg"
                    : "bg-white text-gray-500 hover:text-[#08163F] hover:shadow-md"
                }`}
              >
                {item}
              </button>
            ))}
          </section>

          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

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
                    onClick={() => mudarMes("anterior")}
                    className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
                  >
                    ← Mês anterior
                  </button>

                  <button
                    onClick={() => setMesAtual(new Date())}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#08163F] shadow-sm ring-1 ring-slate-100 transition hover:shadow-md sm:text-sm"
                  >
                    Hoje
                  </button>

                  <button
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
                  const ehHoje = dia.dataISO === formatarDataISO(new Date());

                  return (
                    <div
                      key={dia.dataISO}
                      className={`min-h-[105px] border-b border-r border-gray-100 p-2 sm:min-h-[120px] sm:p-3 ${
                        ehMesAtual ? "bg-white" : "bg-[#f9fafb] text-gray-300"
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
                              {evento.titulo || evento.tipo}
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

                    <button
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
                  {eventosFiltrados.length === 0 ? (
                    <p className="text-sm font-semibold leading-relaxed text-gray-500">
                      Nenhum compromisso encontrado.
                    </p>
                  ) : (
                    eventosFiltrados.slice(0, 6).map((evento) => (
                      <button
                        key={evento.id}
                        onClick={() => setEventoSelecionado(evento)}
                        className="w-full min-w-0 rounded-2xl bg-[#f9fafb] p-3 text-left transition hover:bg-white hover:shadow-md"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                          {formatarData(evento.data)} ·{" "}
                          {limparHorario(evento.horario)}
                        </p>

                        <p className="mt-1 break-words font-black text-[#08163F]">
                          {evento.titulo || evento.tipo}
                        </p>
                      </button>
                    ))
                  )}
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
                </div>

                <button
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
              <InfoBox label="Data" value={formatarData(eventoSelecionado.data)} />
              <InfoBox
                label="Horário"
                value={limparHorario(eventoSelecionado.horario)}
              />
              <InfoBox label="Tipo" value={eventoSelecionado.tipo} />
              <InfoBox label="Status" value={eventoSelecionado.status} />

              <div className="rounded-2xl bg-[#f9fafb] p-5 md:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                  Observação
                </p>

                <p className="mt-2 text-sm font-semibold leading-7 text-gray-600">
                  {eventoSelecionado.observacao ||
                    "Nenhuma observação adicionada pela mentora."}
                </p>
              </div>

              <button
                onClick={() => router.push("/mentorado/suporte")}
                className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 md:col-span-2"
              >
                Falar com suporte sobre este compromisso →
              </button>
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
}: {
  titulo: string;
  valor: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-[20px] p-4 shadow-lg shadow-slate-200/70 sm:p-5 ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`break-words text-xs font-black sm:text-sm ${
          destaque ? "text-[#C9CED6]" : "text-gray-500"
        }`}
      >
        {titulo}
      </p>

      <p className="mt-3 break-words text-2xl font-black leading-tight sm:text-3xl">{valor}</p>
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
        <h3 className="break-words text-lg font-black text-[#050816] sm:text-xl">{titulo}</h3>
      </div>

      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>

      <p className="mt-2 break-words text-base font-black text-[#08163F]">{value}</p>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: TipoAgenda }) {
  const classes: Record<TipoAgenda, string> = {
    Mentoria: "bg-blue-100 text-blue-700",
    Módulo: "bg-purple-100 text-purple-700",
    Reunião: "bg-yellow-100 text-yellow-700",
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
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}>
      {status}
    </span>
  );
}