"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useLocalStorage } from "../../utils/useLocalStorage";
import {
  getUsuarioLogado,
  usuarioTemPermissao,
  User,
} from "../../utils/auth";

type Lancamento = {
  id: number;
  mentorado: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
  formaPagamento: string;
};

const STORAGE_KEY_FINANCEIRO = "ceoclub_lancamentos_financeiro";

const lancamentosIniciais: Lancamento[] = [
  {
    id: 1,
    mentorado: "Dra. Ana Paula",
    descricao: "Mentoria mensal - março",
    valor: 1200,
    vencimento: "2026-03-25",
    status: "Pago",
    formaPagamento: "Cartão",
  },
  {
    id: 2,
    mentorado: "Dr. João Ricardo",
    descricao: "Módulo de vendas - parcela 1",
    valor: 850,
    vencimento: "2026-03-29",
    status: "Pendente",
    formaPagamento: "Pix",
  },
  {
    id: 3,
    mentorado: "Dra. Fernanda Costa",
    descricao: "Reunião estratégica",
    valor: 600,
    vencimento: "2026-03-30",
    status: "Pago",
    formaPagamento: "Dinheiro",
  },
  {
    id: 4,
    mentorado: "Dra. Julia Martins",
    descricao: "Trilha de marketing",
    valor: 300,
    vencimento: "2026-04-02",
    status: "Atrasado",
    formaPagamento: "Boleto",
  },
];

const lancamentoInicial: Lancamento = {
  id: 0,
  mentorado: "",
  descricao: "",
  valor: 0,
  vencimento: "",
  status: "Pendente",
  formaPagamento: "Pix",
};

export default function FinanceiroPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busca, setBusca] = useState("");
  const [erroFormulario, setErroFormulario] = useState("");

  const [novoLancamento, setNovoLancamento] = useState<Lancamento>({
    ...lancamentoInicial,
    id: Date.now(),
  });

  const [lancamentos, setLancamentos, carregouLancamentos] =
    useLocalStorage<Lancamento[]>(
      STORAGE_KEY_FINANCEIRO,
      lancamentosIniciais
    );

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

   if (!usuarioTemPermissao(usuarioLogado, ["mentor", "financeiro"])) {
  router.push("/dashboard");
  return;
}

    setUsuario(usuarioLogado);
  }, [router]);

  function adicionarLancamento(e: React.FormEvent) {
    e.preventDefault();
    setErroFormulario("");

    if (
      !novoLancamento.mentorado ||
      !novoLancamento.descricao ||
      !novoLancamento.vencimento ||
      novoLancamento.valor <= 0
    ) {
      setErroFormulario("Preencha todos os campos corretamente.");
      return;
    }

    setLancamentos((estadoAtual: Lancamento[]) => [
      { ...novoLancamento, id: Date.now() },
      ...estadoAtual,
    ]);

    setNovoLancamento({
      ...lancamentoInicial,
      id: Date.now(),
    });

    setMostrarFormulario(false);
  }

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((item: Lancamento) =>
      item.mentorado.toLowerCase().includes(busca.toLowerCase())
    );
  }, [lancamentos, busca]);

  const totalReceber = lancamentos.reduce(
    (acc: number, item: Lancamento) => acc + item.valor,
    0
  );

  const totalPago = lancamentos
    .filter((item: Lancamento) => item.status === "Pago")
    .reduce((acc: number, item: Lancamento) => acc + item.valor, 0);

  const totalPendente = lancamentos
    .filter(
      (item: Lancamento) =>
        item.status === "Pendente" || item.status === "Atrasado"
    )
    .reduce((acc: number, item: Lancamento) => acc + item.valor, 0);

  const quantidadePago = lancamentos.filter(
    (item: Lancamento) => item.status === "Pago"
  ).length;

  const quantidadePendente = lancamentos.filter(
    (item: Lancamento) => item.status === "Pendente"
  ).length;

  const quantidadeAtrasado = lancamentos.filter(
    (item: Lancamento) => item.status === "Atrasado"
  ).length;

  const dadosGrafico = [
    {
      label: "Pagos",
      valor: totalPago,
      classe: "from-[#5B7FFF] to-[#12317C]",
    },
    {
      label: "Pendentes",
      valor: lancamentos
        .filter((item: Lancamento) => item.status === "Pendente")
        .reduce((acc: number, item: Lancamento) => acc + item.valor, 0),
      classe: "from-[#DDE1E7] to-[#9CA3AF]",
    },
    {
      label: "Atrasados",
      valor: lancamentos
        .filter((item: Lancamento) => item.status === "Atrasado")
        .reduce((acc: number, item: Lancamento) => acc + item.valor, 0),
      classe: "from-[#EF4444] to-[#B91C1C]",
    },
  ];

  const maiorValorGrafico = Math.max(
    ...dadosGrafico.map((item) => item.valor),
    1
  );

  if (!usuario || !carregouLancamentos) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f3f5f8] text-[#0B1D59]">
        Carregando...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#0B1D59]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative flex-1 overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(191,195,201,0.18),transparent)]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(18,49,124,0.08),transparent)]" />

        <div className="relative z-10">
          <div className="mb-8 rounded-[28px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white shadow-[0_24px_60px_rgba(8,22,63,0.18)]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-[#C9CED6]">
                  Financeiro CEO Club
                </p>
                <h1 className="text-3xl font-bold">Gestão financeira da mentoria</h1>
                <p className="mt-2 text-[#D9DEE7]">
                  Acompanhe pagamentos, vencimentos e lançamentos dos mentorados.
                </p>
              </div>

              <button
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
                className="rounded-2xl px-5 py-3 font-bold text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105"
                style={{
                  background:
                    "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
                }}
              >
                {mostrarFormulario ? "Fechar formulário" : "Novo lançamento"}
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <ResumoCard
              titulo="Total a receber"
              valor={formatarMoeda(totalReceber)}
            />
            <ResumoCard titulo="Total pago" valor={formatarMoeda(totalPago)} />
            <ResumoCard
              titulo="Total pendente"
              valor={formatarMoeda(totalPendente)}
            />
          </div>

          <div className="mb-6 rounded-[28px] border border-white/50 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#08163F]">
                Dashboard financeiro
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Panorama de recebimentos, pendências e atrasos.
              </p>
            </div>

            <div className="grid items-end gap-6 md:grid-cols-[1.4fr_1fr]">
              <div className="h-64 flex items-end gap-4">
                {dadosGrafico.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-1 flex-col items-center gap-3"
                  >
                    <div className="text-sm font-semibold text-[#08163F]">
                      {formatarMoeda(item.valor)}
                    </div>

                    <div className="flex h-44 w-full items-end rounded-[20px] bg-[#F3F5F8] p-2">
                      <div
                        className={`w-full rounded-[14px] bg-gradient-to-t ${item.classe} transition-all duration-300`}
                        style={{
                          height: `${(item.valor / maiorValorGrafico) * 100}%`,
                          minHeight: item.valor > 0 ? "24px" : "0px",
                        }}
                      />
                    </div>

                    <span className="text-center text-xs font-medium text-slate-500">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-[#F7F9FC] p-5">
                <h3 className="mb-4 font-semibold text-[#08163F]">
                  Resumo geral
                </h3>

                <div className="space-y-3 text-sm">
                  <LinhaResumo label="Lançamentos pagos" valor={quantidadePago} />
                  <LinhaResumo
                    label="Lançamentos pendentes"
                    valor={quantidadePendente}
                  />
                  <LinhaResumo
                    label="Lançamentos atrasados"
                    valor={quantidadeAtrasado}
                  />
                  <LinhaResumo
                    label="Total em aberto"
                    valorTexto={formatarMoeda(totalPendente)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-[24px] border border-white/50 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <input
              type="text"
              placeholder="Buscar por nome do mentorado"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59] placeholder:text-slate-400 outline-none focus:border-[#12317C]"
            />
          </div>

          {mostrarFormulario && (
            <form
              onSubmit={adicionarLancamento}
              className="mb-6 rounded-[28px] border border-white/50 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm"
            >
              <h2 className="mb-4 text-xl font-semibold text-[#08163F]">
                Cadastrar lançamento
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Mentorado"
                  value={novoLancamento.mentorado}
                  onChange={(e) =>
                    setNovoLancamento({
                      ...novoLancamento,
                      mentorado: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59]"
                />

                <input
                  type="text"
                  placeholder="Descrição"
                  value={novoLancamento.descricao}
                  onChange={(e) =>
                    setNovoLancamento({
                      ...novoLancamento,
                      descricao: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59]"
                />

                <input
                  type="number"
                  placeholder="Valor"
                  value={novoLancamento.valor || ""}
                  onChange={(e) =>
                    setNovoLancamento({
                      ...novoLancamento,
                      valor: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59]"
                />

                <input
                  type="date"
                  value={novoLancamento.vencimento}
                  onChange={(e) =>
                    setNovoLancamento({
                      ...novoLancamento,
                      vencimento: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59]"
                />

                <select
                  value={novoLancamento.status}
                  onChange={(e) =>
                    setNovoLancamento({
                      ...novoLancamento,
                      status: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59]"
                >
                  <option>Pendente</option>
                  <option>Pago</option>
                  <option>Atrasado</option>
                </select>

                <select
                  value={novoLancamento.formaPagamento}
                  onChange={(e) =>
                    setNovoLancamento({
                      ...novoLancamento,
                      formaPagamento: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1D59]"
                >
                  <option>Pix</option>
                  <option>Cartão</option>
                  <option>Boleto</option>
                  <option>Dinheiro</option>
                </select>
              </div>

              {erroFormulario && (
                <p className="mt-4 text-sm font-medium text-red-600">
                  {erroFormulario}
                </p>
              )}

              <button
                type="submit"
                className="mt-4 rounded-2xl bg-[#08163F] px-5 py-3 font-bold text-white transition hover:brightness-110"
              >
                Salvar lançamento
              </button>
            </form>
          )}

          <div className="overflow-hidden rounded-[28px] border border-white/50 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="grid grid-cols-6 bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 font-semibold text-white">
              <span>Mentorado</span>
              <span>Descrição</span>
              <span>Valor</span>
              <span>Vencimento</span>
              <span>Status</span>
              <span>Pagamento</span>
            </div>

            {lancamentosFiltrados.length > 0 ? (
              lancamentosFiltrados.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-6 items-center border-t border-slate-200 p-4 text-sm"
                >
                  <span>{item.mentorado}</span>
                  <span>{item.descricao}</span>
                  <span>{formatarMoeda(item.valor)}</span>
                  <span>{formatarData(item.vencimento)}</span>
                  <span>
                    <StatusBadge status={item.status} />
                  </span>
                  <span>{item.formaPagamento}</span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                Nenhum lançamento encontrado.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

type ResumoCardProps = {
  titulo: string;
  valor: string;
};

function ResumoCard({ titulo, valor }: ResumoCardProps) {
  return (
    <div className="rounded-[24px] border border-white/50 bg-white/85 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-[#08163F]">{titulo}</h2>
      <p className="mt-3 text-2xl font-bold text-[#12317C]">{valor}</p>
    </div>
  );
}

function LinhaResumo({
  label,
  valor,
  valorTexto,
}: {
  label: string;
  valor?: number;
  valorTexto?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-[#08163F]">
        {valorTexto ?? valor ?? 0}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    Pago: "bg-emerald-100 text-emerald-700",
    Pendente: "bg-yellow-100 text-yellow-700",
    Atrasado: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
        estilos[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function formatarData(data: string) {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}