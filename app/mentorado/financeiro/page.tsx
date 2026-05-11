"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, usuarioTemPermissao, User } from "@/utils/auth";

type StatusCobranca = "Pago" | "Pendente" | "Atrasado" | "Cancelado";

type ProfileMentorado = {
  id: string;
  nome: string;
  email: string;
  codigo_inscricao: string | null;
};

type Cobranca = {
  id: string;
  mentorado_id: string;
  titulo: string;
  descricao: string | null;
  valor_total: number;
  quantidade_parcelas: number;
  parcela_atual: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: StatusCobranca;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

type FiltroStatus = "Todos" | StatusCobranca;

const statusOptions: FiltroStatus[] = [
  "Todos",
  "Pago",
  "Pendente",
  "Atrasado",
  "Cancelado",
];

export default function FinanceiroMentoradoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<ProfileMentorado | null>(null);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("Todos");
  const [cobrancaSelecionada, setCobrancaSelecionada] =
    useState<Cobranca | null>(null);

  useEffect(() => {
    iniciarTela();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function iniciarTela() {
    setCarregando(true);
    setErro("");

    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

    if (!usuarioTemPermissao(usuarioLogado, ["mentorado"])) {
      router.push("/dashboard");
      return;
    }

    setUsuario(usuarioLogado);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setErro("Sessão não encontrada. Faça login novamente.");
      setCarregando(false);
      return;
    }

    const { data: perfilData, error: perfilError } = await supabase
      .from("profiles")
      .select("id, nome, email, codigo_inscricao")
      .eq("id", authData.user.id)
      .eq("role", "mentorado")
      .single();

    if (perfilError || !perfilData) {
      setErro(
        perfilError?.message ||
          "Não foi possível encontrar o perfil financeiro do mentorado."
      );
      setCarregando(false);
      return;
    }

    setPerfil(perfilData as ProfileMentorado);

    const { data: cobrancasData, error: cobrancasError } = await supabase
      .from("financeiro_cobrancas")
      .select(
        "id, mentorado_id, titulo, descricao, valor_total, quantidade_parcelas, parcela_atual, valor_parcela, data_vencimento, data_pagamento, forma_pagamento, status, observacao, created_at, updated_at"
      )
      .eq("mentorado_id", perfilData.id)
      .order("data_vencimento", { ascending: true });

    if (cobrancasError) {
      setErro(cobrancasError.message);
      setCarregando(false);
      return;
    }

    setCobrancas((cobrancasData ?? []) as Cobranca[]);
    setCarregando(false);
  }

  const cobrancasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return cobrancas.filter((item) => {
      const bateStatus =
        filtroStatus === "Todos" || item.status === filtroStatus;

      const textoBusca = normalizarTexto(
        [
          item.titulo,
          item.descricao,
          item.observacao,
          item.status,
          item.forma_pagamento,
          `${item.parcela_atual}/${item.quantidade_parcelas}`,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const bateBusca = !termo || textoBusca.includes(termo);

      return bateStatus && bateBusca;
    });
  }, [cobrancas, filtroStatus, busca]);

  const resumo = useMemo(() => {
    const totalContratado = cobrancas.reduce(
      (acc, item) => acc + Number(item.valor_parcela || 0),
      0
    );

    const pago = cobrancas
      .filter((item) => item.status === "Pago")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const pendente = cobrancas
      .filter((item) => item.status === "Pendente")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const atrasado = cobrancas
      .filter((item) => item.status === "Atrasado")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const emAberto = pendente + atrasado;

    const hojeISO = formatarDataISO(new Date());

    const vencendoHoje = cobrancas.filter(
      (item) => item.status === "Pendente" && item.data_vencimento === hojeISO
    ).length;

    const proximoVencimento = cobrancas
      .filter((item) => item.status !== "Pago" && item.status !== "Cancelado")
      .sort(
        (a, b) =>
          criarDataLocal(a.data_vencimento).getTime() -
          criarDataLocal(b.data_vencimento).getTime()
      )[0];

    return {
      totalContratado,
      pago,
      pendente,
      atrasado,
      emAberto,
      vencendoHoje,
      proximoVencimento,
      quantidadeTotal: cobrancas.length,
      quantidadePagas: cobrancas.filter((item) => item.status === "Pago").length,
      quantidadeAbertas: cobrancas.filter(
        (item) => item.status === "Pendente" || item.status === "Atrasado"
      ).length,
    };
  }, [cobrancas]);

  const progressoPagamento = useMemo(() => {
    if (resumo.totalContratado <= 0) return 0;

    return Math.min(
      100,
      Math.round((resumo.pago / resumo.totalContratado) * 100)
    );
  }, [resumo.totalContratado, resumo.pago]);

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        <div className="rounded-[28px] bg-white px-8 py-6 text-center shadow-xl shadow-slate-200">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
            CEO Club
          </p>
          <p className="mt-2 text-xl font-black text-[#08163F]">
            Carregando financeiro...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative flex-1 overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#12317C]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-slate-300/30 blur-3xl" />

        <div className="relative z-10">
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-[0_24px_60px_rgba(8,22,63,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.32em] text-[#C9CED6]">
                  Financeiro
                </p>

                <h1 className="max-w-4xl text-4xl font-black leading-tight">
                  Minha área financeira
                </h1>

                <p className="mt-3 max-w-2xl text-[#D9DEE7]">
                  Acompanhe suas parcelas, vencimentos e histórico de pagamentos
                  da mentoria.
                </p>

                {perfil && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-blue-100">
                      {perfil.codigo_inscricao || "Sem código"}
                    </span>

                    <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-blue-100">
                      {perfil.nome}
                    </span>
                  </div>
                )}
              </div>

              <div className="w-full max-w-sm rounded-[26px] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">
                  Próximo vencimento
                </p>

                <p className="mt-2 text-3xl font-black">
                  {resumo.proximoVencimento
                    ? formatarData(resumo.proximoVencimento.data_vencimento)
                    : "—"}
                </p>

                <p className="mt-1 text-sm font-semibold text-blue-100">
                  {resumo.proximoVencimento
                    ? `${resumo.proximoVencimento.titulo} · ${formatarMoeda(
                        Number(resumo.proximoVencimento.valor_parcela)
                      )}`
                    : "Nenhuma parcela em aberto"}
                </p>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-blue-100">
                    <span>Progresso pago</span>
                    <span>{progressoPagamento}%</span>
                  </div>

                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-white via-slate-200 to-slate-400 transition-all"
                      style={{ width: `${progressoPagamento}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <MiniInfo
                titulo="Parcelas"
                valor={`${resumo.quantidadePagas}/${resumo.quantidadeTotal}`}
                texto="pagas no histórico"
              />

              <MiniInfo
                titulo="Em aberto"
                valor={String(resumo.quantidadeAbertas)}
                texto={formatarMoeda(resumo.emAberto)}
              />

              <MiniInfo
                titulo="Vencendo hoje"
                valor={String(resumo.vencendoHoje)}
                texto="acompanhe o prazo"
              />
            </div>
          </section>

          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          <section className="mb-6 grid gap-4 md:grid-cols-4">
            <ResumoCard
              titulo="Total contratado"
              valor={formatarMoeda(resumo.totalContratado)}
              destaque
            />

            <ResumoCard titulo="Pago" valor={formatarMoeda(resumo.pago)} />

            <ResumoCard
              titulo="Pendente"
              valor={formatarMoeda(resumo.pendente)}
            />

            <ResumoCard
              titulo="Atrasado"
              valor={formatarMoeda(resumo.atrasado)}
              alerta={resumo.atrasado > 0}
            />
          </section>

          <section className="mb-6 rounded-[28px] border border-white/50 bg-white/85 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="grid gap-4 xl:grid-cols-[1fr_0.6fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  Parcelas
                </p>

                <h2 className="mt-1 text-2xl font-black text-[#08163F]">
                  Meus lançamentos
                </h2>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Consulte vencimentos, valores e informações registradas pela
equipe.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_0.6fr]">
                <input
                  type="text"
                  placeholder="Buscar por cobrança, status ou forma de pagamento"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#08163F] outline-none placeholder:text-slate-400 focus:border-[#12317C]"
                />

                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#08163F] outline-none focus:border-[#12317C]"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status === "Todos" ? "Todos os status" : status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="mb-6 grid gap-5 xl:grid-cols-[1fr_0.45fr]">
            <section className="overflow-hidden rounded-[30px] border border-white/50 bg-white/85 shadow-xl shadow-slate-200/70 backdrop-blur-sm">
              <div className="hidden grid-cols-[1fr_0.6fr_0.7fr_0.7fr_0.7fr] bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 font-semibold text-white md:grid">
                <span>Cobrança</span>
                <span>Parcela</span>
                <span>Valor</span>
                <span>Vencimento</span>
                <span>Status</span>
              </div>

              {cobrancasFiltradas.length === 0 ? (
                <div className="p-10 text-center text-sm font-semibold text-slate-500">
                  Nenhum lançamento encontrado.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cobrancasFiltradas.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCobrancaSelecionada(item)}
                      className="grid w-full gap-3 p-4 text-left text-sm transition hover:bg-slate-50 md:grid-cols-[1fr_0.6fr_0.7fr_0.7fr_0.7fr] md:items-center"
                    >
                      <span>
                        <strong className="block text-[#08163F]">
                          {item.titulo}
                        </strong>

                        <small className="text-xs text-slate-400">
                          {item.descricao || "Sem descrição"}
                        </small>
                      </span>

                      <span className="font-bold text-slate-600">
                        Parcela {item.parcela_atual}/{item.quantidade_parcelas}
                      </span>

                      <span className="font-black text-[#08163F]">
                        {formatarMoeda(Number(item.valor_parcela))}
                      </span>

                      <span className="font-bold text-slate-600">
                        {formatarData(item.data_vencimento)}
                      </span>

                      <span>
                        <StatusBadge status={item.status} />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <aside className="rounded-[30px] border border-white/50 bg-white/85 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                Pagamento
              </p>

              <h3 className="mt-2 text-2xl font-black text-[#08163F]">
                Orientações
              </h3>

              <div className="mt-5 space-y-4 text-sm font-semibold leading-6 text-slate-600">
                <p>
                  Os pagamentos e baixas são acompanhados pela equipe da
                  mentoria. Caso já tenha pago uma parcela, envie o comprovante
                  pelo canal oficial de suporte.
                </p>

                <div className="rounded-2xl bg-[#f9fafb] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Dica
                  </p>
                  <p className="mt-2">
                    Use os filtros para conferir rapidamente o que está pago,
                    pendente ou em atraso.
                  </p>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </section>

      {cobrancaSelecionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => setCobrancaSelecionada(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[34px] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                    Detalhes da parcela
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    {cobrancaSelecionada.titulo}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-blue-100">
                    Parcela {cobrancaSelecionada.parcela_atual}/
                    {cobrancaSelecionada.quantidade_parcelas}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCobrancaSelecionada(null)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20"
                  aria-label="Fechar detalhes da parcela"
                >
                  ×
                </button>
              </div>

              <div className="mt-5">
                <StatusBadge status={cobrancaSelecionada.status} />
              </div>
            </div>

            <div className="overflow-y-auto p-7">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoBox
                  label="Valor da parcela"
                  value={formatarMoeda(Number(cobrancaSelecionada.valor_parcela))}
                />

                <InfoBox
                  label="Valor total"
                  value={formatarMoeda(Number(cobrancaSelecionada.valor_total))}
                />

                <InfoBox
                  label="Vencimento"
                  value={formatarData(cobrancaSelecionada.data_vencimento)}
                />

                <InfoBox
                  label="Pagamento"
                  value={
                    cobrancaSelecionada.data_pagamento
                      ? formatarData(cobrancaSelecionada.data_pagamento)
                      : "—"
                  }
                />

                <InfoBox
                  label="Forma de pagamento"
                  value={cobrancaSelecionada.forma_pagamento || "—"}
                />

                <InfoBox
                  label="Status"
                  value={<StatusBadge status={cobrancaSelecionada.status} />}
                />

                <div className="rounded-2xl bg-[#f9fafb] p-5 md:col-span-2">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Informações
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                    {cobrancaSelecionada.descricao ||
                      cobrancaSelecionada.observacao ||
                      "Nenhuma informação adicional adicionada."}
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 border-t border-slate-100 bg-white p-5">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setCobrancaSelecionada(null)}
                  className="rounded-2xl bg-[#08163F] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                >
                  Entendi
                </button>

                <button
                  type="button"
                  onClick={() => setCobrancaSelecionada(null)}
                  className="ml-auto rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-black text-[#08163F] transition hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ResumoCard({
  titulo,
  valor,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border border-white/50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm ${
        destaque
          ? "bg-[#071A55] text-white"
          : alerta
          ? "bg-red-50 text-red-700"
          : "bg-white/85 text-[#08163F]"
      }`}
    >
      <h2
        className={`text-sm font-black ${
          destaque ? "text-blue-100" : alerta ? "text-red-600" : "text-slate-500"
        }`}
      >
        {titulo}
      </h2>

      <p className="mt-3 text-3xl font-black">{valor}</p>
    </div>
  );
}

function MiniInfo({
  titulo,
  valor,
  texto,
}: {
  titulo: string;
  valor: string;
  texto: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{valor}</p>
      <p className="mt-1 text-xs font-bold text-blue-100">{texto}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    Pago: "bg-emerald-100 text-emerald-700",
    Pendente: "bg-yellow-100 text-yellow-700",
    Atrasado: "bg-red-100 text-red-700",
    Cancelado: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-black ${
        estilos[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-lg font-black text-[#08163F]">
        {value}
      </p>
    </div>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function formatarData(data: string) {
  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) return "—";

  return `${dia}/${mes}/${ano}`;
}

function formatarDataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function criarDataLocal(dataISO: string) {
  return new Date(`${dataISO}T12:00:00`);
}

function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
