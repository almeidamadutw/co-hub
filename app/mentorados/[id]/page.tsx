"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { useMentoradosSupabase } from "@/utils/useMentoradosSupabase";

export default function PerfilMentoradoPage() {
  const router = useRouter();
  const params = useParams();

  const [usuario, setUsuario] = useState<User | null>(null);

  const mentoradoId = String(params.id);

  const { mentorados, carregando, erro } = useMentoradosSupabase();

  const mentorado = useMemo(() => {
    return mentorados.find((item) => item.id === mentoradoId) ?? null;
  }, [mentorados, mentoradoId]);

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
  }, [router]);

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando perfil do mentorado...
      </main>
    );
  }

  if (erro) {
    return (
      <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
        <Sidebar nome={usuario.nome} role={usuario.role} />

        <section className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-lg rounded-[30px] bg-white p-8 text-center shadow-lg">
            <h1 className="text-3xl font-black">Erro ao carregar perfil</h1>

            <p className="mt-3 text-gray-500">{erro}</p>

            <button
              onClick={() => router.push("/mentorados")}
              className="mt-6 rounded-2xl bg-[#08163F] px-6 py-3 font-bold text-white"
            >
              Voltar para mentorados
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!mentorado) {
    return (
      <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
        <Sidebar nome={usuario.nome} role={usuario.role} />

        <section className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-lg rounded-[30px] bg-white p-8 text-center shadow-lg">
            <h1 className="text-3xl font-black">Mentorado não encontrado</h1>

            <p className="mt-3 text-gray-500">
              Esse perfil não existe ou ainda não foi cadastrado no Supabase.
            </p>

            <button
              onClick={() => router.push("/mentorados")}
              className="mt-6 rounded-2xl bg-[#08163F] px-6 py-3 font-bold text-white"
            >
              Voltar para mentorados
            </button>
          </div>
        </section>
      </main>
    );
  }

  const status = mentorado.status ?? "Ativo";

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-8 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/mentorados")}
              className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
            >
              ← Voltar
            </button>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
                Perfil do mentorado
              </p>

              <h1 className="text-xl font-black">{mentorado.nome}</h1>
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
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-6">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-lg">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D9DEE7] to-[#9CA3AF] text-3xl font-black text-white">
                    {mentorado.nome?.charAt(0) ?? "M"}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                    Código de inscrição
                  </p>

                  <h2 className="mt-2 text-4xl font-black">
                    {mentorado.nome}
                  </h2>

                  <p className="mt-2 text-[#D9DEE7]">
                    Código:{" "}
                    <span className="font-bold text-white">
                      {mentorado.codigo_inscricao ?? "—"}
                    </span>
                  </p>
                </div>
              </div>

              <StatusBadge status={status} />
            </div>
          </section>

          <section className="mb-7 grid gap-5 xl:grid-cols-4">
            <KPI
              titulo="Status"
              valor={status}
              destaque
            />

            <KPI
              titulo="Código"
              valor={mentorado.codigo_inscricao ?? "—"}
            />

            <KPI
              titulo="Cadastro"
              valor={formatarData(mentorado.created_at)}
            />

            <KPI
              titulo="Tipo"
              valor="Mentorado"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card titulo="Dados do mentorado">
              <Info label="Nome" value={mentorado.nome} />
              <Info label="E-mail" value={mentorado.email} />
              <Info
                label="Telefone"
                value={mentorado.telefone || "Telefone não informado"}
              />
              <Info
                label="Código de inscrição"
                value={mentorado.codigo_inscricao || "Código não gerado"}
              />
              <Info label="Status" value={status} />
            </Card>

            <Card titulo="Acompanhamento">
              <div className="rounded-2xl bg-[#f9fafb] p-5">
                <p className="text-sm font-semibold leading-relaxed text-gray-600">
                  Este perfil já está conectado ao Supabase. As próximas
                  informações exibidas aqui serão progresso, agenda, simulados,
                  financeiro e observações da mentora.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <ActionButton
                  label="Agendar sessão"
                  onClick={() => router.push("/agenda")}
                />

                <ActionButton
                  label="Ver relatórios"
                  onClick={() => router.push("/relatorios")}
                />

                <ActionButton
                  label="Abrir progresso"
                  onClick={() => router.push("/relatorios")}
                />

                <ActionButton
                  label="Financeiro"
                  onClick={() => router.push("/financeiro")}
                />
              </div>
            </Card>

            <Card titulo="Progresso">
              <div className="rounded-2xl bg-[#f9fafb] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-500">
                    Evolução individual
                  </p>

                  <p className="text-sm font-black text-[#08163F]">0%</p>
                </div>

                <div className="h-5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5B7FFF] via-[#12317C] to-[#07122F]"
                    style={{ width: "0%" }}
                  />
                </div>

                <p className="mt-4 text-sm font-semibold leading-6 text-gray-500">
                  O progresso real será calculado quando as aulas concluídas
                  forem conectadas ao banco.
                </p>
              </div>
            </Card>

            <Card titulo="Próximas conexões">
              <Etapa titulo="Cadastro no Supabase" status="Concluído" />
              <Etapa titulo="Agenda real" status="Pendente" />
              <Etapa titulo="Progresso real" status="Pendente" />
              <Etapa titulo="Simulados e resultados" status="Pendente" />
              <Etapa titulo="Financeiro" status="Pendente" />
            </Card>
          </section>
        </div>
      </section>
    </main>
  );
}

function formatarData(data?: string | null) {
  if (!data) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(data));
}

function KPI({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-[26px] p-6 shadow-lg ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          destaque ? "text-[#C9CED6]" : "text-gray-500"
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

      <div className="space-y-4 p-6">{children}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 font-black text-[#08163F]">{value}</p>
    </div>
  );
}

function Etapa({
  titulo,
  status,
}: {
  titulo: string;
  status: "Concluído" | "Pendente";
}) {
  const concluido = status === "Concluído";

  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#f9fafb] p-4">
      <div>
        <p className="font-black text-[#08163F]">{titulo}</p>

        <p className="text-sm font-semibold text-gray-500">{status}</p>
      </div>

      <span
        className={`rounded-full px-4 py-2 text-xs font-black ${
          concluido
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {concluido ? "ok" : "aguardando"}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusLower = status.toLowerCase();

  const classe =
    statusLower === "ativo"
      ? "bg-green-100 text-green-700"
      : statusLower === "pendente"
      ? "bg-amber-100 text-amber-700"
      : statusLower === "inativo"
      ? "bg-slate-100 text-slate-600"
      : "bg-blue-100 text-blue-700";

  return (
    <span className={`rounded-full px-4 py-2 text-sm font-black ${classe}`}>
      {status}
    </span>
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