"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import SuporteSidebar from "@/components/SuporteSidebar";

type Mentor = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  status: string | null;
  codigo_inscricao: string | null;
  trocas_senha: number | null;
  ultima_troca_senha: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const statusOpcoes = [
  { label: "Ativo", value: "ativo" },
  { label: "Inativo", value: "inativo" },
  { label: "Bloqueado", value: "bloqueado" },
  { label: "Cancelado", value: "cancelado" },
  { label: "Suspenso", value: "suspenso" },
];

export default function SuporteMentoresPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [resetandoId, setResetandoId] = useState<string | null>(null);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function carregar() {
      const user = getUsuarioLogado();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (user.role !== "suporte") {
        logoutUsuario();
        router.replace("/login");
        return;
      }

      setUsuario(user);
      await carregarMentores();
      setCarregando(false);
    }

    carregar();
  }, [router]);

  async function carregarMentores() {
    setErro("");

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, nome, email, telefone, status, codigo_inscricao, trocas_senha, ultima_troca_senha, created_at, updated_at"
      )
      .eq("role", "mentor")
      .order("created_at", { ascending: false });

    if (error) {
      setErro(`Não foi possível carregar os mentores: ${error.message}`);
      return;
    }

    setMentores((data || []) as Mentor[]);
  }

  const mentoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return mentores.filter((mentor) => {
      const statusAtual = normalizar(mentor.status);

      const passaStatus =
        statusFiltro === "todos" || statusAtual === statusFiltro;

      const textoBusca = [
        mentor.nome,
        mentor.email,
        mentor.telefone,
        mentor.codigo_inscricao,
        mentor.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const passaBusca = !termo || textoBusca.includes(termo);

      return passaStatus && passaBusca;
    });
  }, [mentores, busca, statusFiltro]);

  const resumo = useMemo(() => {
    return {
      total: mentores.length,
      ativos: mentores.filter((m) => normalizar(m.status) === "ativo").length,
      bloqueados: mentores.filter((m) =>
        ["bloqueado", "suspenso"].includes(normalizar(m.status))
      ).length,
      semStatus: mentores.filter((m) => !normalizar(m.status)).length,
    };
  }, [mentores]);

  function normalizar(valor: string | null) {
    return (valor || "").trim().toLowerCase();
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

  function formatarData(data: string | null) {
    if (!data) return "Não informado";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(data));
  }

  function formatarUltimaTroca(data: string | null) {
    if (!data) return "Ainda não registrada";
    return formatarData(data);
  }

  function atualizarStatusLocal(mentorId: string, status: string) {
    setMentores((listaAtual) =>
      listaAtual.map((mentor) =>
        mentor.id === mentorId ? { ...mentor, status } : mentor
      )
    );
  }

  async function salvarStatus(mentor: Mentor) {
    setErro("");
    setMensagem("");

    const statusAtual = normalizar(mentor.status);

    if (!statusAtual) {
      setErro("Selecione um status antes de salvar.");
      return;
    }

    const confirmar = window.confirm(
      `Deseja salvar o status "${formatarStatus(statusAtual)}" para ${
        mentor.nome || mentor.email || "este mentor"
      }?`
    );

    if (!confirmar) return;

    setSalvandoId(mentor.id);

    const { error } = await supabase.rpc("suporte_atualizar_profile", {
      p_profile_id: mentor.id,
      p_role: "mentor",
      p_status: statusAtual,
    });

    setSalvandoId(null);

    if (error) {
      setErro(
        `Não foi possível salvar o status deste mentor: ${
          error.message || "erro de permissão no Supabase"
        }`
      );
      return;
    }

    setMensagem("Status do mentor atualizado com sucesso e histórico registrado.");
    await carregarMentores();
  }

  async function resetarSenha(mentor: Mentor) {
    setErro("");
    setMensagem("");

    if (!mentor.email) {
      setErro("Este mentor não possui e-mail cadastrado.");
      return;
    }

    const confirmar = window.confirm(
      `Deseja liberar uma nova troca de senha e enviar um novo link para ${
        mentor.nome || mentor.email
      }?`
    );

    if (!confirmar) return;

    setResetandoId(mentor.id);

    const { error: liberarError } = await supabase.rpc(
      "suporte_liberar_reset_senha",
      {
        p_profile_id: mentor.id,
      }
    );

    if (liberarError) {
      setResetandoId(null);
      setErro(
        `Não foi possível liberar o reset de senha: ${
          liberarError.message || "erro de permissão no Supabase"
        }`
      );
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      mentor.email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      }
    );

    setResetandoId(null);

    if (resetError) {
      setErro(
        `Controle de senha liberado e histórico registrado, mas o e-mail não foi enviado: ${resetError.message}`
      );
      await carregarMentores();
      return;
    }

    setMensagem(`Novo link enviado para ${mentor.email} e histórico registrado.`);
    await carregarMentores();
  }

  if (carregando || !usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">
            CEO Club
          </p>

          <h1 className="mt-3 text-2xl font-black">Carregando mentores...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <SuporteSidebar nome={usuario.nome} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
              Suporte técnico
            </p>

            <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
              Mentores
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push("/suporte")}
            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
          >
            Voltar ao dashboard
          </button>
        </header>

        <section className="mx-auto w-full max-w-[1280px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <div className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-xl lg:rounded-[26px] lg:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
              Visão administrativa
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Mentores cadastrados
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
              Consulte dados de acesso, contato, status e suporte dos mentores
              cadastrados no CEO Club.
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
            <CardResumo titulo="Ativos" valor={resumo.ativos} />
            <CardResumo
              titulo="Bloqueados/Suspensos"
              valor={resumo.bloqueados}
            />
            <CardResumo titulo="Sem status" valor={resumo.semStatus} />
          </section>

          <section className="mb-4 grid gap-3 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 lg:grid-cols-[minmax(0,1fr)_240px]">
            <label>
              <span className="text-sm font-black text-gray-500">
                Buscar mentor
              </span>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, e-mail, telefone ou código"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
              />
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
                Lista de mentores
              </h3>

              <p className="mt-1 text-sm font-semibold text-gray-500">
                {mentoresFiltrados.length} mentor(es) encontrado(s)
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {mentoresFiltrados.length === 0 && (
                <div className="p-6 text-sm font-bold text-gray-500">
                  Nenhum mentor encontrado.
                </div>
              )}

              {mentoresFiltrados.map((mentor) => {
                const salvandoAtual = salvandoId === mentor.id;
                const resetandoAtual = resetandoId === mentor.id;

                return (
                  <div
                    key={mentor.id}
                    className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_190px_190px_170px]"
                  >
                    <div className="min-w-0">
                      <h4 className="break-words text-lg font-black text-[#08163F]">
                        {mentor.nome || "Mentor sem nome"}
                      </h4>

                      <p className="mt-1 break-all text-sm font-bold text-gray-500">
                        {mentor.email || "E-mail não informado"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Tag>{mentor.telefone || "Telefone não informado"}</Tag>

                        <Tag>
                          Código: {mentor.codigo_inscricao || "não informado"}
                        </Tag>

                        <Tag>Criado em {formatarData(mentor.created_at)}</Tag>

                        <Tag>
                          Última atualização: {formatarData(mentor.updated_at)}
                        </Tag>

                        <Tag>Trocas registradas: {mentor.trocas_senha ?? 0}</Tag>

                        <Tag>
                          Última troca: {formatarUltimaTroca(mentor.ultima_troca_senha)}
                        </Tag>
                      </div>
                    </div>

                    <label>
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                        Status
                      </span>

                      <select
                        value={normalizar(mentor.status)}
                        onChange={(e) =>
                          atualizarStatusLocal(mentor.id, e.target.value)
                        }
                        disabled={salvandoAtual}
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
                        Atual: {formatarStatus(mentor.status)}
                      </p>
                    </label>

                    <div className="flex flex-col justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => salvarStatus(mentor)}
                        disabled={salvandoAtual}
                        className="w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {salvandoAtual ? "Salvando..." : "Salvar status"}
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/suporte/usuarios")}
                        className="w-full rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                      >
                        Ver usuários
                      </button>
                    </div>

                    <div className="flex items-center xl:justify-end">
                      <button
                        type="button"
                        onClick={() => resetarSenha(mentor)}
                        disabled={resetandoAtual}
                        className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-md ring-1 ring-gray-200 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto"
                      >
                        {resetandoAtual ? "Enviando..." : "Enviar novo link"}
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

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black text-gray-500">
      {children}
    </span>
  );
}
