"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageLoading from "@/components/PageLoading";
import { supabase } from "@/utils/supabase";
import {
  rotaInicialUsuario,
  sincronizarUsuarioComSessao,
  usuarioTemAcessoSuporte,
} from "@/utils/auth";
import type { User } from "@/utils/auth";
import SuporteSidebar from "@/components/SuporteSidebar";
import { obterCabecalhoAutorizacao } from "@/utils/apiAuthClient";

type UsuarioResetSenha = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  status: string | null;
  role: string | null;
  trocas_senha: number | null;
  ultima_troca_senha: string | null;
  total_resets_senha: number | null;
  total_solicitacoes_senha: number | null;
  ultima_solicitacao_senha: string | null;
  recuperacao_automatica_disponivel: boolean | null;
};

export default function ResetSenhaSuportePage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioResetSenha[]>([]);
  const [busca, setBusca] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [resetandoId, setResetandoId] = useState<string | null>(null);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function carregarUsuarios(podeAtualizar = () => true) {
    setErro("");

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, nome, email, telefone, status, role, trocas_senha, ultima_troca_senha, total_resets_senha, total_solicitacoes_senha, ultima_solicitacao_senha, recuperacao_automatica_disponivel"
      )
      .is("excluido_em", null)
      .in("role", ["mentor", "mentorado", "financeiro", "suporte"])
      .order("nome", { ascending: true });

    if (error) {
      if (podeAtualizar()) {
        setErro(`Não foi possível carregar os usuários: ${error.message}`);
      }
      return;
    }

    if (podeAtualizar()) {
      setUsuarios((data || []) as UsuarioResetSenha[]);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const user = await sincronizarUsuarioComSessao();

      if (!ativo) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!usuarioTemAcessoSuporte(user)) {
        router.replace(rotaInicialUsuario(user));
        return;
      }

      setUsuario(user);
      const buscaInicial = new URLSearchParams(window.location.search).get(
        "busca"
      );

      if (buscaInicial) {
        setBusca(buscaInicial);
      }

      await carregarUsuarios(() => ativo);

      if (ativo) {
        setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [router]);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return usuarios;

    return usuarios.filter((item) => {
      const nome = item.nome?.toLowerCase() || "";
      const email = item.email?.toLowerCase() || "";
      const telefone = item.telefone?.toLowerCase() || "";
      const status = item.status?.toLowerCase() || "";
      const perfil = item.role?.toLowerCase() || "";

      return (
        nome.includes(termo) ||
        email.includes(termo) ||
        telefone.includes(termo) ||
        status.includes(termo) ||
        perfil.includes(termo)
      );
    });
  }, [busca, usuarios]);

  function formatarData(data: string | null) {
    if (!data) return "Nunca";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(data));
  }

  function formatarPerfil(role: string | null) {
    if (role === "mentor") return "Mentor";
    if (role === "mentorado") return "Mentorado";
    if (role === "financeiro") return "Financeiro";
    if (role === "suporte") return "Suporte";
    return "Usuário";
  }

  function formatarStatus(status: string | null) {
    const statusAtual = status?.trim().toLowerCase();

    if (statusAtual === "ativo") return "Ativo";
    if (statusAtual === "inativo") return "Inativo";
    if (statusAtual === "bloqueado") return "Bloqueado";
    if (statusAtual === "cancelado") return "Cancelado";
    if (statusAtual === "suspenso") return "Suspenso";

    return "Sem status";
  }

  function statusPermiteRecuperacao(status: string | null) {
    const valor = status?.trim().toLowerCase();
    return !valor || valor === "ativo";
  }

  async function resetarSenhaUsuario(item: UsuarioResetSenha) {
    setErro("");
    setMensagem("");

    if (!item.id || !item.email) {
      setErro("Este usuário não possui e-mail cadastrado.");
      return;
    }

    const emailNormalizado = item.email.trim().toLowerCase();

    const confirmar = window.confirm(
      `Deseja liberar uma nova troca de senha e enviar um novo link para ${
        item.nome || emailNormalizado
      }?`
    );

    if (!confirmar) return;

    setResetandoId(item.id);

    try {
      const headers = await obterCabecalhoAutorizacao();
      const response = await fetch("/api/auth/recuperar-senha/suporte", {
        method: "POST",
        cache: "no-store",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileId: item.id }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error || "Não foi possível liberar e enviar o novo link."
        );
      }

      setMensagem(
        `Novo link enviado para ${emailNormalizado}. O histórico anterior foi preservado.`
      );
      await carregarUsuarios();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível liberar e enviar o novo link."
      );
    } finally {
      setResetandoId(null);
    }
  }

  if (carregando || !usuario) {
    return <PageLoading pagina="recuperação de senha" />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <SuporteSidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
              Suporte
            </p>

            <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
              Reset de senha de usuários
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push("/suporte")}
            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
          >
            Voltar ao suporte
          </button>
        </header>

        <section className="mx-auto w-full max-w-[1280px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <div className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white shadow-xl lg:rounded-[26px] lg:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
              Área restrita
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Liberação de nova troca de senha
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
              Use esta tela quando qualquer usuário ativo precisar receber um
              novo link. A liberação, o envio e a auditoria acontecem juntos,
              sem zerar as trocas anteriores.
            </p>
          </div>

          {mensagem && (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700"
            >
              {mensagem}
            </div>
          )}

          {erro && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700"
            >
              {erro}
            </div>
          )}

          <div className="mb-4 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70">
            <label>
              <span className="text-sm font-black text-gray-500">
                Buscar usuário
              </span>

              <input
                type="search"
                name="buscaUsuario"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite nome, e-mail, telefone, perfil ou status"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
              />
            </label>
          </div>

          <section className="overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
            <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
              <h3 className="text-xl font-black text-[#050816]">
                Usuários cadastrados
              </h3>

              <p className="mt-1 text-sm font-semibold text-gray-500">
                {usuariosFiltrados.length} usuário(s) encontrado(s)
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {usuariosFiltrados.length === 0 && (
                <div className="p-6 text-sm font-bold text-gray-500">
                  Nenhum usuário encontrado.
                </div>
              )}

              {usuariosFiltrados.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_220px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="break-words text-lg font-black text-[#08163F]">
                        {item.nome || "Usuário sem nome"}
                      </h4>

                      <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#12317C]">
                        {formatarPerfil(item.role)}
                      </span>

                      <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-gray-500">
                        {formatarStatus(item.status)}
                      </span>
                    </div>

                    <p className="mt-2 break-all text-sm font-bold text-gray-500">
                      {item.email || "E-mail não informado"}
                    </p>

                    {item.telefone && (
                      <p className="mt-1 text-sm font-bold text-gray-400">
                        {item.telefone}
                      </p>
                    )}

                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <InfoMini
                        label="Trocas registradas"
                        value={String(item.trocas_senha ?? 0)}
                      />

                      <InfoMini
                        label="Última troca"
                        value={formatarData(item.ultima_troca_senha)}
                      />

                      <InfoMini
                        label="Links enviados"
                        value={String(item.total_resets_senha ?? 0)}
                      />

                      <InfoMini
                        label="Recuperação automática"
                        value={
                          item.recuperacao_automatica_disponivel
                            ? "Disponível"
                            : "Exige liberação"
                        }
                      />

                      <InfoMini
                        label="Solicitações recebidas"
                        value={String(item.total_solicitacoes_senha ?? 0)}
                      />

                      <InfoMini
                        label="Última solicitação"
                        value={formatarData(item.ultima_solicitacao_senha)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center xl:justify-end">
                    <button
                      type="button"
                      onClick={() => resetarSenhaUsuario(item)}
                      disabled={
                        resetandoId === item.id ||
                        !statusPermiteRecuperacao(item.status)
                      }
                      className="w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto"
                    >
                      {resetandoId === item.id
                        ? "Enviando..."
                        : !statusPermiteRecuperacao(item.status)
                        ? "Usuário inativo"
                        : item.recuperacao_automatica_disponivel
                        ? "Enviar link autorizado"
                        : "Liberar e enviar novo link"}
                    </button>
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

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black text-[#08163F]">
        {value}
      </p>
    </div>
  );
}
