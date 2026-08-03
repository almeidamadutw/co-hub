"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MentoradoLoading from "@/components/MentoradoLoading";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import { obterCabecalhoAutorizacao } from "@/utils/apiAuthClient";
import { logoutUsuario, sincronizarUsuarioComSessao, User } from "@/utils/auth";

type BibliotecaOrigem = "biblioteca" | "aula";
type EscopoBiblioteca = "mentorado" | "geral" | "interno";

type BibliotecaPasta = {
  id: string;
  nome: string;
  descricao?: string | null;
  visibilidade: "publica" | "privada";
};

type BibliotecaArquivo = {
  id: string;
  mentorado_id?: string | null;
  pasta_id?: string | null;
  pasta_nome?: string | null;
  escopo?: EscopoBiblioteca;
  nome: string;
  categoria: string;
  tipo: string;
  url: string;
  tamanho_bytes?: number | null;
  observacao?: string | null;
  created_at: string;
  origem?: BibliotecaOrigem;
  modulo_nome?: string | null;
  aula_nome?: string | null;
};

const categorias: Record<string, string> = {
  material: "Material",
  reuniao: "Reunião",
  atividade: "Atividade",
  pdf: "PDF",
  video: "Vídeo",
  link: "Link",
  outro: "Outro",
};

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

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function labelOrigem(arquivo: BibliotecaArquivo) {
  if ((arquivo.origem ?? "biblioteca") === "aula") return "Material da aula";
  if (arquivo.pasta_id) return arquivo.pasta_nome || "Pasta pública";
  if (arquivo.escopo === "geral") return "Para todos";
  return "Enviado para você";
}

export default function MentoradoBibliotecaPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [arquivos, setArquivos] = useState<BibliotecaArquivo[]>([]);
  const [pastas, setPastas] = useState<BibliotecaPasta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroPasta, setFiltroPasta] = useState("todos");
  const [filtroOrigem, setFiltroOrigem] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");

  useEffect(() => {
    async function validarAcesso() {
      const usuarioAtual = await sincronizarUsuarioComSessao();

      if (!usuarioAtual) {
        router.replace("/login");
        return;
      }

      if (usuarioAtual.role !== "mentorado") {
        router.replace(
          usuarioAtual.role === "mentor" || usuarioAtual.role === "suporte"
            ? "/mentor/dashboard"
            : "/login"
        );
        return;
      }

      setUsuario(usuarioAtual);
    }

    void validarAcesso();
  }, [router]);

  const carregarBiblioteca = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");
      const headers = await obterCabecalhoAutorizacao();
      const response = await fetch("/api/biblioteca", {
        cache: "no-store",
        headers,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Não foi possível carregar sua Biblioteca.");
      }

      setArquivos(payload.arquivos ?? []);
      setPastas(payload.pastas ?? []);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar sua Biblioteca.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!usuario) return;
    void carregarBiblioteca();
  }, [carregarBiblioteca, usuario]);

  const contagemPorPasta = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const arquivo of arquivos) {
      if (!arquivo.pasta_id) continue;
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
          arquivo.modulo_nome,
          arquivo.aula_nome,
        ]
          .filter(Boolean)
          .join(" ")
      );
      const passouBusca = !buscaNormalizada || textoArquivo.includes(buscaNormalizada);
      const passouPasta =
        filtroPasta === "todos" ||
        (filtroPasta === "sem-pasta"
          ? !arquivo.pasta_id
          : arquivo.pasta_id === filtroPasta);
      const passouCategoria =
        filtroCategoria === "todos" || arquivo.categoria === filtroCategoria;
      const passouOrigem =
        filtroOrigem === "todos" ||
        (filtroOrigem === "aula" && origem === "aula") ||
        (filtroOrigem === "geral" && origem === "biblioteca" && arquivo.escopo === "geral") ||
        (filtroOrigem === "mentorado" && origem === "biblioteca" && arquivo.escopo === "mentorado");

      return passouBusca && passouPasta && passouCategoria && passouOrigem;
    });
  }, [arquivos, busca, filtroCategoria, filtroOrigem, filtroPasta]);

  async function sair() {
    await logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return <MentoradoLoading mensagem="Carregando biblioteca..." />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <MentoradoSidebar nome={usuario.nome} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 sm:text-xs">CEO Club</p>
            <h1 className="line-clamp-1 text-base font-black sm:text-lg md:text-xl">Minha Biblioteca</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.push("/mentorado/dashboard")} className="rounded-xl bg-white px-4 py-2.5 text-xs font-black shadow-sm sm:text-sm">Dashboard</button>
            <button type="button" onClick={sair} className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white shadow-lg sm:text-sm">Sair</button>
          </div>
        </header>

        <div className="px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white shadow-2xl shadow-[#07122F]/20 sm:p-6 lg:p-8">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-200">Biblioteca do mentorado</p>
            <h2 className="mt-3 max-w-4xl text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">Tudo que você precisa, separado por pastas.</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-100 sm:text-base">Aqui aparecem materiais enviados para você, arquivos gerais do CEO Club e documentos das aulas liberadas.</p>
          </section>

          {erro ? <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">{erro}</div> : null}

          {pastas.length > 0 ? (
            <section className="mt-5 rounded-[26px] bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Pastas públicas</p>
                  <h2 className="mt-2 text-xl font-black sm:text-2xl">Materiais organizados</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">{pastas.length} pasta(s)</span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <button type="button" onClick={() => setFiltroPasta("todos")} className={`rounded-[22px] border p-4 text-left transition ${filtroPasta === "todos" ? "border-[#08163F] bg-[#08163F] text-white" : "border-slate-100 bg-slate-50"}`}>
                  <span className="text-2xl">🗂️</span>
                  <p className="mt-3 font-black">Ver tudo</p>
                  <p className={`mt-1 text-xs font-bold ${filtroPasta === "todos" ? "text-blue-100" : "text-slate-400"}`}>{arquivos.length} material(is)</p>
                </button>
                {pastas.map((pasta) => (
                  <button key={pasta.id} type="button" onClick={() => setFiltroPasta(pasta.id)} className={`rounded-[22px] border p-4 text-left transition ${filtroPasta === pasta.id ? "border-emerald-600 bg-emerald-50" : "border-slate-100 bg-slate-50"}`}>
                    <span className="text-2xl">📂</span>
                    <p className="mt-3 break-words font-black">{pasta.nome}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{contagemPorPasta.get(pasta.id) ?? 0} material(is)</p>
                    {pasta.descricao ? <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{pasta.descricao}</p> : null}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-5 rounded-[26px] bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Arquivos disponíveis</p>
                <h2 className="mt-2 text-xl font-black sm:text-2xl">{arquivosFiltrados.length} de {arquivos.length} material(is)</h2>
              </div>
              <button type="button" onClick={carregarBiblioteca} className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-200">Atualizar</button>
            </div>

            <div className="mt-5 grid gap-3 rounded-[22px] bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-4">
              <input aria-label="Buscar material" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar material ou pasta..." className="ceo-field xl:col-span-2" />
              <select aria-label="Filtrar por origem" value={filtroOrigem} onChange={(event) => setFiltroOrigem(event.target.value)} className="ceo-field">
                <option value="todos">Todos os materiais</option>
                <option value="geral">Materiais gerais</option>
                <option value="mentorado">Enviados para você</option>
                <option value="aula">Materiais das aulas</option>
              </select>
              <select aria-label="Filtrar por categoria" value={filtroCategoria} onChange={(event) => setFiltroCategoria(event.target.value)} className="ceo-field">
                <option value="todos">Todas as categorias</option>
                {Object.entries(categorias).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {arquivosFiltrados.length === 0 ? (
                <div className="rounded-[22px] bg-slate-50 p-8 text-center md:col-span-2 xl:col-span-3">
                  <p className="text-lg font-black">Nenhum material encontrado</p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Tente limpar os filtros ou escolher outra pasta.</p>
                </div>
              ) : arquivosFiltrados.map((arquivo) => (
                <article key={`${arquivo.origem ?? "biblioteca"}-${arquivo.id}`} className="flex min-w-0 flex-col rounded-[22px] border border-slate-100 bg-[#f9fafb] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl">{iconeTipo(arquivo.tipo)}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${(arquivo.origem ?? "biblioteca") === "aula" ? "bg-blue-50 text-blue-700" : arquivo.escopo === "geral" ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}>{labelOrigem(arquivo)}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">{categorias[arquivo.categoria] ?? "Material"}</span>
                  </div>
                  <h3 className="mt-3 break-words text-lg font-black">{arquivo.nome}</h3>
                  {arquivo.modulo_nome ? <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-blue-700">{arquivo.modulo_nome}</p> : null}
                  {arquivo.aula_nome ? <p className="mt-1 text-sm font-bold text-slate-500">Aula: {arquivo.aula_nome}</p> : null}
                  {arquivo.observacao ? <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6 text-slate-500">{arquivo.observacao}</p> : null}
                  <div className="mt-auto pt-4">
                    <p className="mb-3 text-xs font-bold text-slate-400">{formatarTamanho(arquivo.tamanho_bytes)} · {formatarData(arquivo.created_at)}</p>
                    <a href={arquivo.url} target="_blank" rel="noreferrer" className="inline-flex w-full justify-center rounded-2xl bg-[#08163F] px-4 py-3 text-sm font-black text-white shadow-lg">Abrir material →</a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
