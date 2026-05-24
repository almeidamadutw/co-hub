"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { CEOCLUB_KEYS } from "@/utils/ceoclubKeys";

type StatusSimulado = "Rascunho" | "Publicado" | "Bloqueado";

type TipoPergunta =
  | "multipla-escolha"
  | "checkbox"
  | "verdadeiro-falso"
  | "dissertativa"
  | "escala"
  | "envio-arquivo";

type Alternativa = {
  id: string;
  texto: string;
  imagem?: string | null;
};

type Questao = {
  id: string;
  tipo: TipoPergunta;
  enunciado: string;
  descricao: string;
  imagem?: string | null;
  obrigatoria: boolean;
  pontos: number;
  alternativas: Alternativa[];
  respostasCorretas: number[];
  explicacao: string;
  escala?: {
    minimo: number;
    maximo: number;
    rotuloMinimo: string;
    rotuloMaximo: string;
  };
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
  ativo?: boolean;
  moduloId?: string;
  moduloTitulo?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

const STORAGE_KEY = CEOCLUB_KEYS.simulados;

const tiposPergunta: { label: string; value: TipoPergunta; descricao: string }[] =
  [
    {
      label: "Múltipla escolha",
      value: "multipla-escolha",
      descricao: "Uma resposta correta entre várias opções.",
    },
    {
      label: "Caixas de seleção",
      value: "checkbox",
      descricao: "Uma ou mais respostas corretas.",
    },
    {
      label: "Verdadeiro ou falso",
      value: "verdadeiro-falso",
      descricao: "Escolha rápida entre verdadeiro e falso.",
    },
    {
      label: "Resposta discursiva",
      value: "dissertativa",
      descricao: "Resposta aberta para análise do mentor.",
    },
    {
      label: "Escala",
      value: "escala",
      descricao: "Resposta em escala numérica.",
    },
    {
      label: "Envio de arquivo",
      value: "envio-arquivo",
      descricao: "Para pedir imagem, PDF ou documento.",
    },
  ];

const modulosDisponiveis = [
  "Comece aqui",
  "Posicionamento",
  "Vendas",
  "Marketing",
  "Fechamento",
  "Gestão",
];

function criarAlternativasIniciais(): Alternativa[] {
  return [
    { id: crypto.randomUUID(), texto: "", imagem: null },
    { id: crypto.randomUUID(), texto: "", imagem: null },
    { id: crypto.randomUUID(), texto: "", imagem: null },
    { id: crypto.randomUUID(), texto: "", imagem: null },
  ];
}

function normalizarQuestao(questao: any): Questao {
  if (questao.enunciado && questao.tipo) {
    return {
      ...questao,
      descricao: questao.descricao ?? "",
      imagem: questao.imagem ?? null,
      obrigatoria: questao.obrigatoria ?? true,
      pontos: questao.pontos ?? 1,
      alternativas: questao.alternativas ?? criarAlternativasIniciais(),
      respostasCorretas: questao.respostasCorretas ?? [],
      explicacao: questao.explicacao ?? "",
    } as Questao;
  }

  const alternativasNormalizadas =
    questao.alternativas?.map((alternativa: any, index: number) => ({
      id: alternativa.id ?? String(index + 1),
      texto: alternativa.texto ?? alternativa ?? "",
      imagem: alternativa.imagem ?? null,
    })) ?? criarAlternativasIniciais();

  const respostaCorretaId = questao.respostaCorretaId ?? questao.correta ?? "1";

  const indiceCorreto = alternativasNormalizadas.findIndex(
    (alternativa: Alternativa) => alternativa.id === String(respostaCorretaId)
  );

  return {
    id: questao.id ?? crypto.randomUUID(),
    tipo: "multipla-escolha",
    enunciado: questao.enunciado ?? questao.pergunta ?? "Pergunta sem título",
    descricao: questao.descricao ?? "",
    imagem: questao.imagem ?? null,
    obrigatoria: questao.obrigatoria ?? true,
    pontos: questao.pontos ?? 1,
    alternativas: alternativasNormalizadas,
    respostasCorretas: indiceCorreto >= 0 ? [indiceCorreto] : [],
    explicacao: questao.explicacao ?? "",
  };
}

function normalizarSimulado(simulado: any): Simulado {
  const questoes = (simulado.questoes ?? []).map(normalizarQuestao);

  const status: StatusSimulado =
    simulado.status ??
    (simulado.ativo
      ? "Publicado"
      : questoes.length >= 30
      ? "Rascunho"
      : "Bloqueado");

  return {
    ...simulado,
    id: simulado.id ?? crypto.randomUUID(),
    titulo: simulado.titulo ?? "Simulado sem título",
    modulo: simulado.modulo ?? simulado.moduloTitulo ?? "Sem módulo",
    descricao: simulado.descricao ?? "",
    publicadoPor: simulado.publicadoPor ?? "Mentor",
    status,
    tempoEstimado: simulado.tempoEstimado ?? "30 min",
    dataCriacao:
      simulado.dataCriacao ??
      simulado.criadoEm ??
      simulado.data ??
      new Date().toISOString(),
    mentorados: simulado.mentorados ?? 0,
    ativo: simulado.ativo ?? status === "Publicado",
    moduloId: simulado.moduloId ?? "",
    moduloTitulo: simulado.moduloTitulo ?? simulado.modulo ?? "Sem módulo",
    criadoEm:
      simulado.criadoEm ??
      simulado.dataCriacao ??
      simulado.data ??
      new Date().toISOString(),
    atualizadoEm: simulado.atualizadoEm ?? new Date().toISOString(),
    questoes,
  };
}

export default function EditarSimuladoPage() {
  const router = useRouter();
  const params = useParams();

  const simuladoId = String(params.id);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [simulado, setSimulado] = useState<Simulado | null>(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [titulo, setTitulo] = useState("");
  const [modulo, setModulo] = useState("Posicionamento");
  const [descricao, setDescricao] = useState("");
  const [tempoEstimado, setTempoEstimado] = useState("30 min");

  const [questaoEditandoId, setQuestaoEditandoId] = useState<string | null>(
    null
  );
  const [tipoPergunta, setTipoPergunta] =
    useState<TipoPergunta>("multipla-escolha");
  const [enunciado, setEnunciado] = useState("");
  const [descricaoPergunta, setDescricaoPergunta] = useState("");
  const [imagemPergunta, setImagemPergunta] = useState<string | null>(null);
  const [obrigatoria, setObrigatoria] = useState(true);
  const [pontos, setPontos] = useState(1);
  const [alternativas, setAlternativas] = useState<Alternativa[]>(
    criarAlternativasIniciais()
  );
  const [respostasCorretas, setRespostasCorretas] = useState<number[]>([]);
  const [explicacao, setExplicacao] = useState("");
  const [escalaMin, setEscalaMin] = useState(1);
  const [escalaMax, setEscalaMax] = useState(5);
  const [rotuloMinimo, setRotuloMinimo] = useState("Pouco");
  const [rotuloMaximo, setRotuloMaximo] = useState("Muito");

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
    const listaBruta = dadosSalvos ? JSON.parse(dadosSalvos) : [];
    const listaNormalizada = listaBruta.map(normalizarSimulado);

    setSimulados(listaNormalizada);

    const encontrado =
      listaNormalizada.find((item: Simulado) => item.id === simuladoId) ?? null;

    setSimulado(encontrado);

    if (encontrado) {
      setTitulo(encontrado.titulo);
      setModulo(encontrado.modulo);
      setDescricao(encontrado.descricao);
      setTempoEstimado(encontrado.tempoEstimado);
    }
  }, [router, simuladoId]);

  const podePublicar = useMemo(() => {
    return (simulado?.questoes.length ?? 0) >= 30;
  }, [simulado]);

  const progressoPublicacao = useMemo(() => {
    if (!simulado) return 0;
    return Math.min(Math.round((simulado.questoes.length / 30) * 100), 100);
  }, [simulado]);

  function persistir(listaAtualizada: Simulado[], simuladoAtualizado: Simulado) {
    const agora = new Date().toISOString();

    const listaSincronizada = listaAtualizada.map((item: Simulado) => ({
      ...item,
      ativo: item.status === "Publicado",
      moduloId: item.moduloId ?? "",
      moduloTitulo: item.modulo ?? item.moduloTitulo ?? "",
      criadoEm: item.criadoEm ?? item.dataCriacao ?? agora,
      atualizadoEm: agora,
    }));

    const simuladoSincronizado: Simulado = {
      ...simuladoAtualizado,
      ativo: simuladoAtualizado.status === "Publicado",
      moduloId: simuladoAtualizado.moduloId ?? "",
      moduloTitulo: simuladoAtualizado.modulo,
      criadoEm:
        simuladoAtualizado.criadoEm ??
        simuladoAtualizado.dataCriacao ??
        agora,
      atualizadoEm: agora,
    };

    setSimulados(listaSincronizada);
    setSimulado(simuladoSincronizado);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listaSincronizada));
  }

  function calcularStatus(
    questoesAtualizadas: Questao[],
    statusAtual: StatusSimulado
  ) {
    if (statusAtual === "Publicado" && questoesAtualizadas.length >= 30) {
      return "Publicado";
    }

    return questoesAtualizadas.length >= 30 ? "Rascunho" : "Bloqueado";
  }

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  function salvarDadosGerais(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (!simulado) return;

    if (!titulo.trim() || !descricao.trim()) {
      setErro("Preencha título e descrição do simulado.");
      return;
    }

    const atualizado: Simulado = {
      ...simulado,
      titulo: titulo.trim(),
      modulo,
      descricao: descricao.trim(),
      tempoEstimado,
    };

    const listaAtualizada = simulados.map((item) =>
      item.id === atualizado.id ? atualizado : item
    );

    persistir(listaAtualizada, atualizado);
    setSucesso("Dados gerais salvos.");
  }

  function lerImagem(arquivo: File, callback: (resultado: string) => void) {
    if (!arquivo.type.startsWith("image/")) {
      setErro("Selecione apenas arquivos de imagem.");
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      callback(leitor.result as string);
    };

    leitor.readAsDataURL(arquivo);
  }

  function alterarImagemPergunta(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    lerImagem(arquivo, setImagemPergunta);
  }

  function alterarImagemAlternativa(
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    lerImagem(arquivo, (resultado) => {
      setAlternativas((atuais) =>
        atuais.map((alternativa, i) =>
          i === index ? { ...alternativa, imagem: resultado } : alternativa
        )
      );
    });
  }

  function mudarTipoPergunta(novoTipo: TipoPergunta) {
    setTipoPergunta(novoTipo);
    setRespostasCorretas([]);

    if (novoTipo === "verdadeiro-falso") {
      setAlternativas([
        { id: crypto.randomUUID(), texto: "Verdadeiro", imagem: null },
        { id: crypto.randomUUID(), texto: "Falso", imagem: null },
      ]);
      return;
    }

    if (novoTipo === "multipla-escolha" || novoTipo === "checkbox") {
      setAlternativas(criarAlternativasIniciais());
      return;
    }

    setAlternativas([]);
  }

  function atualizarTextoAlternativa(index: number, texto: string) {
    setAlternativas((atuais) =>
      atuais.map((alternativa, i) =>
        i === index ? { ...alternativa, texto } : alternativa
      )
    );
  }

  function adicionarAlternativa() {
    setAlternativas((atuais) => [
      ...atuais,
      { id: crypto.randomUUID(), texto: "", imagem: null },
    ]);
  }

  function removerAlternativa(index: number) {
    setAlternativas((atuais) => atuais.filter((_, i) => i !== index));
    setRespostasCorretas((atuais) =>
      atuais
        .filter((resposta) => resposta !== index)
        .map((resposta) => (resposta > index ? resposta - 1 : resposta))
    );
  }

  function selecionarRespostaCorreta(index: number) {
    if (tipoPergunta === "checkbox") {
      setRespostasCorretas((atuais) =>
        atuais.includes(index)
          ? atuais.filter((item) => item !== index)
          : [...atuais, index]
      );
      return;
    }

    setRespostasCorretas([index]);
  }

  function limparFormularioPergunta() {
    setQuestaoEditandoId(null);
    setTipoPergunta("multipla-escolha");
    setEnunciado("");
    setDescricaoPergunta("");
    setImagemPergunta(null);
    setObrigatoria(true);
    setPontos(1);
    setAlternativas(criarAlternativasIniciais());
    setRespostasCorretas([]);
    setExplicacao("");
    setEscalaMin(1);
    setEscalaMax(5);
    setRotuloMinimo("Pouco");
    setRotuloMaximo("Muito");
  }

  function validarPergunta() {
    if (!enunciado.trim()) {
      return "Digite o enunciado da pergunta.";
    }

    if (
      tipoPergunta === "multipla-escolha" ||
      tipoPergunta === "checkbox" ||
      tipoPergunta === "verdadeiro-falso"
    ) {
      const alternativasValidas = alternativas.filter(
        (alternativa) => alternativa.texto.trim() || alternativa.imagem
      );

      if (alternativasValidas.length < 2) {
        return "Cadastre pelo menos duas alternativas.";
      }

      if (respostasCorretas.length === 0) {
        return "Marque pelo menos uma resposta correta.";
      }
    }

    if (tipoPergunta === "escala" && escalaMin >= escalaMax) {
      return "Na escala, o valor mínimo precisa ser menor que o máximo.";
    }

    return "";
  }

  function salvarPergunta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (!simulado) return;

    const mensagemErro = validarPergunta();

    if (mensagemErro) {
      setErro(mensagemErro);
      return;
    }

    const novaQuestao: Questao = {
      id: questaoEditandoId ?? crypto.randomUUID(),
      tipo: tipoPergunta,
      enunciado: enunciado.trim(),
      descricao: descricaoPergunta.trim(),
      imagem: imagemPergunta,
      obrigatoria,
      pontos,
      alternativas,
      respostasCorretas,
      explicacao: explicacao.trim(),
      escala:
        tipoPergunta === "escala"
          ? {
              minimo: escalaMin,
              maximo: escalaMax,
              rotuloMinimo,
              rotuloMaximo,
            }
          : undefined,
    };

    const questoesAtualizadas = questaoEditandoId
      ? simulado.questoes.map((questao) =>
          questao.id === questaoEditandoId ? novaQuestao : questao
        )
      : [...simulado.questoes, novaQuestao];

    const atualizado: Simulado = {
      ...simulado,
      questoes: questoesAtualizadas,
      status: calcularStatus(questoesAtualizadas, simulado.status),
    };

    const listaAtualizada = simulados.map((item) =>
      item.id === atualizado.id ? atualizado : item
    );

    persistir(listaAtualizada, atualizado);
    limparFormularioPergunta();
    setSucesso(
      questaoEditandoId ? "Pergunta atualizada." : "Pergunta adicionada."
    );
  }

  function editarPergunta(questao: Questao) {
    setQuestaoEditandoId(questao.id);
    setTipoPergunta(questao.tipo);
    setEnunciado(questao.enunciado);
    setDescricaoPergunta(questao.descricao);
    setImagemPergunta(questao.imagem ?? null);
    setObrigatoria(questao.obrigatoria);
    setPontos(questao.pontos);
    setAlternativas(questao.alternativas ?? []);
    setRespostasCorretas(questao.respostasCorretas ?? []);
    setExplicacao(questao.explicacao ?? "");
    setEscalaMin(questao.escala?.minimo ?? 1);
    setEscalaMax(questao.escala?.maximo ?? 5);
    setRotuloMinimo(questao.escala?.rotuloMinimo ?? "Pouco");
    setRotuloMaximo(questao.escala?.rotuloMaximo ?? "Muito");

    window.scrollTo({ top: 520, behavior: "smooth" });
  }

  function duplicarPergunta(questao: Questao) {
    if (!simulado) return;

    const copia: Questao = {
      ...questao,
      id: crypto.randomUUID(),
      enunciado: `${questao.enunciado} (cópia)`,
      alternativas: questao.alternativas.map((alternativa) => ({
        ...alternativa,
        id: crypto.randomUUID(),
      })),
    };

    const questoesAtualizadas = [...simulado.questoes, copia];

    const atualizado: Simulado = {
      ...simulado,
      questoes: questoesAtualizadas,
      status: calcularStatus(questoesAtualizadas, simulado.status),
    };

    const listaAtualizada = simulados.map((item) =>
      item.id === atualizado.id ? atualizado : item
    );

    persistir(listaAtualizada, atualizado);
    setSucesso("Pergunta duplicada.");
  }

  function excluirPergunta(id: string) {
    if (!simulado) return;

    const confirmar = confirm("Excluir esta pergunta?");
    if (!confirmar) return;

    const questoesAtualizadas = simulado.questoes.filter(
      (questao) => questao.id !== id
    );

    const atualizado: Simulado = {
      ...simulado,
      questoes: questoesAtualizadas,
      status: calcularStatus(questoesAtualizadas, simulado.status),
    };

    const listaAtualizada = simulados.map((item) =>
      item.id === atualizado.id ? atualizado : item
    );

    persistir(listaAtualizada, atualizado);
    setSucesso("Pergunta excluída.");
  }

  function publicarSimulado() {
    setErro("");
    setSucesso("");

    if (!simulado) return;

    if (simulado.questoes.length < 30) {
      setErro(
        `Este simulado tem ${simulado.questoes.length} perguntas. Para publicar, precisa ter no mínimo 30.`
      );
      return;
    }

    const atualizado: Simulado = {
      ...simulado,
      status: "Publicado",
    };

    const listaAtualizada = simulados.map((item) =>
      item.id === atualizado.id ? atualizado : item
    );

    persistir(listaAtualizada, atualizado);
    setSucesso("Simulado publicado com sucesso.");
  }

  if (!usuario) {
    return <MentorLoading mensagem="Carregando edição..." />;
  }

  if (!simulado) {
    return (
      <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
        <Sidebar nome={usuario.nome} role={usuario.role} />

        <section className="relative flex min-w-0 flex-1 items-center justify-center overflow-x-hidden p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-[24px] bg-white p-6 text-center shadow-xl shadow-slate-200/70 sm:p-8">
            <h1 className="break-words text-2xl font-black sm:text-3xl">
              Simulado não encontrado
            </h1>

            <p className="mt-3 break-words text-sm font-semibold leading-6 text-gray-500">
              Esse simulado não existe ou foi removido.
            </p>

            <button
              onClick={() => router.push("/simulados")}
              className="mt-6 rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white"
            >
              Voltar para simulados
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => router.push("/simulados")}
              className="rounded-xl bg-[#f3f5f8] px-3 py-2 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
            >
              ← Voltar
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
                Editor de simulado
              </p>

              <h1 className="truncate text-base font-black sm:text-lg md:text-xl">{simulado.titulo}</h1>
            </div>
          </div>

          <button
            onClick={sair}
            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
          >
            Sair
          </button>
        </header>

        <div className="relative min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px] lg:p-6">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                  {simulado.modulo}
                </p>

                <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                  Construtor de perguntas
                </h2>

                <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-[#D9DEE7]">
                  Monte o simulado como um formulário completo. Use múltipla
                  escolha, caixas de seleção, escala, resposta discursiva, envio
                  de arquivo e imagens.
                </p>
              </div>

              <div className="min-w-0 rounded-[20px] bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-bold text-[#C9CED6]">
                  Perguntas cadastradas
                </p>

                <p className="mt-2 break-words text-2xl font-black sm:text-3xl">
                  {simulado.questoes.length}/30
                </p>
              </div>
            </div>
          </section>

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mb-4 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
              {sucesso}
            </div>
          )}

          <section className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI titulo="Status" valor={simulado.status} destaque />
            <KPI titulo="Perguntas" valor={simulado.questoes.length} />
            <KPI titulo="Mínimo" valor="30" />
            <KPI
              titulo="Publicação"
              valor={podePublicar ? "Liberada" : "Bloqueada"}
              alerta={!podePublicar}
            />
          </section>

          <section className="mb-4 min-w-0 rounded-[20px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-500">
                Progresso para publicação
              </p>

              <p className="text-sm font-black text-[#08163F]">
                {progressoPublicacao}%
              </p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                style={{ width: `${progressoPublicacao}%` }}
              />
            </div>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
            <div className="min-w-0 space-y-4">
              <Card titulo="Configurações do simulado">
                <form onSubmit={salvarDadosGerais} className="space-y-3">
                  <Campo label="Título">
                    <input
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      className="input-ceo"
                    />
                  </Campo>

                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    <Campo label="Módulo">
                      <select
                        value={modulo}
                        onChange={(e) => setModulo(e.target.value)}
                        className="input-ceo"
                      >
                        {modulosDisponiveis.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </Campo>

                    <Campo label="Tempo estimado">
                      <input
                        value={tempoEstimado}
                        onChange={(e) => setTempoEstimado(e.target.value)}
                        className="input-ceo"
                      />
                    </Campo>
                  </div>

                  <Campo label="Descrição para o mentorado">
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      rows={4}
                      className="input-ceo resize-none"
                    />
                  </Campo>

                  <button
                    type="submit"
                    className="rounded-2xl bg-[#08163F] px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                  >
                    Salvar configurações
                  </button>
                </form>
              </Card>

              <Card
                titulo={questaoEditandoId ? "Editar pergunta" : "Nova pergunta"}
              >
                <form onSubmit={salvarPergunta} className="space-y-3">
                  <Campo label="Tipo de pergunta">
                    <select
                      value={tipoPergunta}
                      onChange={(e) =>
                        mudarTipoPergunta(e.target.value as TipoPergunta)
                      }
                      className="input-ceo"
                    >
                      {tiposPergunta.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <div className="min-w-0 rounded-2xl bg-[#EEF2FF] p-3 sm:p-4">
                    <p className="text-sm font-bold text-[#08163F]">
                      {
                        tiposPergunta.find(
                          (tipo) => tipo.value === tipoPergunta
                        )?.descricao
                      }
                    </p>
                  </div>

                  <Campo label="Enunciado">
                    <textarea
                      value={enunciado}
                      onChange={(e) => setEnunciado(e.target.value)}
                      placeholder="Digite a pergunta..."
                      rows={3}
                      className="input-ceo resize-none"
                    />
                  </Campo>

                  <Campo label="Descrição ou instrução adicional">
                    <textarea
                      value={descricaoPergunta}
                      onChange={(e) => setDescricaoPergunta(e.target.value)}
                      placeholder="Ex: analise o cenário abaixo antes de responder..."
                      rows={2}
                      className="input-ceo resize-none"
                    />
                  </Campo>

                  <div className="min-w-0 rounded-[20px] bg-[#f9fafb] p-4">
                    <p className="text-sm font-black text-gray-500">
                      Imagem da pergunta
                    </p>

                    {imagemPergunta && (
                      <img
                        src={imagemPergunta}
                        alt="Imagem da pergunta"
                        className="mt-3 max-h-52 rounded-2xl object-cover"
                      />
                    )}

                    <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={alterarImagemPergunta}
                        className="input-ceo"
                      />

                      {imagemPergunta && (
                        <button
                          type="button"
                          onClick={() => setImagemPergunta(null)}
                          className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-100"
                        >
                          Remover imagem
                        </button>
                      )}
                    </div>
                  </div>

                  {(tipoPergunta === "multipla-escolha" ||
                    tipoPergunta === "checkbox" ||
                    tipoPergunta === "verdadeiro-falso") && (
                    <div className="space-y-3 rounded-[20px] bg-[#f9fafb] p-4">
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="break-words text-lg font-black text-[#08163F]">
                            Alternativas
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-gray-500">
                            Marque a resposta correta. No tipo checkbox, pode
                            marcar mais de uma.
                          </p>
                        </div>

                        {tipoPergunta !== "verdadeiro-falso" && (
                          <button
                            type="button"
                            onClick={adicionarAlternativa}
                            className="rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-sm transition hover:shadow-md sm:text-sm"
                          >
                            + Alternativa
                          </button>
                        )}
                      </div>

                      {alternativas.map((alternativa, index) => {
                        const marcada = respostasCorretas.includes(index);

                        return (
                          <div
                            key={alternativa.id}
                            className="rounded-2xl bg-white p-3 shadow-sm sm:p-4"
                          >
                            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start">
                              <button
                                type="button"
                                onClick={() => selecionarRespostaCorreta(index)}
                                className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black transition ${
                                  marcada
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {marcada
                                  ? "✓"
                                  : String.fromCharCode(65 + index)}
                              </button>

                              <div className="flex-1 space-y-3">
                                <input
                                  value={alternativa.texto}
                                  onChange={(e) =>
                                    atualizarTextoAlternativa(
                                      index,
                                      e.target.value
                                    )
                                  }
                                  placeholder={`Alternativa ${String.fromCharCode(
                                    65 + index
                                  )}`}
                                  className="input-ceo"
                                />

                                {alternativa.imagem && (
                                  <img
                                    src={alternativa.imagem}
                                    alt="Imagem da alternativa"
                                    className="max-h-48 rounded-2xl object-cover"
                                  />
                                )}

                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    alterarImagemAlternativa(index, e)
                                  }
                                  className="input-ceo"
                                />
                              </div>

                              {tipoPergunta !== "verdadeiro-falso" &&
                                alternativas.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removerAlternativa(index)}
                                    className="rounded-2xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100 sm:text-sm"
                                  >
                                    Remover
                                  </button>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {tipoPergunta === "escala" && (
                    <div className="min-w-0 rounded-[20px] bg-[#f9fafb] p-4">
                      <h3 className="break-words text-lg font-black text-[#08163F]">
                        Configuração da escala
                      </h3>

                      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
                        <Campo label="Valor mínimo">
                          <input
                            type="number"
                            value={escalaMin}
                            onChange={(e) =>
                              setEscalaMin(Number(e.target.value))
                            }
                            className="input-ceo"
                          />
                        </Campo>

                        <Campo label="Valor máximo">
                          <input
                            type="number"
                            value={escalaMax}
                            onChange={(e) =>
                              setEscalaMax(Number(e.target.value))
                            }
                            className="input-ceo"
                          />
                        </Campo>

                        <Campo label="Rótulo mínimo">
                          <input
                            value={rotuloMinimo}
                            onChange={(e) => setRotuloMinimo(e.target.value)}
                            className="input-ceo"
                          />
                        </Campo>

                        <Campo label="Rótulo máximo">
                          <input
                            value={rotuloMaximo}
                            onChange={(e) => setRotuloMaximo(e.target.value)}
                            className="input-ceo"
                          />
                        </Campo>
                      </div>
                    </div>
                  )}

                  {tipoPergunta === "envio-arquivo" && (
                    <div className="min-w-0 rounded-2xl bg-yellow-50 p-4">
                      <p className="font-black text-yellow-800">
                        Pergunta de envio de arquivo
                      </p>

                      <p className="mt-2 text-sm font-bold leading-relaxed text-yellow-700">
                        No protótipo, essa pergunta apenas registra que o
                        mentorado deverá anexar um arquivo. Na versão real, ela
                        será integrada com upload em storage.
                      </p>
                    </div>
                  )}

                  {tipoPergunta !== "escala" &&
                    tipoPergunta !== "envio-arquivo" && (
                      <Campo label="Explicação após responder">
                        <textarea
                          value={explicacao}
                          onChange={(e) => setExplicacao(e.target.value)}
                          placeholder="Explique por que a resposta correta faz sentido..."
                          rows={4}
                          className="input-ceo resize-none"
                        />
                      </Campo>
                    )}

                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    <Campo label="Pontuação">
                      <input
                        type="number"
                        min={0}
                        value={pontos}
                        onChange={(e) => setPontos(Number(e.target.value))}
                        className="input-ceo"
                      />
                    </Campo>

                    <Campo label="Obrigatória">
                      <select
                        value={obrigatoria ? "sim" : "nao"}
                        onChange={(e) =>
                          setObrigatoria(e.target.value === "sim")
                        }
                        className="input-ceo"
                      >
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </Campo>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="submit"
                      className="rounded-2xl bg-[#08163F] px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                    >
                      {questaoEditandoId
                        ? "Salvar pergunta"
                        : "Adicionar pergunta"}
                    </button>

                    <button
                      type="button"
                      onClick={limparFormularioPergunta}
                      className="rounded-2xl bg-[#f3f5f8] px-5 py-2.5 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                    >
                      Limpar
                    </button>
                  </div>
                </form>
              </Card>

              <Card titulo="Perguntas cadastradas">
                {simulado.questoes.length === 0 ? (
                  <div className="rounded-2xl bg-[#f9fafb] p-4 text-center sm:p-5">
                    <p className="font-black text-[#08163F]">
                      Nenhuma pergunta cadastrada ainda.
                    </p>

                    <p className="mt-2 text-sm font-semibold text-gray-500">
                      Use o construtor acima para montar o simulado.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {simulado.questoes.map((questao, index) => (
                      <div
                        key={questao.id}
                        className="min-w-0 rounded-2xl bg-[#f9fafb] p-4"
                      >
                        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="mb-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-[#08163F] px-3 py-1 text-xs font-black text-white">
                                Pergunta {index + 1}
                              </span>

                              <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-black text-[#08163F]">
                                {labelTipoPergunta(questao.tipo)}
                              </span>

                              {questao.obrigatoria && (
                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                                  Obrigatória
                                </span>
                              )}
                            </div>

                            <h3 className="break-words font-black text-[#08163F]">
                              {questao.enunciado}
                            </h3>

                            {questao.imagem && (
                              <img
                                src={questao.imagem}
                                alt="Imagem da pergunta"
                                className="mt-4 max-h-52 rounded-2xl object-cover"
                              />
                            )}

                            <p className="mt-3 text-sm font-semibold text-gray-500">
                              Pontos: {questao.pontos}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                              onClick={() => editarPergunta(questao)}
                              className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#08163F] shadow-sm transition hover:shadow-md sm:text-sm"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => duplicarPergunta(questao)}
                              className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#08163F] shadow-sm transition hover:shadow-md sm:text-sm"
                            >
                              Duplicar
                            </button>

                            <button
                              onClick={() => excluirPergunta(questao.id)}
                              className="rounded-2xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100 sm:text-sm"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <aside className="min-w-0 space-y-4">
              <Card titulo="Publicação">
                <div
                  className={`min-w-0 rounded-2xl p-4 ${
                    podePublicar ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <p
                    className={`font-black ${
                      podePublicar ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {podePublicar
                      ? "Este simulado pode ser publicado."
                      : "Este simulado ainda não pode ser publicado."}
                  </p>

                  <p className="mt-2 text-sm font-bold leading-relaxed text-gray-600">
                    Perguntas atuais: {simulado.questoes.length}. Mínimo para
                    publicação: 30.
                  </p>

                  <button
                    onClick={publicarSimulado}
                    className="mt-4 w-full rounded-2xl bg-[#08163F] px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                  >
                    Publicar simulado
                  </button>
                </div>
              </Card>

              <Card titulo="Prévia rápida">
                <div className="min-w-0 rounded-[20px] bg-[#f9fafb] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">
                    {modulo}
                  </p>

                  <h3 className="mt-2 break-words text-lg font-black text-[#08163F] sm:text-xl">
                    {titulo || "Título do simulado"}
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-500">
                    {descricao || "Descrição do simulado para o mentorado."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniInfo
                      label="Perguntas"
                      value={simulado.questoes.length}
                    />
                    <MiniInfo label="Tempo" value={tempoEstimado} />
                  </div>
                </div>
              </Card>

              <Card titulo="Boas práticas">
                <div className="space-y-3">
                  <Regra
                    numero="1"
                    texto="Misture questões fáceis, médias e difíceis."
                  />
                  <Regra
                    numero="2"
                    texto="Use imagens quando o contexto visual ajudar."
                  />
                  <Regra
                    numero="3"
                    texto="Sempre explique a resposta correta."
                  />
                  <Regra
                    numero="4"
                    texto="Evite alternativas ambíguas ou parecidas demais."
                  />
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
          padding: 0.75rem 0.9rem;
          font-size: 0.875rem;
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

function MentorLoading({ mensagem }: { mensagem: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] px-4 text-[#08163F]">
      <div className="w-full max-w-sm rounded-[24px] border border-white/60 bg-white/90 p-6 text-center shadow-xl shadow-slate-200/70 backdrop-blur-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-xs font-black text-white shadow-lg">
          CEO
        </div>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-slate-400">
          CEO Club
        </p>

        <h1 className="mt-2 break-words text-lg font-black leading-tight text-[#08163F] sm:text-xl">
          {mensagem}
        </h1>

        <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#12317C]" />
        </div>
      </div>
    </main>
  );
}

function labelTipoPergunta(tipo: TipoPergunta) {
  const mapa: Record<TipoPergunta, string> = {
    "multipla-escolha": "Múltipla escolha",
    checkbox: "Caixas de seleção",
    "verdadeiro-falso": "Verdadeiro ou falso",
    dissertativa: "Discursiva",
    escala: "Escala",
    "envio-arquivo": "Envio de arquivo",
  };

  return mapa[tipo];
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
      className={`min-w-0 overflow-hidden rounded-[20px] p-4 shadow-lg shadow-slate-200/70 sm:p-5 ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : alerta
          ? "bg-red-50 text-red-800"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`break-words text-xs font-black sm:text-sm ${
          destaque ? "text-[#C9CED6]" : alerta ? "text-red-500" : "text-gray-500"
        }`}
      >
        {titulo}
      </p>

      <p className="mt-3 break-words text-2xl font-black leading-tight sm:text-3xl">{valor}</p>
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
    <label className="min-w-0">
      <span className="break-words text-sm font-black text-gray-500">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function MiniInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <p className="mt-1 break-words font-black text-[#08163F]">{value}</p>
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
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-lg shadow-slate-200/70 sm:rounded-[24px]">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
        <h3 className="break-words text-lg font-black text-[#050816] sm:text-xl">{titulo}</h3>
      </div>

      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Regra({ numero, texto }: { numero: string; texto: string }) {
  return (
    <div className="flex min-w-0 gap-3 rounded-2xl bg-[#f9fafb] p-3 sm:p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#08163F] text-sm font-black text-white">
        {numero}
      </div>

      <p className="break-words text-sm font-bold leading-relaxed text-gray-600">{texto}</p>
    </div>
  );
}