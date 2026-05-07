"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";

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
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando agenda...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <aside className="hidden min-h-screen w-[310px] flex-col border-r border-black/5 bg-white p-5 shadow-[10px_0_40px_rgba(15,23,42,0.04)] lg:flex">
        <div className="mb-8 flex items-center gap-3 rounded-[24px] bg-[#f8fafc] p-3">
          <div className="h-14 w-14 overflow-hidden rounded-2xl bg-[#08163F] p-1">
            <img
              src="/images/logo.jpeg"
              alt="CEO Club"
              className="h-full w-full rounded-xl object-cover"
            />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">
              Curso
            </p>
            <h1 className="text-lg font-black text-[#08163F]">CEO Club</h1>
          </div>
        </div>

        <nav className="space-y-2">
          <MenuItem
            label="Início"
            onClick={() => router.push("/mentorado/dashboard")}
          />
          <MenuItem
            ativo
            label="Minha agenda"
            onClick={() => router.push("/mentorado/agenda")}
          />
          <MenuItem
            label="Meus módulos"
            onClick={() => router.push("/mentorado/modulos")}
          />
          <MenuItem
            label="Praticar"
            onClick={() => router.push("/mentorado/praticar")}
          />
          <MenuItem
            label="Meu progresso"
            onClick={() => router.push("/mentorado/progresso")}
          />
          <MenuItem
            label="Financeiro"
            onClick={() => router.push("/mentorado/financeiro")}
          />
          <MenuItem
            label="Minha conta"
            onClick={() => router.push("/mentorado/conta")}
          />
        </nav>

        <div className="mt-auto rounded-[24px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9CED6]">
            Mentorado
          </p>

          <p className="mt-2 font-black">{usuario.nome}</p>

          {perfil?.codigo_inscricao && (
            <p className="mt-1 text-xs font-bold text-blue-100">
              Inscrição {perfil.codigo_inscricao}
            </p>
          )}

          <button
            onClick={sair}
            className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#08163F] transition hover:brightness-95"
          >
            Sair
          </button>
        </div>
      </aside>

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-6 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/mentorado/dashboard")}
              className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
            >
              ← Voltar
            </button>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
                Área do mentorado
              </p>
              <h1 className="text-xl font-black">Minha agenda</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/mentorado/suporte")}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Suporte
            </button>

            <button
              onClick={sair}
              className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-6 py-10 md:px-8">
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                  Compromissos da jornada
                </p>

                <h2 className="mt-3 text-4xl font-black">
                  Sua agenda CEO Club
                </h2>

              <p className="mt-3 max-w-2xl text-[#D9DEE7]">
  Veja seus compromissos em visão mensal, com detalhes ao clicar em cada evento.
</p>
              </div>

              <div className="rounded-[26px] bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-sm font-bold text-[#C9CED6]">
                  Próximo compromisso
                </p>

                <p className="mt-2 text-3xl font-black">
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

          <section className="mb-8 grid gap-5 xl:grid-cols-4">
            <KPI titulo="Eventos" valor={resumo.total} destaque />
            <KPI titulo="Mentorias" valor={resumo.mentorias} />
            <KPI titulo="Aguardando" valor={resumo.aguardando} />
            <KPI titulo="Confirmados" valor={resumo.confirmados} />
          </section>

          <section className="mb-6 flex flex-wrap gap-3">
            {["Todos", "Mentoria", "Módulo", "Reunião"].map((item) => (
              <button
                key={item}
                onClick={() => setFiltro(item as "Todos" | TipoAgenda)}
                className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
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

          <section className="grid gap-6 xl:grid-cols-[1fr_400px]">
            <div className="overflow-hidden rounded-[30px] bg-white shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">
                    Calendário mensal
                  </p>

                  <h3 className="mt-1 text-2xl font-black text-[#050816]">
                    {formatarMesAno(mesAtual)}
                  </h3>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => mudarMes("anterior")}
                    className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                  >
                    ← Mês anterior
                  </button>

                  <button
                    onClick={() => setMesAtual(new Date())}
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

              <div className="grid grid-cols-7 border-b border-gray-100 bg-[#f9fafb] text-center text-xs font-black uppercase tracking-[0.16em] text-gray-400">
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
                  const eventosDia = eventosDoDia(dia.dataISO);
                  const ehMesAtual = dia.ehMesAtual;
                  const ehHoje = dia.dataISO === formatarDataISO(new Date());

                  return (
                    <div
                      key={dia.dataISO}
                      className={`min-h-[145px] border-b border-r border-gray-100 p-3 ${
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

                      <div className="mt-3 space-y-2">
                        {eventosDia.slice(0, 3).map((evento) => (
                          <button
                            key={evento.id}
                            type="button"
                            onClick={() => setEventoSelecionado(evento)}
                            className="block w-full rounded-xl bg-[#F3F5FF] px-3 py-2 text-left text-[11px] font-black text-[#08163F] transition hover:bg-[#08163F] hover:text-white"
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

            <aside className="space-y-6">
              <Card titulo="Próximo compromisso">
                {proximoEvento ? (
                  <div className="rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-6 text-white">
                    <TipoBadge tipo={proximoEvento.tipo} />

                    <p className="mt-4 text-sm font-bold text-[#C9CED6]">
                      {proximoEvento.titulo || proximoEvento.tipo}
                    </p>

                    <p className="mt-3 text-4xl font-black">
                      {formatarDataCurta(proximoEvento.data)}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#D9DEE7]">
                      Às {limparHorario(proximoEvento.horario)}
                    </p>

                    <button
                      onClick={() => setEventoSelecionado(proximoEvento)}
                      className="mt-6 rounded-2xl bg-white px-5 py-3 font-black text-[#08163F] transition hover:brightness-95"
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
                        className="w-full rounded-2xl bg-[#f9fafb] p-4 text-left transition hover:bg-white hover:shadow-md"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                          {formatarData(evento.data)} ·{" "}
                          {limparHorario(evento.horario)}
                        </p>

                        <p className="mt-1 font-black text-[#08163F]">
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
          <div className="w-full max-w-2xl overflow-hidden rounded-[34px] bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                    Detalhes do compromisso
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
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

            <div className="grid gap-4 p-7 md:grid-cols-2">
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
                className="rounded-2xl bg-[#08163F] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:brightness-110 md:col-span-2"
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

function MenuItem({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
        ativo
          ? "bg-[#EEF2FF] text-[#08163F]"
          : "text-gray-500 hover:bg-[#f8fafc] hover:text-[#08163F]"
      }`}
    >
      <span>{label}</span>
      <span>→</span>
    </button>
  );
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
      className={`rounded-[26px] p-6 shadow-lg ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          destaque ? "text-[#C9CED6]" : "text-gray-500"
        }`}
      >
        {titulo}
      </p>

      <p className="mt-4 text-3xl font-black">{valor}</p>
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
    <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-6">
        <h3 className="text-2xl font-black text-[#050816]">{titulo}</h3>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-[#08163F]">{value}</p>
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