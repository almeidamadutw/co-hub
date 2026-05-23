"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
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

type FormMaterial = {
  aulaId: string;
  nome: string;
  url: string;
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
};

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

  const [moduloSelecionado, setModuloSelecionado] =
    useState<ModuloMentoria | null>(null);

  const [salvando, setSalvando] = useState(false);

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
    adicionarMaterial,
    removerMaterial,
  } = useModulosSupabase();

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

    if (!usuarioTemPermissao(usuarioLogado, ["mentor", "modulos"])) {
      router.push(
        usuarioLogado.role === "mentorado" ? "/mentorado/dashboard" : "/login"
      );
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
              (aula) => aula.materiais_aula && aula.materiais_aula.length > 0
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
          modulo.atividade_pratica
      ).length,
    };
  }, [modulos, totalAulas, aulasComVideo, totalMateriais]);

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
    setEditandoModuloId(null);
    setFormModulo(moduloInicial);
    setFormAula(aulaInicial);
    setFormMaterial(materialInicial);
    setErro("");
  }

  function limparFiltros() {
    setBusca("");
    setFiltroAtivo("Todos");
    setFiltroConteudo("Todos");
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
          : "Não foi possível salvar o módulo."
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
          : "Não foi possível criar a aula."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarMaterial(e: React.FormEvent) {
    e.preventDefault();

    if (
      !formMaterial.aulaId ||
      !formMaterial.nome.trim() ||
      !formMaterial.url.trim()
    ) {
      setErro("Selecione a aula, informe o nome e o link do material.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      await adicionarMaterial({
        aulaId: formMaterial.aulaId,
        nome: formMaterial.nome.trim(),
        url: formMaterial.url.trim(),
      });

      fecharFormularios();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o material."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExcluirModulo(moduloId: string) {
    const confirmar = window.confirm(
      "Deseja excluir este módulo e todas as aulas vinculadas?"
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
          : "Não foi possível excluir o módulo."
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
          : "Não foi possível excluir a aula."
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
          : "Não foi possível remover o material."
      );
    }
  }

  async function editarCampoAula(
    aula: AulaModulo,
    campo: "titulo" | "descricao" | "objetivo" | "duracao" | "video_url",
    label: string
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
          : "Não foi possível atualizar a aula."
      );
    }
  }

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando módulos...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="ceo-content">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#12317C]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-slate-300/30 blur-3xl" />

        <div className="ceo-stack">
          <section className="ceo-hero">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.32em] text-[#C9CED6]">
                  Módulos CEO Club
                </p>

                <h1 className="ceo-title max-w-4xl">
                  Estruture a jornada de aprendizagem dos mentorados.
                </h1>

                <p className="ceo-subtitle">
                  Cadastre módulo, posicionamento, objetivo, encontros, materiais,
atividade prática e acompanhe a evolução.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => abrirNovaAula()}
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/15"
                >
                  Nova aula
                </button>

                <button
                  onClick={abrirNovoModulo}
                  className="rounded-2xl px-5 py-3 font-black text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105"
                  style={{
                    background:
                      "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
                  }}
                >
                  Novo módulo
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniInfo titulo="Módulos completos" valor={String(resumo.completos)} />
              <MiniInfo titulo="Aulas com vídeo" valor={String(resumo.videos)} />
              <MiniInfo titulo="Módulos sem aulas" valor={String(resumo.semAulas)} />
              <MiniInfo titulo="Materiais" valor={String(resumo.materiais)} />
            </div>
          </section>

          <section className="mb-5 grid gap-4 sm:mb-6 sm:grid-cols-2 xl:grid-cols-5">
            <ResumoCard titulo="Módulos" valor={String(resumo.modulos)} destaque />
            <ResumoCard titulo="Ativos" valor={String(resumo.ativos)} />
            <ResumoCard titulo="Aulas" valor={String(resumo.aulas)} />
            <ResumoCard titulo="Vídeos" valor={String(resumo.videos)} />
            <ResumoCard titulo="Materiais" valor={String(resumo.materiais)} />
          </section>

          <section className="ceo-card mb-5 sm:mb-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_180px_190px_120px]">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por módulo, nome premium, objetivo ou aula"
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

            <p className="mt-4 text-sm font-bold text-slate-500">
              Exibindo {modulosFiltrados.length} de {modulos.length} módulo(s).
            </p>
          </section>

          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          <section className="grid gap-5">
            {modulosFiltrados.length === 0 ? (
              <div className="rounded-[24px] bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-xl shadow-slate-200/70 sm:rounded-[30px]">
                Nenhum módulo encontrado.
              </div>
            ) : (
              modulosFiltrados.map((modulo) => (
                <ModuloCard
                  key={modulo.id}
                  modulo={modulo}
                  onOpen={() => setModuloSelecionado(modulo)}
                  onEdit={() => abrirEditarModulo(modulo)}
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
            <div className="grid gap-4 md:grid-cols-2">
              <Campo label="Nome do módulo">
                <input
                  value={formModulo.nomePremium}
                  onChange={(e) =>
                    setFormModulo({ ...formModulo, nomePremium: e.target.value })
                  }
                  placeholder="Digite o nome do módulo"
                  className="ceo-field"
                />
              </Campo>

              <Campo label="Nome explicativo">
                <input
                  value={formModulo.nomeExplicativo}
                  onChange={(e) =>
                    setFormModulo({ ...formModulo, nomeExplicativo: e.target.value })
                  }
                  placeholder="Explique o tema principal do módulo"
                  className="ceo-field"
                />
              </Campo>

              <Campo label="Descrição curta">
                <textarea
                  value={formModulo.descricaoCurta}
                  onChange={(e) =>
                    setFormModulo({ ...formModulo, descricaoCurta: e.target.value })
                  }
                  placeholder="Resumo curto do módulo"
                  className="ceo-field min-h-[110px]"
                />
              </Campo>

              <Campo label="Objetivo do módulo">
                <textarea
                  value={formModulo.objetivoModulo}
                  onChange={(e) =>
                    setFormModulo({ ...formModulo, objetivoModulo: e.target.value })
                  }
                  placeholder="O que o mentorado precisa alcançar"
                  className="ceo-field min-h-[110px]"
                />
              </Campo>

              <Campo label="Aula principal / encontros">
                <textarea
                  value={formModulo.aulaPrincipal}
                  onChange={(e) =>
                    setFormModulo({ ...formModulo, aulaPrincipal: e.target.value })
                  }
                  placeholder="Aula principal, encontro ao vivo, mentoria, revisão..."
                  className="ceo-field min-h-[110px]"
                />
              </Campo>

              <Campo label="Encontros">
                <textarea
                  value={formModulo.encontros}
                  onChange={(e) =>
                    setFormModulo({ ...formModulo, encontros: e.target.value })
                  }
                  placeholder="Descreva os encontros previstos"
                  className="ceo-field min-h-[110px]"
                />
              </Campo>

              <Campo label="Materiais">
                <textarea
                  value={formModulo.materiais}
                  onChange={(e) =>
                    setFormModulo({ ...formModulo, materiais: e.target.value })
                  }
placeholder="Liste os materiais do módulo"
                  className="ceo-field min-h-[110px]"
                />
              </Campo>

              <Campo label="Atividade prática">
                <textarea
                  value={formModulo.atividadePratica}
                  onChange={(e) =>
                    setFormModulo({ ...formModulo, atividadePratica: e.target.value })
                  }
                  placeholder="Descreva a atividade prática do mentorado"
                  className="ceo-field min-h-[110px]"
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
            <div className="grid gap-4 md:grid-cols-2">
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
                className="ceo-field min-h-[120px]"
              />

              <textarea
                value={formAula.objetivo}
                onChange={(e) =>
                  setFormAula({ ...formAula, objetivo: e.target.value })
                }
                placeholder="Objetivo da aula"
                className="ceo-field min-h-[120px]"
              />
            </div>

            <FormularioActions salvando={salvando} label="Salvar aula" />
          </form>
        </ModalFormulario>
      )}

      {mostrarMaterialForm && (
        <ModalFormulario titulo="Novo material" onClose={fecharFormularios}>
          <form onSubmit={salvarMaterial}>
            <div className="grid gap-4 md:grid-cols-2">
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
                  ))
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

              <input
                value={formMaterial.url}
                onChange={(e) =>
                  setFormMaterial({ ...formMaterial, url: e.target.value })
                }
                placeholder="URL do material"
                className="ceo-field md:col-span-2"
              />
            </div>

            <FormularioActions salvando={salvando} label="Salvar material" />
          </form>
        </ModalFormulario>
      )}

      {moduloSelecionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => setModuloSelecionado(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl sm:rounded-[34px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                    Módulo {moduloSelecionado.ordem}
                  </p>

                  <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                    {getModuloPremium(moduloSelecionado)}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-blue-100">
                    {getModuloExplicativo(moduloSelecionado)}
                  </p>
                </div>

                <button
                  onClick={() => setModuloSelecionado(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>

              <div className="mt-5">
                <StatusBadge ativo={moduloSelecionado.ativo} />
              </div>
            </div>

            <div className="overflow-y-auto p-5 sm:p-7">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoBox label="Descrição curta" value={getModuloDescricaoCurta(moduloSelecionado) || "—"} />
                <InfoBox label="Objetivo do módulo" value={moduloSelecionado.objetivo_modulo || "—"} />
                <InfoBox label="Aula principal / encontros" value={moduloSelecionado.aula_principal || "—"} />
                <InfoBox label="Materiais" value={moduloSelecionado.materiais || "—"} />
                <InfoBox label="Atividade prática" value={moduloSelecionado.atividade_pratica || "—"} full />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => abrirEditarModulo(moduloSelecionado)}
                  className="rounded-2xl bg-[#EEF2FF] px-5 py-4 text-sm font-black text-[#08163F]"
                >
                  Editar módulo
                </button>

                <button
                  onClick={() => abrirNovaAula(moduloSelecionado.id)}
                  className="rounded-2xl bg-[#08163F] px-5 py-4 text-sm font-black text-white"
                >
                  Nova aula neste módulo
                </button>

                <button
                  onClick={() => abrirNovoMaterial()}
                  className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-[#08163F]"
                >
                  Novo material
                </button>

                <button
                  onClick={() => confirmarExcluirModulo(moduloSelecionado.id)}
                  className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-black text-red-600"
                >
                  Excluir módulo
                </button>
              </div>

              <div className="mt-7">
                <h3 className="text-xl font-black text-[#08163F]">Aulas</h3>

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

            <div className="sticky bottom-0 z-10 border-t border-slate-100 bg-white p-5">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => abrirNovaAula(moduloSelecionado.id)}
                  className="rounded-2xl bg-[#08163F] px-5 py-4 text-sm font-black text-white"
                >
                  Nova aula
                </button>

                <button
                  onClick={() => setModuloSelecionado(null)}
                  className="ml-auto rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-black text-[#08163F] transition hover:bg-slate-50"
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
  onOpen,
  onEdit,
}: {
  modulo: ModuloMentoria;
  onOpen: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-white/50 bg-white/90 shadow-xl shadow-slate-200/70 sm:rounded-[30px]">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <button
            type="button"
            onClick={onOpen}
            className="flex flex-1 gap-4 text-left sm:gap-5"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] to-[#12317C] text-xl font-black text-white sm:h-16 sm:w-16">
              {modulo.ordem}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-black text-[#08163F] sm:text-2xl">
                  {getModuloPremium(modulo)}
                </h2>

                <StatusBadge ativo={modulo.ativo} />
              </div>

              <p className="mt-1 text-sm font-black text-slate-500">
                {getModuloExplicativo(modulo)}
              </p>

              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                {getModuloDescricaoCurta(modulo) || "Sem descrição curta."}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SmallMetric label="Aulas" value={String(modulo.aulas.length)} />
                <SmallMetric
                  label="Vídeos"
                  value={String(modulo.aulas.filter((aula) => Boolean(aula.video_url)).length)}
                />
                <SmallMetric
                  label="Materiais"
                  value={String(
                    modulo.aulas.reduce(
                      (acc, aula) => acc + (aula.materiais_aula?.length ?? 0),
                      0
                    )
                  )}
                />
                <SmallMetric label="Prática" value={modulo.atividade_pratica ? "Sim" : "—"} />
              </div>
            </div>
          </button>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-2xl bg-[#EEF2FF] px-4 py-3 text-sm font-black text-[#08163F]"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={onOpen}
              className="rounded-2xl bg-[#08163F] px-4 py-3 text-sm font-black text-white"
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
    <div className="rounded-2xl bg-[#f9fafb] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#08163F]">{value}</p>
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
    label: string
  ) => void;
  onExcluir: () => void;
  onNovoMaterial: () => void;
  onRemoverMaterial: (materialId: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Aula {aula.ordem}
          </p>

          <h4 className="mt-1 text-lg font-black text-[#08163F]">{aula.titulo}</h4>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {aula.descricao || "Sem descrição."}
          </p>

          {aula.objetivo && (
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Objetivo: {aula.objetivo}
            </p>
          )}

          <p className="mt-2 text-xs font-bold text-slate-400">
            {aula.duracao || "Duração não informada"}
          </p>
        </div>

        <StatusBadge ativo={aula.ativo} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={() => onEditarCampo(aula, "titulo", "título")} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100">Editar título</button>
        <button onClick={() => onEditarCampo(aula, "descricao", "descrição")} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100">Editar descrição</button>
        <button onClick={() => onEditarCampo(aula, "objetivo", "objetivo")} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100">Editar objetivo</button>
        <button onClick={() => onEditarCampo(aula, "video_url", "vídeo")} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100">Editar vídeo</button>
        <button onClick={onNovoMaterial} className="rounded-xl bg-[#EEF2FF] px-4 py-2 text-xs font-black text-[#08163F]">Novo material</button>
        <button onClick={onExcluir} className="rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-600">Excluir</button>
      </div>

      {aula.video_url && (
        <a href={aula.video_url} target="_blank" rel="noreferrer" className="mt-4 block rounded-2xl bg-white p-4 text-sm font-black text-[#08163F] ring-1 ring-slate-100">
          Abrir vídeo →
        </a>
      )}

      {aula.materiais_aula && aula.materiais_aula.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Materiais</p>

          <div className="mt-3 space-y-2">
            {aula.materiais_aula.map((material) => (
              <div key={material.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f9fafb] px-4 py-3">
                <a href={material.url} target="_blank" rel="noreferrer" className="text-sm font-black text-[#08163F] hover:underline">{material.nome}</a>
                <button onClick={() => onRemoverMaterial(material.id)} className="text-xs font-black text-red-500">Remover</button>
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-4xl overflow-hidden rounded-[24px] bg-white shadow-2xl sm:rounded-[34px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white sm:p-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">Editor</p>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">{titulo}</h2>
          </div>

          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20">×</button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-7">{children}</div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      {children}
    </label>
  );
}

function FormularioActions({ salvando, label }: { salvando: boolean; label: string }) {
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="submit" disabled={salvando} className="rounded-2xl bg-[#08163F] px-5 py-3 font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
        {salvando ? "Salvando..." : label}
      </button>
    </div>
  );
}

function MiniInfo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm sm:p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">{titulo}</p>
      <p className="mt-2 break-words text-xl font-black text-white sm:text-2xl">{valor}</p>
    </div>
  );
}

function ResumoCard({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-[22px] border border-white/50 p-4 shadow-[0_14px_35px_rgba(15,23,42,0.07)] backdrop-blur-sm sm:p-5 lg:p-6 ${destaque ? "bg-[#071A55] text-white" : "bg-white/85 text-[#08163F]"}`}>
      <h2 className={`text-sm font-black ${destaque ? "text-blue-100" : "text-slate-500"}`}>{titulo}</h2>
      <p className="mt-3 break-words text-2xl font-black sm:text-3xl">{valor}</p>
    </div>
  );
}

function InfoBox({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={`rounded-2xl bg-[#f9fafb] p-5 ${full ? "md:col-span-2" : ""}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-slate-600">{value}</p>
    </div>
  );
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}
