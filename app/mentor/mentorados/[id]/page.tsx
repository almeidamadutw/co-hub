"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  role: string | null;
  created_at: string | null;
};

export default function MentorMentoradosListaPage() {
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
      window.location.replace("/login");
      return;
    }

    if (!["mentor", "suporte", "financeiro"].includes(user.role)) {
      logoutUsuario();
      window.location.replace("/login");
      return;
    }

    setUsuario(user);
    carregarMentorados();
  }, []);

  async function carregarMentorados() {
    try {
      setCarregando(true);
      setErro("");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, nome, email, telefone, codigo_inscricao, status, role, created_at"
        )
        .eq("role", "mentorado")
        .order("nome", { ascending: true });

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
    const termo = busca.trim().toLowerCase();

    if (!termo) return mentorados;

    return mentorados.filter((mentorado) => {
      const texto = [
        mentorado.nome,
        mentorado.email,
        mentorado.telefone,
        mentorado.codigo_inscricao,
        mentorado.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [mentorados, busca]);

  if (!montado || !usuario) {
    return (
      <main className="min-h-screen bg-[#f3f5f8] text-[#08163F]">
        <section className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-8 text-center shadow-xl shadow-slate-200/70">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              CEO Club
            </p>

            <h1 className="mt-3 text-xl font-black">
              Carregando mentorados...
            </h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} acessoSuporte />

      <section className="min-h-screen w-full overflow-x-hidden px-4 py-5 sm:px-5 lg:pl-[calc(240px+24px)] lg:pr-6 xl:pl-[calc(260px+28px)] xl:pr-8 2xl:pl-[calc(290px+32px)] 2xl:pr-10">
        <div className="w-full space-y-5">
          <section className="w-full rounded-[28px] bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6 lg:p-8">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-center">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
                  CEO Club
                </p>

                <h1 className="mt-3 break-words text-3xl font-black leading-tight text-[#08163F] sm:text-4xl">
                  Mentorados
                </h1>

                <p className="mt-3 max-w-3xl break-words text-sm font-bold leading-6 text-slate-500 sm:text-base">
                  Acompanhe os mentorados, abra o perfil individual e veja a
                  jornada de cada um.
                </p>
              </div>

              <div className="rounded-[24px] bg-[#f8fafc] p-4 text-left lg:text-center">
                <p className="text-3xl font-black text-[#08163F]">
                  {mentorados.length}
                </p>

                <p className="mt-1 text-sm font-black text-slate-500">
                  mentorado(s)
                </p>
              </div>
            </div>
          </section>

          <section className="w-full rounded-[24px] bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]">
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

            {erro && (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
                {erro}
              </div>
            )}
          </section>

          {carregando ? (
            <section className="w-full rounded-[24px] bg-white p-8 text-center shadow-xl shadow-slate-200/70">
              <p className="text-sm font-black text-slate-500">
                Carregando lista...
              </p>
            </section>
          ) : mentoradosFiltrados.length === 0 ? (
            <section className="w-full rounded-[24px] bg-white p-8 text-center shadow-xl shadow-slate-200/70">
              <p className="text-xl font-black text-[#08163F]">
                Nenhum mentorado encontrado
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Tente limpar a busca ou atualizar a lista.
              </p>
            </section>
          ) : (
            <section className="grid w-full gap-4 xl:grid-cols-2">
              {mentoradosFiltrados.map((mentorado) => (
                <MentoradoCard key={mentorado.id} mentorado={mentorado} />
              ))}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function MentoradoCard({ mentorado }: { mentorado: Mentorado }) {
  const status = mentorado.status || "ativo";
  const entrada = formatarData(mentorado.created_at);

  return (
    <article className="w-full min-w-0 rounded-[26px] bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
            Mentorado
          </p>

          <h2 className="mt-2 break-words text-2xl font-black leading-tight text-[#08163F] sm:text-3xl">
            {mentorado.nome || "Mentorado sem nome"}
          </h2>

          <p className="mt-2 break-all text-sm font-bold text-slate-500">
            {mentorado.email || "E-mail não informado"}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-black text-[#08163F]">
          {status}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniInfo label="Telefone" value={mentorado.telefone || "—"} />
        <MiniInfo label="Código" value={mentorado.codigo_inscricao || "—"} />
        <MiniInfo label="Entrada" value={entrada} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/mentor/mentorados/${mentorado.id}`}
          className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
        >
          Ver perfil
        </Link>

        <Link
          href={`/mentor/biblioteca?mentorado=${mentorado.id}`}
          className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-lg"
        >
          Biblioteca
        </Link>
      </div>
    </article>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[18px] bg-[#f8fafc] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-[#08163F]">
        {value}
      </p>
    </div>
  );
}

function formatarData(data?: string | null) {
  if (!data) return "—";

  const parsed = new Date(data);

  if (Number.isNaN(parsed.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR").format(parsed);
}
