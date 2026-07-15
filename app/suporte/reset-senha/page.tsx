"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import {
  logoutUsuario,
  sincronizarUsuarioComSessao,
} from "@/utils/auth";
import type { User } from "@/utils/auth";
import SuporteSidebar from "@/components/SuporteSidebar";

type UsuarioResetSenha = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  status: string | null;
  role: string | null;
  trocas_senha: number | null;
  ultima_troca_senha: string | null;
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

  async function carregarUsuarios() {
    setErro("");

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, nome, email, telefone, status, role, trocas_senha, ultima_troca_senha"
      )
      .in("role", ["mentor", "mentorado"])
      .order("nome", { ascending: true });

    if (error) {
      setErro(`Não foi possível carregar os usuários: ${error.message}`);
      return;
    }

    setUsuarios((data || []) as UsuarioResetSenha[]);
  }

  useEffect(() => {
    async function carregar() {
      const user = await sincronizarUsuarioComSessao();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (user.role !== "suporte") {
        await logoutUsuario();
        router.replace("/login");
        return;
      }

      setUsuario(user);
      await carregarUsuarios();
      setCarregando(false);
    }

    void carregar();
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

    const { error: liberarError } = await supabase.rpc(
      "suporte_liberar_reset_senha",
      {
        p_profile_id: item.id,
      }
    );

    if (liberarError) {
      setResetandoId(null);
      setErro(
        `Não foi possível liberar o reset de senha: ${
          liberarError.message || "erro de permissão ou validação no Supabase"
        }`
      );
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      emailNormalizado,
      {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      }
    );

    setResetandoId(null);

    if (resetError) {
      setUsuarios((listaAtual) =>
        listaAtual.map((usuarioAtual) =>
          usuarioAtual.id === item.id
            ? {
                ...usuarioAtual,
                trocas_senha: 0,
                ultima_troca_senha: null,
              }
            : usuarioAtual
        )
      );

      setErro(
        `O controle de senha foi liberado e o histórico foi atualizado, mas o e-mail não foi enviado: ${resetError.message}`
      );
      return;
    }

    setUsuarios((listaAtual) =>
      listaAtual.map((usuarioAtual) =>
        usuarioAtual.id === item.id
          ? {
              ...usuarioAtual,
              trocas_senha: 0,
              ultima_troca_senha: null,
            }
          : usuarioAtual
      )
    );

    setMensagem(
      `Acesso liberado, novo link enviado para ${emailNormalizado} e histórico atualizado.`
    );

    await carregarUsuarios();
  }

  if (carregando || !usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">
            CEO Club
          </p>
          <h1 className="mt-3 text-2xl font-black">Carregando suporte...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <SuporteSidebar nome={usuario.nome} />

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
              Use esta tela quando um mentor ou mentorado precisar receber um
              novo link de redefinição. O sistema libera uma nova troca,
              envia o e-mail de recuperação e registra tudo no histórico de
              segurança.
            </p>
          </div>

          {mensagem && (
            <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700">
              {mensagem}
            </div>
          )}

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {erro}
            </div>
          )}

          <div className="mb-4 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70">
            <label>
              <span className="text-sm font-black text-gray-500">
                Buscar usuário
              </span>

              <input
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

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <InfoMini
                        label="Trocas registradas"
                        value={String(item.trocas_senha ?? 0)}
                      />

                      <InfoMini
                        label="Última troca"
                        value={formatarData(item.ultima_troca_senha)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center xl:justify-end">
                    <button
                      type="button"
                      onClick={() => resetarSenhaUsuario(item)}
                      disabled={resetandoId === item.id}
                      className="w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto"
                    >
                      {resetandoId === item.id
                        ? "Enviando..."
                        : "Enviar novo link"}
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
