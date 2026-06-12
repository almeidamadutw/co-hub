"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario } from "@/utils/auth";
import type { User } from "@/utils/auth";
import SuporteSidebar from "@/components/SuporteSidebar";

type Mentorado = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  status: string | null;
  trocas_senha: number | null;
  ultima_troca_senha: string | null;
};

export default function ResetSenhaSuportePage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [busca, setBusca] = useState("");

  const [carregando, setCarregando] = useState(true);
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
      await carregarMentorados();
      setCarregando(false);
    }

    carregar();
  }, [router]);

  async function carregarMentorados() {
    setErro("");

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, nome, email, telefone, status, trocas_senha, ultima_troca_senha"
      )
      .eq("role", "mentorado")
      .order("nome", { ascending: true });

    if (error) {
      setErro(`Não foi possível carregar os mentorados: ${error.message}`);
      return;
    }

    setMentorados((data || []) as Mentorado[]);
  }

  const mentoradosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return mentorados;

    return mentorados.filter((mentorado) => {
      const nome = mentorado.nome?.toLowerCase() || "";
      const emailMentorado = mentorado.email?.toLowerCase() || "";
      const telefone = mentorado.telefone?.toLowerCase() || "";
      const status = mentorado.status?.toLowerCase() || "";

      return (
        nome.includes(termo) ||
        emailMentorado.includes(termo) ||
        telefone.includes(termo) ||
        status.includes(termo)
      );
    });
  }, [busca, mentorados]);

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

  async function resetarSenhaMentorado(mentorado: Mentorado) {
    setErro("");
    setMensagem("");

    if (!mentorado.id || !mentorado.email) {
      setErro("Este mentorado não possui e-mail cadastrado.");
      return;
    }

    const emailNormalizado = mentorado.email.trim().toLowerCase();

    const confirmar = window.confirm(
      `Deseja resetar a troca de senha e enviar um novo link para ${
        mentorado.nome || emailNormalizado
      }?`
    );

    if (!confirmar) return;

    setResetandoId(mentorado.id);

    const { error: liberarError } = await supabase.rpc(
      "suporte_liberar_reset_senha",
      {
        p_profile_id: mentorado.id,
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
      setMentorados((listaAtual) =>
        listaAtual.map((item) =>
          item.id === mentorado.id
            ? {
                ...item,
                trocas_senha: 0,
                ultima_troca_senha: null,
              }
            : item
        )
      );

      setErro(
        `O controle de senha foi liberado e o log foi registrado, mas o e-mail não foi enviado: ${resetError.message}`
      );
      return;
    }

    setMentorados((listaAtual) =>
      listaAtual.map((item) =>
        item.id === mentorado.id
          ? {
              ...item,
              trocas_senha: 0,
              ultima_troca_senha: null,
            }
          : item
      )
    );

    setMensagem(
      `Controle de senha resetado, link enviado para ${emailNormalizado} e log registrado.`
    );

    await carregarMentorados();
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
              Reset de senha dos mentorados
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
              Use esta tela quando um mentorado precisar receber um novo link de
              redefinição. O sistema zera o controle de primeira troca, envia o
              e-mail de recuperação e registra a ação nos logs técnicos.
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
                Buscar mentorado
              </span>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite nome, e-mail, telefone ou status"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3 text-sm font-bold text-[#08163F] outline-none transition placeholder:text-gray-400 focus:border-[#12317C] focus:bg-white focus:ring-4 focus:ring-[#12317C]/10"
              />
            </label>
          </div>

          <section className="overflow-hidden rounded-[22px] bg-white shadow-lg shadow-slate-200/70">
            <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
              <h3 className="text-xl font-black text-[#050816]">
                Mentorados cadastrados
              </h3>

              <p className="mt-1 text-sm font-semibold text-gray-500">
                {mentoradosFiltrados.length} mentorado(s) encontrado(s)
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {mentoradosFiltrados.length === 0 && (
                <div className="p-6 text-sm font-bold text-gray-500">
                  Nenhum mentorado encontrado.
                </div>
              )}

              {mentoradosFiltrados.map((mentorado) => (
                <div
                  key={mentorado.id}
                  className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_220px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="break-words text-lg font-black text-[#08163F]">
                        {mentorado.nome || "Mentorado sem nome"}
                      </h4>

                      <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-gray-500">
                        {mentorado.status || "ativo"}
                      </span>
                    </div>

                    <p className="mt-2 break-all text-sm font-bold text-gray-500">
                      {mentorado.email || "E-mail não informado"}
                    </p>

                    {mentorado.telefone && (
                      <p className="mt-1 text-sm font-bold text-gray-400">
                        {mentorado.telefone}
                      </p>
                    )}

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <InfoMini
                        label="Trocas registradas"
                        value={String(mentorado.trocas_senha ?? 0)}
                      />

                      <InfoMini
                        label="Última troca"
                        value={formatarData(mentorado.ultima_troca_senha)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center xl:justify-end">
                    <button
                      type="button"
                      onClick={() => resetarSenhaMentorado(mentorado)}
                      disabled={resetandoId === mentorado.id}
                      className="w-full rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 xl:w-auto"
                    >
                      {resetandoId === mentorado.id
                        ? "Enviando..."
                        : "Resetar senha"}
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