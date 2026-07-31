"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import SuporteSidebar from "@/components/SuporteSidebar";
import { obterCabecalhoAutorizacao } from "@/utils/apiAuthClient";
import {
  rotaInicialUsuario,
  sincronizarUsuarioComSessao,
  User,
  usuarioTemAcessoSuporte,
  usuarioTemPermissao,
} from "@/utils/auth";

type ModoPainel = "mentor" | "suporte";
type ModoMaterial = "arquivo" | "link";
type DestinoMaterial = "geral" | "mentorado" | "pasta";
type OrigemBiblioteca = "biblioteca" | "aula";
type EscopoBiblioteca = "mentorado" | "geral" | "interno";
type VisibilidadePasta = "publica" | "privada";

type MentoradoResumo = {
  id: string;
  nome: string | null;
  email: string | null;
};

type BibliotecaPasta = {
  id: string;
  nome: string;
  descricao?: string | null;
  visibilidade: VisibilidadePasta;
  criada_por?: string | null;
  created_at: string;
  updated_at: string;
};

type BibliotecaArquivo = {
  id: string;
  mentorado_id?: string | null;
  mentorado_nome?: string | null;
  mentorado_email?: string | null;
  criado_por?: string | null;
  pasta_id?: string | null;
  pasta_nome?: string | null;
  pasta_visibilidade?: VisibilidadePasta | null;
  escopo?: EscopoBiblioteca;
  nome: string;
  categoria: string;
  tipo: string;
  url: string;
  url_original?: string | null;
  storage_path?: string | null;
  tamanho_bytes?: number | null;
  observacao?: string | null;
  created_at: string;
  updated_at?: string | null;
  origem?: OrigemBiblioteca;
  modulo_id?: string | null;
  modulo_nome?: string | null;
  aula_id?: string | null;
  aula_nome?: string | null;
};

type FormMaterial = {
  destino: DestinoMaterial;
  mentoradoId: string;
  pastaId: string;
  nome: string;
  categoria: string;
  observacao: string;
  modo: ModoMaterial;
  url: string;
  arquivo: File | null;
};

type FormPasta = {
  nome: string;
  descricao: string;
  visibilidade: VisibilidadePasta;
};

const formMaterialInicial: FormMaterial = {
  destino: "geral",
  mentoradoId: "",
  pastaId: "",
  nome: "",
  categoria: "material",
  observacao: "",
  modo: "arquivo",
  url: "",
  arquivo: null,
};

const formPastaInicial: FormPasta = {
  nome: "",
  descricao: "",
  visibilidade: "privada",
};

const categorias = [
  { value: "material", label: "Material" },
  { value: "reuniao", label: "Reunião" },
  { value: "atividade", label: "Atividade" },
  { value: "pdf", label: "PDF" },
  { value: "video", label: "Vídeo" },
  { value: "link", label: "Link" },
  { value: "outro", label: "Outro" },
];

function formatarTamanho(bytes?: number | null) {
  if (!bytes) return "Link externo";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

function iconeTipo(tipo: string) {
  if (tipo === "pdf") return "📄";
  if (tipo === "video") return "🎥";
  if (tipo === "imagem") return "🖼️";
  if (tipo === "link") return "🔗";
  if (tipo === "documento") return "📎";
  return "📁";
}

function labelCategoria(categoria: string) {
  return categorias.find((item) => item.value === categoria)?.label ?? "Material";
}

function labelDestino(arquivo: BibliotecaArquivo) {
  if ((arquivo.origem ?? "biblioteca") === "aula") return "Material da aula";
  if (arquivo.pasta_id) return arquivo.pasta_nome || "Pasta";
  if (arquivo.escopo === "geral") return "Todos os mentorados";
  if (arquivo.escopo === "interno") return "Somente equipe";
  return arquivo.mentorado_nome || arquivo.mentorado_email || "Material individual";
}

function corDestino(arquivo: BibliotecaArquivo) {
  if ((arquivo.origem ?? "biblioteca") === "aula") {
    return "bg-blue-50 text-blue-700";
  }

  if (arquivo.escopo === "interno") return "bg-amber-50 text-amber-700";
  if (arquivo.escopo === "geral") return "bg-emerald-50 text-emerald-700";
  return "bg-violet-50 text-violet-700";
}

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function BibliotecaGestao({
  modoPainel,
}: {
  modoPainel: ModoPainel;
}) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [arquivos, setArquivos] = useState<BibliotecaArquivo[]>([]);
  const [pastas, setPastas] = useState<BibliotecaPasta[]>([]);
  const [mentorados, setMentorados] = useState<MentoradoResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroPasta, setFiltroPasta] = useState("todos");
  const [filtroDestino, setFiltroDestino] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroMentorado, setFiltroMentorado] = useState("todos");
  const [modalMaterialAberto, setModalMaterialAberto] = useState(false);
  const [modalPastaAberto, setModalPastaAberto] = useState(false);
  const [materialEditando, setMaterialEditando] = useState<BibliotecaArquivo | null>(null);
  const [pastaEditando, setPastaEditando] = useState<BibliotecaPasta | null>(null);
  const [formMaterial, setFormMaterial] = useState<FormMaterial>(formMaterialInicial);
  const [formPasta, setFormPasta] = useState<FormPasta>(formPastaInicial);

  useEffect(() => {
    async function validarAcesso() {
      const usuarioAtual = await sincronizarUsuarioComSessao();

      if (!usuarioAtual) {
        router.replace("/login");
        return;
      }

      const autorizado =
        modoPainel === "suporte"
          ? usuarioTemAcessoSuporte(usuarioAtual)
          : usuarioTemPermissao(usuarioAtual, ["mentor", "suporte"]);

      if (!autorizado) {
        router.replace(rotaInicialUsuario(usuarioAtual));
        return;
      }

      setUsuario(usuarioAtual);
    }

    void validarAcesso();
  }, [modoPainel, router]);

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");
      const headers = await obterCabecalhoAutorizacao();
      const response = await fetch("/api/biblioteca?mentoradoId=todos", {
        cache: "no-store",
        headers,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Não foi possível carregar a Biblioteca.");
      }

      setArquivos(payload.arquivos ?? []);
      setPastas(payload.pastas ?? []);
      setMentorados(payload.mentorados ?? []);

      const params = new URLSearchParams(window.location.search);
      const mentoradoId = params.get("mentoradoId") || params.get("mentorado");
      if (mentoradoId) setFiltroMentorado(mentoradoId);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar a Biblioteca.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!usuario) return;
    void carregarDados();
  }, [carregarDados, usuario]);

  const contagemPorPasta = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const arquivo of arquivos) {
      if (!arquivo.pasta_id || (arquivo.origem ?? "biblioteca") === "aula") continue;
      mapa.set(arquivo.pasta_id, (mapa.get(arquivo.pasta_id) ?? 0) + 1);
    }
    return mapa;
  }, [arquivos]);

  const arquivosFiltrados = useMemo(() => {
    const buscaNormalizada = normalizarBusca(busca.trim());

    return arquivos.filter((arquivo) => {
      const origem = arquivo.origem ?? "biblioteca";
      const textoArquivo = normalizarBusca(
        [
          arquivo.nome,
          arquivo.observacao,
          arquivo.pasta_nome,
          arquivo.mentorado_nome,
          arquivo.mentorado_email,
          arquivo.modulo_nome,
          arquivo.aula_nome,
        ]
          .filter(Boolean)
          .join(" ")
      );
      const passouBusca = !buscaNormalizada || textoArquivo.includes(buscaNormalizada);
      const passouPasta =
        filtroPasta === "todos" ||
        (filtroPasta === "raiz" ? !arquivo.pasta_id : arquivo.pasta_id === filtroPasta);
      const passouCategoria =
        filtroCategoria === "todos" || arquivo.categoria === filtroCategoria;
      const passouMentorado =
        filtroMentorado === "todos" || arquivo.mentorado_id === filtroMentorado;

      let passouDestino = filtroDestino === "todos";
      if (filtroDestino === "aula") passouDestino = origem === "aula";
      if (filtroDestino === "geral") {
        passouDestino = origem === "biblioteca" && arquivo.escopo === "geral";
      }
      if (filtroDestino === "mentorado") {
        passouDestino = origem === "biblioteca" && arquivo.escopo === "mentorado";
      }
      if (filtroDestino === "interno") {
        passouDestino = origem === "biblioteca" && arquivo.escopo === "interno";
      }

      return passouBusca && passouPasta && passouCategoria && passouMentorado && passouDestino;
    });
  }, [arquivos, busca, filtroCategoria, filtroDestino, filtroMentorado, filtroPasta]);

  const totais = useMemo(() => {
    return {
      biblioteca: arquivos.filter((arquivo) => (arquivo.origem ?? "biblioteca") === "biblioteca").length,
      gerais: arquivos.filter(
        (arquivo) =>
          (arquivo.origem ?? "biblioteca") === "biblioteca" && arquivo.escopo === "geral"
      ).length,
      individuais: arquivos.filter(
        (arquivo) =>
          (arquivo.origem ?? "biblioteca") === "biblioteca" && arquivo.escopo === "mentorado"
      ).length,
      privados: arquivos.filter(
        (arquivo) =>
          (arquivo.origem ?? "biblioteca") === "biblioteca" && arquivo.escopo === "interno"
      ).length,
    };
  }, [arquivos]);

  function abrirNovoMaterial() {
    setMaterialEditando(null);
    setFormMaterial({
      ...formMaterialInicial,
      mentoradoId: mentorados[0]?.id || "",
      pastaId: pastas[0]?.id || "",
    });
    setErro("");
    setSucesso("");
    setModalMaterialAberto(true);
  }

  function abrirEdicaoMaterial(arquivo: BibliotecaArquivo) {
    const destino: DestinoMaterial = arquivo.pasta_id
      ? "pasta"
      : arquivo.escopo === "mentorado"
        ? "mentorado"
        : "geral";

    setMaterialEditando(arquivo);
    setFormMaterial({
      destino,
      mentoradoId: arquivo.mentorado_id || mentorados[0]?.id || "",
      pastaId: arquivo.pasta_id || pastas[0]?.id || "",
      nome: arquivo.nome,
      categoria: arquivo.categoria,
      observacao: arquivo.observacao || "",
      modo: arquivo.storage_path ? "arquivo" : "link",
      url: arquivo.storage_path ? "" : arquivo.url_original || arquivo.url,
      arquivo: null,
    });
    setErro("");
    setSucesso("");
    setModalMaterialAberto(true);
  }

  function abrirNovaPasta() {
    setPastaEditando(null);
    setFormPasta(formPastaInicial);
    setErro("");
    setSucesso("");
    setModalPastaAberto(true);
  }

  function abrirEdicaoPasta(pasta: BibliotecaPasta) {
    setPastaEditando(pasta);
    setFormPasta({
      nome: pasta.nome,
      descricao: pasta.descricao || "",
      visibilidade: pasta.visibilidade,
    });
    setErro("");
    setSucesso("");
    setModalPastaAberto(true);
  }

  async function salvarMaterial(event: React.FormEvent) {
    event.preventDefault();
    if (salvando) return;

    if (!formMaterial.nome.trim()) {
      setErro("Informe o nome do material.");
      return;
    }

    if (formMaterial.destino === "mentorado" && !formMaterial.mentoradoId) {
      setErro("Selecione o mentorado.");
      return;
    }

    if (formMaterial.destino === "pasta" && !formMaterial.pastaId) {
      setErro("Selecione a pasta.");
      return;
    }

    if (formMaterial.modo === "link" && !formMaterial.url.trim()) {
      setErro("Cole o link do material.");
      return;
    }

    if (
      formMaterial.modo === "arquivo" &&
      !formMaterial.arquivo &&
      (!materialEditando || !materialEditando.storage_path)
    ) {
      setErro("Escolha um arquivo para enviar.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");
      const data = new FormData();
      if (materialEditando) data.append("id", materialEditando.id);
      data.append("destino", formMaterial.destino);
      data.append("mentoradoId", formMaterial.mentoradoId);
      data.append("pastaId", formMaterial.pastaId);
      data.append("nome", formMaterial.nome.trim());
      data.append("categoria", formMaterial.categoria);
      data.append("observacao", formMaterial.observacao.trim());
      data.append("modo", formMaterial.modo);
      data.append("url", formMaterial.url.trim());
      if (formMaterial.arquivo) data.append("arquivo", formMaterial.arquivo);

      const headers = await obterCabecalhoAutorizacao();
      const response = await fetch("/api/biblioteca", {
        method: materialEditando ? "PATCH" : "POST",
        headers,
        body: data,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Não foi possível salvar o material.");
      }

      setModalMaterialAberto(false);
      setSucesso(materialEditando ? "Material atualizado." : "Material adicionado à Biblioteca.");
      await carregarDados();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o material.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarPasta(event: React.FormEvent) {
    event.preventDefault();
    if (salvando) return;

    if (!formPasta.nome.trim()) {
      setErro("Informe o nome da pasta.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");
      const headers = await obterCabecalhoAutorizacao();
      const response = await fetch("/api/biblioteca/pastas", {
        method: pastaEditando ? "PATCH" : "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pastaEditando?.id,
          nome: formPasta.nome.trim(),
          descricao: formPasta.descricao.trim(),
          visibilidade: formPasta.visibilidade,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Não foi possível salvar a pasta.");
      }

      setModalPastaAberto(false);
      setSucesso(pastaEditando ? "Pasta atualizada." : "Pasta criada.");
      await carregarDados();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar a pasta.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerMaterial(arquivo: BibliotecaArquivo) {
    if ((arquivo.origem ?? "biblioteca") === "aula") {
      setErro("Materiais de aula devem ser removidos diretamente na aula de origem.");
      return;
    }

    if (!window.confirm(`Deseja remover "${arquivo.nome}" da Biblioteca?`)) return;

    try {
      setErro("");
      setSucesso("");
      const headers = await obterCabecalhoAutorizacao();
      const response = await fetch("/api/biblioteca", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: arquivo.id }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Não foi possível remover o material.");
      }

      setSucesso("Material removido da Biblioteca.");
      await carregarDados();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível remover o material.");
    }
  }

  async function removerPasta(pasta: BibliotecaPasta) {
    if (!window.confirm(`Deseja excluir a pasta "${pasta.nome}"?`)) return;

    try {
      setErro("");
      setSucesso("");
      const headers = await obterCabecalhoAutorizacao();
      const response = await fetch("/api/biblioteca/pastas", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: pasta.id }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Não foi possível remover a pasta.");
      }

      if (filtroPasta === pasta.id) setFiltroPasta("todos");
      setSucesso("Pasta removida.");
      await carregarDados();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível remover a pasta.");
    }
  }

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] px-4 text-[#08163F]">
        <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">CEO Club</p>
          <h1 className="mt-3 text-xl font-black">Organizando a Biblioteca...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      {modoPainel === "suporte" ? (
        <SuporteSidebar nome={usuario.nome} role={usuario.role} />
      ) : (
        <Sidebar
          nome={usuario.nome}
          role={usuario.role}
          acessoSuporte={Boolean(usuario.acesso_suporte)}
        />
      )}

      <section className="ceo-content no-scrollbar !p-4 sm:!p-5 lg:!p-6">
        <div className="ceo-stack !max-w-7xl">
          <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white shadow-2xl shadow-[#07122F]/20 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-200">Biblioteca CEO Club</p>
                <h1 className="mt-3 text-2xl font-black sm:text-3xl lg:text-4xl">Materiais organizados, sem caça ao tesouro.</h1>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-100 sm:text-base">
                  Envie para um mentorado, para todos ou organize em pastas públicas e privadas.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={abrirNovaPasta}
                  className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
                >
                  + Nova pasta
                </button>
                <button
                  type="button"
                  onClick={abrirNovoMaterial}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:brightness-95"
                >
                  + Adicionar material
                </button>
              </div>
            </div>
          </section>

          {erro ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">{erro}</div> : null}
          {sucesso ? <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700">{sucesso}</div> : null}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Materiais próprios", totais.biblioteca, "Arquivo e link"],
              ["Para todos", totais.gerais, "Geral e pastas públicas"],
              ["Individuais", totais.individuais, "Destino específico"],
              ["Privados", totais.privados, "Somente equipe"],
            ].map(([label, value, detail]) => (
              <article key={String(label)} className="rounded-[22px] bg-white p-5 shadow-lg shadow-slate-200/60">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">{detail}</p>
              </article>
            ))}
          </section>

          <section className="rounded-[26px] bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Pastas</p>
                <h2 className="mt-2 text-xl font-black sm:text-2xl">Organização da equipe</h2>
              </div>
              <p className="text-sm font-bold text-slate-400">{pastas.length} pasta(s)</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => setFiltroPasta("todos")}
                className={`rounded-[22px] border p-4 text-left transition ${
                  filtroPasta === "todos"
                    ? "border-[#08163F] bg-[#08163F] text-white shadow-lg"
                    : "border-slate-100 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <span className="text-2xl">🗂️</span>
                <p className="mt-3 font-black">Todos os materiais</p>
                <p className={`mt-1 text-xs font-bold ${filtroPasta === "todos" ? "text-blue-100" : "text-slate-400"}`}>{arquivos.length} item(ns)</p>
              </button>

              {pastas.map((pasta) => (
                <article
                  key={pasta.id}
                  className={`rounded-[22px] border p-4 transition ${
                    filtroPasta === pasta.id
                      ? "border-[#08163F] bg-blue-50"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <button type="button" onClick={() => setFiltroPasta(pasta.id)} className="w-full text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-2xl">{pasta.visibilidade === "publica" ? "📂" : "🔒"}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${pasta.visibilidade === "publica" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {pasta.visibilidade === "publica" ? "Pública" : "Privada"}
                      </span>
                    </div>
                    <p className="mt-3 break-words font-black">{pasta.nome}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{contagemPorPasta.get(pasta.id) ?? 0} item(ns)</p>
                  </button>
                  <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3">
                    <button type="button" onClick={() => abrirEdicaoPasta(pasta)} className="text-xs font-black text-blue-700">Editar</button>
                    <button type="button" onClick={() => removerPasta(pasta)} className="text-xs font-black text-red-600">Excluir</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[26px] bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Arquivos</p>
                <h2 className="mt-2 text-xl font-black sm:text-2xl">{arquivosFiltrados.length} de {arquivos.length} material(is)</h2>
              </div>
              <button type="button" onClick={carregarDados} className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-200">Atualizar</button>
            </div>

            <div className="mt-5 grid gap-3 rounded-[22px] bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-5">
              <input aria-label="Buscar material" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar material, pasta, aula..." className="ceo-field xl:col-span-2" />
              <select aria-label="Filtrar por destino" value={filtroDestino} onChange={(event) => setFiltroDestino(event.target.value)} className="ceo-field">
                <option value="todos">Todos os destinos</option>
                <option value="geral">Todos os mentorados</option>
                <option value="mentorado">Individuais</option>
                <option value="interno">Somente equipe</option>
                <option value="aula">Materiais das aulas</option>
              </select>
              <select aria-label="Filtrar por categoria" value={filtroCategoria} onChange={(event) => setFiltroCategoria(event.target.value)} className="ceo-field">
                <option value="todos">Todas as categorias</option>
                {categorias.map((categoria) => <option key={categoria.value} value={categoria.value}>{categoria.label}</option>)}
              </select>
              <select aria-label="Filtrar por mentorado" value={filtroMentorado} onChange={(event) => setFiltroMentorado(event.target.value)} className="ceo-field">
                <option value="todos">Todos os mentorados</option>
                {mentorados.map((mentorado) => <option key={mentorado.id} value={mentorado.id}>{mentorado.nome || mentorado.email}</option>)}
              </select>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {arquivosFiltrados.length === 0 ? (
                <div className="rounded-[22px] bg-slate-50 p-8 text-center lg:col-span-2">
                  <p className="text-lg font-black">Nenhum material encontrado</p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Tente limpar os filtros ou adicione um novo material.</p>
                </div>
              ) : arquivosFiltrados.map((arquivo) => {
                const origem = arquivo.origem ?? "biblioteca";
                return (
                  <article key={`${origem}-${arquivo.id}`} className="flex min-w-0 flex-col rounded-[22px] border border-slate-100 bg-[#f9fafb] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl">{iconeTipo(arquivo.tipo)}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${corDestino(arquivo)}`}>{labelDestino(arquivo)}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">{labelCategoria(arquivo.categoria)}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">{formatarTamanho(arquivo.tamanho_bytes)}</span>
                    </div>
                    <h3 className="mt-3 break-words text-lg font-black">{arquivo.nome}</h3>
                    {arquivo.modulo_nome ? <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-blue-700">{arquivo.modulo_nome}</p> : null}
                    {arquivo.aula_nome ? <p className="mt-1 text-sm font-bold text-slate-500">Aula: {arquivo.aula_nome}</p> : null}
                    {arquivo.observacao ? <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6 text-slate-500">{arquivo.observacao}</p> : null}
                    <p className="mt-3 text-xs font-bold text-slate-400">Enviado em {formatarData(arquivo.created_at)}</p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <a href={arquivo.url} target="_blank" rel="noreferrer" className="rounded-2xl bg-[#08163F] px-4 py-2.5 text-sm font-black text-white shadow-lg">Abrir</a>
                      {origem !== "aula" ? (
                        <>
                          <button type="button" onClick={() => abrirEdicaoMaterial(arquivo)} className="rounded-2xl bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700">Editar</button>
                          <button type="button" onClick={() => removerMaterial(arquivo)} className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-black text-red-700">Remover</button>
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </section>

      {modalMaterialAberto ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/70 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-material">
          <form onSubmit={salvarMaterial} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Biblioteca</p>
                <h2 id="titulo-modal-material" className="mt-2 text-2xl font-black">{materialEditando ? "Editar material" : "Adicionar material"}</h2>
              </div>
              <button type="button" onClick={() => setModalMaterialAberto(false)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-500" aria-label="Fechar modal">✕</button>
            </div>

            <div className="mt-6 grid gap-4">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Destino</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    ["geral", "Todos", "Todos os mentorados"],
                    ["mentorado", "Individual", "Um mentorado"],
                    ["pasta", "Pasta", "Pública ou privada"],
                  ].map(([value, label, detail]) => (
                    <button key={value} type="button" onClick={() => setFormMaterial((atual) => ({ ...atual, destino: value as DestinoMaterial }))} className={`rounded-2xl border p-3 text-left ${formMaterial.destino === value ? "border-[#08163F] bg-[#08163F] text-white" : "border-slate-200 bg-slate-50"}`}>
                      <span className="block text-sm font-black">{label}</span>
                      <span className={`mt-1 block text-xs font-bold ${formMaterial.destino === value ? "text-blue-100" : "text-slate-400"}`}>{detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              {formMaterial.destino === "mentorado" ? (
                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Mentorado</span>
                  <select value={formMaterial.mentoradoId} onChange={(event) => setFormMaterial((atual) => ({ ...atual, mentoradoId: event.target.value }))} className="ceo-field">
                    <option value="">Selecione o mentorado</option>
                    {mentorados.map((mentorado) => <option key={mentorado.id} value={mentorado.id}>{mentorado.nome || mentorado.email}</option>)}
                  </select>
                </label>
              ) : null}

              {formMaterial.destino === "pasta" ? (
                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Pasta</span>
                  <select value={formMaterial.pastaId} onChange={(event) => setFormMaterial((atual) => ({ ...atual, pastaId: event.target.value }))} className="ceo-field">
                    <option value="">Selecione a pasta</option>
                    {pastas.map((pasta) => <option key={pasta.id} value={pasta.id}>{pasta.visibilidade === "publica" ? "Pública" : "Privada"} — {pasta.nome}</option>)}
                  </select>
                  {pastas.length === 0 ? <span className="mt-2 block text-xs font-bold text-amber-600">Crie uma pasta antes de usar este destino.</span> : null}
                </label>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Nome</span>
                  <input value={formMaterial.nome} maxLength={160} onChange={(event) => setFormMaterial((atual) => ({ ...atual, nome: event.target.value }))} className="ceo-field" placeholder="Nome do material" />
                </label>
                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Categoria</span>
                  <select value={formMaterial.categoria} onChange={(event) => setFormMaterial((atual) => ({ ...atual, categoria: event.target.value }))} className="ceo-field">
                    {categorias.map((categoria) => <option key={categoria.value} value={categoria.value}>{categoria.label}</option>)}
                  </select>
                </label>
              </div>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Observação</span>
                <textarea value={formMaterial.observacao} onChange={(event) => setFormMaterial((atual) => ({ ...atual, observacao: event.target.value }))} className="ceo-field min-h-[90px]" placeholder="Descrição opcional" />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFormMaterial((atual) => ({ ...atual, modo: "arquivo", url: "" }))} className={`rounded-2xl px-4 py-3 text-sm font-black ${formMaterial.modo === "arquivo" ? "bg-[#08163F] text-white" : "bg-slate-100 text-slate-500"}`}>Upload</button>
                <button type="button" onClick={() => setFormMaterial((atual) => ({ ...atual, modo: "link", arquivo: null }))} className={`rounded-2xl px-4 py-3 text-sm font-black ${formMaterial.modo === "link" ? "bg-[#08163F] text-white" : "bg-slate-100 text-slate-500"}`}>Link</button>
              </div>

              {formMaterial.modo === "link" ? (
                <input value={formMaterial.url} onChange={(event) => setFormMaterial((atual) => ({ ...atual, url: event.target.value }))} className="ceo-field" placeholder="https://..." />
              ) : (
                <label className="flex min-h-[145px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <span className="font-black">Clique para escolher o arquivo</span>
                  <span className="mt-2 text-xs font-bold text-slate-400">Até 25 MB — PDF, Office, imagem, vídeo, texto, CSV ou ZIP</span>
                  <input type="file" className="hidden" onChange={(event) => {
                    const arquivo = event.target.files?.[0] ?? null;
                    setFormMaterial((atual) => ({ ...atual, arquivo, nome: atual.nome || arquivo?.name.replace(/\.[^/.]+$/, "") || "" }));
                  }} />
                  {formMaterial.arquivo ? <span className="mt-4 max-w-full break-words rounded-xl bg-white px-4 py-2 text-sm font-black shadow">{formMaterial.arquivo.name}</span> : materialEditando?.storage_path ? <span className="mt-4 text-xs font-bold text-emerald-700">O arquivo atual será mantido. Escolha outro somente para substituir.</span> : null}
                </label>
              )}
            </div>

            {erro ? <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">{erro}</div> : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setModalMaterialAberto(false)} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600">Cancelar</button>
              <button type="submit" disabled={salvando} className="rounded-2xl bg-[#08163F] px-6 py-3 text-sm font-black text-white shadow-lg disabled:opacity-60">{salvando ? "Salvando..." : materialEditando ? "Salvar alterações" : "Adicionar à Biblioteca"}</button>
            </div>
          </form>
        </div>
      ) : null}

      {modalPastaAberto ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/70 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-pasta">
          <form onSubmit={salvarPasta} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Organização</p>
                <h2 id="titulo-modal-pasta" className="mt-2 text-2xl font-black">{pastaEditando ? "Editar pasta" : "Nova pasta"}</h2>
              </div>
              <button type="button" onClick={() => setModalPastaAberto(false)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-500" aria-label="Fechar modal">✕</button>
            </div>

            <div className="mt-6 grid gap-4">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Nome da pasta</span>
                <input value={formPasta.nome} maxLength={100} onChange={(event) => setFormPasta((atual) => ({ ...atual, nome: event.target.value }))} className="ceo-field" placeholder="Ex.: Materiais de apoio" />
              </label>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Descrição</span>
                <textarea value={formPasta.descricao} onChange={(event) => setFormPasta((atual) => ({ ...atual, descricao: event.target.value }))} className="ceo-field min-h-[90px]" placeholder="Descrição opcional" />
              </label>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Visibilidade</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => setFormPasta((atual) => ({ ...atual, visibilidade: "publica" }))} className={`rounded-2xl border p-4 text-left ${formPasta.visibilidade === "publica" ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}>
                    <span className="block font-black text-emerald-700">📂 Pública</span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">Todos os mentorados podem ver.</span>
                  </button>
                  <button type="button" onClick={() => setFormPasta((atual) => ({ ...atual, visibilidade: "privada" }))} className={`rounded-2xl border p-4 text-left ${formPasta.visibilidade === "privada" ? "border-amber-600 bg-amber-50" : "border-slate-200"}`}>
                    <span className="block font-black text-amber-700">🔒 Privada</span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">Somente mentora e Suporte/T.I.</span>
                  </button>
                </div>
                {pastaEditando && pastaEditando.visibilidade !== formPasta.visibilidade ? <p className="mt-3 rounded-2xl bg-blue-50 p-3 text-xs font-bold text-blue-700">Ao salvar, todos os arquivos desta pasta acompanharão a nova visibilidade.</p> : null}
              </div>
            </div>

            {erro ? <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">{erro}</div> : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setModalPastaAberto(false)} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600">Cancelar</button>
              <button type="submit" disabled={salvando} className="rounded-2xl bg-[#08163F] px-6 py-3 text-sm font-black text-white shadow-lg disabled:opacity-60">{salvando ? "Salvando..." : pastaEditando ? "Salvar alterações" : "Criar pasta"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
