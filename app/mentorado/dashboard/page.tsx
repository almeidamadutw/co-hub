"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

type Modulo = {
  id: string;
  titulo: string;
  descricao: string;
  progresso: number;
  status: "Concluído" | "Em andamento" | "Bloqueado";
};

const modulosMock: Modulo[] = [
  {
    id: "boas-vindas",
    titulo: "Boas-vindas",
    descricao: "Introdução à jornada CEO Club.",
    progresso: 100,
    status: "Concluído",
  },
  {
    id: "posicionamento",
    titulo: "Posicionamento",
    descricao: "Clareza de marca, autoridade e diferenciação.",
    progresso: 65,
    status: "Em andamento",
  },
  {
    id: "vendas",
    titulo: "Vendas",
    descricao: "Estratégia comercial, objeções e fechamento.",
    progresso: 20,
    status: "Em andamento",
  },
  {
    id: "marketing",
    titulo: "Marketing",
    descricao: "Conteúdo, presença digital e geração de demanda.",
    progresso: 0,
    status: "Bloqueado",
  },
];

export default function DashboardMentoradoPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);

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

  const moduloAtual = useMemo(() => {
    return (
      modulosMock.find((modulo) => modulo.status === "Em andamento") ??
      modulosMock[0]
    );
  }, []);

  const resumo = useMemo(() => {
    const progressoGeral = Math.round(
      modulosMock.reduce((acc, modulo) => acc + modulo.progresso, 0) /
        modulosMock.length
    );

    const concluidos = modulosMock.filter(
      (modulo) => modulo.status === "Concluído"
    ).length;

    const andamento = modulosMock.filter(
      (modulo) => modulo.status === "Em andamento"
    ).length;

    return {
      progressoGeral,
      concluidos,
      andamento,
      total: modulosMock.length,
    };
  }, []);

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando área do mentorado...
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
  <MenuItem label="Início" onClick={() => router.push("/mentorado/dashboard")} />
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] to-[#12317C] text-sm font-black text-white shadow-lg">
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
          <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-gray-200 bg-white shadow-lg">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D9DEE7] to-[#9CA3AF] text-3xl font-black text-white">
                  {usuario.nome.charAt(0)}
                </div>
              </div>

              <div>
                <h2 className="text-4xl font-black tracking-tight text-[#050816]">
                  Bem-vindo(a) de volta, {usuario.nome}
                </h2>
                <p className="mt-2 text-lg font-medium text-gray-500">
                  Continue sua evolução com foco, prática e direção.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push("/mentorado/modulos")}
              className="rounded-2xl bg-gradient-to-b from-[#F3F4F6] via-[#D1D5DB] to-[#9CA3AF] px-6 py-4 font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Continuar módulo →
            </button>
          </section>

          <section className="mb-7 grid gap-5 xl:grid-cols-4">
            <KPI titulo="Progresso geral" valor={`${resumo.progressoGeral}%`} destaque />
            <KPI titulo="Módulos concluídos" valor={`${resumo.concluidos}/${resumo.total}`} />
            <KPI titulo="Em andamento" valor={resumo.andamento} />
            <KPI titulo="Próximo encontro" valor="Em breve" />
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

          <section className="mb-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card titulo="Continue sua jornada">
              <button
                onClick={() => router.push("/mentorado/modulos")}
                className="group grid w-full gap-5 rounded-[26px] bg-[#f9fafb] p-5 text-left transition hover:bg-white hover:shadow-md md:grid-cols-[220px_1fr]"
              >
                <div className="flex h-48 items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white shadow-lg">
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#C9CED6]">
                      Módulo atual
                    </p>
                    <h3 className="mt-3 text-3xl font-black">
                      {moduloAtual.titulo}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-400">
                    Continue estudando
                  </p>

                  <h3 className="mt-2 text-2xl font-black text-[#08163F]">
                    {moduloAtual.titulo}
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-500">
                    {moduloAtual.descricao}
                  </p>

                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-semibold text-gray-500">
                        Progresso do módulo
                      </span>
                      <span className="font-black text-[#08163F]">
                        {moduloAtual.progresso}%
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] to-[#12317C]"
                        style={{ width: `${moduloAtual.progresso}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-5 font-black text-[#12317C] transition group-hover:translate-x-1">
                    Assistir conteúdo →
                  </p>
                </div>
              </button>
            </Card>

            <Card titulo="Praticar meus conhecimentos">
              <div className="flex min-h-[330px] flex-col items-center justify-center rounded-[28px] bg-gradient-to-br from-white via-[#fbfaf7] to-[#f4f1ea] p-8 text-center shadow-inner">
                <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#F3F4F6] to-[#D1D5DB] text-6xl shadow-lg">
                  🎯
                </div>

                <h3 className="text-2xl font-black text-[#08163F]">
                  Treine o módulo de {moduloAtual.titulo}
                </h3>

                <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-gray-500">
                  Responda perguntas criadas conforme o módulo que você está
                  estudando agora. A prática reforça o conteúdo e mostra onde
                  você precisa evoluir.
                </p>

                <button
                  onClick={() => router.push("/mentorado/praticar")}
                  className="mt-8 rounded-full bg-white px-10 py-4 text-base font-black text-[#08163F] shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Explorar agora →
                </button>
              </div>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card titulo="Meus módulos">
              <div className="space-y-4">
                {modulosMock.map((modulo) => (
                  <button
                    key={modulo.id}
                    onClick={() => router.push("/mentorado/modulos")}
                    className="w-full rounded-2xl border border-gray-100 bg-[#f9fafb] p-4 text-left transition hover:border-[#12317C]/20 hover:bg-white hover:shadow-md"
                  >
                    <div className="mb-3 flex justify-between gap-4">
                      <div>
                        <p className="font-black text-[#08163F]">
                          {modulo.titulo}
                        </p>

                        <p className="text-sm font-medium text-gray-500">
                          {modulo.descricao}
                        </p>
                      </div>

                      <StatusBadge status={modulo.status} />
                    </div>

                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-semibold text-gray-500">
                        Progresso
                      </span>

                      <span className="font-black text-[#08163F]">
                        {modulo.progresso}%
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] to-[#12317C]"
                        style={{ width: `${modulo.progresso}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card titulo="Plano da semana">
              <div className="space-y-4">
                <Tarefa titulo="Revisar posicionamento atual" status="Pendente" />
                <Tarefa titulo="Enviar diagnóstico comercial" status="Em andamento" />
                <Tarefa titulo="Assistir aula de vendas consultivas" status="Pendente" />
                <Tarefa titulo="Praticar perguntas do módulo atual" status="Pendente" />
              </div>
            </Card>

            <Card titulo="Precisa de ajuda?">
              <div className="rounded-[28px] bg-white p-2">
                <div className="rounded-[26px] bg-[#f9fafb] p-6">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-400">
                    Suporte
                  </p>

                  <h3 className="mt-3 text-2xl font-black text-[#08163F]">
                    Central de apoio CEO Club
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-500">
                    Encontre respostas, tire dúvidas sobre os módulos ou fale
                    com a equipe da mentoria.
                  </p>

                  <button
                    onClick={() => router.push("/mentorado/suporte")}
                    className="mt-6 rounded-2xl bg-[#08163F] px-6 py-3 font-black text-white transition hover:brightness-110"
                  >
                    Abrir suporte →
                  </button>
                </div>
              </div>
            </Card>

            <Card titulo="Insights da sua jornada">
              <div className="space-y-4">
                <Insight texto="Você avançou bem em posicionamento, mas ainda pode acelerar nas ações comerciais." />
                <Insight texto="O módulo atual já possui perguntas liberadas para prática." />
                <Insight texto="A próxima etapa ideal é transformar aprendizado em execução prática." />
              </div>
            </Card>
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

function StatusBadge({ status }: { status: Modulo["status"] }) {
  const classes = {
    "Concluído": "bg-green-100 text-green-700",
    "Em andamento": "bg-blue-100 text-blue-700",
    Bloqueado: "bg-gray-200 text-gray-500",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}>
      {status}
    </span>
  );
}

function Tarefa({
  titulo,
  status,
}: {
  titulo: string;
  status: "Pendente" | "Em andamento" | "Concluída";
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f9fafb] p-4">
      <p className="font-bold text-[#08163F]">{titulo}</p>

      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-500">
        {status}
      </span>
    </div>
  );
}

function Insight({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-[#12317C]/10 bg-[#f8fafc] p-4">
      <p className="text-sm font-semibold leading-relaxed text-gray-600">
        💡 {texto}
      </p>
    </div>
  );
}