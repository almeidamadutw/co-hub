"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";

type ModuloMentorado = {
  id: string;
  titulo: string;
  descricao: string;
  status: "Bloqueado" | "Disponível" | "Concluído";
  progresso: number;
};

type TarefaSemana = {
  id: string;
  titulo: string;
  status: "Pendente" | "Concluída";
};

const modulosIniciais: ModuloMentorado[] = [];
const tarefasIniciais: TarefaSemana[] = [];

export default function DashboardMentoradoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [modulos] = useState<ModuloMentorado[]>(modulosIniciais);
  const [tarefas] = useState<TarefaSemana[]>(tarefasIniciais);

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

  const resumo = useMemo(() => {
    const totalModulos = modulos.length;
    const concluidos = modulos.filter((m) => m.status === "Concluído").length;
    const emAndamento = modulos.filter((m) => m.status === "Disponível").length;

    const progressoGeral =
      totalModulos > 0
        ? Math.round(
            modulos.reduce((acc, modulo) => acc + modulo.progresso, 0) /
              totalModulos
          )
        : 0;

    return {
      totalModulos,
      concluidos,
      emAndamento,
      progressoGeral,
      tarefasPendentes: tarefas.filter((t) => t.status === "Pendente").length,
    };
  }, [modulos, tarefas]);

  async function sair() {
    logoutUsuario();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando sua jornada...
      </main>
    );
  }

  const inicial = usuario.nome?.charAt(0)?.toUpperCase() || "M";

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
          <MenuItem ativo label="Início" onClick={() => router.push("/mentorado/dashboard")} />
          <MenuItem label="Minha agenda" onClick={() => router.push("/mentorado/agenda")} />
          <MenuItem label="Meus módulos" onClick={() => router.push("/mentorado/modulos")} />
          <MenuItem label="Praticar" onClick={() => router.push("/mentorado/praticar")} />
          <MenuItem label="Meu progresso" onClick={() => router.push("/mentorado/progresso")} />
          <MenuItem label="Financeiro" onClick={() => router.push("/mentorado/financeiro")} />
          <MenuItem label="Minha conta" onClick={() => router.push("/mentorado/conta")} />
        </nav>

        <div className="mt-auto rounded-[24px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9CED6]">
            Mentorado
          </p>

          <p className="mt-2 font-black">{usuario.nome}</p>

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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08163F] text-sm font-black text-white shadow-lg">
              CC
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
                Área do mentorado
              </p>
              <h1 className="text-xl font-black">Minha jornada</h1>
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
          <section className="mb-8 overflow-hidden rounded-[34px] bg-white p-8 shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-white bg-gradient-to-br from-[#E5E7EB] to-[#BFC3C9] text-4xl font-black text-white shadow-xl">
                  {inicial}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-gray-400">
                    Bem-vindo(a) ao CEO Club
                  </p>

                  <h2 className="mt-3 text-4xl font-black text-[#050816]">
                    Olá, {usuario.nome}
                  </h2>

                  <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-gray-500">
                    Sua jornada ainda não foi iniciada. Assim que a mentora
                    liberar os módulos, aulas, atividades e simulados, tudo
                    aparecerá organizado aqui.
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push("/mentorado/suporte")}
                className="rounded-2xl bg-[#08163F] px-6 py-4 font-black text-white shadow-lg transition hover:brightness-110"
              >
                Falar com suporte →
              </button>
            </div>
          </section>

          <section className="mb-8 grid gap-5 xl:grid-cols-4">
            <KPI titulo="Progresso geral" valor={`${resumo.progressoGeral}%`} destaque />
            <KPI titulo="Módulos liberados" valor={resumo.totalModulos} />
            <KPI titulo="Em andamento" valor={resumo.emAndamento} />
            <KPI titulo="Tarefas pendentes" valor={resumo.tarefasPendentes} />
          </section>

          <section className="mb-8 rounded-[26px] bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-500">
                Evolução da sua mentoria
              </p>

              <p className="text-sm font-black text-[#08163F]">
                {resumo.progressoGeral}%
              </p>
            </div>

            <div className="h-5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                style={{ width: `${resumo.progressoGeral}%` }}
              />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="space-y-6">
              <Card titulo="Meus módulos">
                {modulos.length === 0 ? (
                  <EmptyState
                    titulo="Nenhum módulo liberado ainda"
                    texto="Quando sua mentora liberar os primeiros conteúdos, eles aparecerão aqui para você começar sua jornada."
                    botao="Ver meus módulos"
                    onClick={() => router.push("/mentorado/modulos")}
                  />
                ) : (
                  <div className="space-y-4">
                    {modulos.map((modulo) => (
                      <div key={modulo.id} className="rounded-2xl bg-[#f9fafb] p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="font-black text-[#08163F]">
                              {modulo.titulo}
                            </h3>
                            <p className="mt-1 text-sm font-semibold text-gray-500">
                              {modulo.descricao}
                            </p>
                          </div>

                          <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-black text-[#08163F]">
                            {modulo.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card titulo="Praticar meus conhecimentos">
                <div className="rounded-[26px] bg-gradient-to-br from-[#f9fafb] to-white p-8 text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#EEF2FF] text-5xl">
                    🎯
                  </div>

                  <h3 className="mt-5 text-2xl font-black text-[#050816]">
                    Simulados ainda não liberados
                  </h3>

                  <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-relaxed text-gray-500">
                    A área de prática será liberada conforme seu andamento nos
                    módulos. Quando houver simulados disponíveis, você poderá
                    treinar por aqui.
                  </p>

                  <button
                    onClick={() => router.push("/mentorado/praticar")}
                    className="mt-6 rounded-2xl bg-[#08163F] px-6 py-4 font-black text-white shadow-lg transition hover:brightness-110"
                  >
                    Ir para prática →
                  </button>
                </div>
              </Card>
            </div>

            <aside className="space-y-6">
              <Card titulo="Plano da semana">
                {tarefas.length === 0 ? (
                  <EmptyState
                    titulo="Nenhuma tarefa no momento"
                    texto="Quando sua mentora definir atividades, elas aparecerão nesta área."
                  />
                ) : (
                  <div className="space-y-3">
                    {tarefas.map((tarefa) => (
                      <div
                        key={tarefa.id}
                        className="rounded-2xl bg-[#f9fafb] p-4"
                      >
                        <p className="font-black text-[#08163F]">{tarefa.titulo}</p>
                        <p className="mt-1 text-sm font-semibold text-gray-500">
                          {tarefa.status}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card titulo="Próximo encontro">
                <div className="rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-6 text-white">
                  <p className="text-sm font-bold text-[#C9CED6]">
                    Agenda da mentoria
                  </p>

                  <p className="mt-3 text-3xl font-black">Em breve</p>

                  <p className="mt-2 text-sm font-semibold text-[#D9DEE7]">
                    Assim que um encontro for marcado, ele aparecerá aqui.
                  </p>

                  <button
                    onClick={() => router.push("/mentorado/agenda")}
                    className="mt-6 rounded-2xl bg-white px-5 py-3 font-black text-[#08163F] transition hover:brightness-95"
                  >
                    Ver agenda →
                  </button>
                </div>
              </Card>
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
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
      <p className={`text-sm font-bold ${destaque ? "text-[#C9CED6]" : "text-gray-500"}`}>
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
    <div className="rounded-[26px] bg-[#f9fafb] p-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-4xl shadow-sm">
        ✦
      </div>

      <h3 className="mt-5 text-xl font-black text-[#08163F]">{titulo}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-gray-500">
        {texto}
      </p>

      {botao && onClick && (
        <button
          onClick={onClick}
          className="mt-6 rounded-2xl bg-white px-6 py-3 font-black text-[#08163F] shadow-sm transition hover:shadow-md"
        >
          {botao} →
        </button>
      )}
    </div>
  );
}