"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/utils/supabase";
import { obterCabecalhoAutorizacao } from "@/utils/apiAuthClient";
import {
  AulaModulo,
  ModuloMentoria,
  PayloadModulo,
  getModuloDescricaoCurta,
  getModuloExplicativo,
  getModuloPremium,
  useModulosSupabase,
} from "@/utils/useModulosSupabase";
import { getUsuarioLogado, usuarioTemPermissao, User } from "@/utils/auth";

type FormModulo = {
  nomePremium: string;
  nomeExplicativo: string;
  descricaoCurta: string;
  objetivoModulo: string;
  aulaPrincipal: string;
  encontros: string;
  materiais: string;
  atividadePratica: string;
};

type FormAula = {
  moduloId: string;
  titulo: string;
  descricao: string;
  objetivo: string;
  duracao: string;
  videoUrl: string;
};

type ModoMaterial = "arquivo" | "link";

type TipoMaterial =
  | "pdf"
  | "video"
  | "link"
  | "imagem"
  | "documento"
  | "atividade"
  | "reuniao"
  | "outro";

type FormMaterial = {
  aulaId: string;
  nome: string;
  url: string;
  modo: ModoMaterial;
  tipo: TipoMaterial;
  arquivo: File | null;
};

type MentoradoResumo = {
  id: string;
  nome: string | null;
  email: string | null;
};

type AtividadePersonalizada = {
  id: string;
  modulo_id: string;
  mentorado_id: string;
  atividade: string;
  observacao_mentor: string | null;
  resposta_mentorado: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  profiles: {
    nome: string | null;
    email: string | null;
  } | null;
};

type AtividadePersonalizadaConsulta = Omit<
  AtividadePersonalizada,
  "profiles"
> & {
  profiles:
    | {
        nome: string | null;
        email: string | null;
      }
    | Array<{
        nome: string | null;
        email: string | null;
      }>
    | null;
};

type StatusLiberacaoModulo = "aberto" | "fechado" | "agendado";

type ModuloLiberacaoGlobal = {
  id: string;
  modulo_id: string;
  status_liberacao: StatusLiberacaoModulo;
  liberar_em: string | null;
  created_at: string;
  updated_at: string;
};

type FormLiberacaoModulo = {
  statusLiberacao: StatusLiberacaoModulo;
  liberarEm: string;
};

type StatusAtividadePersonalizada =
  "Não iniciada" | "Em andamento" | "Entregue" | "Revisar" | "Concluída";

type FormAtividadePersonalizada = {
  mentoradoId: string;
  atividade: string;
  observacaoMentor: string;
  status: StatusAtividadePersonalizada;
};

const moduloInicial: FormModulo = {
  nomePremium: "",
  nomeExplicativo: "",
  descricaoCurta: "",
  objetivoModulo: "",
  aulaPrincipal: "",
  encontros: "",
  materiais: "",
  atividadePratica: "",
};

const aulaInicial: FormAula = {
  moduloId: "",
  titulo: "",
  descricao: "",
  objetivo: "",
  duracao: "",
  videoUrl: "",
};

const materialInicial: FormMaterial = {
  aulaId: "",
  nome: "",
  url: "",
  modo: "arquivo",
  tipo: "pdf",
  arquivo: null,
};

const atividadePersonalizadaInicial: FormAtividadePersonalizada = {
  mentoradoId: "",
  atividade: "",
  observacaoMentor: "",
  status: "Não iniciada",
};

const statusAtividadeOptions: StatusAtividadePersonalizada[] = [
  "Não iniciada",
  "Em andamento",
  "Entregue",
  "Revisar",
  "Concluída",
];

function detectarTipoMaterial(file: File | null): TipoMaterial {
  if (!file) return "outro";

  const tipoArquivo = file.type.toLowerCase();
  const nomeArquivo = file.name.toLowerCase();

  if (tipoArquivo.includes("pdf") || nomeArquivo.endsWith(".pdf")) {
    return "pdf";
  }

  if (tipoArquivo.includes("video")) {
    return "video";
  }

  if (tipoArquivo.includes("image")) {
    return "imagem";
  }

  if (
    nomeArquivo.endsWith(".doc") ||
    nomeArquivo.endsWith(".docx") ||
    nomeArquivo.endsWith(".xls") ||
    nomeArquivo.endsWith(".xlsx") ||
    nomeArquivo.endsWith(".ppt") ||
    nomeArquivo.endsWith(".pptx")
  ) {
    return "documento";
  }

  return "outro";
}

export default function ModulosPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("Todos");
  const [filtroConteudo, setFiltroConteudo] = useState("Todos");

  const [mostrarModuloForm, setMostrarModuloForm] = useState(false);
  const [mostrarAulaForm, setMostrarAulaForm] = useState(false);
  const [mostrarMaterialForm, setMostrarMaterialForm] = useState(false);

  const [editandoModuloId, setEditandoModuloId] = useState<string | null>(null);
  const [formModulo, setFormModulo] = useState<FormModulo>(moduloInicial);
  const [formAula, setFormAula] = useState<FormAula>(aulaInicial);
  const [formMaterial, setFormMaterial] =
    useState<FormMaterial>(materialInicial);

  const [
    mostrarAtividadePersonalizadaForm,
    setMostrarAtividadePersonalizadaForm,
  ] = useState(false);
  const [atividadeEditandoId, setAtividadeEditandoId] = useState<string | null>(
    null,
  );
  const [formAtividadePersonalizada, setFormAtividadePersonalizada] =
    useState<FormAtividadePersonalizada>(atividadePersonalizadaInicial);

  const [mentorados, setMentorados] = useState<MentoradoResumo[]>([]);
  const [atividadesPersonalizadas, setAtividadesPersonalizadas] = useState<
    AtividadePersonalizada[]
  >([]);
  const [carregandoAtividades, setCarregandoAtividades] = useState(false);
  const [liberacoesGlobais, setLiberacoesGlobais] = useState<
    ModuloLiberacaoGlobal[]
  >([]);
  const [carregandoLiberacoes, setCarregandoLiberacoes] = useState(false);
  const [moduloLiberacaoSelecionado, setModuloLiberacaoSelecionado] =
    useState<ModuloMentoria | null>(null);
  const [formLiberacao, setFormLiberacao] = useState<FormLiberacaoModulo>({
    statusLiberacao: "fechado",
    liberarEm: "",
  });

  const [moduloSelecionado, setModuloSelecionado] =
    useState<ModuloMentoria | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [salvandoMaterial, setSalvandoMaterial] = useState(false);
  const [movendoSequenciaId, setMovendoSequenciaId] = useState<string | null>(
    null,
  );

  const {
    modulos,
    carregando,
    erro,
    setErro,
    totalAulas,
    aulasComVideo,
    totalMateriais,
    criarModulo,
    atualizarModulo,
    excluirModulo,
    criarAula,
    atualizarAula,
    excluirAula,
    removerMaterial,
    carregarModulos,
  } = useModulosSupabase();

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

    if (!usuarioTemPermissao(usuarioLogado, ["mentor", "suporte"])) {
      const destino =
        usuarioLogado.role === "mentorado"
          ? "/mentorado/dashboard"
          : usuarioLogado.role === "financeiro"
            ? "/mentor/financeiro"
            : "/login";

      router.push(destino);
      return;
    }

    setUsuario(usuarioLogado);
  }, [router]);

  const modulosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return modulos.filter((modulo) => {
      const textoModulo = [
        getModuloPremium(modulo),
        getModuloExplicativo(modulo),
        getModuloDescricaoCurta(modulo),
        modulo.objetivo_modulo,
        modulo.aula_principal,
        modulo.encontros,
        modulo.materiais,
        modulo.atividade_pratica,
        ...modulo.aulas.map((aula) => aula.titulo),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const bateBusca = !termo || textoModulo.includes(termo);

      const bateStatus =
        filtroAtivo === "Todos" ||
        (filtroAtivo === "Ativos" && modulo.ativo) ||
        (filtroAtivo === "Inativos" && !modulo.ativo);

      const bateConteudo =
        filtroConteudo === "Todos" ||
        (filtroConteudo === "Com aulas" && modulo.aulas.length > 0) ||
        (filtroConteudo === "Sem aulas" && modulo.aulas.length === 0) ||
        (filtroConteudo === "Com vídeo" &&
          modulo.aulas.some((aula) => Boolean(aula.video_url))) ||
        (filtroConteudo === "Com material" &&
          (Boolean(modulo.materiais?.trim()) ||
            modulo.aulas.some(
              (aula) => aula.materiais_aula && aula.materiais_aula.length > 0,
            )));

      return bateBusca && bateStatus && bateConteudo;
    });
  }, [modulos, busca, filtroAtivo, filtroConteudo]);

  const resumo = useMemo(() => {
    return {
      modulos: modulos.length,
      ativos: modulos.filter((modulo) => modulo.ativo).length,
      aulas: totalAulas,
      videos: aulasComVideo,
      materiais: totalMateriais,
      semAulas: modulos.filter((modulo) => modulo.aulas.length === 0).length,
      completos: modulos.filter(
        (modulo) =>
          modulo.nome_premium &&
          modulo.nome_explicativo &&
          modulo.objetivo_modulo &&
          modulo.atividade_pratica,
      ).length,
    };
  }, [modulos, totalAulas, aulasComVideo, totalMateriais]);

  const modulosOrdenados = useMemo(() => {
    return [...modulos].sort((a, b) => {
      const ordemA = Number(a.ordem ?? 0);
      const ordemB = Number(b.ordem ?? 0);

      if (ordemA !== ordemB) return ordemA - ordemB;
      return getModuloPremium(a).localeCompare(getModuloPremium(b));
    });
  }, [modulos]);

  function obterIndiceModulo(moduloId: string) {
    return modulosOrdenados.findIndex((modulo) => modulo.id === moduloId);
  }

  const carregarMentorados = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, email")
      .eq("role", "mentorado")
      .order("nome", { ascending: true });

    if (error) {
      setErro(error.message);
      return;
    }

    setMentorados((data ?? []) as MentoradoResumo[]);
  }, [setErro]);

  const carregarAtividadesPersonalizadas = useCallback(async (moduloId: string) => {
    setCarregandoAtividades(true);

    const { data, error } = await supabase
      .from("modulo_atividades_mentorados")
      .select(
        `
        id,
        modulo_id,
        mentorado_id,
        atividade,
        observacao_mentor,
        resposta_mentorado,
        status,
        created_at,
        updated_at,
        profiles (
          nome,
          email
        )
      `,
      )
      .eq("modulo_id", moduloId)
      .order("updated_at", { ascending: false });

    if (error) {
      setErro(error.message);
      setCarregandoAtividades(false);
      return;
    }

    const atividadesTratadas = (
      (data ?? []) as AtividadePersonalizadaConsulta[]
    ).map((item) => ({
      ...item,
      profiles: Array.isArray(item.profiles)
        ? (item.profiles[0] ?? null)
        : (item.profiles ?? null),
    })) as AtividadePersonalizada[];

    setAtividadesPersonalizadas(atividadesTratadas);
    setCarregandoAtividades(false);
  }, [setErro]);

  const carregarLiberacoesGlobais = useCallback(async () => {
    setCarregandoLiberacoes(true);

    const { data, error } = await supabase
      .from("modulo_liberacoes")
      .select(
        "id, modulo_id, status_liberacao, liberar_em, created_at, updated_at",
      )
      .order("updated_at", { ascending: false });

    if (error) {
      setErro(error.message);
      setCarregandoLiberacoes(false);
      return;
    }

    setLiberacoesGlobais((data ?? []) as ModuloLiberacaoGlobal[]);
    setCarregandoLiberacoes(false);
  }, [setErro]);

  useEffect(() => {
    if (!usuario) return;
    void carregarMentorados();
    void carregarLiberacoesGlobais();
  }, [carregarLiberacoesGlobais, carregarMentorados, usuario]);

  useEffect(() => {
    if (!moduloSelecionado?.id) {
      setAtividadesPersonalizadas([]);
      return;
    }

    void carregarAtividadesPersonalizadas(moduloSelecionado.id);
  }, [carregarAtividadesPersonalizadas, moduloSelecionado?.id]);

  function obterLiberacaoGlobal(moduloId: string) {
    return (
      liberacoesGlobais.find((liberacao) => liberacao.modulo_id === moduloId) ??
      null
    );
  }

  function abrirLiberacaoModulo(modulo: ModuloMentoria) {
    const liberacao = obterLiberacaoGlobal(modulo.id);

    setModuloLiberacaoSelecionado(modulo);
    setFormLiberacao({
      statusLiberacao: liberacao?.status_liberacao ?? "fechado",
      liberarEm: dataParaInput(liberacao?.liberar_em),
    });
    setErro("");
  }

  async function salvarLiberacaoModulo(e: React.FormEvent) {
    e.preventDefault();

    if (!moduloLiberacaoSelecionado?.id) {
      setErro("Selecione um módulo para configurar a liberação.");
      return;
    }

    if (
      formLiberacao.statusLiberacao === "agendado" &&
      !formLiberacao.liberarEm
    ) {
      setErro("Informe a data e horário para liberar automaticamente.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      const liberarEm =
        formLiberacao.statusLiberacao === "agendado"
          ? new Date(formLiberacao.liberarEm).toISOString()
          : null;

      const { error } = await supabase.from("modulo_liberacoes").upsert(
        {
          modulo_id: moduloLiberacaoSelecionado.id,
          status_liberacao: formLiberacao.statusLiberacao,
          liberar_em: liberarEm,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "modulo_id",
        },
      );

      if (error) throw new Error(error.message);

      await carregarLiberacoesGlobais();
      setModuloLiberacaoSelecionado(null);
      setFormLiberacao({ statusLiberacao: "fechado", liberarEm: "" });
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a liberação do módulo.",
      );
    } finally {
      setSalvando(false);
    }
  }

  function abrirAtividadePersonalizada(
    modulo: ModuloMentoria,
    atividade?: AtividadePersonalizada,
  ) {
    const mentoradoId = atividade?.mentorado_id || mentorados[0]?.id || "";

    setModuloSelecionado(modulo);
    setAtividadeEditandoId(atividade?.id ?? null);
    setFormAtividadePersonalizada({
      mentoradoId,
      atividade: atividade?.atividade ?? modulo.atividade_pratica ?? "",
      observacaoMentor: atividade?.observacao_mentor ?? "",
      status:
        (atividade?.status as StatusAtividadePersonalizada) ?? "Não iniciada",
    });
    setErro("");
    setMostrarAtividadePersonalizadaForm(true);
  }

  async function salvarAtividadePersonalizada(e: React.FormEvent) {
    e.preventDefault();

    if (!moduloSelecionado?.id) {
      setErro("Selecione um módulo para personalizar a atividade.");
      return;
    }

    if (!formAtividadePersonalizada.mentoradoId) {
      setErro("Selecione o mentorado.");
      return;
    }

    if (!formAtividadePersonalizada.atividade.trim()) {
      setErro("Descreva a atividade prática personalizada.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      const payload = {
        modulo_id: moduloSelecionado.id,
        mentorado_id: formAtividadePersonalizada.mentoradoId,
        atividade: formAtividadePersonalizada.atividade.trim(),
        observacao_mentor:
          formAtividadePersonalizada.observacaoMentor.trim() || null,
        status: formAtividadePersonalizada.status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("modulo_atividades_mentorados")
        .upsert(payload, {
          onConflict: "modulo_id,mentorado_id",
        });

      if (error) throw new Error(error.message);

      await carregarAtividadesPersonalizadas(moduloSelecionado.id);
      setMostrarAtividadePersonalizadaForm(false);
      setAtividadeEditandoId(null);
      setFormAtividadePersonalizada(atividadePersonalizadaInicial);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a atividade personalizada.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExcluirAtividadePersonalizada(atividadeId: string) {
    const confirmar = window.confirm(
      "Deseja remover esta atividade personalizada?",
    );

    if (!confirmar || !moduloSelecionado?.id) return;

    try {
      setErro("");

      const { error } = await supabase
        .from("modulo_atividades_mentorados")
        .delete()
        .eq("id", atividadeId);

      if (error) throw new Error(error.message);

      await carregarAtividadesPersonalizadas(moduloSelecionado.id);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível remover a atividade personalizada.",
      );
    }
  }

  function montarPayloadModulo(): PayloadModulo {
    return {
      nomePremium: formModulo.nomePremium,
      nomeExplicativo: formModulo.nomeExplicativo,
      descricaoCurta: formModulo.descricaoCurta,
      objetivoModulo: formModulo.objetivoModulo,
      aulaPrincipal: formModulo.aulaPrincipal,
      encontros: formModulo.encontros,
      materiais: formModulo.materiais,
      atividadePratica: formModulo.atividadePratica,
      criadoPor: (usuario as User & { id?: string })?.id ?? null,
    };
  }

  function preencherFormModulo(modulo: ModuloMentoria) {
    setFormModulo({
      nomePremium: modulo.nome_premium ?? modulo.titulo ?? "",
      nomeExplicativo: modulo.nome_explicativo ?? modulo.titulo ?? "",
      descricaoCurta: modulo.descricao_curta ?? modulo.descricao ?? "",
      objetivoModulo: modulo.objetivo_modulo ?? "",
      aulaPrincipal: modulo.aula_principal ?? "",
      encontros: modulo.encontros ?? "",
      materiais: modulo.materiais ?? "",
      atividadePratica: modulo.atividade_pratica ?? "",
    });
  }

  function abrirNovoModulo() {
    setFormModulo(moduloInicial);
    setEditandoModuloId(null);
    setErro("");
    setMostrarModuloForm(true);
  }

  function abrirEditarModulo(modulo: ModuloMentoria) {
    preencherFormModulo(modulo);
    setEditandoModuloId(modulo.id);
    setModuloSelecionado(null);
    setErro("");
    setMostrarModuloForm(true);
  }

  function abrirNovaAula(moduloId?: string) {
    setFormAula({ ...aulaInicial, moduloId: moduloId ?? "" });
    setErro("");
    setMostrarAulaForm(true);
  }

  function abrirNovoMaterial(aulaId?: string) {
    setFormMaterial({ ...materialInicial, aulaId: aulaId ?? "" });
    setErro("");
    setMostrarMaterialForm(true);
  }

  function fecharFormularios() {
    setMostrarModuloForm(false);
    setMostrarAulaForm(false);
    setMostrarMaterialForm(false);
    setMostrarAtividadePersonalizadaForm(false);
    setEditandoModuloId(null);
    setAtividadeEditandoId(null);
    setFormModulo(moduloInicial);
    setFormAula(aulaInicial);
    setFormMaterial(materialInicial);
    setFormAtividadePersonalizada(atividadePersonalizadaInicial);
    setErro("");
  }

  function limparFiltros() {
    setBusca("");
    setFiltroAtivo("Todos");
    setFiltroConteudo("Todos");
  }

  async function moverModuloNaSequencia(
    modulo: ModuloMentoria,
    direcao: "subir" | "descer",
  ) {
    const indiceAtual = obterIndiceModulo(modulo.id);
    const indiceAlvo = direcao === "subir" ? indiceAtual - 1 : indiceAtual + 1;
    const moduloAlvo = modulosOrdenados[indiceAlvo];

    if (indiceAtual < 0 || !moduloAlvo) return;

    const ordemAtual = Number(modulo.ordem ?? indiceAtual + 1);
    const ordemAlvo = Number(moduloAlvo.ordem ?? indiceAlvo + 1);

    try {
      setErro("");
      setMovendoSequenciaId(modulo.id);

      const { error: erroModuloAtual } = await supabase
        .from("modulos")
        .update({ ordem: ordemAlvo, updated_at: new Date().toISOString() })
        .eq("id", modulo.id);

      if (erroModuloAtual) throw new Error(erroModuloAtual.message);

      const { error: erroModuloAlvo } = await supabase
        .from("modulos")
        .update({ ordem: ordemAtual, updated_at: new Date().toISOString() })
        .eq("id", moduloAlvo.id);

      if (erroModuloAlvo) throw new Error(erroModuloAlvo.message);

      window.location.reload();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a sequência dos módulos.",
      );
      setMovendoSequenciaId(null);
    }
  }

  async function salvarModulo(e: React.FormEvent) {
    e.preventDefault();

    if (!formModulo.nomePremium.trim() || !formModulo.nomeExplicativo.trim()) {
      setErro("Informe o nome do módulo e a descrição do nome.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      if (editandoModuloId) {
        await atualizarModulo({
          moduloId: editandoModuloId,
          payload: montarPayloadModulo(),
        });
      } else {
        await criarModulo(montarPayloadModulo());
      }

      fecharFormularios();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o módulo.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarAula(e: React.FormEvent) {
    e.preventDefault();

    if (!formAula.moduloId || !formAula.titulo.trim()) {
      setErro("Selecione o módulo e informe o título da aula.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      await criarAula({
        moduloId: formAula.moduloId,
        titulo: formAula.titulo.trim(),
        descricao: formAula.descricao.trim(),
        objetivo: formAula.objetivo.trim(),
        duracao: formAula.duracao.trim(),
        videoUrl: formAula.videoUrl.trim(),
      });

      fecharFormularios();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a aula.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarMaterial(e?: React.SyntheticEvent) {
    e?.preventDefault();

    if (salvandoMaterial) return;

    if (!formMaterial.aulaId || !formMaterial.nome.trim()) {
      setErro("Selecione a aula e informe o nome do material.");
      return;
    }

    if (formMaterial.modo === "link" && !formMaterial.url.trim()) {
      setErro("Informe o link do material.");
      return;
    }

    if (formMaterial.modo === "arquivo" && !formMaterial.arquivo) {
      setErro("Escolha um arquivo para enviar.");
      return;
    }

    const LIMITE_MB = 25;

    if (
      formMaterial.modo === "arquivo" &&
      formMaterial.arquivo &&
      formMaterial.arquivo.size > LIMITE_MB * 1024 * 1024
    ) {
      setErro(
        `Esse arquivo tem ${(formMaterial.arquivo.size / 1024 / 1024).toFixed(
          1,
        )} MB. Para não travar o sistema, envie arquivos de até ${LIMITE_MB} MB ou salve como link do Drive.`,
      );
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 60000);

    try {
      setSalvandoMaterial(true);
      setErro("");

      console.log("Tentando salvar material", {
        aulaId: formMaterial.aulaId,
        modo: formMaterial.modo,
        nome: formMaterial.nome,
        arquivo: formMaterial.arquivo?.name ?? null,
      });

      const dados = new FormData();
      dados.append("aulaId", formMaterial.aulaId);
      dados.append("nome", formMaterial.nome.trim());
      dados.append("modo", formMaterial.modo);
      dados.append("tipo", formMaterial.tipo);

      if (formMaterial.modo === "link") {
        dados.append("url", formMaterial.url.trim());
      }

      if (formMaterial.modo === "arquivo" && formMaterial.arquivo) {
        dados.append("arquivo", formMaterial.arquivo);
      }

      const headers = await obterCabecalhoAutorizacao();

      const resposta = await fetch("/api/materiais", {
        method: "POST",
        headers,
        body: dados,
        signal: controller.signal,
      });

      const textoResposta = await resposta.text();
      let resultado: { error?: string; message?: string } | null = null;

      try {
        resultado = textoResposta ? JSON.parse(textoResposta) : null;
      } catch {
        resultado = null;
      }

      if (!resposta.ok) {
        throw new Error(
          resultado?.error ||
            resultado?.message ||
            textoResposta ||
            "Não foi possível salvar o material.",
        );
      }

      await carregarModulos();
      fecharFormularios();
    } catch (error) {
      console.error("Erro ao salvar material:", error);

      if (error instanceof DOMException && error.name === "AbortError") {
        setErro(
          "O upload passou de 60 segundos e foi cancelado. Tente um arquivo menor ou use Salvar link com Drive.",
        );
        return;
      }

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o material.",
      );
    } finally {
      window.clearTimeout(timeoutId);
      setSalvandoMaterial(false);
    }
  }

  async function confirmarExcluirModulo(moduloId: string) {
    const confirmar = window.confirm(
      "Deseja excluir este módulo e todas as aulas vinculadas?",
    );

    if (!confirmar) return;

    try {
      setErro("");
      await excluirModulo(moduloId);
      setModuloSelecionado(null);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o módulo.",
      );
    }
  }

  async function confirmarExcluirAula(aulaId: string) {
    const confirmar = window.confirm("Deseja excluir esta aula?");
    if (!confirmar) return;

    try {
      setErro("");
      await excluirAula(aulaId);
      setModuloSelecionado(null);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a aula.",
      );
    }
  }

  async function confirmarRemoverMaterial(materialId: string) {
    const confirmar = window.confirm("Deseja remover este material?");
    if (!confirmar) return;

    try {
      setErro("");
      await removerMaterial(materialId);
      setModuloSelecionado(null);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o material.",
      );
    }
  }

  async function editarCampoAula(
    aula: AulaModulo,
    campo: "titulo" | "descricao" | "objetivo" | "duracao" | "video_url",
    label: string,
  ) {
    const valorAtual = aula[campo] ?? "";
    const novoValor = window.prompt(`Editar ${label}:`, valorAtual);

    if (novoValor === null) return;

    try {
      setErro("");

      await atualizarAula({
        aulaId: aula.id,
        campo,
        valor: novoValor,
      });

      setModuloSelecionado(null);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a aula.",
      );
    }
  }

  if (!usuario || carregando) {
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
            Carregando módulos...
          </h1>

          <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#12317C]" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} acessoSuporte={usuario.role === "suporte"} />

      <section className="ceo-content no-scrollbar !p-4 sm:!p-5 lg:!p-6">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#12317C]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-slate-300/30 blur-3xl" />

        <div className="ceo-stack">
          <section className="mb-5 overflow-hidden rounded-[28px] border border-white/70 bg-white p-5 text-[#08163F] shadow-xl shadow-slate-200/70 sm:p-6 lg:p-8">
            <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 sm:text-xs">
                  Módulos CEO Club
                </p>

                <h1 className="max-w-5xl break-words text-2xl font-black leading-tight text-[#08163F] sm:text-3xl lg:text-4xl">
                  Estruture a jornada de aprendizagem dos mentorados.
                </h1>

                <p className="mt-3 max-w-5xl break-words text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                  Cadastre módulo, posicionamento, objetivo, encontros,
                  materiais, atividade prática e acompanhe a evolução.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => abrirNovaAula()}
                  className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300/70 transition hover:scale-[1.01] hover:brightness-110"
                >
                  Nova aula
                </button>

                <button
                  type="button"
                  onClick={abrirNovoModulo}
                  className="rounded-2xl bg-gradient-to-b from-[#F8FAFC] via-[#DDE3EA] to-[#AAB3C0] px-5 py-3 text-sm font-black text-[#08163F] shadow-lg shadow-slate-300/70 transition hover:scale-[1.01] hover:brightness-105"
                >
                  Novo módulo
                </button>
              </div>
            </div>

            <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniInfo
                titulo="Módulos completos"
                valor={String(resumo.completos)}
              />
              <MiniInfo
                titulo="Aulas com vídeo"
                valor={String(resumo.videos)}
              />
              <MiniInfo
                titulo="Módulos sem aulas"
                valor={String(resumo.semAulas)}
              />
              <MiniInfo titulo="Materiais" valor={String(resumo.materiais)} />
            </div>
          </section>

          <section className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ResumoCard
              titulo="Módulos"
              valor={String(resumo.modulos)}
              destaque
            />
            <ResumoCard titulo="Ativos" valor={String(resumo.ativos)} />
            <ResumoCard titulo="Aulas" valor={String(resumo.aulas)} />
            <ResumoCard titulo="Vídeos" valor={String(resumo.videos)} />
            <ResumoCard titulo="Materiais" valor={String(resumo.materiais)} />
          </section>

          <section className="ceo-card mb-4 min-w-0">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(150px,180px)_minmax(160px,190px)_120px]">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por módulo, nome, objetivo ou aula"
                className="ceo-field"
              />

              <select
                value={filtroAtivo}
                onChange={(e) => setFiltroAtivo(e.target.value)}
                className="ceo-field"
              >
                <option>Todos</option>
                <option>Ativos</option>
                <option>Inativos</option>
              </select>

              <select
                value={filtroConteudo}
                onChange={(e) => setFiltroConteudo(e.target.value)}
                className="ceo-field"
              >
                <option>Todos</option>
                <option>Com aulas</option>
                <option>Sem aulas</option>
                <option>Com vídeo</option>
                <option>Com material</option>
              </select>

              <button
                type="button"
                onClick={limparFiltros}
                className="rounded-2xl bg-[#08163F] px-4 py-3 text-sm font-black text-white transition hover:brightness-110"
              >
                Limpar
              </button>
            </div>

            <p className="mt-3 break-words text-sm font-bold text-slate-500">
              Exibindo {modulosFiltrados.length} de {modulos.length} módulo(s).
            </p>
          </section>

          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          <section className="grid min-w-0 gap-4">
            {modulosFiltrados.length === 0 ? (
              <div className="rounded-[22px] bg-white p-6 text-center text-sm font-semibold text-slate-500 shadow-xl shadow-slate-200/70 sm:p-8">
                Nenhum módulo encontrado.
              </div>
            ) : (
              modulosFiltrados.map((modulo) => (
                <ModuloCard
                  key={modulo.id}
                  modulo={modulo}
                  liberacao={obterLiberacaoGlobal(modulo.id)}
                  carregandoLiberacao={carregandoLiberacoes}
                  onOpen={() => setModuloSelecionado(modulo)}
                  onEdit={() => abrirEditarModulo(modulo)}
                  onLiberacao={() => abrirLiberacaoModulo(modulo)}
                  onMoverParaCima={() =>
                    moverModuloNaSequencia(modulo, "subir")
                  }
                  onMoverParaBaixo={() =>
                    moverModuloNaSequencia(modulo, "descer")
                  }
                  podeSubir={obterIndiceModulo(modulo.id) > 0}
                  podeDescer={
                    obterIndiceModulo(modulo.id) >= 0 &&
                    obterIndiceModulo(modulo.id) < modulosOrdenados.length - 1
                  }
                  movendoSequencia={movendoSequenciaId === modulo.id}
                />
              ))
            )}
          </section>
        </div>
      </section>

      {mostrarModuloForm && (
        <ModalFormulario
          titulo={editandoModuloId ? "Editar módulo" : "Novo módulo"}
          onClose={fecharFormularios}
        >
          <form onSubmit={salvarModulo}>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <Campo label="Nome do módulo">
                <input
                  value={formModulo.nomePremium}
                  onChange={(e) =>
                    setFormModulo({
                      ...formModulo,
                      nomePremium: e.target.value,
                    })
                  }
                  placeholder="Digite o nome do módulo"
                  className="ceo-field"
                />
              </Campo>

              <Campo label="Nome explicativo">
                <input
                  value={formModulo.nomeExplicativo}
                  onChange={(e) =>
                    setFormModulo({
                      ...formModulo,
                      nomeExplicativo: e.target.value,
                    })
                  }
                  placeholder="Explique o tema principal do módulo"
                  className="ceo-field"
                />
              </Campo>

              <Campo label="Descrição curta">
                <textarea
                  value={formModulo.descricaoCurta}
                  onChange={(e) =>
                    setFormModulo({
                      ...formModulo,
                      descricaoCurta: e.target.value,
                    })
                  }
                  placeholder="Resumo curto do módulo"
                  className="ceo-field min-h-[90px]"
                />
              </Campo>

              <Campo label="Objetivo do módulo">
                <textarea
                  value={formModulo.objetivoModulo}
                  onChange={(e) =>
                    setFormModulo({
                      ...formModulo,
                      objetivoModulo: e.target.value,
                    })
                  }
                  placeholder="O que o mentorado precisa alcançar"
                  className="ceo-field min-h-[90px]"
                />
              </Campo>

              <Campo label="Aula principal / encontros">
                <textarea
                  value={formModulo.aulaPrincipal}
                  onChange={(e) =>
                    setFormModulo({
                      ...formModulo,
                      aulaPrincipal: e.target.value,
                    })
                  }
                  placeholder="Aula principal, encontro ao vivo, mentoria, revisão..."
                  className="ceo-field min-h-[90px]"
                />
              </Campo>

              <Campo label="Encontros">
                <textarea
                  value={formModulo.encontros}
                  onChange={(e) =>
                    setFormModulo({ ...formModulo, encontros: e.target.value })
                  }
                  placeholder="Descreva os encontros previstos"
                  className="ceo-field min-h-[90px]"
                />
              </Campo>

              <Campo label="Materiais">
                <textarea
                  value={formModulo.materiais}
                  onChange={(e) =>
                    setFormModulo({ ...formModulo, materiais: e.target.value })
                  }
                  placeholder="Liste os materiais do módulo"
                  className="ceo-field min-h-[90px]"
                />
              </Campo>

              <Campo label="Atividade prática">
                <textarea
                  value={formModulo.atividadePratica}
                  onChange={(e) =>
                    setFormModulo({
                      ...formModulo,
                      atividadePratica: e.target.value,
                    })
                  }
                  placeholder="Descreva a atividade prática do mentorado"
                  className="ceo-field min-h-[90px]"
                />
              </Campo>
            </div>

            <FormularioActions
              salvando={salvando}
              label={editandoModuloId ? "Salvar alterações" : "Salvar módulo"}
            />
          </form>
        </ModalFormulario>
      )}

      {mostrarAulaForm && (
        <ModalFormulario titulo="Nova aula" onClose={fecharFormularios}>
          <form onSubmit={salvarAula}>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <select
                value={formAula.moduloId}
                onChange={(e) =>
                  setFormAula({ ...formAula, moduloId: e.target.value })
                }
                className="ceo-field"
              >
                <option value="">Selecione o módulo</option>

                {modulos.map((modulo) => (
                  <option key={modulo.id} value={modulo.id}>
                    {modulo.ordem}. {getModuloPremium(modulo)}
                  </option>
                ))}
              </select>

              <input
                value={formAula.titulo}
                onChange={(e) =>
                  setFormAula({ ...formAula, titulo: e.target.value })
                }
                placeholder="Título da aula"
                className="ceo-field"
              />

              <input
                value={formAula.duracao}
                onChange={(e) =>
                  setFormAula({ ...formAula, duracao: e.target.value })
                }
                placeholder="Duração, ex: 45 min"
                className="ceo-field"
              />

              <input
                value={formAula.videoUrl}
                onChange={(e) =>
                  setFormAula({ ...formAula, videoUrl: e.target.value })
                }
                placeholder="URL do vídeo"
                className="ceo-field"
              />

              <textarea
                value={formAula.descricao}
                onChange={(e) =>
                  setFormAula({ ...formAula, descricao: e.target.value })
                }
                placeholder="Descrição da aula"
                className="ceo-field min-h-[96px]"
              />

              <textarea
                value={formAula.objetivo}
                onChange={(e) =>
                  setFormAula({ ...formAula, objetivo: e.target.value })
                }
                placeholder="Objetivo da aula"
                className="ceo-field min-h-[96px]"
              />
            </div>

            <FormularioActions salvando={salvando} label="Salvar aula" />
          </form>
        </ModalFormulario>
      )}

      {mostrarMaterialForm && (
        <ModalFormulario titulo="Novo material" onClose={fecharFormularios}>
          <form onSubmit={salvarMaterial}>
            {erro && (
              <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-black leading-6 text-red-700">
                {erro}
              </div>
            )}

            <div className="mb-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormMaterial({
                    ...formMaterial,
                    modo: "arquivo",
                    url: "",
                  })
                }
                className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                  formMaterial.modo === "arquivo"
                    ? "bg-[#08163F] text-white shadow-lg"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                Upload de arquivo
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormMaterial({
                    ...formMaterial,
                    modo: "link",
                    arquivo: null,
                    tipo: "link",
                  })
                }
                className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                  formMaterial.modo === "link"
                    ? "bg-[#08163F] text-white shadow-lg"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                Salvar link
              </button>
            </div>

            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <select
                value={formMaterial.aulaId}
                onChange={(e) =>
                  setFormMaterial({ ...formMaterial, aulaId: e.target.value })
                }
                className="ceo-field"
              >
                <option value="">Selecione a aula</option>

                {modulos.flatMap((modulo) =>
                  modulo.aulas.map((aula) => (
                    <option key={aula.id} value={aula.id}>
                      {getModuloPremium(modulo)} · {aula.titulo}
                    </option>
                  )),
                )}
              </select>

              <input
                value={formMaterial.nome}
                onChange={(e) =>
                  setFormMaterial({ ...formMaterial, nome: e.target.value })
                }
                placeholder="Nome do material"
                className="ceo-field"
              />

              <select
                value={formMaterial.tipo}
                onChange={(e) =>
                  setFormMaterial({
                    ...formMaterial,
                    tipo: e.target.value as TipoMaterial,
                  })
                }
                className="ceo-field md:col-span-2"
              >
                <option value="pdf">PDF</option>
                <option value="video">Vídeo</option>
                <option value="link">Link</option>
                <option value="imagem">Imagem</option>
                <option value="documento">Documento</option>
                <option value="atividade">Atividade</option>
                <option value="reuniao">Reunião</option>
                <option value="outro">Outro</option>
              </select>

              {formMaterial.modo === "link" ? (
                <input
                  value={formMaterial.url}
                  onChange={(e) =>
                    setFormMaterial({ ...formMaterial, url: e.target.value })
                  }
                  placeholder="URL do material"
                  className="ceo-field md:col-span-2"
                />
              ) : (
                <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center transition hover:border-[#08163F] hover:bg-slate-100 md:col-span-2">
                  <span className="text-base font-black text-[#08163F] sm:text-lg">
                    Clique para escolher o arquivo
                  </span>

                  <span className="mt-2 text-sm font-bold text-slate-400">
                    PDF, vídeo, imagem, documento, atividade ou outro material
                  </span>

                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const arquivoSelecionado = e.target.files?.[0] ?? null;

                      setFormMaterial({
                        ...formMaterial,
                        arquivo: arquivoSelecionado,
                        tipo: detectarTipoMaterial(arquivoSelecionado),
                      });
                    }}
                  />

                  {formMaterial.arquivo && (
                    <span className="mt-5 max-w-full break-words rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow">
                      {formMaterial.arquivo.name}
                    </span>
                  )}
                </label>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={salvarMaterial}
                disabled={salvandoMaterial}
                className="rounded-2xl bg-[#08163F] px-5 py-3 font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvandoMaterial ? "Salvando material..." : "Salvar material"}
              </button>

              <button
                type="button"
                onClick={fecharFormularios}
                disabled={salvandoMaterial}
                className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </form>
        </ModalFormulario>
      )}

      {mostrarAtividadePersonalizadaForm && moduloSelecionado && (
        <ModalFormulario
          titulo={
            atividadeEditandoId
              ? "Editar atividade personalizada"
              : "Nova atividade personalizada"
          }
          onClose={fecharFormularios}
        >
          <form onSubmit={salvarAtividadePersonalizada}>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <Campo label="Mentorado">
                <select
                  value={formAtividadePersonalizada.mentoradoId}
                  onChange={(e) =>
                    setFormAtividadePersonalizada({
                      ...formAtividadePersonalizada,
                      mentoradoId: e.target.value,
                    })
                  }
                  className="ceo-field"
                >
                  <option value="">Selecione o mentorado</option>

                  {mentorados.map((mentorado) => (
                    <option key={mentorado.id} value={mentorado.id}>
                      {mentorado.nome ||
                        mentorado.email ||
                        "Mentorado sem nome"}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Status">
                <select
                  value={formAtividadePersonalizada.status}
                  onChange={(e) =>
                    setFormAtividadePersonalizada({
                      ...formAtividadePersonalizada,
                      status: e.target.value as StatusAtividadePersonalizada,
                    })
                  }
                  className="ceo-field"
                >
                  {statusAtividadeOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Atividade prática personalizada">
                <textarea
                  value={formAtividadePersonalizada.atividade}
                  onChange={(e) =>
                    setFormAtividadePersonalizada({
                      ...formAtividadePersonalizada,
                      atividade: e.target.value,
                    })
                  }
                  placeholder="Descreva exatamente o que este mentorado deve fazer neste módulo"
                  className="ceo-field min-h-[120px]"
                />
              </Campo>

              <Campo label="Observação para o mentorado">
                <textarea
                  value={formAtividadePersonalizada.observacaoMentor}
                  onChange={(e) =>
                    setFormAtividadePersonalizada({
                      ...formAtividadePersonalizada,
                      observacaoMentor: e.target.value,
                    })
                  }
                  placeholder="Contexto, orientação ou ponto de atenção conforme a dor dele"
                  className="ceo-field min-h-[120px]"
                />
              </Campo>
            </div>

            <FormularioActions
              salvando={salvando}
              label={
                atividadeEditandoId
                  ? "Salvar atividade"
                  : "Criar atividade personalizada"
              }
            />
          </form>
        </ModalFormulario>
      )}

      {moduloLiberacaoSelecionado && (
        <ModalFormulario
          titulo={`Liberação do módulo ${moduloLiberacaoSelecionado.ordem}`}
          onClose={() => {
            setModuloLiberacaoSelecionado(null);
            setFormLiberacao({ statusLiberacao: "fechado", liberarEm: "" });
          }}
        >
          <form onSubmit={salvarLiberacaoModulo}>
            <div className="rounded-2xl bg-[#f9fafb] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Módulo
              </p>

              <h3 className="mt-2 break-words text-xl font-black text-[#08163F]">
                {getModuloPremium(moduloLiberacaoSelecionado)}
              </h3>

              <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-500">
                Esta liberação é geral: vale para todos os mentorados. Use
                Aberto para liberar agora, Fechado para bloquear ou Agendado
                para abrir automaticamente na data escolhida.
              </p>
            </div>

            <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
              <Campo label="Status da liberação">
                <select
                  value={formLiberacao.statusLiberacao}
                  onChange={(e) =>
                    setFormLiberacao({
                      ...formLiberacao,
                      statusLiberacao: e.target.value as StatusLiberacaoModulo,
                    })
                  }
                  className="ceo-field"
                >
                  <option value="aberto">Aberto agora</option>
                  <option value="fechado">Fechado</option>
                  <option value="agendado">Agendado</option>
                </select>
              </Campo>

              <Campo label="Liberar automaticamente em">
                <input
                  type="datetime-local"
                  value={formLiberacao.liberarEm}
                  disabled={formLiberacao.statusLiberacao !== "agendado"}
                  onChange={(e) =>
                    setFormLiberacao({
                      ...formLiberacao,
                      liberarEm: e.target.value,
                    })
                  }
                  className="ceo-field disabled:cursor-not-allowed disabled:opacity-50"
                />
              </Campo>
            </div>

            <FormularioActions salvando={salvando} label="Salvar liberação" />
          </form>
        </ModalFormulario>
      )}

      {moduloSelecionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => setModuloSelecionado(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-[min(96vw,58rem)] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl sm:rounded-[30px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                    Módulo {moduloSelecionado.ordem}
                  </p>

                  <h2 className="mt-2 break-words text-xl font-black leading-tight sm:text-2xl">
                    {getModuloPremium(moduloSelecionado)}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-blue-100">
                    {getModuloExplicativo(moduloSelecionado)}
                  </p>
                </div>

                <button
                  onClick={() => setModuloSelecionado(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-black text-white transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>

              <div className="mt-5">
                <StatusBadge ativo={moduloSelecionado.ativo} />
              </div>
            </div>

            <div className="overflow-y-auto p-4 sm:p-6">
              <div className="grid min-w-0 gap-3 md:grid-cols-2">
                <InfoBox
                  label="Descrição curta"
                  value={getModuloDescricaoCurta(moduloSelecionado) || "—"}
                />
                <InfoBox
                  label="Objetivo do módulo"
                  value={moduloSelecionado.objetivo_modulo || "—"}
                />
                <InfoBox
                  label="Aula principal / encontros"
                  value={moduloSelecionado.aula_principal || "—"}
                />
                <InfoBox
                  label="Materiais"
                  value={moduloSelecionado.materiais || "—"}
                />
                <InfoBox
                  label="Atividade prática base da mentoria"
                  value={moduloSelecionado.atividade_pratica || "—"}
                  full
                />
              </div>

              <AtividadesPersonalizadasSection
                atividades={atividadesPersonalizadas}
                carregando={carregandoAtividades}
                onNova={() => abrirAtividadePersonalizada(moduloSelecionado)}
                onEditar={(atividade) =>
                  abrirAtividadePersonalizada(moduloSelecionado, atividade)
                }
                onExcluir={confirmarExcluirAtividadePersonalizada}
              />

              <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={() => abrirEditarModulo(moduloSelecionado)}
                  className="rounded-2xl bg-[#EEF2FF] px-4 py-2.5 text-sm font-black text-[#08163F]"
                >
                  Editar módulo
                </button>

                <button
                  onClick={() => abrirNovaAula(moduloSelecionado.id)}
                  className="rounded-2xl bg-[#08163F] px-4 py-2.5 text-sm font-black text-white"
                >
                  Nova aula neste módulo
                </button>

                <button
                  onClick={() =>
                    abrirNovoMaterial(moduloSelecionado.aulas[0]?.id)
                  }
                  className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-[#08163F]"
                >
                  Novo material
                </button>

                <button
                  onClick={() => confirmarExcluirModulo(moduloSelecionado.id)}
                  className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-black text-red-600"
                >
                  Excluir módulo
                </button>
              </div>

              <div className="mt-5">
                <h3 className="break-words text-xl font-black text-[#08163F]">
                  Aulas
                </h3>

                <div className="mt-4 space-y-3">
                  {moduloSelecionado.aulas.length === 0 ? (
                    <div className="rounded-2xl bg-[#f9fafb] p-5 text-sm font-semibold text-slate-500">
                      Nenhuma aula cadastrada neste módulo.
                    </div>
                  ) : (
                    moduloSelecionado.aulas.map((aula) => (
                      <AulaCard
                        key={aula.id}
                        aula={aula}
                        onEditarCampo={editarCampoAula}
                        onExcluir={() => confirmarExcluirAula(aula.id)}
                        onNovoMaterial={() => abrirNovoMaterial(aula.id)}
                        onRemoverMaterial={confirmarRemoverMaterial}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 border-t border-slate-100 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={() => abrirNovaAula(moduloSelecionado.id)}
                  className="rounded-2xl bg-[#08163F] px-4 py-2.5 text-sm font-black text-white"
                >
                  Nova aula
                </button>

                <button
                  onClick={() => setModuloSelecionado(null)}
                  className="ml-auto rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-[#08163F] transition hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ModuloCard({
  modulo,
  liberacao,
  carregandoLiberacao,
  onOpen,
  onEdit,
  onLiberacao,
  onMoverParaCima,
  onMoverParaBaixo,
  podeSubir,
  podeDescer,
  movendoSequencia,
}: {
  modulo: ModuloMentoria;
  liberacao: ModuloLiberacaoGlobal | null;
  carregandoLiberacao: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onLiberacao: () => void;
  onMoverParaCima: () => void;
  onMoverParaBaixo: () => void;
  podeSubir: boolean;
  podeDescer: boolean;
  movendoSequencia: boolean;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-[22px] border border-white/50 bg-white/90 shadow-xl shadow-slate-200/70 sm:rounded-[24px]">
      <div className="p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 gap-4 text-left sm:gap-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] to-[#12317C] text-lg font-black text-white sm:h-14 sm:w-14">
              {modulo.ordem}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="break-words text-lg font-black leading-tight text-[#08163F] sm:text-xl">
                  {getModuloPremium(modulo)}
                </h2>

                <StatusBadge ativo={modulo.ativo} />
                <LiberacaoBadge
                  liberacao={liberacao}
                  carregando={carregandoLiberacao}
                />
              </div>

              <p className="mt-1 break-words text-sm font-black text-slate-500">
                {getModuloExplicativo(modulo)}
              </p>

              <p className="mt-2 max-w-4xl break-words text-sm font-semibold leading-6 text-slate-500">
                {getModuloDescricaoCurta(modulo) || "Sem descrição curta."}
              </p>

              <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SmallMetric
                  label="Aulas"
                  value={String(modulo.aulas.length)}
                />
                <SmallMetric
                  label="Vídeos"
                  value={String(
                    modulo.aulas.filter((aula) => Boolean(aula.video_url))
                      .length,
                  )}
                />
                <SmallMetric
                  label="Materiais"
                  value={String(
                    modulo.aulas.reduce(
                      (acc, aula) => acc + (aula.materiais_aula?.length ?? 0),
                      0,
                    ),
                  )}
                />
                <SmallMetric
                  label="Prática"
                  value={modulo.atividade_pratica ? "Sim" : "—"}
                />
              </div>
            </div>
          </button>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              disabled={!podeSubir || movendoSequencia}
              onClick={onMoverParaCima}
              title="Subir módulo na sequência"
              className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            >
              ↑
            </button>

            <button
              type="button"
              disabled={!podeDescer || movendoSequencia}
              onClick={onMoverParaBaixo}
              title="Descer módulo na sequência"
              className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            >
              ↓
            </button>

            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl bg-[#EEF2FF] px-4 py-2.5 text-xs font-black text-[#08163F] sm:text-sm"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={onLiberacao}
              className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-700 transition hover:bg-amber-100 sm:text-sm"
            >
              Liberação
            </button>

            <button
              type="button"
              onClick={onOpen}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white sm:text-sm"
            >
              Abrir →
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f9fafb] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-[#08163F]">
        {value}
      </p>
    </div>
  );
}

function AulaCard({
  aula,
  onEditarCampo,
  onExcluir,
  onNovoMaterial,
  onRemoverMaterial,
}: {
  aula: AulaModulo;
  onEditarCampo: (
    aula: AulaModulo,
    campo: "titulo" | "descricao" | "objetivo" | "duracao" | "video_url",
    label: string,
  ) => void;
  onExcluir: () => void;
  onNovoMaterial: () => void;
  onRemoverMaterial: (materialId: string) => void;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f9fafb] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Aula {aula.ordem}
          </p>

          <h4 className="mt-1 break-words text-base font-black leading-tight text-[#08163F] sm:text-lg">
            {aula.titulo}
          </h4>

          <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-500">
            {aula.descricao || "Sem descrição."}
          </p>

          {aula.objetivo && (
            <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-500">
              Objetivo: {aula.objetivo}
            </p>
          )}

          <p className="mt-2 text-xs font-bold text-slate-400">
            {aula.duracao || "Duração não informada"}
          </p>
        </div>

        <StatusBadge ativo={aula.ativo} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
        <button
          onClick={() => onEditarCampo(aula, "titulo", "título")}
          className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100 sm:px-4"
        >
          Editar título
        </button>
        <button
          onClick={() => onEditarCampo(aula, "descricao", "descrição")}
          className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100 sm:px-4"
        >
          Editar descrição
        </button>
        <button
          onClick={() => onEditarCampo(aula, "objetivo", "objetivo")}
          className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100 sm:px-4"
        >
          Editar objetivo
        </button>
        <button
          onClick={() => onEditarCampo(aula, "video_url", "vídeo")}
          className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100 sm:px-4"
        >
          Editar vídeo
        </button>
        <button
          onClick={onNovoMaterial}
          className="rounded-xl bg-[#EEF2FF] px-4 py-2 text-xs font-black text-[#08163F]"
        >
          Novo material
        </button>
        <button
          onClick={onExcluir}
          className="rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-600"
        >
          Excluir
        </button>
      </div>

      {aula.video_url && (
        <a
          href={aula.video_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block break-words rounded-2xl bg-white p-4 text-sm font-black text-[#08163F] ring-1 ring-slate-100"
        >
          Abrir vídeo →
        </a>
      )}

      {aula.materiais_aula && aula.materiais_aula.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Materiais
          </p>

          <div className="mt-3 space-y-2">
            {aula.materiais_aula.map((material) => (
              <div
                key={material.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f9fafb] px-4 py-3"
              >
                <a
                  href={material.url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-words text-sm font-black text-[#08163F] hover:underline"
                >
                  {material.nome}
                </a>
                <button
                  onClick={() => onRemoverMaterial(material.id)}
                  className="text-xs font-black text-red-500"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModalFormulario({
  titulo,
  children,
  onClose,
}: {
  titulo: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[min(96vw,52rem)] overflow-hidden rounded-[24px] bg-white shadow-2xl sm:rounded-[30px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
              Editor
            </p>
            <h2 className="mt-2 break-words text-xl font-black leading-tight sm:text-2xl">
              {titulo}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-black text-white transition hover:bg-white/20"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {children}
        </div>
      </div>
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
    <label className="block">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      {children}
    </label>
  );
}

function FormularioActions({
  salvando,
  label,
}: {
  salvando: boolean;
  label: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
      <button
        type="submit"
        disabled={salvando}
        className="rounded-2xl bg-[#08163F] px-5 py-3 font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {salvando ? "Salvando..." : label}
      </button>
    </div>
  );
}

function dataParaInput(data?: string | null) {
  if (!data) return "";

  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return "";

  const offsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

function MiniInfo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-[22px] border border-slate-100 bg-[#f8fafc] p-4 shadow-sm">
      <p className="break-words text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 sm:text-xs">
        {titulo}
      </p>

      <p className="mt-3 break-words text-3xl font-black leading-none text-[#08163F] sm:text-4xl">
        {valor}
      </p>
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-[24px] p-5 shadow-xl shadow-slate-200/70 sm:p-6 ${
        destaque
          ? "bg-[#071A55] text-white"
          : "border border-slate-100 bg-white text-[#08163F]"
      }`}
    >
      <h2
        className={`break-words text-sm font-black ${
          destaque ? "text-blue-100" : "text-slate-500"
        }`}
      >
        {titulo}
      </h2>

      <p className="mt-4 break-words text-4xl font-black leading-none">
        {valor}
      </p>
    </div>
  );
}

function LiberacaoBadge({
  liberacao,
  carregando,
}: {
  liberacao: ModuloLiberacaoGlobal | null;
  carregando: boolean;
}) {
  const [agora, setAgora] = useState(0);

  useEffect(() => {
    const atualizarHorario = () => setAgora(Date.now());
    const primeiroUpdate = window.setTimeout(atualizarHorario, 0);
    const intervalo = window.setInterval(atualizarHorario, 30_000);

    return () => {
      window.clearTimeout(primeiroUpdate);
      window.clearInterval(intervalo);
    };
  }, []);

  if (carregando) {
    return (
      <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
        Verificando lock
      </span>
    );
  }

  const status = liberacao?.status_liberacao ?? "fechado";
  const liberacaoVencida =
    status === "agendado" &&
    liberacao?.liberar_em &&
    agora > 0 &&
    new Date(liberacao.liberar_em).getTime() <= agora;

  const label =
    status === "aberto" || liberacaoVencida
      ? "Aberto"
      : status === "agendado"
        ? `Agendado ${liberacao?.liberar_em ? formatarDataHora(liberacao.liberar_em) : ""}`
        : "Fechado";

  const classe =
    status === "aberto" || liberacaoVencida
      ? "bg-emerald-50 text-emerald-700"
      : status === "agendado"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${classe}`}
    >
      {label}
    </span>
  );
}

function AtividadesPersonalizadasSection({
  atividades,
  carregando,
  onNova,
  onEditar,
  onExcluir,
}: {
  atividades: AtividadePersonalizada[];
  carregando: boolean;
  onNova: () => void;
  onEditar: (atividade: AtividadePersonalizada) => void;
  onExcluir: (atividadeId: string) => void;
}) {
  return (
    <section className="mt-4 rounded-[22px] border border-slate-100 bg-[#f9fafb] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Atividade prática personalizada
          </p>
          <h3 className="mt-2 break-words text-lg font-black text-[#08163F] sm:text-xl">
            O que cada mentorado precisa fazer neste módulo
          </h3>
          <p className="mt-2 max-w-3xl break-words text-sm font-semibold leading-6 text-slate-500">
            A atividade base fica visível para a mentora. Aqui você adapta a
            tarefa conforme a dor, fase e necessidade de cada mentorado.
          </p>
        </div>

        <button
          type="button"
          onClick={onNova}
          className="rounded-2xl bg-[#08163F] px-4 py-2.5 text-sm font-black text-white transition hover:brightness-110"
        >
          Nova personalizada
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {carregando ? (
          <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
            Carregando atividades personalizadas...
          </div>
        ) : atividades.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
            Nenhuma atividade personalizada para este módulo ainda.
          </div>
        ) : (
          atividades.map((atividade) => {
            const nome =
              atividade.profiles?.nome ||
              atividade.profiles?.email ||
              "Mentorado";

            return (
              <article
                key={atividade.id}
                className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="break-words text-base font-black text-[#08163F]">
                        {nome}
                      </h4>
                      <StatusAtividadeBadge status={atividade.status} />
                    </div>

                    <p className="mt-3 whitespace-pre-line break-words text-sm font-semibold leading-6 text-slate-600">
                      {atividade.atividade}
                    </p>

                    {atividade.observacao_mentor && (
                      <p className="mt-3 whitespace-pre-line break-words rounded-2xl bg-[#f9fafb] p-3 text-sm font-semibold leading-6 text-slate-500">
                        Observação: {atividade.observacao_mentor}
                      </p>
                    )}

                    {atividade.resposta_mentorado && (
                      <p className="mt-3 whitespace-pre-line break-words rounded-2xl bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-700">
                        Resposta do mentorado: {atividade.resposta_mentorado}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onEditar(atividade)}
                      className="rounded-xl bg-[#EEF2FF] px-4 py-2 text-xs font-black text-[#08163F]"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => onExcluir(atividade.id)}
                      className="rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-600"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function StatusAtividadeBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    "Não iniciada": "bg-slate-100 text-slate-600",
    "Não iniciado": "bg-slate-100 text-slate-600",
    "Em andamento": "bg-blue-100 text-blue-700",
    Entregue: "bg-purple-100 text-purple-700",
    Revisar: "bg-yellow-100 text-yellow-700",
    Concluída: "bg-emerald-100 text-emerald-700",
    Concluído: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        classes[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function InfoBox({
  label,
  value,
  full,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl bg-[#f9fafb] p-4 ${full ? "md:col-span-2" : ""}`}
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6 text-slate-600">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}
