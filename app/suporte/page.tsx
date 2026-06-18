"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import SuporteSidebar from "@/components/SuporteSidebar";

type PerfilResumo = {
  id: string;
  nome: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
};

type ResumoSuporte = {
  totalUsuarios: number;
  totalMentorados: number;
  totalMentores: number;
  totalFinanceiro: number;
  totalSuporte: number;
  usuariosAtivos: number;
  usuariosInativos: number;
  usuariosSemPerfil: number;
  usuariosSemStatus: number;
};

export default function SuportePage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfis, setPerfis] = useState<PerfilResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarDashboard() {
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

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, role, status, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setErro("Não foi possível carregar os dados reais do sistema.");
        setCarregando(false);
        return;
      }

      setPerfis((data || []) as PerfilResumo[]);
      setCarregando(false);
    }

    carregarDashboard();
  }, [router]);

  const resumo = useMemo<ResumoSuporte>(() => {
    const normalizar = (valor: string | null) =>
      valor?.trim().toLowerCase() || "";

    return {
      totalUsuarios: perfis.length,

      totalMentorados: perfis.filter(
        (perfil) => normalizar(perfil.role) === "mentorado"
      ).length,

      totalMentores: perfis.filter(
        (perfil) => normalizar(perfil.role) === "mentor"
      ).length,

      totalFinanceiro: perfis.filter(
        (perfil) => normalizar(perfil.role) === "financeiro"
      ).length,

      totalSuporte: perfis.filter(
        (perfil) => normalizar(perfil.role) === "suporte"
      ).length,

      usuariosAtivos: perfis.filter(
        (perfil) => normalizar(perfil.status) === "ativo"
      ).length,

      usuariosInativos: perfis.filter((perfil) => {
        const status = normalizar(perfil.status);

        return (
          status === "inativo" ||
          status === "bloqueado" ||
          status === "cancelado" ||
          status === "suspenso"
        );
      }).length,

      usuariosSemPerfil: perfis.filter((perfil) => !perfil.role).length,

      usuariosSemStatus: perfis.filter((perfil) => !perfil.status).length,
    };
  }, [perfis]);

  const ultimosUsuarios = useMemo(() => {
    return perfis.slice(0, 6);
  }, [perfis]);

  function formatarData(data: string | null) {
    if (!data) return "Sem data";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(data));
  }

  function formatarPerfil(role: string | null) {
    if (!role) return "Sem perfil";

    const roleNormalizada = role.trim().toLowerCase();

    if (roleNormalizada === "mentor") return "Mentor";
    if (roleNormalizada === "mentorado") return "Mentorado";
    if (roleNormalizada === "financeiro") return "Financeiro";
    if (roleNormalizada === "suporte") return "Suporte";

    return role;
  }

  function formatarStatus(status: string | null) {
    if (!status) return "Sem status";

    const statusNormalizado = status.trim().toLowerCase();

    if (statusNormalizado === "ativo") return "Ativo";
    if (statusNormalizado === "inativo") return "Inativo";
    if (statusNormalizado === "bloqueado") return "Bloqueado";
    if (statusNormalizado === "cancelado") return "Cancelado";
    if (statusNormalizado === "suspenso") return "Suspenso";

    return status;
  }

  if (carregando || !usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">
            CEO Club
          </p>
          <h1 className="mt-3 text-2xl font-black">
            Carregando suporte...
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
              Área técnica
            </p>

            <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
              Dashboard do suporte
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push("/conta")}
            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
          >
            Minha conta
          </button>
        </header>

        <section className="mx-auto w-full max-w-[1280px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <div className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-xl lg:rounded-[26px] lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                  Central técnica CEO Club
                </p>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl lg:text-4xl">
                  Painel administrativo geral
                </h2>

                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
                  Visão real dos usuários cadastrados no sistema. Esta tela
                  consulta diretamente a tabela de perfis do Supabase.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9CED6]">
                  Acesso
                </p>

                <p className="mt-1 text-sm font-black text-white">
                  Admin geral
                </p>
              </div>
            </div>
          </div>

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {erro}
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CardResumo
              titulo="Usuários totais"
              valor={resumo.totalUsuarios}
              descricao="Perfis cadastrados no Supabase"
            />

            <CardResumo
              titulo="Mentorados"
              valor={resumo.totalMentorados}
              descricao="Usuários com perfil mentorado"
            />

            <CardResumo
              titulo="Mentores"
              valor={resumo.totalMentores}
              descricao="Usuários com perfil mentor"
            />

            <CardResumo
              titulo="Financeiro"
              valor={resumo.totalFinanceiro}
              descricao="Usuários com perfil financeiro"
            />
          </section>

          <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CardResumo
              titulo="Suporte"
              valor={resumo.totalSuporte}
              descricao="Usuários com perfil suporte"
            />

            <CardResumo
              titulo="Ativos"
              valor={resumo.usuariosAtivos}
              descricao="Perfis com status ativo"
            />

            <CardResumo
              titulo="Inativos"
              valor={resumo.usuariosInativos}
              descricao="Bloqueados, suspensos ou cancelados"
            />

            <CardResumo
              titulo="Sem perfil"
              valor={resumo.usuariosSemPerfil}
              descricao="Usuários que precisam receber um perfil de acesso"
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-3">
            <AcaoSuporte
              titulo="Tickets"
              descricao="Acompanhar chamados abertos por mentorados, mentores e equipe."
              botao="Ver tickets"
              onClick={() => router.push("/suporte/tickets")}
            />

            <AcaoSuporte
              titulo="Reset de senha"
              descricao="Liberar nova troca de senha e enviar link de redefinição."
              botao="Acessar reset"
              onClick={() => router.push("/suporte/reset-senha")}
            />

            <AcaoSuporte
              titulo="Usuários"
              descricao="Consultar perfis de acesso, status e dados técnicos dos usuários."
              botao="Gerenciar usuários"
              onClick={() => router.push("/suporte/usuarios")}
            />

            <AcaoSuporte
              titulo="Mentorados"
              descricao="Ver mentorados cadastrados, contatos e informações de acesso."
              botao="Ver mentorados"
              onClick={() => router.push("/suporte/mentorados")}
            />

            <AcaoSuporte
              titulo="Logs técnicos"
              descricao="Acompanhar alterações sensíveis feitas dentro do sistema."
              botao="Ver logs"
              onClick={() => router.push("/suporte/logs")}
            />

            <AcaoSuporte
              titulo="Permissões"
              descricao="Corrigir usuários sem perfil, status errado ou acesso inconsistente."
              botao="Ver usuários"
              onClick={() => router.push("/suporte/usuarios")}
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
              <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">
                  Dados reais
                </p>

                <h3 className="mt-2 text-xl font-black text-[#050816]">
                  Últimos usuários cadastrados
                </h3>
              </div>

              <div className="divide-y divide-gray-100">
                {ultimosUsuarios.length === 0 && (
                  <div className="p-5 text-sm font-bold text-gray-500">
                    Nenhum usuário encontrado.
                  </div>
                )}

                {ultimosUsuarios.map((perfil) => (
                  <div key={perfil.id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="break-words text-base font-black text-[#08163F]">
                          {perfil.nome || "Usuário sem nome"}
                        </h4>

                        <p className="mt-1 break-all text-sm font-bold text-gray-500">
                          {perfil.email || "E-mail não informado"}
                        </p>
                      </div>

                      <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black text-[#08163F]">
                        {formatarPerfil(perfil.role)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-500 shadow-sm">
                        {formatarStatus(perfil.status)}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-500 shadow-sm">
                        Criado em {formatarData(perfil.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] bg-white p-5 shadow-lg shadow-slate-200/70">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">
                Segurança
              </p>

              <h3 className="mt-2 text-xl font-black text-[#050816]">
                Regras desta área
              </h3>

              <p className="mt-3 text-sm font-semibold leading-6 text-gray-500">
                Esta área só permite acesso para usuários com perfil de acesso{" "}
                <span className="font-black text-[#08163F]">suporte</span>.
                Outros perfis são deslogados automaticamente.
              </p>

              <div className="mt-4 space-y-3">
                <InfoSeguranca
                  label="Usuários sem perfil"
                  value={String(resumo.usuariosSemPerfil)}
                />

                <InfoSeguranca
                  label="Usuários sem status"
                  value={String(resumo.usuariosSemStatus)}
                />

                <InfoSeguranca
                  label="Perfil atual"
                  value={formatarPerfil(usuario.role)}
                />
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function CardResumo({
  titulo,
  valor,
  descricao,
}: {
  titulo: string;
  valor: number;
  descricao: string;
}) {
  return (
    <div className="rounded-[22px] bg-white p-5 shadow-lg shadow-slate-200/70">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
        {titulo}
      </p>

      <p className="mt-3 text-4xl font-black text-[#08163F]">{valor}</p>

      <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
        {descricao}
      </p>
    </div>
  );
}

function AcaoSuporte({
  titulo,
  descricao,
  botao,
  onClick,
}: {
  titulo: string;
  descricao: string;
  botao: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-[22px] bg-white p-5 shadow-lg shadow-slate-200/70">
      <h3 className="text-xl font-black text-[#050816]">{titulo}</h3>

      <p className="mt-2 min-h-[72px] text-sm font-semibold leading-6 text-gray-500">
        {descricao}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="mt-4 w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
      >
        {botao}
      </button>
    </div>
  );
}

function InfoSeguranca({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>

      <p className="mt-2 break-words text-2xl font-black text-[#08163F]">
        {value}
      </p>
    </div>
  );
}