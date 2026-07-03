"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, usuarioTemPermissao, User } from "@/utils/auth";

type MentoradoResumo = {
  id: string;
  nome: string | null;
  email: string | null;
};

type BibliotecaArquivo = {
  id: string;
  mentorado_id: string;
  criado_por: string | null;
  nome: string;
  categoria: string;
  tipo: string;
  url: string;
  storage_path: string | null;
  tamanho_bytes: number | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

type ModoBiblioteca = "arquivo" | "link";

type FormBiblioteca = {
  mentoradoId: string;
  nome: string;
  categoria: string;
  observacao: string;
  modo: ModoBiblioteca;
  url: string;
  arquivo: File | null;
};

const formInicial: FormBiblioteca = {
  mentoradoId: "",
  nome: "",
  categoria: "material",
  observacao: "",
  modo: "arquivo",
  url: "",
  arquivo: null,
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

function labelCategoria(categoria: string) {
  return categorias.find((item) => item.value === categoria)?.label ?? "Material";
}

function iconeTipo(tipo: string) {
  if (tipo === "pdf") return "📄";
  if (tipo === "video") return "🎥";
  if (tipo === "imagem") return "🖼️";
  if (tipo === "link") return "🔗";
  if (tipo === "documento") return "📎";
  return "📁";
}

export default function MentorBibliotecaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorados, setMentorados] = useState<MentoradoResumo[]>([]);
  const [arquivos, setArquivos] = useState<BibliotecaArquivo[]>([]);
  const [form, setForm] = useState<FormBiblioteca>(formInicial);
  const [carregando, setCarregando] = useState(true);
  const [carregandoArquivos, setCarregandoArquivos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const mentoradoSelecionado = useMemo(() => {
    return mentorados.find((mentorado) => mentorado.id === form.mentoradoId) ?? null;
  }, [mentorados, form.mentoradoId]);

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.replace("/login");
      return;
    }

    if (!usuarioTemPermissao(usuarioLogado, ["mentor", "suporte"])) {
      router.replace(
        usuarioLogado.role === "mentorado" ? "/mentorado/dashboard" : "/login"
      );
      return;
    }

    setUsuario(usuarioLogado);
  }, [router]);

  useEffect(() => {
    if (!usuario) return;
    carregarMentorados();
  }, [usuario]);

  useEffect(() => {
    if (!form.mentoradoId) {
      setArquivos([]);
      return;
    }

    carregarArquivos(form.mentoradoId);
  }, [form.mentoradoId]);

  async function carregarMentorados() {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, email")
      .eq("role", "mentorado")
      .order("nome", { ascending: true });

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    const lista = (data ?? []) as MentoradoResumo[];
    setMentorados(lista);

    const mentoradoIdUrl = searchParams.get("mentoradoId");
    const primeiroId = mentoradoIdUrl || lista[0]?.id || "";

    setForm((atual) => ({ ...atual, mentoradoId: atual.mentoradoId || primeiroId }));
    setCarregando(false);
  }

  async function carregarArquivos(mentoradoId: string) {
    try {
      setCarregandoArquivos(true);
      setErro("");

      const response = await fetch(
        `/api/biblioteca?mentoradoId=${encodeURIComponent(mentoradoId)}`,
        { cache: "no-store" }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Não foi possível carregar a biblioteca.");
      }

      setArquivos(payload.arquivos ?? []);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível carregar a biblioteca."
      );
    } finally {
      setCarregandoArquivos(false);
    }
  }

  async function salvarBiblioteca(e?: React.FormEvent) {
    e?.preventDefault();

    if (salvando) return;

    if (!form.mentoradoId) {
      setErro("Selecione o mentorado.");
      return;
    }

    if (!form.nome.trim()) {
      setErro("Informe o nome do material.");
      return;
    }

    if (form.modo === "link" && !form.url.trim()) {
      setErro("Cole o link do material.");
      return;
    }

    if (form.modo === "arquivo" && !form.arquivo) {
      setErro("Escolha um arquivo para enviar.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const data = new FormData();
      data.append("mentoradoId", form.mentoradoId);
      data.append("criadoPor", (usuario as User & { id?: string })?.id ?? "");
      data.append("nome", form.nome.trim());
      data.append("categoria", form.categoria);
      data.append("observacao", form.observacao.trim());
      data.append("modo", form.modo);
      data.append("url", form.url.trim());

      if (form.modo === "arquivo" && form.arquivo) {
        data.append("arquivo", form.arquivo);
      }

      const response = await fetch("/api/biblioteca", {
        method: "POST",
        body: data,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Não foi possível salvar o material.");
      }

      setSucesso("Material salvo na biblioteca do mentorado.");
      setForm((atual) => ({
        ...formInicial,
        mentoradoId: atual.mentoradoId,
      }));
      await carregarArquivos(form.mentoradoId);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o material.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerArquivo(arquivo: BibliotecaArquivo) {
    const confirmar = window.confirm(`Deseja remover "${arquivo.nome}" da biblioteca?`);
    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      const response = await fetch("/api/biblioteca", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: arquivo.id }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Não foi possível remover o material.");
      }

      setSucesso("Material removido da biblioteca.");
      await carregarArquivos(form.mentoradoId);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível remover o material.");
    }
  }

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] px-4 text-[#08163F]">
        <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
            CEO Club
          </p>
          <h1 className="mt-3 text-xl font-black">Carregando biblioteca...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role="mentor" acessoSuporte={usuario.role === "suporte"} />

      <section className="ceo-content no-scrollbar !p-4 sm:!p-5 lg:!p-6">
        <div className="ceo-stack !max-w-6xl">
          <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                  Biblioteca CEO Club
                </p>
                <h1 className="mt-3 max-w-4xl break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                  Biblioteca individual do mentorado.
                </h1>
                <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                  Envie PDFs, atividades, links, vídeos, materiais de reunião e arquivos importantes para cada mentorado.
                </p>
              </div>

              <div className="rounded-[22px] bg-[#f8fafc] p-4 text-sm font-black text-slate-500">
                {arquivos.length} material(is) salvo(s)
              </div>
            </div>
          </section>

          {erro && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700">
              {sucesso}
            </div>
          )}

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <form onSubmit={salvarBiblioteca} className="min-w-0 rounded-[26px] bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Novo item
              </p>
              <h2 className="mt-2 text-xl font-black">Enviar para biblioteca</h2>

              <div className="mt-5 grid gap-3">
                <label>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Mentorado
                  </p>
                  <select
                    value={form.mentoradoId}
                    onChange={(e) =>
                      setForm({ ...form, mentoradoId: e.target.value })
                    }
                    className="ceo-field"
                  >
                    <option value="">Selecione o mentorado</option>
                    {mentorados.map((mentorado) => (
                      <option key={mentorado.id} value={mentorado.id}>
                        {mentorado.nome || mentorado.email || "Mentorado sem nome"}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, modo: "arquivo", url: "" })}
                    className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                      form.modo === "arquivo"
                        ? "bg-[#08163F] text-white shadow-lg"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    Upload
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, modo: "link", arquivo: null })}
                    className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                      form.modo === "link"
                        ? "bg-[#08163F] text-white shadow-lg"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    Link
                  </button>
                </div>

                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do material"
                  className="ceo-field"
                />

                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="ceo-field"
                >
                  {categorias.map((categoria) => (
                    <option key={categoria.value} value={categoria.value}>
                      {categoria.label}
                    </option>
                  ))}
                </select>

                <textarea
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  placeholder="Observação opcional para o mentorado"
                  className="ceo-field min-h-[100px]"
                />

                {form.modo === "link" ? (
                  <input
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="Cole aqui o link do Drive, vídeo ou material"
                    className="ceo-field"
                  />
                ) : (
                  <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center transition hover:border-[#08163F] hover:bg-slate-100">
                    <span className="text-base font-black text-[#08163F]">
                      Clique para escolher o arquivo
                    </span>
                    <span className="mt-2 text-sm font-bold text-slate-400">
                      Até 25 MB. Para arquivos maiores, use link do Drive.
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const arquivo = e.target.files?.[0] ?? null;
                        setForm({
                          ...form,
                          arquivo,
                          nome: form.nome || arquivo?.name.replace(/\.[^/.]+$/, "") || "",
                        });
                      }}
                    />
                    {form.arquivo && (
                      <span className="mt-5 max-w-full break-words rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow">
                        {form.arquivo.name}
                      </span>
                    )}
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="mt-5 w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? "Salvando na biblioteca..." : "Salvar na biblioteca"}
              </button>
            </form>

            <section className="min-w-0 rounded-[26px] bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                    Arquivos salvos
                  </p>
                  <h2 className="mt-2 break-words text-xl font-black sm:text-2xl">
                    {mentoradoSelecionado?.nome || mentoradoSelecionado?.email || "Selecione um mentorado"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => form.mentoradoId && carregarArquivos(form.mentoradoId)}
                  className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                >
                  Atualizar
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                {carregandoArquivos ? (
                  <div className="rounded-[22px] bg-slate-50 p-6 text-center text-sm font-black text-slate-400">
                    Carregando biblioteca...
                  </div>
                ) : arquivos.length === 0 ? (
                  <div className="rounded-[22px] bg-slate-50 p-6 text-center">
                    <p className="text-lg font-black">Nenhum material salvo</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      Quando você enviar PDFs, links ou atividades, eles aparecem aqui.
                    </p>
                  </div>
                ) : (
                  arquivos.map((arquivo) => (
                    <article
                      key={arquivo.id}
                      className="min-w-0 rounded-[22px] border border-slate-100 bg-[#f9fafb] p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xl">{iconeTipo(arquivo.tipo)}</span>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
                              {labelCategoria(arquivo.categoria)}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
                              {formatarTamanho(arquivo.tamanho_bytes)}
                            </span>
                          </div>

                          <h3 className="mt-3 break-words text-lg font-black text-[#08163F]">
                            {arquivo.nome}
                          </h3>

                          {arquivo.observacao && (
                            <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold leading-6 text-slate-500">
                              {arquivo.observacao}
                            </p>
                          )}

                          <p className="mt-2 text-xs font-bold text-slate-400">
                            Enviado em {formatarData(arquivo.created_at)}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <a
                            href={arquivo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl bg-[#08163F] px-4 py-2.5 text-center text-sm font-black text-white shadow-lg transition hover:brightness-110"
                          >
                            Abrir
                          </a>
                          <button
                            type="button"
                            onClick={() => removerArquivo(arquivo)}
                            className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-100"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
