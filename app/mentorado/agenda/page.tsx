"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MentoradoLoading from "@/components/MentoradoLoading";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import { sincronizarUsuarioComSessao, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";

type TipoAgenda = "Mentoria" | "Módulo" | "Reunião" | "Presencial";
type StatusAgenda = "Confirmada" | "Aguardando" | "Concluída" | "Cancelada";

type EventoAgenda = {
  id: string;
  titulo: string | null;
  tipo: TipoAgenda;
  data: string;
  horario: string;
  status: StatusAgenda;
  observacao: string | null;
};

const tipos: Array<"Todos" | TipoAgenda> = [
  "Todos",
  "Mentoria",
  "Módulo",
  "Reunião",
  "Presencial",
];

const statusDisponiveis: Array<"Todos" | StatusAgenda> = [
  "Todos",
  "Confirmada",
  "Aguardando",
  "Concluída",
  "Cancelada",
];

export default function AgendaMentoradoPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<"Todos" | TipoAgenda>("Todos");
  const [statusFiltro, setStatusFiltro] =
    useState<"Todos" | StatusAgenda>("Todos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarEventos = useCallback(async (mentoradoId: string) => {
    try {
      setCarregando(true);
      setErro("");

      const { data, error } = await supabase
        .from("agenda_eventos")
        .select("id, titulo, tipo, data, horario, status, observacao")
        .eq("mentorado_id", mentoradoId)
        .order("data", { ascending: true })
        .order("horario", { ascending: true });

      if (error) throw new Error(error.message);

      setEventos((data ?? []) as EventoAgenda[]);
    } catch (error) {
      setEventos([]);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar sua agenda."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let telaAtiva = true;

    async function iniciarTela() {
      const user = await sincronizarUsuarioComSessao();

      if (!telaAtiva) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      if (user.role !== "mentorado") {
        const destino =
          user.role === "mentor"
            ? "/mentor/agenda"
            : user.role === "suporte"
              ? "/suporte"
              : "/mentor/financeiro";

        router.replace(destino);
        return;
      }

      setUsuario(user);
      await carregarEventos(user.id);
    }

    void iniciarTela();

    return () => {
      telaAtiva = false;
    };
  }, [carregarEventos, router]);

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((evento) => {
      const correspondeAoTipo =
        tipoFiltro === "Todos" || evento.tipo === tipoFiltro;
      const correspondeAoStatus =
        statusFiltro === "Todos" || evento.status === statusFiltro;

      return correspondeAoTipo && correspondeAoStatus;
    });
  }, [eventos, statusFiltro, tipoFiltro]);

  const resumo = useMemo(
    () => ({
      total: eventos.length,
      confirmadas: eventos.filter((evento) => evento.status === "Confirmada")
        .length,
      aguardando: eventos.filter((evento) => evento.status === "Aguardando")
        .length,
      concluidas: eventos.filter((evento) => evento.status === "Concluída")
        .length,
    }),
    [eventos]
  );

  if (!usuario) {
    return <MentoradoLoading mensagem="Carregando sua agenda..." />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f6f7fb] text-[#08163F]">
      <MentoradoSidebar nome={usuario.nome} />

      <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:ml-[220px] lg:px-7 lg:py-7 xl:ml-[230px] xl:px-9">
        <div className="mx-auto w-full max-w-[1320px]">
          <header className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white shadow-[0_18px_45px_rgba(8,22,63,0.16)] sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9CED6] sm:text-xs">
                  Sua jornada CEO Club
                </p>
                <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                  Minha agenda
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#D9DEE7]">
                  Acompanhe mentorias, reuniões e compromissos programados pela
                  equipe.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void carregarEventos(usuario.id)}
                disabled={carregando}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
              >
                {carregando ? "Atualizando..." : "Atualizar agenda"}
              </button>
            </div>
          </header>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResumoCard label="Compromissos" valor={resumo.total} />
            <ResumoCard label="Confirmados" valor={resumo.confirmadas} />
            <ResumoCard label="Aguardando" valor={resumo.aguardando} />
            <ResumoCard label="Concluídos" valor={resumo.concluidas} />
          </section>

          <section className="mt-5 rounded-[26px] border border-white/70 bg-white/90 p-4 shadow-xl shadow-slate-200/60 sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black">Compromissos</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Filtre por tipo ou situação para localizar um evento.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={tipoFiltro}
                  onChange={(event) =>
                    setTipoFiltro(event.target.value as "Todos" | TipoAgenda)
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
                >
                  {tipos.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo === "Todos" ? "Todos os tipos" : tipo}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFiltro}
                  onChange={(event) =>
                    setStatusFiltro(
                      event.target.value as "Todos" | StatusAgenda
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
                >
                  {statusDisponiveis.map((status) => (
                    <option key={status} value={status}>
                      {status === "Todos" ? "Todos os status" : status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {erro && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {erro}
              </div>
            )}

            {carregando ? (
              <div className="mt-5 rounded-[22px] bg-slate-50 px-5 py-12 text-center text-sm font-bold text-slate-500">
                Carregando compromissos...
              </div>
            ) : eventosFiltrados.length === 0 ? (
              <div className="mt-5 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
                <p className="font-black">Nenhum compromisso encontrado.</p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Quando a equipe agendar um evento, ele aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {eventosFiltrados.map((evento) => (
                  <article
                    key={evento.id}
                    className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                          {evento.tipo}
                        </p>
                        <h3 className="mt-2 break-words text-base font-black sm:text-lg">
                          {evento.titulo || evento.tipo}
                        </h3>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-[11px] font-black ${corStatus(evento.status)}`}
                      >
                        {evento.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 rounded-2xl bg-[#f6f7fb] p-3 text-sm font-bold text-slate-600 sm:grid-cols-2">
                      <p>{formatarData(evento.data)}</p>
                      <p className="sm:text-right">
                        {limparHorario(evento.horario)}
                      </p>
                    </div>

                    {evento.observacao && (
                      <p className="mt-4 break-words text-sm font-medium leading-6 text-slate-500">
                        {evento.observacao}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function ResumoCard({ label, valor }: { label: string; valor: number }) {
  return (
    <article className="rounded-[22px] border border-white/70 bg-white/90 p-4 shadow-lg shadow-slate-200/50">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[#08163F]">{valor}</p>
    </article>
  );
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${data}T12:00:00`));
}

function limparHorario(horario: string) {
  return horario.slice(0, 5);
}

function corStatus(status: StatusAgenda) {
  if (status === "Confirmada") return "bg-emerald-100 text-emerald-700";
  if (status === "Aguardando") return "bg-amber-100 text-amber-700";
  if (status === "Concluída") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}
