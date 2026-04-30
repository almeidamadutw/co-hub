"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

type Questao = {
  id: string;
  pergunta: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
};

type Simulado = {
  id: string;
  titulo: string;
  modulo: string;
  descricao: string;
  publicadoPor: string;
  status: "Disponível" | "Concluído" | "Bloqueado";
  quantidadeQuestoes: number;
  tempoEstimado: string;
  dataPublicacao: string;
  questoes: Questao[];
};

const simuladosMock: Simulado[] = [
  {
    id: "posicionamento-teste",
    titulo: "Simulado de Posicionamento",
    modulo: "Posicionamento",
    descricao:
      "Teste seus conhecimentos sobre clareza de marca, autoridade e diferenciação.",
    publicadoPor: "Mentora Dra. Luciana Rocha",
    status: "Disponível",
    quantidadeQuestoes: 3,
    tempoEstimado: "5 min",
    dataPublicacao: "30/04",
    questoes: [
      {
        id: "q1",
        pergunta:
          "Qual é o principal objetivo do posicionamento dentro de uma marca pessoal?",
        alternativas: [
          "Copiar o que outros profissionais fazem",
          "Ser lembrado por uma percepção clara e estratégica",
          "Postar todos os dias sem estratégia",
          "Usar apenas identidade visual bonita",
        ],
        correta: 1,
        explicacao:
          "Posicionamento é sobre ocupar um espaço claro na mente do público, comunicando valor, diferenciação e autoridade.",
      },
      {
        id: "q2",
        pergunta:
          "Uma boa promessa de posicionamento deve ser baseada principalmente em:",
        alternativas: [
          "Preço baixo",
          "Quantidade de seguidores",
          "Valor percebido e transformação entregue",
          "Sorte no algoritmo",
        ],
        correta: 2,
        explicacao:
          "A promessa precisa mostrar a transformação entregue, não só características soltas do serviço.",
      },
      {
        id: "q3",
        pergunta:
          "Quando um profissional tenta falar com todo mundo, o que tende a acontecer?",
        alternativas: [
          "A comunicação fica mais forte",
          "A marca se torna mais memorável",
          "A mensagem perde força e clareza",
          "O público entende melhor a oferta",
        ],
        correta: 2,
        explicacao:
          "Falar com todo mundo geralmente dilui a comunicação. Uma marca forte precisa ter clareza sobre quem deseja atingir.",
      },
    ],
  },
  {
    id: "vendas-inicial",
    titulo: "Simulado de Vendas Consultivas",
    modulo: "Vendas",
    descricao:
      "Simulado sobre diagnóstico, objeções e fechamento de vendas premium.",
    publicadoPor: "Mentora Dra. Luciana Rocha",
    status: "Bloqueado",
    quantidadeQuestoes: 30,
    tempoEstimado: "30 min",
    dataPublicacao: "Em breve",
    questoes: [],
  },
  {
    id: "marketing-base",
    titulo: "Simulado de Marketing Médico",
    modulo: "Marketing",
    descricao:
      "Questões sobre conteúdo, posicionamento digital e geração de demanda.",
    publicadoPor: "Mentora Dra. Luciana Rocha",
    status: "Concluído",
    quantidadeQuestoes: 30,
    tempoEstimado: "28 min",
    dataPublicacao: "25/04",
    questoes: [],
  },
];

export default function PraticarMentoradoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [simuladoSelecionado, setSimuladoSelecionado] =
    useState<Simulado | null>(null);
  const [questaoAtual, setQuestaoAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [finalizado, setFinalizado] = useState(false);

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

  const questoes = simuladoSelecionado?.questoes ?? [];
  const questao = questoes[questaoAtual];

  const totalRespondidas = Object.keys(respostas).length;

  const acertos = useMemo(() => {
    if (!simuladoSelecionado) return 0;

    return simuladoSelecionado.questoes.reduce((acc, q, index) => {
      if (respostas[index] === q.correta) return acc + 1;
      return acc;
    }, 0);
  }, [respostas, simuladoSelecionado]);

  const percentual =
    questoes.length > 0 ? Math.round((acertos / questoes.length) * 100) : 0;

  function iniciarSimulado(simulado: Simulado) {
    if (simulado.status === "Bloqueado") return;

    setSimuladoSelecionado(simulado);
    setQuestaoAtual(0);
    setRespostas({});
    setFinalizado(false);
  }

  function responder(indiceAlternativa: number) {
    if (finalizado) return;

    setRespostas((prev) => ({
      ...prev,
      [questaoAtual]: indiceAlternativa,
    }));
  }

  function proximaQuestao() {
    if (questaoAtual < questoes.length - 1) {
      setQuestaoAtual((prev) => prev + 1);
      return;
    }

    setFinalizado(true);
  }

  function voltarParaLista() {
    setSimuladoSelecionado(null);
    setQuestaoAtual(0);
    setRespostas({});
    setFinalizado(false);
  }

  function refazerSimulado() {
    setQuestaoAtual(0);
    setRespostas({});
    setFinalizado(false);
  }

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando simulados...
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
            label="Assistir aula"
            onClick={() => router.push("/mentorado/modulos")}
          />
          <MenuItem
            ativo
            label="Meus simulados"
            onClick={() => router.push("/mentorado/praticar")}
          />
          <MenuItem
            label="Meu progresso"
            onClick={() => router.push("/mentorado/progresso")}
          />
          <MenuItem
            label="Minha agenda"
            onClick={() => router.push("/mentorado/agenda")}
          />
          <MenuItem
            label="Tarefas"
            onClick={() => router.push("/mentorado/tarefas")}
          />
          <MenuItem
            label="Suporte"
            onClick={() => router.push("/mentorado/suporte")}
          />
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
              onClick={() =>
                simuladoSelecionado
                  ? voltarParaLista()
                  : router.push("/mentorado/dashboard")
              }
              className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
            >
              ← Voltar
            </button>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
                Praticar conhecimentos
              </p>
              <h1 className="text-xl font-black">
                {simuladoSelecionado
                  ? simuladoSelecionado.titulo
                  : "Meus simulados"}
              </h1>
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
          {!simuladoSelecionado && (
            <>
              <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                      Simulados publicados
                    </p>

                    <h2 className="mt-3 text-4xl font-black">
                      Pratique conforme sua jornada
                    </h2>

                    <p className="mt-3 max-w-2xl text-[#D9DEE7]">
                      Os simulados aparecem aqui quando a mentora publica para
                      você. Agora estamos usando 3 perguntas para teste, mas na
                      versão real cada simulado publicado terá no mínimo 30
                      questões.
                    </p>
                  </div>

                  <div className="rounded-[26px] bg-white/10 p-5 backdrop-blur-sm">
                    <p className="text-sm font-bold text-[#C9CED6]">
                      Disponíveis
                    </p>
                    <p className="mt-2 text-4xl font-black">
                      {
                        simuladosMock.filter(
                          (simulado) => simulado.status === "Disponível"
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8 grid gap-5 xl:grid-cols-4">
                <KPI
                  titulo="Total de simulados"
                  valor={simuladosMock.length}
                  destaque
                />
                <KPI
                  titulo="Disponíveis"
                  valor={
                    simuladosMock.filter((s) => s.status === "Disponível")
                      .length
                  }
                />
                <KPI
                  titulo="Concluídos"
                  valor={
                    simuladosMock.filter((s) => s.status === "Concluído").length
                  }
                />
                <KPI titulo="Regra real" valor="30+ questões" />
              </section>

              <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
                <div className="space-y-5">
                  {simuladosMock.map((simulado) => (
                    <button
                      key={simulado.id}
                      onClick={() => iniciarSimulado(simulado)}
                      disabled={simulado.status === "Bloqueado"}
                      className="w-full rounded-[30px] bg-white p-6 text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="mb-4 flex flex-wrap items-center gap-3">
                            <StatusBadge status={simulado.status} />
                            <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-black text-[#08163F]">
                              {simulado.modulo}
                            </span>
                          </div>

                          <h3 className="text-2xl font-black text-[#050816]">
                            {simulado.titulo}
                          </h3>

                          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-gray-500">
                            {simulado.descricao}
                          </p>

                          <p className="mt-4 text-sm font-bold text-gray-400">
                            Publicado por {simulado.publicadoPor} ·{" "}
                            {simulado.dataPublicacao}
                          </p>
                        </div>

                        <div className="grid min-w-[240px] grid-cols-2 gap-3">
                          <MiniInfo
                            label="Questões"
                            value={simulado.quantidadeQuestoes}
                          />
                          <MiniInfo
                            label="Tempo"
                            value={simulado.tempoEstimado}
                          />
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end">
                        <span className="rounded-2xl bg-[#08163F] px-6 py-3 text-sm font-black text-white">
                          {simulado.status === "Bloqueado"
                            ? "Bloqueado"
                            : simulado.status === "Concluído"
                            ? "Ver resultado"
                            : "Iniciar simulado →"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <aside className="space-y-6">
                  <Card titulo="Como funciona">
                    <div className="space-y-4">
                      <Regra
                        numero="1"
                        texto="A mentora cria e publica o simulado."
                      />
                      <Regra
                        numero="2"
                        texto="Você responde dentro da plataforma."
                      />
                      <Regra
                        numero="3"
                        texto="O sistema calcula acertos, erros e desempenho."
                      />
                      <Regra
                        numero="4"
                        texto="A mentora acompanha seus resultados depois."
                      />
                    </div>
                  </Card>

                  <Card titulo="Observação do protótipo">
                    <div className="rounded-2xl bg-yellow-50 p-5">
                      <p className="text-sm font-bold leading-relaxed text-yellow-800">
                        Para teste, usamos 3 perguntas. No sistema real, a
                        publicação será bloqueada se o simulado tiver menos de
                        30 questões.
                      </p>
                    </div>
                  </Card>
                </aside>
              </section>
            </>
          )}

          {simuladoSelecionado && !finalizado && questao && (
            <>
              <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                      {simuladoSelecionado.modulo}
                    </p>

                    <h2 className="mt-3 text-4xl font-black">
                      {simuladoSelecionado.titulo}
                    </h2>

                    <p className="mt-3 max-w-2xl text-[#D9DEE7]">
                      Responda com atenção. Após selecionar uma alternativa, você
                      verá a explicação da questão.
                    </p>
                  </div>

                  <div className="rounded-[26px] bg-white/10 p-5 backdrop-blur-sm">
                    <p className="text-sm font-bold text-[#C9CED6]">
                      Respondidas
                    </p>
                    <p className="mt-2 text-4xl font-black">
                      {totalRespondidas}/{questoes.length}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="rounded-[32px] bg-white p-6 shadow-lg">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-400">
                        Questão {questaoAtual + 1} de {questoes.length}
                      </p>

                      <h3 className="mt-3 text-2xl font-black leading-snug text-[#050816]">
                        {questao.pergunta}
                      </h3>
                    </div>

                    <span className="rounded-full bg-[#EEF2FF] px-4 py-2 text-sm font-black text-[#08163F]">
                      {simuladoSelecionado.modulo}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {questao.alternativas.map((alternativa, index) => {
                      const respostaSelecionada = respostas[questaoAtual];
                      const selecionada = respostaSelecionada === index;
                      const jaRespondeu = respostaSelecionada !== undefined;
                      const correta = questao.correta === index;
                      const erradaSelecionada = selecionada && !correta;

                      return (
                        <button
                          key={alternativa}
                          onClick={() => responder(index)}
                          className={`w-full rounded-2xl border p-5 text-left font-bold transition ${
                            !jaRespondeu
                              ? "border-gray-100 bg-[#f9fafb] text-[#08163F] hover:border-[#12317C]/20 hover:bg-white hover:shadow-md"
                              : correta
                              ? "border-green-200 bg-green-50 text-green-800"
                              : erradaSelecionada
                              ? "border-red-200 bg-red-50 text-red-800"
                              : "border-gray-100 bg-[#f9fafb] text-gray-400"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black shadow-sm">
                              {String.fromCharCode(65 + index)}
                            </span>

                            <span>{alternativa}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {respostas[questaoAtual] !== undefined && (
                    <div className="mt-6 rounded-2xl bg-[#f8fafc] p-5">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
                        Explicação
                      </p>

                      <p className="mt-2 font-semibold leading-relaxed text-gray-600">
                        {questao.explicacao}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex justify-between gap-4">
                    <button
                      onClick={() =>
                        setQuestaoAtual((prev) => Math.max(0, prev - 1))
                      }
                      disabled={questaoAtual === 0}
                      className="rounded-2xl bg-[#f3f5f8] px-6 py-3 font-black text-[#08163F] transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Anterior
                    </button>

                    <button
                      onClick={proximaQuestao}
                      disabled={respostas[questaoAtual] === undefined}
                      className="rounded-2xl bg-[#08163F] px-6 py-3 font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {questaoAtual === questoes.length - 1
                        ? "Finalizar simulado"
                        : "Próxima questão"}
                    </button>
                  </div>
                </div>

                <aside className="rounded-[32px] bg-white p-6 shadow-lg">
                  <h3 className="text-2xl font-black text-[#050816]">
                    Seu progresso
                  </h3>

                  <div className="mt-5 rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white">
                    <p className="text-sm font-bold text-[#C9CED6]">
                      Respondidas
                    </p>

                    <p className="mt-2 text-4xl font-black">
                      {totalRespondidas}/{questoes.length}
                    </p>

                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{
                          width: `${(totalRespondidas / questoes.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {questoes.map((q, index) => {
                      const respondida = respostas[index] !== undefined;

                      return (
                        <button
                          key={q.id}
                          onClick={() => setQuestaoAtual(index)}
                          className={`flex w-full items-center justify-between rounded-2xl p-4 text-left font-black transition ${
                            index === questaoAtual
                              ? "bg-[#EEF2FF] text-[#08163F]"
                              : respondida
                              ? "bg-green-50 text-green-700"
                              : "bg-[#f9fafb] text-gray-500 hover:bg-white hover:shadow-md"
                          }`}
                        >
                          <span>Questão {index + 1}</span>
                          <span>{respondida ? "✓" : "→"}</span>
                        </button>
                      );
                    })}
                  </div>
                </aside>
              </section>
            </>
          )}

          {simuladoSelecionado && finalizado && (
            <section className="rounded-[34px] bg-white p-8 text-center shadow-lg">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-5xl text-white shadow-xl">
                🎯
              </div>

              <h2 className="mt-6 text-4xl font-black text-[#050816]">
                Simulado finalizado
              </h2>

              <p className="mt-2 text-lg font-semibold text-gray-500">
                Você acertou {acertos} de {questoes.length} questões.
              </p>

              <div className="mx-auto mt-8 grid max-w-3xl gap-5 md:grid-cols-3">
                <ResultadoCard titulo="Acertos" valor={acertos} />
                <ResultadoCard titulo="Erros" valor={questoes.length - acertos} />
                <ResultadoCard titulo="Desempenho" valor={`${percentual}%`} />
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <button
                  onClick={refazerSimulado}
                  className="rounded-2xl bg-[#08163F] px-6 py-3 font-black text-white shadow-lg transition hover:brightness-110"
                >
                  Refazer simulado
                </button>

                <button
                  onClick={voltarParaLista}
                  className="rounded-2xl bg-[#f3f5f8] px-6 py-3 font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                >
                  Voltar aos simulados
                </button>
              </div>
            </section>
          )}
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

function Regra({ numero, texto }: { numero: string; texto: string }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-[#f9fafb] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#08163F] text-sm font-black text-white">
        {numero}
      </div>

      <p className="text-sm font-bold leading-relaxed text-gray-600">{texto}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Simulado["status"] }) {
  const classes = {
    Disponível: "bg-blue-100 text-blue-700",
    Concluído: "bg-green-100 text-green-700",
    Bloqueado: "bg-gray-200 text-gray-500",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}>
      {status}
    </span>
  );
}

function ResultadoCard({
  titulo,
  valor,
}: {
  titulo: string;
  valor: React.ReactNode;
}) {
  return (
    <div className="rounded-[26px] bg-[#f9fafb] p-6">
      <p className="text-sm font-bold text-gray-500">{titulo}</p>
      <p className="mt-3 text-4xl font-black text-[#08163F]">{valor}</p>
    </div>
  );
}