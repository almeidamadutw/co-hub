"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import SuporteSidebar from "@/components/SuporteSidebar";

type LogTecnico = {
  id: string;
  suporte_id: string | null;
  suporte_nome: string | null;
  suporte_email: string | null;
  acao: string;
  entidade: string | null;
  entidade_id: string | null;
  descricao: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

const acoesFiltro = [
  { label: "Todas", value: "todas" },
  { label: "Atualização de usuário", value: "atualizacao_usuario" },
  { label: "Reset de senha", value: "reset_senha" },
  { label: "Chamado respondido", value: "ticket_respondido" },
  { label: "Chamado resolvido", value: "ticket_resolvido" },
  { label: "Alteração de status", value: "alteracao_status" },
];

export default function SuporteLogsPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [logs, setLogs] = useState<LogTecnico[]>([]);
  const [busca, setBusca] = useState("");
  const [acaoFiltro, setAcaoFiltro] = useState("todas");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

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
      await carregarLogs();
      setCarregando(false);
    }

    carregar();
  }, [router]);

  async function carregarLogs() {
    setErro("");

    const { data, error } = await supabase
      .from("suporte_logs")
      .select(
        "id, suporte_id, suporte_nome, suporte_email, acao, entidade, entidade_id, descricao, metadata, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setErro(`Não foi possível carregar o histórico: ${error.message}`);
      return;
    }

    setLogs((data || []) as LogTecnico[]);
  }

  const logsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return logs.filter((log) => {
      const passaAcao = acaoFiltro === "todas" || log.acao === acaoFiltro;

      const textoBusca = [
        log.suporte_nome,
        log.suporte_email,
        log.acao,
        formatarAcao(log.acao),
        log.entidade,
        formatarEntidade(log.entidade),
        log.descricao,
        limparDescricao(log.descricao),
        log.entidade_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const passaBusca = !termo || textoBusca.includes(termo);

      return passaAcao && passaBusca;
    });
  }, [logs, busca, acaoFiltro]);

  const resumo = useMemo(() => {
    return {
      total: logs.length,
      resetSenha: logs.filter((log) => log.acao === "reset_senha").length,
      usuarios: logs.filter((log) => log.acao === "atualizacao_usuario").length,
      tickets: logs.filter(
        (log) =>
          log.acao === "ticket_respondido" || log.acao === "ticket_resolvido"
      ).length,
    };
  }, [logs]);

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

  function formatarAcao(acao: string) {
    if (acao === "atualizacao_usuario") return "Atualização de usuário";
    if (acao === "reset_senha") return "Reset de senha";
    if (acao === "ticket_respondido") return "Chamado respondido";
    if (acao === "ticket_resolvido") return "Chamado resolvido";
    if (acao === "alteracao_status") return "Alteração de status";

    return acao.replaceAll("_", " ");
  }

  function formatarEntidade(entidade: string | null) {
    if (!entidade) return "Área não informada";

    const entidadeAtual = entidade.trim().toLowerCase();

    if (entidadeAtual === "profile" || entidadeAtual === "profiles") {
      return "Usuário";
    }

    if (
      entidadeAtual === "suporte_ticket" ||
      entidadeAtual === "suporte_tickets" ||
      entidadeAtual === "ticket" ||
      entidadeAtual === "tickets"
    ) {
      return "Chamado";
    }

    if (entidadeAtual === "senha" || entidadeAtual === "password") {
      return "Senha";
    }

    return entidade.replaceAll("_", " ");
  }

  function limparDescricao(descricao: string) {
    return descricao
      .replace(/\brole\b/gi, "perfil de acesso")
      .replace(/\blogs\b/gi, "histórico")
      .replace(/\blog\b/gi, "histórico")
      .replace(/\btickets\b/gi, "chamados")
      .replace(/\bticket\b/gi, "chamado")
      .replace(/p_profile_id/gi, "referência do usuário")
      .replace(/p_status/gi, "status")
      .replace(/p_role/gi, "perfil de acesso");
  }

  if (carregando || !usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">
            CEO Club
          </p>
          <h1 className="mt-3 text-2xl font-black">
            Carregando histórico...
          </h1>
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
              Histórico de segurança
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
              Registro administrativo
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Histórico de ações do suporte
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
              Esta tela registra alterações sensíveis feitas pelo suporte, como
              reset de senha, alterações de status, perfis de acesso e atendimento de
              chamados.
            </p>
          </div>

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {erro}
            </div>
          )}

          <section className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CardResumo titulo="Total de registros" valor={resumo.total} />
            <CardResumo titulo="Reset de senha" valor={resumo.resetSenha} />
            <CardResumo titulo="Usuários" valor={resumo.usuarios} />
            <CardResumo titulo="Chamados" valor={resumo.tickets} />
          </section>

          <section className="mb-4 grid gap-3 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 lg:grid-cols-[minmax(0,1fr)_260px]">
            <label>
              <span className="text-sm font-black text-gray-500">
                Buscar registro
              </span>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Busque por ação, responsável, descrição ou área"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
              />
            </label>

            <label>
              <span className="text-sm font-black text-gray-500">Ação</span>

              <select
                value={acaoFiltro}
                onChange={(e) => setAcaoFiltro(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
              >
                {acoesFiltro.map((item) => (
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
                Registros encontrados
              </h3>

              <p className="mt-1 text-sm font-semibold text-gray-500">
                {logsFiltrados.length} registro(s) encontrado(s)
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {logsFiltrados.length === 0 && (
                <div className="p-6 text-sm font-bold text-gray-500">
                  Nenhum registro encontrado ainda.
                </div>
              )}

              {logsFiltrados.map((log) => (
                <div
                  key={log.id}
                  className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_220px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#08163F] px-3 py-1 text-xs font-black text-white">
                        {formatarAcao(log.acao)}
                      </span>

                      {log.entidade && (
                        <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black text-gray-500">
                          {formatarEntidade(log.entidade)}
                        </span>
                      )}
                    </div>

                    <h4 className="mt-3 break-words text-base font-black text-[#08163F]">
                      {limparDescricao(log.descricao)}
                    </h4>

                    <p className="mt-2 break-words text-sm font-semibold text-gray-500">
                      Feito por: {log.suporte_nome || "Suporte não identificado"}
                    </p>

                    {log.suporte_email && (
                      <p className="mt-1 break-all text-xs font-bold text-gray-400">
                        {log.suporte_email}
                      </p>
                    )}

                    {log.entidade_id && (
                      <p className="mt-2 break-all text-xs font-bold text-gray-400">
                        Referência interna: {log.entidade_id}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-[#f9fafb] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                      Data
                    </p>

                    <p className="mt-2 text-sm font-black text-[#08163F]">
                      {formatarData(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
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