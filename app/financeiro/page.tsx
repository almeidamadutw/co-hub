"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useLocalStorage } from "../../utils/useLocalStorage";
import { getUsuarioLogado, usuarioTemPermissao, User } from "../../utils/auth";

type Lancamento = {
  id: number;
  paciente: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
  formaPagamento: string;
};

const STORAGE_KEY_FINANCEIRO = "cohub_lancamentos_financeiro";

const lancamentosIniciais: Lancamento[] = [
  {
    id: 1,
    paciente: "Mariana Costa",
    descricao: "Implante - entrada",
    valor: 1200,
    vencimento: "2026-03-25",
    status: "Pago",
    formaPagamento: "Cartão",
  },
  {
    id: 2,
    paciente: "Carlos Henrique",
    descricao: "Lente dental - parcela 1",
    valor: 850,
    vencimento: "2026-03-29",
    status: "Pendente",
    formaPagamento: "Pix",
  },
  {
    id: 3,
    paciente: "Fernanda Alves",
    descricao: "Clareamento",
    valor: 600,
    vencimento: "2026-03-30",
    status: "Pago",
    formaPagamento: "Dinheiro",
  },
  {
    id: 4,
    paciente: "Rafaela Souza",
    descricao: "Limpeza + retorno",
    valor: 300,
    vencimento: "2026-04-02",
    status: "Atrasado",
    formaPagamento: "Boleto",
  },
];

const lancamentoInicial: Lancamento = {
  id: 0,
  paciente: "",
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

    if (!usuarioTemPermissao(usuarioLogado, ["admin", "financeiro", "crc"])) {
      router.push("/dashboard");
      return;
    }

    setUsuario(usuarioLogado);
  }, [router]);

  function adicionarLancamento(e: React.FormEvent) {
    e.preventDefault();
    setErroFormulario("");

    if (
      !novoLancamento.paciente ||
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
      item.paciente.toLowerCase().includes(busca.toLowerCase())
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
      classe: "bg-green-500",
    },
    {
      label: "Pendentes",
      valor: lancamentos
        .filter((item: Lancamento) => item.status === "Pendente")
        .reduce((acc: number, item: Lancamento) => acc + item.valor, 0),
      classe: "bg-yellow-400",
    },
    {
      label: "Atrasados",
      valor: lancamentos
        .filter((item: Lancamento) => item.status === "Atrasado")
        .reduce((acc: number, item: Lancamento) => acc + item.valor, 0),
      classe: "bg-red-500",
    },
  ];

  const maiorValorGrafico = Math.max(
    ...dadosGrafico.map((item) => item.valor),
    1
  );

  if (!usuario || !carregouLancamentos) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 text-[#1A1F4D]">
        Carregando...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-gray-100 text-[#1A1F4D]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 p-8">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Financeiro</h1>
            <p className="text-gray-600 mt-2">
              Gerencie pagamentos, vencimentos e lançamentos da clínica.
            </p>
          </div>

          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
          >
            {mostrarFormulario ? "Fechar formulário" : "Novo Lançamento"}
          </button>
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
            <div>
              <h2 className="text-xl font-semibold">Dashboard financeiro</h2>
              <p className="text-sm text-gray-500 mt-1">
                Panorama de recebimentos, pendências e atrasos.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-[1.4fr_1fr] gap-6 items-end">
            <div className="h-64 flex items-end gap-4">
              {dadosGrafico.map((item) => (
                <div
                  key={item.label}
                  className="flex-1 flex flex-col items-center gap-3"
                >
                  <div className="text-sm font-semibold">
                    {formatarMoeda(item.valor)}
                  </div>

                  <div className="w-full h-44 bg-gray-100 rounded-2xl flex items-end p-2">
                    <div
                      className={`w-full rounded-xl transition-all duration-300 ${item.classe}`}
                      style={{
                        height: `${(item.valor / maiorValorGrafico) * 100}%`,
                        minHeight: item.valor > 0 ? "24px" : "0px",
                      }}
                    />
                  </div>

                  <span className="text-xs text-center text-gray-600 font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold mb-4">Resumo geral</h3>

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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
          <input
            type="text"
            placeholder="Buscar por nome do paciente"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white placeholder:text-gray-400"
          />
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={adicionarLancamento}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Cadastrar lançamento</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Paciente"
                value={novoLancamento.paciente}
                onChange={(e) =>
                  setNovoLancamento({
                    ...novoLancamento,
                    paciente: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              />

              <select
                value={novoLancamento.status}
                onChange={(e) =>
                  setNovoLancamento({
                    ...novoLancamento,
                    status: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
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
              className="mt-4 bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
            >
              Salvar lançamento
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-6 bg-[#1A1F4D] text-white font-semibold p-4">
            <span>Paciente</span>
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
                className="grid grid-cols-6 p-4 border-t border-gray-200 text-sm items-center"
              >
                <span>{item.paciente}</span>
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
            <div className="p-8 text-center text-gray-500">
              Nenhum lançamento encontrado.
            </div>
          )}
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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="text-2xl font-bold text-[#D4AF37] mt-3">{valor}</p>
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
    <div className="flex items-center justify-between border-b border-gray-200 pb-2 last:border-b-0 last:pb-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-bold">{valorTexto ?? valor ?? 0}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    Pago: "bg-green-100 text-green-700",
    Pendente: "bg-yellow-100 text-yellow-700",
    Atrasado: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
        estilos[status] || "bg-gray-100 text-gray-700"
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