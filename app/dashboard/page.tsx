"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";

type PerfilUsuario = "mentor" | "mentorado" | "financeiro" | "progresso" | "modulos";

type UsuarioSistema = {
  id: string;
  nome: string;
  email: string;
  role: PerfilUsuario;
  telefone: string | null;
  status: "Ativo" | "Pendente" | "Inativo" | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentorado") {
      router.replace("/mentorado/dashboard");
      return;
    }

    if (user.role !== "mentor") {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);
    carregarUsuarios();
  }, [router]);

  async function pegarToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }

  async function carregarUsuarios() {
    setCarregandoDados(true);
    setErro("");

    const token = await pegarToken();

    if (!token) {
      setErro("Sessão expirada. Entre novamente.");
      setCarregandoDados(false);
      return;
    }

    const resposta = await fetch("/api/admin/usuarios", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await resposta.json();

    if (!resposta.ok) {
      setErro(json.error ?? "Não foi possível carregar os dados do painel.");
      setCarregandoDados(false);
      return;
    }

    setUsuarios(json.usuarios ?? []);
    setCarregandoDados(false);
  }

  const resumo = useMemo(() => {
    const mentoradas = usuarios.filter((item) => item.role === "mentorado");
    const mentoras = usuarios.filter((item) => item.role === "mentor");

    const ativos = usuarios.filter(
      (item) => (item.status ?? "Ativo") === "Ativo"
    );

    const pendentes = usuarios.filter(
      (item) => (item.status ?? "Ativo") === "Pendente"
    );

    return {
      totalUsuarios: usuarios.length,
      mentoradas: mentoradas.length,
      mentoras: mentoras.length,
      ativos: ativos.length,
      pendentes: pendentes.length,
    };
  }, [usuarios]);

  async function sair() {
    logoutUsuario();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando painel da mentora...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-8 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] to-[#12317C] text-sm font-black text-white shadow-lg">
              CC
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
                Área da mentora
              </p>
              <h1 className="text-xl font-black">Painel estratégico</h1>
            </div>
          </div>

          <button
            onClick={sair}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Sair
          </button>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-8 py-10">
          <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-gray-200 bg-white shadow-lg">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D9DEE7] to-[#9CA3AF] text-3xl font-black text-white">
                  {usuario.nome.charAt(0)}
                </div>
              </div>

              <div>
                <h2 className="text-4xl font-black tracking-tight text-[#050816]">
                  Bem-vinda de volta, {usuario.nome}
                </h2>

                <p className="mt-2 max-w-2xl text-lg font-medium text-gray-500">
                  Este painel agora mostra dados reais cadastrados no CEO Club.
                  Conforme mentoradas, módulos, aulas e simulados forem criados,
                  os indicadores serão preenchidos automaticamente.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/usuarios")}
                className="rounded-2xl bg-[#08163F] px-6 py-4 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
              >
                + Cadastrar mentorado
              </button>

              <button
                onClick={() => router.push("/mentorados")}
                className="rounded-2xl bg-gradient-to-b from-[#F3F4F6] via-[#D1D5DB] to-[#9CA3AF] px-6 py-4 font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:brightness-105"
              >
                Gerenciar mentorados →
              </button>
            </div>
          </section>

          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          <section className="mb-7 grid gap-5 xl:grid-cols-5">
            <KPI
              titulo="Mentoradas cadastradas"
              valor={carregandoDados ? "..." : resumo.mentoradas}
              destaque
            />

            <KPI
              titulo="Mentoras"
              valor={carregandoDados ? "..." : resumo.mentoras}
            />

            <KPI
              titulo="Usuários ativos"
              valor={carregandoDados ? "..." : resumo.ativos}
            />

            <KPI
              titulo="Acessos cadastrados"
              valor={carregandoDados ? "..." : resumo.totalUsuarios}
            />

            <KPI
              titulo="Pendentes"
              valor={carregandoDados ? "..." : resumo.pendentes}
              alerta={resumo.pendentes > 0}
            />
          </section>

          <section className="mb-8 rounded-[26px] bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-500">
                Evolução geral das mentoradas
              </p>

              <p className="text-sm font-black text-[#08163F]">0%</p>
            </div>

            <div className="h-5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                style={{ width: "0%" }}
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-gray-500">
              Nenhum progresso foi registrado ainda. Quando os módulos e aulas
              forem conectados ao banco, esta barra passará a refletir a evolução
              real das mentoradas.
            </p>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card titulo="Mentoradas cadastradas">
              {carregandoDados ? (
                <EmptyState
                  titulo="Carregando mentoradas..."
                  texto="Buscando os perfis reais cadastrados no Supabase."
                />
              ) : usuarios.filter((u) => u.role === "mentorado").length === 0 ? (
                <EmptyState
                  titulo="Nenhuma mentorada cadastrada ainda"
                  texto="Cadastre a primeira mentorada para liberar o acesso dela ao CEO Club."
                  botao="+ Cadastrar mentorado"
                  onClick={() => router.push("/usuarios")}
                />
              ) : (
                <div className="space-y-4">
                  {usuarios
                    .filter((item) => item.role === "mentorado")
                    .map((mentorada) => (
                      <button
                        key={mentorada.id}
                        onClick={() => router.push(`/mentorados/${mentorada.id}`)}
                        className="w-full rounded-2xl border border-gray-100 bg-[#f9fafb] p-4 text-left transition hover:border-[#12317C]/20 hover:bg-white hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-black text-[#08163F]">
                              {mentorada.nome}
                            </p>

                            <p className="text-sm font-medium text-gray-500">
                              {mentorada.email}
                            </p>

                            {mentorada.telefone && (
                              <p className="mt-1 text-sm font-medium text-gray-400">
                                {mentorada.telefone}
                              </p>
                            )}
                          </div>

                          <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-black text-[#08163F]">
                            {mentorada.status ?? "Ativo"}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </Card>

            <Card titulo="Próximos encontros">
              <EmptyState
                titulo="Nenhum encontro agendado"
                texto="Quando a agenda real for conectada ao banco, os próximos encontros aparecerão nesta área."
                botao="Abrir agenda"
                onClick={() => router.push("/agenda")}
              />
            </Card>

            <Card titulo="Módulos e aulas">
              <EmptyState
                titulo="Nenhum módulo cadastrado ainda"
                texto="Os módulos e aulas serão exibidos aqui quando forem criados pela mentora."
                botao="Gerenciar módulos"
                onClick={() => router.push("/modulos")}
              />
            </Card>

            <Card titulo="Simulados">
              <EmptyState
                titulo="Nenhum simulado publicado"
                texto="Quando a mentora criar e publicar simulados, eles aparecerão aqui com os resultados reais."
                botao="Criar simulado"
                onClick={() => router.push("/simulados")}
              />
            </Card>

            <Card titulo="Financeiro">
              <EmptyState
                titulo="Nenhum lançamento financeiro"
                texto="O financeiro ainda não possui dados cadastrados. Quando conectado ao banco, esta área mostrará pagamentos e pendências reais."
                botao="Abrir financeiro"
                onClick={() => router.push("/financeiro")}
              />
            </Card>

            <Card titulo="Ações rápidas">
              <div className="grid gap-4 md:grid-cols-2">
                <ActionButton
                  label="Cadastrar mentorado"
                  onClick={() => router.push("/usuarios")}
                />

                <ActionButton
                  label="Ver mentorados"
                  onClick={() => router.push("/mentorados")}
                />

                <ActionButton
                  label="Criar simulado"
                  onClick={() => router.push("/simulados")}
                />

                <ActionButton
                  label="Ver agenda"
                  onClick={() => router.push("/agenda")}
                />
              </div>
            </Card>
          </section>
        </div>
      </section>
    </main>
  );
}

function KPI({
  titulo,
  valor,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: React.ReactNode;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-[26px] p-6 shadow-lg ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : alerta
          ? "bg-yellow-50 text-yellow-800"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          destaque
            ? "text-[#C9CED6]"
            : alerta
            ? "text-yellow-600"
            : "text-gray-500"
        }`}
      >
        {titulo}
      </p>

      <p className="mt-4 text-3xl font-black">{valor}</p>
    </div>
  );
}

function Card({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-6">
        <h3 className="text-2xl font-black text-[#050816]">{titulo}</h3>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}

function EmptyState({
  titulo,
  texto,
  botao,
  onClick,
}: {
  titulo: string;
  texto: string;
  botao?: string;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-[26px] bg-[#f9fafb] p-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-4xl shadow-sm">
        ✦
      </div>

      <h3 className="mt-5 text-xl font-black text-[#08163F]">{titulo}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-gray-500">
        {texto}
      </p>

      {botao && onClick && (
        <button
          onClick={onClick}
          className="mt-6 rounded-2xl bg-white px-6 py-3 font-black text-[#08163F] shadow-sm transition hover:shadow-md"
        >
          {botao} →
        </button>
      )}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-[#f9fafb] p-5 text-left font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
    >
      {label} →
    </button>
  );
}