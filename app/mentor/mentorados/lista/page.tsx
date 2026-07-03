"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";

type Mentorado = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  codigo_inscricao: string | null;
  status: string | null;
  created_at: string | null;
};

function formatarData(data?: string | null) {
  if (!data) return "—";

  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function rolePodeAcessar(role?: string) {
  return role === "mentor" || role === "suporte" || role === "financeiro";
}

export default function MentorMentoradosListaPage() {
  const router = useRouter();

  const [montado, setMontado] = useState(false);
  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setMontado(true);

    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentorado") {
      router.replace("/mentorado/dashboard");
      return;
    }

    if (!rolePodeAcessar(user.role)) {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);
    carregarMentorados();
  }, [router]);

  async function carregarMentorados() {
    try {
      setCarregando(true);
      setErro("");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, telefone, codigo_inscricao, status, created_at")
        .eq("role", "mentorado")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      setMentorados((data ?? []) as Mentorado[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os mentorados."
      );
    } finally {
      setCarregando(false);
    }
  }

  const mentoradosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    if (!termo) return mentorados;

    return mentorados.filter((mentorado) => {
      const texto = normalizarTexto(
        [
          mentorado.nome,
          mentorado.email,
          mentorado.telefone,
          mentorado.codigo_inscricao,
          mentorado.status,
        ]
          .filter(Boolean)
          .join(" ")
      );

      return texto.includes(termo);
    });
  }, [mentorados, busca]);

  if (!montado) {
    return null;
  }

  if (!usuario || carregando) {
    return (
      <main className="min-h-screen bg-[#f3f5f8] text-[#08163F]">
        {usuario && <Sidebar nome={usuario.nome} role={usuario.role} />}

        <section className="flex min-h-screen items-center justify-center px-4 lg:pl-[calc(240px+1rem)] xl:pl-[calc(260px+1rem)] 2xl:pl-[calc(290px+1rem)]">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-8 text-center shadow-xl shadow-slate-200/70">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              CEO Club
            </p>
            <h1 className="mt-3 text-xl font-black">Carregando mentorados...</h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative min-h-screen w-full overflow-x-hidden px-4 py-4 sm:px-5 lg:pl-[calc(240px+1rem)] lg:pr-4 lg:py-5 xl:pl-[calc(260px+1rem)] 2xl:pl-[calc(290px+1rem)] 2xl:pr-5">
        <div className="w-full space-y-4">
          <section className="overflow-hidden rounded-[26px] border border-white/70 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6 lg:p-7">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              CEO Club
            </p>

            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-black leading-tight sm:text-3xl">
                  Mentorados
                </h1>

                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                  Acompanhe os mentorados, abra o perfil individual e veja a jornada de cada um.
                </p>
              </div>

              <div className="rounded-[22px] bg-[#f8fafc] px-5 py-4 text-sm font-black text-slate-500">
                {mentorados.length} mentorado(s)
              </div>
            </div>
          </section>

          {erro && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
              {erro}
            </div>
          )}

          <section className="rounded-[24px] bg-white p-4 shadow-xl shadow-slate-200/70">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, e-mail, telefone ou código"
                className="ceo-field"
              />

              <button
                type="button"
                onClick={carregarMentorados}
                className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
              >
                Atualizar
              </button>
            </div>
          </section>

          <section className="grid w-full grid-cols-1 gap-4 2xl:grid-cols-2">
            {mentoradosFiltrados.length === 0 ? (
              <div className="rounded-[24px] bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-xl shadow-slate-200/70 xl:col-span-2">
                Nenhum mentorado encontrado.
              </div>
            ) : (
              mentoradosFiltrados.map((mentorado) => (
                <article
                  key={mentorado.id}
                  className="min-w-0 rounded-[24px] bg-white p-4 shadow-xl shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-2xl sm:p-5"
                >
                  <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                        Mentorado
                      </p>

                      <h2 className="mt-2 break-words text-lg font-black leading-tight text-[#08163F] sm:text-xl">
                        {mentorado.nome || "Mentorado sem nome"}
                      </h2>

                      <p className="mt-2 break-all text-sm font-bold text-slate-500">
                        {mentorado.email || "Sem e-mail"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-black text-[#08163F]">
                      {mentorado.status || "Ativo"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <InfoMini label="Telefone" value={mentorado.telefone || "—"} />
                    <InfoMini label="Código" value={mentorado.codigo_inscricao || "—"} />
                    <InfoMini label="Entrada" value={formatarData(mentorado.created_at)} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/mentor/mentorados/${mentorado.id}`}
                      className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                    >
                      Ver perfil
                    </Link>

                    <Link
                      href={`/mentor/biblioteca?mentorado=${mentorado.id}`}
                      className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-[#08163F] transition hover:bg-slate-200"
                    >
                      Biblioteca
                    </Link>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f8fafc] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-[#08163F]">{value}</p>
    </div>
  );
}
