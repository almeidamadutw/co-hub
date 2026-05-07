"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";
import { supabase } from "@/utils/supabase";

type StatusCobranca = "Pago" | "Pendente" | "Atrasado" | "Cancelado";

type PerfilMentorado = {
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

export default function FinanceiroMentoradoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilMentorado | null>(null);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<"Todos" | StatusCobranca>("Todos");
  const [cobrancaSelecionada, setCobrancaSelecionada] =
    useState<Cobranca | null>(null);

  useEffect(() => {
    const user = getUsuarioLogado();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "mentor") {
      router.replace("/dashboard");
      return;
    }

    if (user.role !== "mentorado") {
      logoutUsuario();
      router.replace("/login");
      return;
    }

    setUsuario(user);
  }, [router]);

  useEffect(() => {
    if (!usuario) return;

    const usuarioAtual = usuario;

    async function carregarFinanceiro() {
      setCarregando(true);
      setErro("");

      const { data: perfilData, error: perfilError } = await supabase
        .from("profiles")
        .select("id, nome, email, codigo_inscricao")
        .eq("email", usuarioAtual.email)
        .eq("role", "mentorado")
        .single();

      if (perfilError || !perfilData) {
        setErro(
          perfilError?.message ||
            "Não foi possível carregar suas informações financeiras."
        );
        setCarregando(false);
        return;
      }

      setPerfil(perfilData as PerfilMentorado);

      const { data: cobrancasData, error: cobrancasError } = await supabase
        .from("financeiro_cobrancas")
        .select(
          "id, mentorado_id, titulo, descricao, valor_total, quantidade_parcelas, parcela_atual, valor_parcela, data_vencimento, data_pagamento, forma_pagamento, status, observacao, created_at, updated_at"
        )
        .eq("mentorado_id", perfilData.id)
        .order("data_vencimento", { ascending: true });

      if (cobrancasError) {
        setErro(cobrancasError.message);
        setCobrancas([]);
        setCarregando(false);
        return;
      }

      setCobrancas((cobrancasData ?? []) as Cobranca[]);
      setCarregando(false);
    }

    carregarFinanceiro();
  }, [usuario]);

  const cobrancasFiltradas = useMemo(() => {
    if (filtro === "Todos") return cobrancas;

    return cobrancas.filter((cobranca) => cobranca.status === filtro);
  }, [cobrancas, filtro]);

  const resumo = useMemo(() => {
    const totalPago = cobrancas
      .filter((cobranca) => cobranca.status === "Pago")
      .reduce((acc, cobranca) => acc + Number(cobranca.valor_parcela || 0), 0);

    const totalPendente = cobrancas
      .filter(
        (cobranca) =>
          cobranca.status === "Pendente" || cobranca.status === "Atrasado"
      )
      .reduce((acc, cobranca) => acc + Number(cobranca.valor_parcela || 0), 0);

    const pendentes = cobrancas.filter(
      (cobranca) => cobranca.status === "Pendente"
    ).length;

    const atrasadas = cobrancas.filter(
      (cobranca) => cobranca.status === "Atrasado"
    ).length;

    return {
      totalPago,
      totalPendente,
      pendentes,
      atrasadas,
    };
  }, [cobrancas]);

  const proximaCobranca = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return (
      cobrancas
        .filter((cobranca) => cobranca.status !== "Pago")
        .sort((a, b) => {
          const dataA = new Date(`${a.data_vencimento}T12:00:00`).getTime();
          const dataB = new Date(`${b.data_vencimento}T12:00:00`).getTime();

          return dataA - dataB;
        })[0] ?? null
    );
  }, [cobrancas]);

  function sair() {
    logoutUsuario();
    router.replace("/login");
  }

  if (!usuario || carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando financeiro...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <aside className="hidden min-h-screen w-[310px] flex-col border-r border-black/5 bg-white p-5 shadow-[10px_0_40px_rgba(15,23,42,0.04)] lg:flex">
        <LogoBox />

        <nav className="space-y-2">
          <MenuItem
            label="Início"
            onClick={() => router.push("/mentorado/dashboard")}
          />
          <MenuItem
            label="Minha agenda"
            onClick={() => router.push("/mentorado/agenda")}
          />
          <MenuItem
            label="Meus módulos"
            onClick={() => router.push("/mentorado/modulos")}
          />
          <MenuItem
            label="Praticar"
            onClick={() => router.push("/mentorado/praticar")}
          />
          <MenuItem
            label="Meu progresso"
            onClick={() => router.push("/mentorado/progresso")}
          />
          <MenuItem
            ativo
            label="Financeiro"
            onClick={() => router.push("/mentorado/financeiro")}
          />
          <MenuItem
            label="Minha conta"
            onClick={() => router.push("/mentorado/conta")}
          />
        </nav>

        <UserBox nome={perfil?.nome || usuario.nome} onSair={sair} />
      </aside>

      <section className="flex-1 overflow-hidden">
        <Header
          titulo="Financeiro"
          subtitulo="Área do mentorado"
          onVoltar={() => router.push("/mentorado/dashboard")}
          onSuporte={() => router.push("/mentorado/suporte")}
          onSair={sair}
        />

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-6 py-10 md:px-8">
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                  Financeiro CEO Club
                </p>

                <h1 className="mt-3 text-4xl font-black">
                  Seus pagamentos e mensalidades
                </h1>

                <p className="mt-3 max-w-2xl text-[#D9DEE7]">
                  Acompanhe vencimentos, parcelas e histórico financeiro da sua
                  jornada.
                </p>
              </div>

              {perfil?.codigo_inscricao && (
                <div className="rounded-[24px] bg-white/10 px-5 py-4 backdrop-blur-sm">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
                    Inscrição
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {perfil.codigo_inscricao}
                  </p>
                </div>
              )}
            </div>
          </section>

          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          <section className="mb-8 grid gap-5 xl:grid-cols-4">
            <KPI titulo="Pago" valor={formatarMoeda(resumo.totalPago)} destaque />
            <KPI titulo="Em aberto" valor={formatarMoeda(resumo.totalPendente)} />
            <KPI titulo="Pendentes" valor={resumo.pendentes} />
            <KPI titulo="Atrasadas" valor={resumo.atrasadas} alerta={resumo.atrasadas > 0} />
          </section>

          <section className="mb-6 flex flex-wrap gap-3">
            {["Todos", "Pendente", "Pago", "Atrasado", "Cancelado"].map(
              (item) => (
                <button
                  key={item}
                  onClick={() => setFiltro(item as "Todos" | StatusCobranca)}
                  className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                    filtro === item
                      ? "bg-[#08163F] text-white shadow-lg"
                      : "bg-white text-gray-500 hover:text-[#08163F] hover:shadow-md"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Card titulo="Histórico financeiro">
              {cobrancasFiltradas.length === 0 ? (
                <EmptyState
                  titulo="Nenhuma cobrança encontrada"
                  texto="Quando houver parcelas ou pagamentos cadastrados, eles aparecerão nesta área."
                />
              ) : (
                <div className="space-y-4">
                  {cobrancasFiltradas.map((cobranca) => (
                    <button
                      key={cobranca.id}
                      type="button"
                      onClick={() => setCobrancaSelecionada(cobranca)}
                      className="flex w-full flex-col gap-4 rounded-2xl bg-[#f9fafb] p-5 text-left transition hover:bg-white hover:shadow-md md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-black text-[#08163F]">
                          {cobranca.titulo}
                        </p>

                        <p className="mt-1 text-sm font-bold text-gray-500">
                          Vencimento: {formatarData(cobranca.data_vencimento)}
                        </p>

                        <p className="mt-1 text-xs font-bold text-gray-400">
                          Parcela {cobranca.parcela_atual}/
                          {cobranca.quantidade_parcelas}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="font-black text-[#08163F]">
                          {formatarMoeda(Number(cobranca.valor_parcela))}
                        </p>

                        <StatusBadge status={cobranca.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <aside className="space-y-6">
              <Card titulo="Próxima cobrança">
                {proximaCobranca ? (
                  <div className="rounded-[26px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-6 text-white">
                    <p className="text-sm font-bold text-[#C9CED6]">
                      {proximaCobranca.titulo}
                    </p>

                    <p className="mt-3 text-4xl font-black">
                      {formatarMoeda(Number(proximaCobranca.valor_parcela))}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#D9DEE7]">
                      Vencimento em{" "}
                      {formatarData(proximaCobranca.data_vencimento)}
                    </p>

                    <button
                      onClick={() => setCobrancaSelecionada(proximaCobranca)}
                      className="mt-6 rounded-2xl bg-white px-5 py-3 font-black text-[#08163F] transition hover:brightness-95"
                    >
                      Ver detalhes →
                    </button>
                  </div>
                ) : (
                  <EmptyState
                    titulo="Nenhuma cobrança em aberto"
                    texto="Você não possui cobranças pendentes no momento."
                  />
                )}
              </Card>

              <Card titulo="Orientações">
                <p className="text-sm font-semibold leading-relaxed text-gray-500">
                  Em caso de dúvidas sobre vencimentos ou formas de pagamento,
                  fale com o suporte da mentoria.
                </p>

                <button
                  onClick={() => router.push("/mentorado/suporte")}
                  className="mt-5 rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                >
                  Falar com suporte →
                </button>
              </Card>
            </aside>
          </section>
        </div>
      </section>

      {cobrancaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[34px] bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                    Detalhes financeiros
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    {cobrancaSelecionada.titulo}
                  </h2>
                </div>

                <button
                  onClick={() => setCobrancaSelecionada(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>

              <div className="mt-5">
                <StatusBadge status={cobrancaSelecionada.status} />
              </div>
            </div>

            <div className="grid gap-4 p-7 md:grid-cols-2">
              <InfoBox
                label="Valor da parcela"
                value={formatarMoeda(Number(cobrancaSelecionada.valor_parcela))}
              />

              <InfoBox
                label="Valor total"
                value={formatarMoeda(Number(cobrancaSelecionada.valor_total))}
              />

              <InfoBox
                label="Parcela"
                value={`${cobrancaSelecionada.parcela_atual}/${cobrancaSelecionada.quantidade_parcelas}`}
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

              <div className="rounded-2xl bg-[#f9fafb] p-5 md:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Observação
                </p>

                <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                  {cobrancaSelecionada.observacao ||
                    cobrancaSelecionada.descricao ||
                    "Nenhuma observação adicionada."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function LogoBox() {
  return (
    <div className="mb-8 flex items-center gap-3 rounded-[24px] bg-[#f8fafc] p-3">
      <div className="h-14 w-14 overflow-hidden rounded-2xl bg-[#08163F] p-1">
        <img
          src="/images/logo.jpeg"
          alt="CEO Club"
          className="h-full w-full rounded-xl object-cover"
        />
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">
          Curso
        </p>
        <h1 className="text-lg font-black text-[#08163F]">CEO Club</h1>
      </div>
    </div>
  );
}

function Header({
  titulo,
  subtitulo,
  onVoltar,
  onSuporte,
  onSair,
}: {
  titulo: string;
  subtitulo: string;
  onVoltar: () => void;
  onSuporte: () => void;
  onSair: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-6 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onVoltar}
          className="rounded-2xl bg-[#f3f5f8] px-4 py-3 text-sm font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
        >
          ← Voltar
        </button>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
            {subtitulo}
          </p>
          <h1 className="text-xl font-black">{titulo}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSuporte}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          Suporte
        </button>

        <button
          onClick={onSair}
          className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
        >
          Sair
        </button>
      </div>
    </header>
  );
}

function UserBox({ nome, onSair }: { nome: string; onSair: () => void }) {
  return (
    <div className="mt-auto rounded-[24px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9CED6]">
        Mentorado
      </p>

      <p className="mt-2 font-black">{nome}</p>

      <button
        onClick={onSair}
        className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#08163F] transition hover:brightness-95"
      >
        Sair
      </button>
    </div>
  );
}

function MenuItem({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
        ativo
          ? "bg-[#EEF2FF] text-[#08163F]"
          : "text-gray-500 hover:bg-[#f8fafc] hover:text-[#08163F]"
      }`}
    >
      <span>{label}</span>
      <span>→</span>
    </button>
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
          ? "bg-red-50 text-red-700"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          destaque ? "text-[#C9CED6]" : alerta ? "text-red-600" : "text-gray-500"
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

function EmptyState({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-[26px] bg-[#f9fafb] p-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-4xl shadow-sm">
        ✦
      </div>

      <h3 className="mt-5 text-xl font-black text-[#08163F]">{titulo}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-gray-500">
        {texto}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusCobranca }) {
  const classes: Record<StatusCobranca, string> = {
    Pago: "bg-green-100 text-green-700",
    Pendente: "bg-yellow-100 text-yellow-700",
    Atrasado: "bg-red-100 text-red-700",
    Cancelado: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}>
      {status}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-[#08163F]">{value}</p>
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
  return `${dia}/${mes}/${ano}`;
}