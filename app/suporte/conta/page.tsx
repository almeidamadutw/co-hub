"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import SuporteSidebar from "@/components/SuporteSidebar";

type PerfilSuporte = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default function ContaSuportePage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilSuporte | null>(null);

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

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, telefone, role, status, created_at, updated_at")
        .eq("id", user.id)
        .single();

      if (error) {
        setErro(`Não foi possível carregar sua conta: ${error.message}`);
        setCarregando(false);
        return;
      }

      setPerfil(data as PerfilSuporte);
      setCarregando(false);
    }

    carregar();
  }, [router]);

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

  if (carregando || !usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        <div className="rounded-[24px] bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">
            CEO Club
          </p>

          <h1 className="mt-3 text-2xl font-black">
            Carregando minha conta...
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
              Minha conta
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

        <section className="mx-auto w-full max-w-[1000px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <div className="mb-4 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white shadow-xl lg:rounded-[26px] lg:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
              Perfil administrativo
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Dados da conta de suporte
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#D9DEE7]">
              Esta área mostra os dados do usuário de suporte logado no sistema.
            </p>
          </div>

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {erro}
            </div>
          )}

          <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[24px] bg-white p-6 text-center shadow-lg shadow-slate-200/70">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#08163F] text-4xl font-black text-white">
                {(perfil?.nome || usuario.nome || "S").charAt(0).toUpperCase()}
              </div>

              <h3 className="mt-4 break-words text-xl font-black text-[#08163F]">
                {perfil?.nome || usuario.nome || "Suporte"}
              </h3>

              <p className="mt-1 break-all text-sm font-bold text-gray-500">
                {perfil?.email || usuario.email}
              </p>

              <span className="mt-4 inline-flex rounded-full bg-[#f3f5f8] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                {perfil?.role || "suporte"}
              </span>
            </div>

            <div className="rounded-[24px] bg-white p-5 shadow-lg shadow-slate-200/70">
              <h3 className="text-xl font-black text-[#08163F]">
                Informações da conta
              </h3>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoConta label="Nome" value={perfil?.nome || usuario.nome} />
                <InfoConta label="E-mail" value={perfil?.email || usuario.email} />
                <InfoConta
                  label="Telefone"
                  value={perfil?.telefone || "Não informado"}
                />
                <InfoConta label="Role" value={perfil?.role || "suporte"} />
                <InfoConta label="Status" value={perfil?.status || "ativo"} />
                <InfoConta
                  label="Criado em"
                  value={formatarData(perfil?.created_at || null)}
                />
                <InfoConta
                  label="Última atualização"
                  value={formatarData(perfil?.updated_at || null)}
                />
              </div>

              <div className="mt-6 rounded-2xl bg-[#f9fafb] p-4">
                <p className="text-sm font-bold leading-6 text-gray-500">
                  Alterações sensíveis de acesso, role e status devem ser feitas
                  pela tela de usuários do suporte, para manter o histórico nos
                  logs técnicos.
                </p>
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function InfoConta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-[#08163F]">
        {value}
      </p>
    </div>
  );
}