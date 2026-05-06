"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { useMentoradosSupabase } from "@/utils/useMentoradosSupabase";

export default function MentoradosPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  const { mentorados, carregando, erro, ativos, pendentes, total } =
    useMentoradosSupabase();

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentorado") {
      router.replace("/mentorado/dashboard");
      return;
    }

    if (user.role !== "mentor") {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);
  }, [router]);

  const mentoradosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return mentorados.filter((mentorado) => {
      const status = mentorado.status ?? "Ativo";

      const bateBusca =
        mentorado.nome?.toLowerCase().includes(termo) ||
        mentorado.email?.toLowerCase().includes(termo) ||
        mentorado.telefone?.toLowerCase().includes(termo) ||
        mentorado.codigo_inscricao?.toLowerCase().includes(termo);

      const bateStatus =
        filtroStatus === "Todos" || status === filtroStatus;

      return bateBusca && bateStatus;
    });
  }, [mentorados, busca, filtroStatus]);

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando mentorados...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-8 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] to-[#12317C] text-sm font-black text-white shadow-lg">
              CC
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
                Área da mentora
              </p>
              <h1 className="text-xl font-black">Mentorados</h1>
            </div>
          </div>

          <button
            onClick={() => router.push("/usuarios")}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
          >
            + Cadastrar mentorado
          </button>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-8 py-10">
          <section className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-2xl shadow-[#07122F]/20 xl:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-28 left-14 h-60 w-60 rounded-full bg-blue-400/20 blur-3xl" />
            <div className="absolute right-1/3 top-1/2 h-36 w-36 rounded-full bg-slate-300/10 blur-2xl" />

            <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-200">
                  Gestão da jornada
                </p>

                <h2 className="mt-4 max-w-4xl text-3xl font-black leading-tight md:text-4xl xl:text-[3.05rem]">
                  Acompanhe mentorados com dados reais do CEO Club.
                </h2>

                <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100 md:text-lg">
                  Visualize cadastros, códigos de inscrição, status e acessos
                  dos mentorados salvos diretamente no Supabase.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Tag>dados reais</Tag>
                  <Tag>código de inscrição</Tag>
                  <Tag>status</Tag>
                  <Tag>acompanhamento</Tag>
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-white/10 bg-white/10 p-6 backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-200">
                  Resumo da área
                </p>

                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl bg-white/10 px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                      Mentorados
                    </p>

                    <strong className="mt-2 block text-3xl font-black">
                      {total}
                    </strong>

                    <p className="mt-1 text-sm text-blue-100">
                      {total === 1
                        ? "1 cadastro encontrado."
                        : `${total} cadastros encontrados.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <MiniMetric titulo="Ativos" valor={String(ativos)} />
                    <MiniMetric titulo="Pendentes" valor={String(pendentes)} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <KPI
              titulo="Mentorados cadastrados"
              valor={String(total)}
              texto="Dados buscados no Supabase."
              destaque
            />

            <KPI
              titulo="Ativos"
              valor={String(ativos)}
              texto="Mentorados com status ativo."
            />

            <KPI
              titulo="Pendentes"
              valor={String(pendentes)}
              texto="Cadastros aguardando atenção."
            />

            <KPI
              titulo="Em atenção"
              valor="0"
              texto="Alertas serão calculados pelo progresso."
              alerta
            />
          </section>

          <section className="mt-8 rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Lista de mentorados
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  Gestão individual da jornada
                </h3>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                  Mentorados cadastrados no sistema aparecem aqui com código de
                  inscrição, status e dados de contato.
                </p>
              </div>

              <button
                onClick={() => router.push("/usuarios")}
                className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
              >
                + Cadastrar mentorado
              </button>
            </div>

            {erro && (
              <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                {erro}
              </div>
            )}

            <div className="mt-6 grid gap-4 rounded-[1.7rem] border border-slate-100 bg-[#f9fafb] p-4 md:grid-cols-[1.6fr_0.8fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Busca
                </p>

                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome, e-mail, telefone ou código"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C]"
                />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Status
                </p>

                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#12317C]"
                >
                  <option>Todos</option>
                  <option>Ativo</option>
                  <option>Pendente</option>
                  <option>Inativo</option>
                </select>
              </div>
            </div>

            <div className="mt-7 overflow-hidden rounded-[1.8rem] border border-slate-100 bg-white">
              <div className="grid grid-cols-[1.2fr_0.7fr_1fr_0.7fr_0.6fr] bg-slate-50 px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                <span>Mentorado</span>
                <span>Código</span>
                <span>Contato</span>
                <span>Status</span>
                <span>Ação</span>
              </div>

              {mentoradosFiltrados.length === 0 ? (
                <div className="border-t border-slate-100 bg-white px-6 py-12 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#f3f5f8] text-3xl shadow-sm">
                    ✦
                  </div>

                  <h4 className="mt-5 text-xl font-black">
                    Nenhum mentorado encontrado
                  </h4>

                  <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                    Cadastre um mentorado em usuários ou ajuste os filtros da
                    busca.
                  </p>

                  <button
                    onClick={() => router.push("/usuarios")}
                    className="mt-6 rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    Cadastrar mentorado
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {mentoradosFiltrados.map((mentorado) => (
                    <button
                      key={mentorado.id}
                      type="button"
                      onClick={() => router.push(`/mentorados/${mentorado.id}`)}
                      className="grid w-full grid-cols-[1.2fr_0.7fr_1fr_0.7fr_0.6fr] items-center px-6 py-5 text-left transition hover:bg-[#f9fafb]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] to-[#12317C] text-sm font-black text-white">
                          {mentorado.nome?.charAt(0) ?? "M"}
                        </div>

                        <div>
                          <p className="font-black text-[#08163F]">
                            {mentorado.nome}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-400">
                            Cadastrado em {formatarData(mentorado.created_at)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="rounded-full bg-[#EEF2FF] px-4 py-2 text-xs font-black text-[#08163F]">
                          {mentorado.codigo_inscricao ?? "—"}
                        </span>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#08163F]">
                          {mentorado.email}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {mentorado.telefone || "Telefone não informado"}
                        </p>
                      </div>

                      <div>
                        <StatusBadge status={mentorado.status ?? "Ativo"} />
                      </div>

                      <div>
                        <span className="text-sm font-black text-[#08163F]">
                          Abrir →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-3">
            <InsightCard
              titulo="Acompanhamento"
              texto="Veja rapidamente quem está ativo e quem precisa de atualização cadastral."
            />

            <InsightCard
              titulo="Código de inscrição"
              texto="Cada mentorado recebe um código automático no formato 260001, 260002 e assim por diante."
            />

            <InsightCard
              titulo="Próximas integrações"
              texto="Progresso, agenda, simulados e financeiro serão vinculados ao ID real do mentorado."
            />
          </section>
        </div>
      </section>
    </main>
  );
}

function formatarData(data?: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(data));
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100">
      {children}
    </span>
  );
}

function MiniMetric({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
        {titulo}
      </p>

      <strong className="mt-2 block text-2xl font-black">{valor}</strong>
    </div>
  );
}

function InsightCard({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <article className="rounded-[1.7rem] bg-white p-6 shadow-xl shadow-slate-200/70">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-lg font-black text-[#08163F]">
        ◌
      </div>

      <h3 className="mt-5 text-xl font-black">{titulo}</h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {texto}
      </p>
    </article>
  );
}

function KPI({
  titulo,
  valor,
  texto,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: React.ReactNode;
  texto: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <article
      className={`rounded-[1.7rem] p-6 shadow-xl ${
        destaque
          ? "bg-[#071A55] text-white shadow-[#071A55]/20"
          : alerta
          ? "bg-rose-50 text-rose-700 shadow-slate-200/70"
          : "bg-white text-[#07122F] shadow-slate-200/70"
      }`}
    >
      <p
        className={`text-sm font-black ${
          destaque
            ? "text-blue-100"
            : alerta
            ? "text-rose-700"
            : "text-slate-500"
        }`}
      >
        {titulo}
      </p>

      <strong className="mt-4 block text-4xl font-black">{valor}</strong>

      <p
        className={`mt-3 text-sm font-medium leading-6 ${
          destaque
            ? "text-blue-100"
            : alerta
            ? "text-rose-600"
            : "text-slate-500"
        }`}
      >
        {texto}
      </p>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusLower = status.toLowerCase();

  const classe =
    statusLower === "ativo"
      ? "bg-emerald-50 text-emerald-700"
      : statusLower === "pendente"
      ? "bg-amber-50 text-amber-700"
      : statusLower === "inativo"
      ? "bg-slate-100 text-slate-500"
      : "bg-[#EEF2FF] text-[#08163F]";

  return (
    <span className={`rounded-full px-4 py-2 text-xs font-black ${classe}`}>
      {status}
    </span>
  );
}