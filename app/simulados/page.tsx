"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

type StatusSimulado = "Rascunho" | "Publicado" | "Bloqueado";

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
  status: StatusSimulado;
  tempoEstimado: string;
  dataCriacao: string;
  mentorados: number;
  questoes: Questao[];
};

const STORAGE_KEY = "ceoclub_simulados_mentor";

const simuladosIniciais: Simulado[] = [
  {
    id: "posicionamento-teste",
    titulo: "Simulado de Posicionamento",
    modulo: "Posicionamento",
    descricao:
      "Teste de protótipo sobre clareza de marca, autoridade e diferenciação.",
    publicadoPor: "Mentora Dra. Luciana Rocha",
    status: "Bloqueado",
    tempoEstimado: "5 min",
    dataCriacao: "30/04",
    mentorados: 12,
    questoes: [
      {
        id: "q1",
        pergunta:
          "Qual é o principal objetivo do posicionamento dentro de uma marca pessoal?",
        alternativas: [
          "Copiar concorrentes",
          "Ser lembrado por uma percepção clara e estratégica",
          "Postar sem estratégia",
          "Usar apenas identidade visual bonita",
        ],
        correta: 1,
        explicacao:
          "Posicionamento é sobre ocupar um espaço claro na mente do público.",
      },
      {
        id: "q2",
        pergunta: "Uma boa promessa de posicionamento deve se basear em:",
        alternativas: [
          "Preço baixo",
          "Quantidade de seguidores",
          "Valor percebido e transformação entregue",
          "Sorte no algoritmo",
        ],
        correta: 2,
        explicacao:
          "A promessa precisa comunicar transformação, clareza e valor percebido.",
      },
      {
        id: "q3",
        pergunta:
          "Quando um profissional tenta falar com todo mundo, o que costuma acontecer?",
        alternativas: [
          "A comunicação fica mais forte",
          "A marca fica mais memorável",
          "A mensagem perde força e clareza",
          "O público entende melhor a oferta",
        ],
        correta: 2,
        explicacao:
          "Falar com todo mundo geralmente dilui a mensagem e enfraquece a marca.",
      },
    ],
  },
  {
    id: "vendas-consultivas",
    titulo: "Simulado de Vendas Consultivas",
    modulo: "Vendas",
    descricao:
      "Simulado completo sobre diagnóstico, objeções e fechamento premium.",
    publicadoPor: "Mentora Dra. Luciana Rocha",
    status: "Publicado",
    tempoEstimado: "30 min",
    dataCriacao: "28/04",
    mentorados: 8,
    questoes: Array.from({ length: 30 }, (_, index) => ({
      id: `vendas-${index + 1}`,
      pergunta: `Pergunta ${index + 1} de vendas consultivas`,
      alternativas: ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
      correta: 1,
      explicacao: "Explicação da questão.",
    })),
  },
];

export default function SimuladosMentoraPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [titulo, setTitulo] = useState("");
  const [modulo, setModulo] = useState("Posicionamento");
  const [descricao, setDescricao] = useState("");
  const [tempoEstimado, setTempoEstimado] = useState("30 min");

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

    const dadosSalvos = localStorage.getItem(STORAGE_KEY);

    if (dadosSalvos) {
      setSimulados(JSON.parse(dadosSalvos));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simuladosIniciais));
      setSimulados(simuladosIniciais);
    }
  }, [router]);

  useEffect(() => {
    if (simulados.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simulados));
    }
  }, [simulados]);

  const simuladosFiltrados = useMemo(() => {
    return simulados.filter((simulado) =>
      `${simulado.titulo} ${simulado.modulo} ${simulado.status}`
        .toLowerCase()
        .includes(busca.toLowerCase())
    );
  }, [simulados, busca]);

  const resumo = useMemo(() => {
    return {
      total: simulados.length,
      publicados: simulados.filter((s) => s.status === "Publicado").length,
      rascunhos: simulados.filter((s) => s.status === "Rascunho").length,
      bloqueados: simulados.filter((s) => s.status === "Bloqueado").length,
    };
  }, [simulados]);

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  function limparFormulario() {
    setTitulo("");
    setModulo("Posicionamento");
    setDescricao("");
    setTempoEstimado("30 min");
    setErro("");
    setSucesso("");
  }

  function criarSimulado(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (!titulo.trim()) {
      setErro("Digite um título para o simulado.");
      return;
    }

    if (!descricao.trim()) {
      setErro("Digite uma descrição para orientar o mentorado.");
      return;
    }

    const novoSimulado: Simulado = {
      id: String(Date.now()),
      titulo: titulo.trim(),
      modulo,
      descricao: descricao.trim(),
      publicadoPor: usuario?.nome ?? "Mentora",
      status: "Bloqueado",
      tempoEstimado,
      dataCriacao: "Hoje",
      mentorados: 0,
      questoes: [],
    };

    const novaLista = [novoSimulado, ...simulados];

    setSimulados(novaLista);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));

    limparFormulario();
    setMostrarFormulario(false);

    router.push(`/simulados/${novoSimulado.id}/editar`);
  }

  function publicarSimulado(id: string) {
    setErro("");
    setSucesso("");

    const simulado = simulados.find((item) => item.id === id);

    if (!simulado) return;

    if (simulado.questoes.length < 30) {
      setErro(
        `O simulado "${simulado.titulo}" tem ${simulado.questoes.length} questões. Para publicar, precisa ter no mínimo 30.`
      );
      return;
    }

    setSimulados((atual) =>
      atual.map((item) =>
        item.id === id ? { ...item, status: "Publicado" } : item
      )
    );

    setSucesso("Simulado publicado para os mentorados.");
  }

  function excluirSimulado(id: string) {
    const confirmar = confirm("Tem certeza que deseja excluir este simulado?");

    if (!confirmar) return;

    setSimulados((atual) => atual.filter((simulado) => simulado.id !== id));
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
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-8 backdrop-blur-xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
              Área da mentora
            </p>
            <h1 className="text-xl font-black">Simulados</h1>
          </div>

          <button
            onClick={sair}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Sair
          </button>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-8 py-10">
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                  Gestão de simulados
                </p>

                <h2 className="mt-3 text-4xl font-black">
                  Crie, edite e publique avaliações
                </h2>

                <p className="mt-3 max-w-2xl text-[#D9DEE7]">
                  Crie simulados por módulo, cadastre perguntas e publique para
                  os mentorados. Para publicar, o simulado precisa ter pelo menos
                  30 questões.
                </p>
              </div>

              <button
                onClick={() => setMostrarFormulario((atual) => !atual)}
                className="rounded-2xl bg-white px-6 py-4 font-black text-[#08163F] shadow-lg transition hover:brightness-95"
              >
                {mostrarFormulario ? "Fechar formulário" : "+ Novo simulado"}
              </button>
            </div>
          </section>

          <section className="mb-7 grid gap-5 xl:grid-cols-4">
            <KPI titulo="Total" valor={resumo.total} destaque />
            <KPI titulo="Publicados" valor={resumo.publicados} />
            <KPI titulo="Rascunhos" valor={resumo.rascunhos} />
            <KPI titulo="Bloqueados" valor={resumo.bloqueados} alerta />
          </section>

          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mb-6 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
              {sucesso}
            </div>
          )}

          {mostrarFormulario && (
            <form
              onSubmit={criarSimulado}
              className="mb-8 rounded-[32px] bg-white p-7 shadow-lg"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-black text-[#050816]">
                  Criar novo simulado
                </h3>

                <p className="mt-2 text-sm font-semibold text-gray-500">
                  Primeiro crie o rascunho. Depois você será levado para a tela
                  de edição para cadastrar as perguntas.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Campo label="Título do simulado">
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Simulado de Vendas Premium"
                    className="input-ceo"
                  />
                </Campo>

                <Campo label="Módulo">
                  <select
                    value={modulo}
                    onChange={(e) => setModulo(e.target.value)}
                    className="input-ceo"
                  >
                    <option>Posicionamento</option>
                    <option>Vendas</option>
                    <option>Marketing</option>
                    <option>Fechamento</option>
                    <option>Gestão</option>
                  </select>
                </Campo>

                <Campo label="Tempo estimado">
                  <input
                    value={tempoEstimado}
                    onChange={(e) => setTempoEstimado(e.target.value)}
                    placeholder="Ex: 30 min"
                    className="input-ceo"
                  />
                </Campo>

                <Campo label="Publicado por">
                  <input
                    value={usuario.nome}
                    disabled
                    className="input-ceo cursor-not-allowed opacity-70"
                  />
                </Campo>

                <div className="md:col-span-2">
                  <Campo label="Descrição para o mentorado">
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Explique o objetivo deste simulado..."
                      rows={4}
                      className="input-ceo resize-none"
                    />
                  </Campo>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-yellow-50 p-5">
                <p className="font-black text-yellow-800">
                  Regra de publicação
                </p>
                <p className="mt-2 text-sm font-bold leading-relaxed text-yellow-700">
                  O simulado será criado como bloqueado enquanto tiver menos de
                  30 questões. Você poderá adicionar perguntas na tela de edição.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-4">
                <button
                  type="submit"
                  className="rounded-2xl bg-[#08163F] px-7 py-4 font-black text-white shadow-lg transition hover:brightness-110"
                >
                  Criar e editar perguntas →
                </button>

                <button
                  type="button"
                  onClick={() => {
                    limparFormulario();
                    setMostrarFormulario(false);
                  }}
                  className="rounded-2xl bg-[#f3f5f8] px-7 py-4 font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="mb-6 rounded-[26px] bg-white p-4 shadow-lg">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, módulo ou status..."
              className="w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-5 py-4 font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
            />
          </div>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="space-y-5">
              {simuladosFiltrados.map((simulado) => (
                <div
                  key={simulado.id}
                  className="rounded-[30px] bg-white p-6 shadow-lg"
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
                        Criado em {simulado.dataCriacao} · {simulado.mentorados}{" "}
                        mentorados
                      </p>
                    </div>

                    <div className="grid min-w-[260px] grid-cols-2 gap-3">
                      <MiniInfo label="Questões" value={simulado.questoes.length} />
                      <MiniInfo label="Tempo" value={simulado.tempoEstimado} />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                      onClick={() =>
                        router.push(`/simulados/${simulado.id}/editar`)
                      }
                      className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                    >
                      Editar →
                    </button>

                    <button
                      onClick={() => publicarSimulado(simulado.id)}
                      className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                    >
                      Publicar
                    </button>

                    <button
                      onClick={() => excluirSimulado(simulado.id)}
                      className="rounded-2xl bg-red-50 px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <aside className="space-y-6">
              <Card titulo="Regra de publicação">
                <div className="rounded-2xl bg-yellow-50 p-5">
                  <p className="text-sm font-bold leading-relaxed text-yellow-800">
                    A publicação será bloqueada se o simulado tiver menos de 30
                    questões. No protótipo, você pode criar com menos perguntas
                    para testar o fluxo, mas ele não será publicado.
                  </p>
                </div>
              </Card>

              <Card titulo="Fluxo ideal">
                <div className="space-y-4">
                  <Regra numero="1" texto="Crie o simulado como rascunho." />
                  <Regra numero="2" texto="Adicione perguntas e alternativas." />
                  <Regra numero="3" texto="Cadastre pelo menos 30 questões." />
                  <Regra numero="4" texto="Publique para os mentorados." />
                </div>
              </Card>
            </aside>
          </section>
        </div>
      </section>

      <style jsx global>{`
        .input-ceo {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          padding: 1rem;
          font-weight: 700;
          color: #08163f;
          outline: none;
          transition: 0.2s ease;
        }

        .input-ceo::placeholder {
          color: #9ca3af;
        }

        .input-ceo:focus {
          border-color: #12317c;
          box-shadow: 0 0 0 4px rgba(18, 49, 124, 0.1);
          background: white;
        }
      `}</style>
    </main>
  );
}

function KPI({
  titulo,
  valor,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: React.ReactNode;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-[26px] p-6 shadow-lg ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : alerta
          ? "bg-red-50 text-red-800"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          destaque ? "text-[#C9CED6]" : alerta ? "text-red-500" : "text-gray-500"
        }`}
      >
        {titulo}
      </p>

      <p className="mt-4 text-3xl font-black">{valor}</p>
    </div>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="text-sm font-black text-gray-500">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
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

function StatusBadge({ status }: { status: StatusSimulado }) {
  const classes = {
    Rascunho: "bg-yellow-100 text-yellow-700",
    Publicado: "bg-green-100 text-green-700",
    Bloqueado: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}>
      {status}
    </span>
  );
}