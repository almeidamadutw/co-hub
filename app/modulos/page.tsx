"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

import {
  AulaModulo,
  ModuloMentoria,
  useModulosSupabase,
} from "@/utils/useModulosSupabase";

import {
  getUsuarioLogado,
  usuarioTemPermissao,
  User,
} from "@/utils/auth";

type FormModulo = {
  titulo: string;
  descricao: string;
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
  titulo: "",
  descricao: "",
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
      const bateBusca =
        !termo ||
        modulo.titulo.toLowerCase().includes(termo) ||
        (modulo.descricao ?? "").toLowerCase().includes(termo) ||
        modulo.aulas.some((aula) =>
          aula.titulo.toLowerCase().includes(termo)
        );

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
          modulo.aulas.some(
            (aula) => aula.materiais_aula && aula.materiais_aula.length > 0
          ));

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
      taxaVideo:
        totalAulas === 0 ? 0 : Math.round((aulasComVideo / totalAulas) * 100),
    };
  }, [modulos, totalAulas, aulasComVideo, totalMateriais]);

  function abrirNovoModulo() {
    setFormModulo(moduloInicial);
    setErro("");
    setMostrarModuloForm(true);
  }

  function abrirNovaAula(moduloId?: string) {
    setFormAula({
      ...aulaInicial,
      moduloId: moduloId ?? "",
    });

    setErro("");
    setMostrarAulaForm(true);
  }

  function abrirNovoMaterial(aulaId?: string) {
    setFormMaterial({
      ...materialInicial,
      aulaId: aulaId ?? "",
    });

    setErro("");
    setMostrarMaterialForm(true);
  }

  function fecharFormularios() {
    setMostrarModuloForm(false);
    setMostrarAulaForm(false);
    setMostrarMaterialForm(false);
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

    if (!formModulo.titulo.trim()) {
      setErro("Informe o título do módulo.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      await criarModulo({
  titulo: formModulo.titulo.trim(),
  descricao: formModulo.descricao.trim(),
  criadoPor: (usuario as User & { id?: string })?.id ?? null,
});

      fecharFormularios();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o módulo."
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

      <section className="relative flex-1 overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#12317C]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-slate-300/30 blur-3xl" />

        <div className="relative z-10">
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-[0_24px_60px_rgba(8,22,63,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.32em] text-[#C9CED6]">
                  Módulos CEO Club
                </p>

                <h1 className="max-w-4xl text-4xl font-black leading-tight">
                  Organize a jornada de aprendizagem dos mentorados.
                </h1>

                <p className="mt-3 max-w-2xl text-[#D9DEE7]">
                  Crie módulos, aulas, objetivos, vídeos e materiais de apoio.
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

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <MiniInfo titulo="Aulas com vídeo" valor={`${resumo.taxaVideo}%`} />
              <MiniInfo titulo="Módulos sem aulas" valor={String(resumo.semAulas)} />
              <MiniInfo titulo="Materiais" valor={String(resumo.materiais)} />
            </div>
          </section>

          <section className="mb-6 grid gap-4 md:grid-cols-5">
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

          <section className="mb-6 rounded-[28px] border border-white/50 bg-white/85 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.6fr_0.7fr_0.45fr]">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por módulo, aula ou descrição"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#08163F] outline-none focus:border-[#12317C]"
              />

              <select
                value={filtroAtivo}
                onChange={(e) => setFiltroAtivo(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#08163F] outline-none focus:border-[#12317C]"
              >
                <option>Todos</option>
                <option>Ativos</option>
                <option>Inativos</option>
              </select>

              <select
                value={filtroConteudo}
                onChange={(e) => setFiltroConteudo(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#08163F] outline-none focus:border-[#12317C]"
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
              <div className="rounded-[30px] bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-xl shadow-slate-200/70">
                Nenhum módulo encontrado.
              </div>
            ) : (
              modulosFiltrados.map((modulo) => (
                <ModuloCard
                  key={modulo.id}
                  modulo={modulo}
                  onOpen={() => setModuloSelecionado(modulo)}
                />
              ))
            )}
          </section>
        </div>
      </section>

      {mostrarModuloForm && (
        <ModalFormulario titulo="Novo módulo" onClose={fecharFormularios}>
          <form onSubmit={salvarModulo}>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={formModulo.titulo}
                onChange={(e) =>
                  setFormModulo({ ...formModulo, titulo: e.target.value })
                }
                placeholder="Título do módulo"
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#12317C]"
              />

              <textarea
                value={formModulo.descricao}
                onChange={(e) =>
                  setFormModulo({ ...formModulo, descricao: e.target.value })
                }
                placeholder="Descrição do módulo"
                className="min-h-[130px] rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#12317C] md:col-span-2"
              />
            </div>

            <FormularioActions salvando={salvando} label="Salvar módulo" />
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
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#12317C]"
              >
                <option value="">Selecione o módulo</option>

                {modulos.map((modulo) => (
                  <option key={modulo.id} value={modulo.id}>
                    {modulo.ordem}. {modulo.titulo}
                  </option>
                ))}
              </select>

              <input
                value={formAula.titulo}
                onChange={(e) =>
                  setFormAula({ ...formAula, titulo: e.target.value })
                }
                placeholder="Título da aula"
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#12317C]"
              />

              <input
                value={formAula.duracao}
                onChange={(e) =>
                  setFormAula({ ...formAula, duracao: e.target.value })
                }
                placeholder="Duração, ex: 45 min"
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#12317C]"
              />

              <input
                value={formAula.videoUrl}
                onChange={(e) =>
                  setFormAula({ ...formAula, videoUrl: e.target.value })
                }
                placeholder="URL do vídeo"
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#12317C]"
              />

              <textarea
                value={formAula.descricao}
                onChange={(e) =>
                  setFormAula({ ...formAula, descricao: e.target.value })
                }
                placeholder="Descrição da aula"
                className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#12317C]"
              />

              <textarea
                value={formAula.objetivo}
                onChange={(e) =>
                  setFormAula({ ...formAula, objetivo: e.target.value })
                }
                placeholder="Objetivo da aula"
                className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#12317C]"
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
                  setFormMaterial({
                    ...formMaterial,
                    aulaId: e.target.value,
                  })
                }
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#12317C]"
              >
                <option value="">Selecione a aula</option>

                {modulos.flatMap((modulo) =>
                  modulo.aulas.map((aula) => (
                    <option key={aula.id} value={aula.id}>
                      {modulo.titulo} · {aula.titulo}
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
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#12317C]"
              />

              <input
                value={formMaterial.url}
                onChange={(e) =>
                  setFormMaterial({ ...formMaterial, url: e.target.value })
                }
                placeholder="URL do material"
                className="rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#12317C] md:col-span-2"
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
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[34px] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                    Detalhes do módulo
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    {moduloSelecionado.titulo}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-blue-100">
                    Ordem {moduloSelecionado.ordem} ·{" "}
                    {moduloSelecionado.aulas.length} aula(s)
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

            <div className="overflow-y-auto p-7">
              <div className="rounded-2xl bg-[#f9fafb] p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Descrição
                </p>

                <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                  {moduloSelecionado.descricao || "Sem descrição."}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => abrirNovaAula(moduloSelecionado.id)}
                  className="rounded-2xl bg-[#08163F] px-5 py-4 text-sm font-black text-white"
                >
                  Nova aula neste módulo
                </button>

                <button
                  onClick={() => abrirNovoMaterial()}
                  className="rounded-2xl bg-[#EEF2FF] px-5 py-4 text-sm font-black text-[#08163F]"
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
}: {
  modulo: ModuloMentoria;
  onOpen: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-white/50 bg-white/90 shadow-xl shadow-slate-200/70">
      <button
        type="button"
        onClick={onOpen}
        className="w-full p-6 text-left transition hover:bg-[#f9fafb]"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] to-[#12317C] text-xl font-black text-white">
              {modulo.ordem}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black text-[#08163F]">
                  {modulo.titulo}
                </h2>

                <StatusBadge ativo={modulo.ativo} />
              </div>

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                {modulo.descricao || "Sem descrição."}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
              </div>
            </div>
          </div>

          <span className="text-sm font-black text-[#08163F]">Abrir →</span>
        </div>
      </button>
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

          <h4 className="mt-1 text-lg font-black text-[#08163F]">
            {aula.titulo}
          </h4>

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
        <button
          onClick={() => onEditarCampo(aula, "titulo", "título")}
          className="rounded-xl bg-white px-4 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100"
        >
          Editar título
        </button>

        <button
          onClick={() => onEditarCampo(aula, "descricao", "descrição")}
          className="rounded-xl bg-white px-4 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100"
        >
          Editar descrição
        </button>

        <button
          onClick={() => onEditarCampo(aula, "objetivo", "objetivo")}
          className="rounded-xl bg-white px-4 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100"
        >
          Editar objetivo
        </button>

        <button
          onClick={() => onEditarCampo(aula, "video_url", "vídeo")}
          className="rounded-xl bg-white px-4 py-2 text-xs font-black text-[#08163F] ring-1 ring-slate-100"
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
  className="mt-4 block rounded-2xl bg-white p-4 text-sm font-black text-[#08163F] ring-1 ring-slate-100"
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
  className="text-sm font-black text-[#08163F] hover:underline"
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
        className="w-full max-w-3xl overflow-hidden rounded-[34px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
              Editor
            </p>

            <h2 className="mt-3 text-3xl font-black">{titulo}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-7">{children}</div>
      </div>
    </div>
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
    <div className="mt-5 flex flex-wrap gap-3">
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

function MiniInfo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{valor}</p>
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
      className={`rounded-[24px] border border-white/50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm ${
        destaque ? "bg-[#071A55] text-white" : "bg-white/85 text-[#08163F]"
      }`}
    >
      <h2
        className={`text-sm font-black ${
          destaque ? "text-blue-100" : "text-slate-500"
        }`}
      >
        {titulo}
      </h2>

      <p className="mt-3 text-3xl font-black">{valor}</p>
    </div>
  );
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        ativo
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}