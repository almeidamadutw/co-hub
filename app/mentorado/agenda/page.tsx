"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

type EventoAgenda = {
  id: string;
  titulo: string;
  data: string;
  horario: string;
  tipo: "Mentoria" | "Aula" | "Tarefa" | "Simulado";
  status: "Confirmado" | "Pendente" | "Concluído" | "Cancelado";
  descricao: string;
};

const eventosMock: EventoAgenda[] = [
  {
    id: "1",
    titulo: "Mentoria individual",
    data: "06/05/2026",
    horario: "14:00",
    tipo: "Mentoria",
    status: "Confirmado",
    descricao: "Encontro para revisar posicionamento e plano de ação da semana.",
  },
  {
    id: "2",
    titulo: "Assistir módulo de Posicionamento",
    data: "07/05/2026",
    horario: "10:00",
    tipo: "Aula",
    status: "Pendente",
    descricao: "Continuar as aulas do módulo atual.",
  },
  {
    id: "3",
    titulo: "Responder simulado",
    data: "08/05/2026",
    horario: "16:00",
    tipo: "Simulado",
    status: "Pendente",
    descricao: "Praticar conhecimentos do módulo atual.",
  },
  {
    id: "4",
    titulo: "Enviar diagnóstico comercial",
    data: "09/05/2026",
    horario: "18:00",
    tipo: "Tarefa",
    status: "Pendente",
    descricao: "Enviar material solicitado pela mentora.",
  },
];

export default function AgendaMentoradoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [filtro, setFiltro] = useState<"Todos" | EventoAgenda["tipo"]>("Todos");

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

  const eventosFiltrados = useMemo(() => {
    if (filtro === "Todos") return eventosMock;

    return eventosMock.filter((evento) => evento.tipo === filtro);
  }, [filtro]);

  const resumo = useMemo(() => {
    return {
      total: eventosMock.length,
      mentorias: eventosMock.filter((evento) => evento.tipo === "Mentoria").length,
      pendentes: eventosMock.filter((evento) => evento.status === "Pendente").length,
      confirmados: eventosMock.filter((evento) => evento.status === "Confirmado").length,
    };
  }, []);

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario) {
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
          <MenuItem label="Início" onClick={() => router.push("/mentorado/dashboard")} />
          <MenuItem ativo label="Minha agenda" onClick={() => router.push("/mentorado/agenda")} />
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
                  Veja mentorias, tarefas, aulas e simulados previstos para sua
                  evolução dentro da plataforma.
                </p>
              </div>

              <div className="rounded-[26px] bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-sm font-bold text-[#C9CED6]">
                  Próximo compromisso
                </p>
                <p className="mt-2 text-3xl font-black">06/05</p>
              </div>
            </div>
          </section>

          <section className="mb-8 grid gap-5 xl:grid-cols-4">
            <KPI titulo="Eventos" valor={resumo.total} destaque />
            <KPI titulo="Mentorias" valor={resumo.mentorias} />
            <KPI titulo="Pendentes" valor={resumo.pendentes} />
            <KPI titulo="Confirmados" valor={resumo.confirmados} />
          </section>

          <section className="mb-6 flex flex-wrap gap-3">
            {["Todos", "Mentoria", "Aula", "Tarefa", "Simulado"].map((item) => (
              <button
                key={item}
                onClick={() => setFiltro(item as "Todos" | EventoAgenda["tipo"])}
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

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="space-y-5">
              {eventosFiltrados.map((evento) => (
                <div
                  key={evento.id}
                  className="rounded-[30px] bg-white p-6 shadow-lg"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <TipoBadge tipo={evento.tipo} />
                        <StatusBadge status={evento.status} />
                      </div>

                      <h3 className="text-2xl font-black text-[#050816]">
                        {evento.titulo}
                      </h3>

                      <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-500">
                        {evento.descricao}
                      </p>
                    </div>

                    <div className="grid min-w-[220px] grid-cols-2 gap-3">
                      <MiniInfo label="Data" value={evento.data} />
                      <MiniInfo label="Horário" value={evento.horario} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="space-y-6">
              <Card titulo="Próxima mentoria">
                <div className="rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-6 text-white">
                  <p className="text-sm font-bold text-[#C9CED6]">
                    Mentoria individual
                  </p>

                  <p className="mt-3 text-4xl font-black">06/05</p>

                  <p className="mt-2 text-sm font-semibold text-[#D9DEE7]">
                    Às 14:00, com foco em posicionamento e plano de ação.
                  </p>

                  <button
                    onClick={() => router.push("/mentorado/suporte")}
                    className="mt-6 rounded-2xl bg-white px-5 py-3 font-black text-[#08163F] transition hover:brightness-95"
                  >
                    Falar com suporte →
                  </button>
                </div>
              </Card>

              <Card titulo="Observação">
                <p className="text-sm font-semibold leading-relaxed text-gray-500">
                  Esta agenda é a visão da mentorada. A mentora gerencia datas,
                  horários e compromissos pela área administrativa.
                </p>
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

function MiniInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 font-black text-[#08163F]">{value}</p>
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

function TipoBadge({ tipo }: { tipo: EventoAgenda["tipo"] }) {
  const classes = {
    Mentoria: "bg-blue-100 text-blue-700",
    Aula: "bg-purple-100 text-purple-700",
    Tarefa: "bg-yellow-100 text-yellow-700",
    Simulado: "bg-green-100 text-green-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes[tipo]}`}>
      {tipo}
    </span>
  );
}

function StatusBadge({ status }: { status: EventoAgenda["status"] }) {
  const classes = {
    Confirmado: "bg-green-100 text-green-700",
    Pendente: "bg-yellow-100 text-yellow-700",
    Concluído: "bg-blue-100 text-blue-700",
    Cancelado: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}>
      {status}
    </span>
  );
}