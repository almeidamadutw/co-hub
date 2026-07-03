"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import MentoradoSidebar from "@/components/MentoradoSidebar";
import MentoradoLoading from "@/components/MentoradoLoading";

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

export default function MentoradoBibliotecaPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [arquivos, setArquivos] = useState<BibliotecaArquivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

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

  useEffect(() => {
    if (!usuario) return;
    carregarBiblioteca();
  }, [usuario]);

  async function carregarBiblioteca() {
    try {
      setCarregando(true);
      setErro("");

      const mentoradoId = (usuario as User & { id?: string })?.id;

      if (!mentoradoId) {
        throw new Error("Não foi possível identificar seu perfil.");
      }

      const response = await fetch(
        `/api/biblioteca?mentoradoId=${encodeURIComponent(mentoradoId)}`,
        { cache: "no-store" }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Não foi possível carregar sua biblioteca.");
      }

      setArquivos(payload.arquivos ?? []);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar sua biblioteca.");
    } finally {
      setCarregando(false);
    }
  }

  async function sair() {
    logoutUsuario();
    await supabase.auth.signOut();
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
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 sm:text-xs">
              CEO Club
            </p>
            <h1 className="line-clamp-1 text-base font-black sm:text-lg md:text-xl">
              Minha biblioteca
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/mentorado/dashboard")}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#08163F] shadow-sm sm:text-sm"
            >
              Dashboard
            </button>
            <button
              onClick={sair}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white shadow-lg sm:text-sm"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white shadow-2xl shadow-[#07122F]/20 sm:p-6 lg:p-8">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-200">
              Biblioteca do mentorado
            </p>
            <h2 className="mt-3 max-w-4xl break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
              Seus materiais, reuniões e atividades em um só lugar.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-100 sm:text-base">
              Tudo que sua mentora enviar para você fica salvo aqui, mesmo depois de sair e entrar novamente no sistema.
            </p>
          </section>

          {erro && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
              {erro}
            </div>
          )}

          <section className="mt-5 rounded-[26px] bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Arquivos disponíveis
                </p>
                <h2 className="mt-2 text-xl font-black sm:text-2xl">
                  {arquivos.length} material(is)
                </h2>
              </div>

              <button
                type="button"
                onClick={carregarBiblioteca}
                className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-200"
              >
                Atualizar
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {arquivos.length === 0 ? (
                <div className="rounded-[22px] bg-slate-50 p-6 text-center md:col-span-2 xl:col-span-3">
                  <p className="text-lg font-black">Nenhum material enviado ainda</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Quando sua mentora enviar PDFs, links, atividades ou gravações, tudo aparece aqui.
                  </p>
                </div>
              ) : (
                arquivos.map((arquivo) => (
                  <article
                    key={arquivo.id}
                    className="flex min-w-0 flex-col rounded-[22px] border border-slate-100 bg-[#f9fafb] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl">{iconeTipo(arquivo.tipo)}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
                        {categorias[arquivo.categoria] ?? "Material"}
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

                    <p className="mt-3 text-xs font-bold text-slate-400">
                      Enviado em {formatarData(arquivo.created_at)}
                    </p>

                    <a
                      href={arquivo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex justify-center rounded-2xl bg-[#08163F] px-4 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                    >
                      Abrir material →
                    </a>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
