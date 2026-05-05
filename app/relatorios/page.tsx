"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

export default function RelatoriosPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);

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

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando relatórios da mentora...
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
              <h1 className="text-xl font-black">Relatórios estratégicos</h1>
            </div>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Voltar ao painel
          </button>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-8 py-10">
          <section className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-9 text-white shadow-2xl shadow-[#07122F]/25">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-32 left-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />

            <div className="relative">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-blue-200">
                Inteligência da mentoria
              </p>

              <h2 className="mt-4 max-w-5xl text-4xl font-black leading-tight xl:text-5xl">
                Relatórios para entender evolução, dificuldades e oportunidades
                dentro do CEO Club.
              </h2>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-100">
                Esta área vai consolidar dados reais de módulos, aulas,
                simulados, presença e evolução individual das mentoradas.
              </p>
            </div>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <KPI
              titulo="Progresso médio"
              valor="0%"
              texto="Aguardando dados reais de conclusão de aulas."
              destaque
            />

            <KPI
              titulo="Mentoradas em atenção"
              valor="0"
              texto="Nenhum alerta registrado no momento."
            />

            <KPI
              titulo="Módulo com maior evolução"
              valor="—"
              texto="Será calculado após atividades concluídas."
            />

            <KPI
              titulo="Módulo com maior dificuldade"
              valor="—"
              texto="Será exibido após simulados e progresso real."
              alerta
            />
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card
              etiqueta="Módulos"
              titulo="Rendimento por módulo"
              descricao="Quando as mentoradas começarem a concluir aulas, esta área mostrará quais módulos têm melhor evolução e quais precisam de reforço."
            >
              <EmptyState
                titulo="Nenhum progresso por módulo ainda"
                texto="Os indicadores serão preenchidos automaticamente quando houver aulas concluídas, simulados respondidos ou atividades registradas."
                acao="Gerenciar módulos"
                onClick={() => router.push("/modulos")}
              />
            </Card>

            <Card
              etiqueta="Alertas"
              titulo="Pontos de atenção"
              descricao="Aqui aparecerão sinais importantes, como mentoradas com baixa atividade, módulos com queda de rendimento ou simulados com baixo desempenho."
            >
              <div className="grid gap-4">
                <InfoBox
                  titulo="Sem alertas ativos"
                  texto="Quando houver dados reais, o sistema poderá destacar mentoradas que precisam de acompanhamento mais próximo."
                  tipo="neutro"
                />

                <InfoBox
                  titulo="Análise estratégica futura"
                  texto="Esta tela poderá cruzar presença, aulas, simulados e progresso para gerar leituras mais úteis para a mentora."
                  tipo="azul"
                />
              </div>
            </Card>
          </section>

          <section className="mt-8 rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Mentoradas
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  Evolução individual
                </h3>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                  Esta tabela será preenchida com dados reais de cada mentorada,
                  incluindo progresso, módulo atual, dificuldades e última
                  atividade registrada.
                </p>
              </div>

              <button
                onClick={() => router.push("/mentorados")}
                className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
              >
                Ver mentorados
              </button>
            </div>

            <div className="mt-7 rounded-[1.8rem] border border-dashed border-slate-200 bg-[#f9fafb] p-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white text-3xl shadow-sm">
                ✦
              </div>

              <h4 className="mt-5 text-xl font-black">
                Nenhum relatório individual disponível
              </h4>

              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                Assim que houver dados reais de progresso, esta área mostrará
                quem está evoluindo, quem precisa de suporte e onde a mentora
                deve agir primeiro.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
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

function Card({
  etiqueta,
  titulo,
  descricao,
  children,
}: {
  etiqueta: string;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/70">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
        {etiqueta}
      </p>

      <h3 className="mt-1 text-2xl font-black">{titulo}</h3>

      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
        {descricao}
      </p>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function EmptyState({
  titulo,
  texto,
  acao,
  onClick,
}: {
  titulo: string;
  texto: string;
  acao?: string;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-[1.8rem] border border-dashed border-slate-200 bg-[#f9fafb] p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.3rem] bg-white text-2xl shadow-sm">
        ◌
      </div>

      <h4 className="mt-5 text-lg font-black">{titulo}</h4>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        {texto}
      </p>

      {acao && onClick && (
        <button
          onClick={onClick}
          className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-sm transition hover:shadow-md"
        >
          {acao} →
        </button>
      )}
    </div>
  );
}

function InfoBox({
  titulo,
  texto,
  tipo,
}: {
  titulo: string;
  texto: string;
  tipo: "neutro" | "azul";
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${
        tipo === "azul" ? "bg-blue-50" : "bg-slate-50"
      }`}
    >
      <p
        className={`font-black ${
          tipo === "azul" ? "text-blue-700" : "text-slate-700"
        }`}
      >
        {titulo}
      </p>

      <p
        className={`mt-2 text-sm font-semibold leading-6 ${
          tipo === "azul" ? "text-blue-600" : "text-slate-500"
        }`}
      >
        {texto}
      </p>
    </div>
  );
}