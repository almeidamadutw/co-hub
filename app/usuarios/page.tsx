"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, User } from "@/utils/auth";
import Sidebar from "@/components/Sidebar";

type Perfil = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  role: string | null;
  status: string | null;
  codigo_inscricao: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const roles = [
  { label: "Mentor", value: "mentor" },
  { label: "Mentorado", value: "mentorado" },
  { label: "Financeiro", value: "financeiro" },
  { label: "Suporte", value: "suporte" },
];

const statusOpcoes = [
  { label: "Ativo", value: "ativo" },
  { label: "Inativo", value: "inativo" },
  { label: "Bloqueado", value: "bloqueado" },
  { label: "Cancelado", value: "cancelado" },
  { label: "Suspenso", value: "suspenso" },
];

export default function UsuariosPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [busca, setBusca] = useState("");
  const [roleFiltro, setRoleFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = getUsuarioLogado();

      if (!user) {
        router.replace("/login");
        return;
      }

      const podeAcessarUsuarios =
        user.role === "mentor" || user.role === "suporte";

      if (!podeAcessarUsuarios) {
        if (user.role === "mentorado") {
          router.replace("/mentorado/dashboard");
          return;
        }

        if (user.role === "financeiro") {
          router.replace("/financeiro");
          return;
        }

        router.replace("/login");
        return;
      }

      setUsuario(user);
      await carregarUsuarios();
      setCarregando(false);
    }

    carregar();
  }, [router]);

  async function carregarUsuarios() {
    setErro("");

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, nome, email, telefone, role, status, codigo_inscricao, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setErro(`Não foi possível carregar os usuários: ${error.message}`);
      return;
    }

    setPerfis((data || []) as Perfil[]);
  }

  const perfisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return perfis.filter((perfil) => {
      const roleAtual = normalizar(perfil.role);
      const statusAtual = normalizar(perfil.status);

      const passaRole = roleFiltro === "todos" || roleAtual === roleFiltro;
      const passaStatus =
        statusFiltro === "todos" || statusAtual === statusFiltro;

      const textoBusca = [
        perfil.nome,
        perfil.email,
        perfil.telefone,
        perfil.codigo_inscricao,
        perfil.role,
        perfil.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const passaBusca = !termo || textoBusca.includes(termo);

      return passaRole && passaStatus && passaBusca;
    });
  }, [perfis, busca, roleFiltro, statusFiltro]);

  const resumo = useMemo(() => {
    return {
      total: perfis.length,
      mentorados: perfis.filter((p) => normalizar(p.role) === "mentorado")
        .length,
      mentores: perfis.filter((p) => normalizar(p.role) === "mentor").length,
      suporte: perfis.filter((p) => normalizar(p.role) === "suporte").length,
      financeiro: perfis.filter((p) => normalizar(p.role) === "financeiro")
        .length,
      semRole: perfis.filter((p) => !normalizar(p.role)).length,
      semStatus: perfis.filter((p) => !normalizar(p.status)).length,
    };
  }, [perfis]);

  function normalizar(valor: string | null) {
    return (valor || "").trim().toLowerCase();
  }

  function formatarData(data: string | null) {
    if (!data) return "Sem data";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(data));
  }

  function formatarStatus(status: string | null) {
    const statusAtual = normalizar(status);

    if (statusAtual === "ativo") return "Ativo";
    if (statusAtual === "inativo") return "Inativo";
    if (statusAtual === "bloqueado") return "Bloqueado";
    if (statusAtual === "cancelado") return "Cancelado";
    if (statusAtual === "suspenso") return "Suspenso";

    return "Sem status";
  }

  function atualizarCampoLocal(
    perfilId: string,
    campo: "role" | "status",
    valor: string
  ) {
    setPerfis((listaAtual) =>
      listaAtual.map((perfil) =>
        perfil.id === perfilId ? { ...perfil, [campo]: valor } : perfil
      )
    );
  }

  async function salvarPerfil(perfil: Perfil) {
    setErro("");
    setMensagem("");

    const roleAtual = normalizar(perfil.role);
    const statusAtual = normalizar(perfil.status);

    if (!roleAtual) {
      setErro("Selecione uma role antes de salvar.");
      return;
    }

    if (!statusAtual) {
      setErro("Selecione um status antes de salvar.");
      return;
    }

    if (perfil.id === usuario?.id && roleAtual !== usuario.role) {
      setErro("Você não pode alterar sua própria permissão de acesso.");
      return;
    }

    const confirmar = window.confirm(
      `Deseja salvar as alterações de acesso para ${
        perfil.nome || perfil.email || "este usuário"
      }?`
    );

    if (!confirmar) return;

    setSalvandoId(perfil.id);

    const { error } = await supabase.rpc("suporte_atualizar_profile", {
      p_profile_id: perfil.id,
      p_role: roleAtual,
      p_status: statusAtual,
    });

    setSalvandoId(null);

    if (error) {
      setErro(
        `Não foi possível salvar este usuário: ${
          error.message || "erro de permissão ou validação no Supabase"
        }`
      );
      return;
    }

    setMensagem("Usuário atualizado com sucesso.");
    await carregarUsuarios();
  }

  if (carregando || !usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">
            CEO Club
          </p>
          <h1 className="mt-3 text-2xl font-black">Carregando usuários...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar
        nome={usuario.nome}
        role={usuario.role}
        acessoSuporte={Boolean(
          (usuario as User & { acesso_suporte?: boolean }).acesso_suporte
        )}
      />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
              Área da mentora
            </p>

            <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
              Usuários da mentoria
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
          >
            Voltar ao dashboard
          </button>
        </header>

        <section className="mx-auto w-full max-w-[1280px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <div className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-xl lg:rounded-[26px] lg:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
              Gestão de acesso
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Usuários da mentoria
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
              Consulte os perfis cadastrados no Supabase, corrija roles,
              ajuste status e mantenha os acessos da mentoria organizados.
            </p>
          </div>

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {erro}
            </div>
          )}

          {mensagem && (
            <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700">
              {mensagem}
            </div>
          )}

          <section className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CardResumo titulo="Total" valor={resumo.total} />
            <CardResumo titulo="Mentorados" valor={resumo.mentorados} />
            <CardResumo titulo="Mentores" valor={resumo.mentores} />
            <CardResumo titulo="Financeiro" valor={resumo.financeiro} />
          </section>

          <section className="mb-4 grid gap-4 md:grid-cols-3">
            <CardResumo titulo="Suporte" valor={resumo.suporte} />
            <CardResumo titulo="Sem role" valor={resumo.semRole} />
            <CardResumo titulo="Sem status" valor={resumo.semStatus} />
          </section>

          <section className="mb-4 grid gap-3 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <label>
              <span className="text-sm font-black text-gray-500">
                Buscar usuário
              </span>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, e-mail, telefone ou código"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
              />
            </label>

            <label>
              <span className="text-sm font-black text-gray-500">Role</span>

              <select
                value={roleFiltro}
                onChange={(e) => setRoleFiltro(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
              >
                <option value="todos">Todas</option>
                {roles.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-black text-gray-500">Status</span>

              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
              >
                <option value="todos">Todos</option>
                {statusOpcoes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
            <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
              <h3 className="text-xl font-black text-[#050816]">
                Usuários cadastrados
              </h3>

              <p className="mt-1 text-sm font-semibold text-gray-500">
                {perfisFiltrados.length} usuário(s) encontrado(s)
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {perfisFiltrados.length === 0 && (
                <div className="p-6 text-sm font-bold text-gray-500">
                  Nenhum usuário encontrado.
                </div>
              )}

              {perfisFiltrados.map((perfil) => {
                const editandoAtual = salvandoId === perfil.id;
                const ehUsuarioAtual = perfil.id === usuario.id;

                return (
                  <div
                    key={perfil.id}
                    className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_180px_180px_160px]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="break-words text-lg font-black text-[#08163F]">
                          {perfil.nome || "Usuário sem nome"}
                        </h4>

                        {ehUsuarioAtual && (
                          <span className="rounded-full bg-[#08163F] px-3 py-1 text-xs font-black text-white">
                            Você
                          </span>
                        )}
                      </div>

                      <p className="mt-1 break-all text-sm font-bold text-gray-500">
                        {perfil.email || "E-mail não informado"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black text-gray-500">
                          {perfil.telefone || "Telefone não informado"}
                        </span>

                        <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black text-gray-500">
                          Criado em {formatarData(perfil.created_at)}
                        </span>

                        {perfil.codigo_inscricao && (
                          <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black text-gray-500">
                            Código: {perfil.codigo_inscricao}
                          </span>
                        )}
                      </div>
                    </div>

                    <label>
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                        Role
                      </span>

                      <select
                        value={normalizar(perfil.role)}
                        onChange={(e) =>
                          atualizarCampoLocal(perfil.id, "role", e.target.value)
                        }
                        disabled={editandoAtual || ehUsuarioAtual}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-3 py-3 text-sm font-black text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Sem role</option>
                        {roles.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>

                      {ehUsuarioAtual && (
                        <p className="mt-2 text-xs font-bold text-gray-400">
                          Sua própria role fica protegida.
                        </p>
                      )}
                    </label>

                    <label>
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                        Status
                      </span>

                      <select
                        value={normalizar(perfil.status)}
                        onChange={(e) =>
                          atualizarCampoLocal(
                            perfil.id,
                            "status",
                            e.target.value
                          )
                        }
                        disabled={editandoAtual}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-3 py-3 text-sm font-black text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Sem status</option>
                        {statusOpcoes.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-xs font-bold text-gray-400">
                        Atual: {formatarStatus(perfil.status)}
                      </p>
                    </label>

                    <div className="flex items-center xl:justify-end">
                      <button
                        type="button"
                        onClick={() => salvarPerfil(perfil)}
                        disabled={editandoAtual}
                        className="w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto"
                      >
                        {editandoAtual ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function CardResumo({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-[22px] bg-white p-5 shadow-lg shadow-slate-200/70">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
        {titulo}
      </p>

      <p className="mt-3 text-4xl font-black text-[#08163F]">{valor}</p>
    </div>
  );
}