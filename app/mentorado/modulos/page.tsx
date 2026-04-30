"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

type Aula = {
  id: string;
  titulo: string;
  duracao: string;
  concluida: boolean;
  descricao: string;
  modulo: string;
  videoLabel: string;
  arquivos: {
    nome: string;
    tamanho: string;
  }[];
};

type Modulo = {
  id: string;
  titulo: string;
  numero: number;
  aulas: Aula[];
};

const modulosMock: Modulo[] = [
  {
    id: "comeco",
    numero: 1,
    titulo: "Comece aqui",
    aulas: [
      {
        id: "boas-vindas",
        titulo: "Seja bem-vindo!",
        duracao: "2 min",
        concluida: true,
        modulo: "Módulo 1 - Comece aqui",
        videoLabel: "Boas-vindas CEO Club",
        descricao:
          "Nesta aula, você entende como a jornada CEO Club funciona, como acompanhar seu progresso e como transformar aprendizado em execução prática.",
        arquivos: [
          {
            nome: "Guia inicial CEO Club.pdf",
            tamanho: "148 KB",
          },
        ],
      },
      {
        id: "plataforma",
        titulo: "Conhecendo a plataforma",
        duracao: "4 min",
        concluida: false,
        modulo: "Módulo 1 - Comece aqui",
        videoLabel: "Conhecendo a plataforma",
        descricao:
          "Aprenda como navegar pelos módulos, acessar atividades, acompanhar tarefas e usar a área de prática para reforçar os conteúdos.",
        arquivos: [],
      },
    ],
  },
  {
    id: "posicionamento",
    numero: 2,
    titulo: "Posicionamento",
    aulas: [
      {
        id: "clareza-marca",
        titulo: "Clareza de marca e autoridade",
        duracao: "16 min",
        concluida: false,
        modulo: "Módulo 2 - Posicionamento",
        videoLabel: "Clareza de marca",
        descricao:
          "Nesta aula, você aprende a construir uma comunicação clara, fortalecer autoridade e definir uma posição mais estratégica na mente do seu público.",
        arquivos: [
          {
            nome: "Checklist de posicionamento.pdf",
            tamanho: "212 KB",
          },
          {
            nome: "Mapa de clareza da marca.pdf",
            tamanho: "185 KB",
          },
        ],
      },
      {
        id: "diferenciacao",
        titulo: "Diferenciação no mercado",
        duracao: "12 min",
        concluida: false,
        modulo: "Módulo 2 - Posicionamento",
        videoLabel: "Diferenciação",
        descricao:
          "Entenda como sair da comparação por preço e comunicar valor de forma mais forte, elegante e memorável.",
        arquivos: [
          {
            nome: "Exercício de diferenciação.pdf",
            tamanho: "96 KB",
          },
        ],
      },
      {
        id: "persona",
        titulo: "Persona, promessa e linguagem",
        duracao: "18 min",
        concluida: false,
        modulo: "Módulo 2 - Posicionamento",
        videoLabel: "Persona e linguagem",
        descricao:
          "Aprenda a definir para quem você fala, qual transformação oferece e como traduzir isso em uma linguagem comercial mais precisa.",
        arquivos: [],
      },
    ],
  },
  {
    id: "vendas",
    numero: 3,
    titulo: "Vendas - Nível Inicial",
    aulas: [
      {
        id: "venda-consultiva",
        titulo: "Venda consultiva",
        duracao: "20 min",
        concluida: false,
        modulo: "Módulo 3 - Vendas",
        videoLabel: "Venda consultiva",
        descricao:
          "Aprenda a conduzir uma conversa comercial com diagnóstico, escuta ativa e conexão entre desejo, valor e decisão.",
        arquivos: [
          {
            nome: "Roteiro de venda consultiva.pdf",
            tamanho: "173 KB",
          },
        ],
      },
      {
        id: "objecoes",
        titulo: "Como lidar com objeções",
        duracao: "15 min",
        concluida: false,
        modulo: "Módulo 3 - Vendas",
        videoLabel: "Objeções",
        descricao:
          "Entenda como transformar objeções em pontos de clareza, sem pressionar o cliente e sem desvalorizar sua oferta.",
        arquivos: [],
      },
    ],
  },
];

export default function ModulosMentoradoPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [aulaSelecionadaId, setAulaSelecionadaId] = useState("clareza-marca");
  const [modalArquivosAberto, setModalArquivosAberto] = useState(false);

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

  const todasAulas = useMemo(() => {
    return modulosMock.flatMap((modulo) => modulo.aulas);
  }, []);

  const aulaSelecionada = useMemo(() => {
    return (
      todasAulas.find((aula) => aula.id === aulaSelecionadaId) ?? todasAulas[0]
    );
  }, [aulaSelecionadaId, todasAulas]);

  const totalAulas = todasAulas.length;
  const aulasConcluidas = todasAulas.filter((aula) => aula.concluida).length;

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando módulo de aula...
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
          <MenuItem ativo label="Assistir aula" onClick={() => router.push("/mentorado/modulos")} />
          <MenuItem label="Praticar" onClick={() => router.push("/mentorado/praticar")} />
          <MenuItem label="Meu progresso" onClick={() => router.push("/mentorado/progresso")} />
          <MenuItem label="Minha agenda" onClick={() => router.push("/mentorado/agenda")} />
          <MenuItem label="Tarefas" onClick={() => router.push("/mentorado/tarefas")} />
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
                Aula CEO Club
              </p>
              <h1 className="text-xl font-black">{aulaSelecionada.titulo}</h1>
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
          <section className="grid gap-8 xl:grid-cols-[1fr_430px]">
            <div>
              <div className="overflow-hidden rounded-[32px] bg-black shadow-xl">
                <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-[#020617] via-[#07122F] to-[#12317C] text-white">
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.34em] text-[#C9CED6]">
                      Mentoria CEO Club
                    </p>
                    <h2 className="mt-4 text-5xl font-black">
                      {aulaSelecionada.videoLabel}
                    </h2>
                    <p className="mt-4 text-sm font-semibold text-[#D9DEE7]">
                      Player de vídeo demonstrativo
                    </p>

                    <button className="mt-8 rounded-full bg-white px-8 py-4 font-black text-[#08163F] shadow-lg transition hover:brightness-95">
                      ▶ Reproduzir aula
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <h2 className="text-4xl font-black text-[#050816]">
                    {aulaSelecionada.titulo}
                  </h2>

                  <p className="mt-3 text-lg font-bold text-gray-500">
                    CEO Club · {aulaSelecionada.modulo}
                  </p>
                </div>

                <button
                  onClick={() => setModalArquivosAberto(true)}
                  className="rounded-full border border-gray-200 bg-white px-8 py-4 font-black text-[#08163F] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  📄 Arquivos disponíveis
                </button>
              </div>

              <div className="mt-7 max-w-3xl rounded-[30px] bg-white p-7 shadow-lg">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-400">
                  Sobre esta aula
                </p>

                <p className="mt-4 text-lg font-semibold leading-relaxed text-gray-600">
                  {aulaSelecionada.descricao}
                </p>

                <div className="mt-6 rounded-[24px] bg-[#f9fafb] p-5">
                  <p className="font-black text-[#08163F]">Objetivo da aula</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-500">
                    Entender o conteúdo, aplicar no contexto da sua mentoria e
                    depois reforçar o aprendizado na área de prática.
                  </p>

                  <button
                    onClick={() => router.push("/mentorado/praticar")}
                    className="mt-5 rounded-2xl bg-[#08163F] px-6 py-3 font-black text-white transition hover:brightness-110"
                  >
                    Praticar este conteúdo →
                  </button>
                </div>
              </div>
            </div>

            <aside className="rounded-[32px] bg-white p-5 shadow-lg">
              <div className="mb-5 rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9CED6]">
                  Progresso do curso
                </p>

                <p className="mt-3 text-4xl font-black">
                  {aulasConcluidas}/{totalAulas}
                </p>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{
                      width: `${(aulasConcluidas / totalAulas) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="max-h-[calc(100vh-250px)] space-y-4 overflow-y-auto pr-2">
                {modulosMock.map((modulo) => {
                  const aulasModulo = modulo.aulas.length;
                  const concluidasModulo = modulo.aulas.filter(
                    (aula) => aula.concluida
                  ).length;

                  return (
                    <div
                      key={modulo.id}
                      className="overflow-hidden rounded-[24px] border border-gray-200 bg-white"
                    >
                      <div className="border-b border-gray-100 bg-[#f9fafb] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-[#08163F] px-4 py-2 text-xs font-black text-white">
                            Módulo {modulo.numero}
                          </span>

                          <span className="text-sm font-black text-gray-500">
                            {concluidasModulo}/{aulasModulo}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-black text-[#08163F]">
                          {modulo.titulo}
                        </h3>
                      </div>

                      <div>
                        {modulo.aulas.map((aula, index) => {
                          const ativa = aula.id === aulaSelecionada.id;

                          return (
                            <button
                              key={aula.id}
                              onClick={() => setAulaSelecionadaId(aula.id)}
                              className={`flex w-full items-center gap-4 border-b border-gray-100 p-4 text-left transition last:border-b-0 ${
                                ativa
                                  ? "bg-[#EEF2FF]"
                                  : "bg-white hover:bg-[#f9fafb]"
                              }`}
                            >
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                                  aula.concluida
                                    ? "bg-green-100 text-green-700"
                                    : ativa
                                    ? "bg-[#08163F] text-white"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {aula.concluida ? "✓" : index + 1}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="font-black text-[#08163F]">
                                  {aula.titulo}
                                </p>

                                <p className="mt-1 text-sm font-semibold text-gray-500">
                                  ▶ {aula.duracao}
                                </p>
                              </div>

                              <span className="text-xl font-black text-gray-400">
                                {ativa ? "•" : "›"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </section>
        </div>
      </section>

      {modalArquivosAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[34px] bg-white p-7 shadow-2xl">
            <div className="mb-7 flex items-center justify-between gap-4">
              <h2 className="text-4xl font-black text-[#050816]">
                Arquivos disponíveis
              </h2>

              <button
                onClick={() => setModalArquivosAberto(false)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f5f8] text-2xl font-black text-[#08163F] transition hover:bg-gray-200"
              >
                ×
              </button>
            </div>

            {aulaSelecionada.arquivos.length > 0 ? (
              <div className="space-y-4">
                {aulaSelecionada.arquivos.map((arquivo) => (
                  <div
                    key={arquivo.nome}
                    className="flex flex-col gap-4 rounded-[26px] bg-[#f9fafb] p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-xl font-black text-[#08163F]">
                        📄 {arquivo.nome}
                      </p>

                      <p className="mt-1 text-sm font-bold text-gray-500">
                        {arquivo.tamanho}
                      </p>
                    </div>

                    <button className="rounded-full bg-gradient-to-b from-[#F3F4F6] via-[#D1D5DB] to-[#9CA3AF] px-8 py-4 font-black text-[#08163F] shadow-lg transition hover:brightness-105">
                      Baixar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[26px] bg-[#f9fafb] p-8 text-center">
                <p className="text-2xl font-black text-[#08163F]">
                  Nenhum arquivo disponível
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-500">
                  Esta aula ainda não possui materiais anexados.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
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