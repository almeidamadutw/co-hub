"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, User, UserRole } from "../../utils/auth";

type CardProps = {
  titulo: string;
  texto: string;
  href?: string;
  onClick?: () => void;
};

type Paciente = {
  foto?: string;
  nome: string;
  telefone: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  procedimento: string;
  status: string;
  observacoes: string;
};

type Lancamento = {
  id: number;
  paciente: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
  formaPagamento: string;
};

type Lead = {
  nome: string;
  interesse: string;
  status: string;
  origem: string;
};

type Consulta = {
  id: number;
  paciente: string;
  profissional: string;
  data: string;
  horario: string;
  procedimento: string;
  status: string;
};

const STORAGE_KEY_PACIENTES = "cohub_pacientes";
const STORAGE_KEY_FINANCEIRO = "cohub_lancamentos_financeiro";
const STORAGE_KEY_LEADS = "cohub_leads";
const STORAGE_KEY_AGENDA = "cohub_agenda";

function Card({ titulo, texto, href, onClick }: CardProps) {
  const isClickavel = Boolean(href || onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-200 text-left transition ${
        isClickavel ? "hover:-translate-y-1 hover:shadow-md cursor-pointer" : "cursor-default"
      }`}
    >
      <h2 className="text-lg font-semibold text-[#1A1F4D]">{titulo}</h2>
      <p className="text-gray-500 mt-2">{texto}</p>
      {href && (
        <p className="text-sm font-semibold text-[#D4AF37] mt-4">
          Abrir módulo →
        </p>
      )}
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregouDados, setCarregouDados] = useState(false);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

    setUsuario(usuarioLogado);
  }, [router]);

  function carregarDados() {
    try {
      const pacientesSalvos = localStorage.getItem(STORAGE_KEY_PACIENTES);
      const financeiroSalvo = localStorage.getItem(STORAGE_KEY_FINANCEIRO);
      const leadsSalvos = localStorage.getItem(STORAGE_KEY_LEADS);
      const agendaSalva = localStorage.getItem(STORAGE_KEY_AGENDA);

      setPacientes(pacientesSalvos ? JSON.parse(pacientesSalvos) : []);
      setLancamentos(financeiroSalvo ? JSON.parse(financeiroSalvo) : []);
      setLeads(leadsSalvos ? JSON.parse(leadsSalvos) : []);
      setConsultas(agendaSalva ? JSON.parse(agendaSalva) : []);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      setPacientes([]);
      setLancamentos([]);
      setLeads([]);
      setConsultas([]);
    } finally {
      setCarregouDados(true);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function sair() {
    localStorage.removeItem("cohub_user");
    router.push("/login");
  }

  function resetarDadosSistema() {
    const confirmar = window.confirm(
      "Tem certeza que deseja resetar os dados salvos do sistema? Essa ação vai limpar pacientes, agenda, leads e financeiro."
    );

    if (!confirmar) return;

    localStorage.removeItem(STORAGE_KEY_PACIENTES);
    localStorage.removeItem(STORAGE_KEY_FINANCEIRO);
    localStorage.removeItem(STORAGE_KEY_LEADS);
    localStorage.removeItem(STORAGE_KEY_AGENDA);

    carregarDados();
    alert("Dados resetados com sucesso.");
  }

  const hoje = useMemo(() => new Date(), []);
  const hojeIso = useMemo(() => hoje.toISOString().split("T")[0], [hoje]);

  const saudacao = useMemo(() => {
    const hora = hoje.getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  }, [hoje]);

  const dataFormatada = useMemo(() => {
    return hoje.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [hoje]);

  const totalPacientes = pacientes.length;
  const pacientesEmTratamento = pacientes.filter(
    (paciente: Paciente) => paciente.status === "Em tratamento"
  ).length;
  const retornosPendentes = pacientes.filter(
    (paciente: Paciente) => paciente.status === "Retorno pendente"
  ).length;
  const pacientesFinalizados = pacientes.filter(
    (paciente: Paciente) => paciente.status === "Finalizado"
  ).length;

  const faturamentoRecebido = lancamentos
    .filter((item: Lancamento) => item.status === "Pago")
    .reduce((acc: number, item: Lancamento) => acc + item.valor, 0);

  const totalEmAberto = lancamentos
    .filter(
      (item: Lancamento) =>
        item.status === "Pendente" || item.status === "Atrasado"
    )
    .reduce((acc: number, item: Lancamento) => acc + item.valor, 0);

  const pagamentosPendentes = lancamentos.filter(
    (item: Lancamento) => item.status === "Pendente" || item.status === "Atrasado"
  ).length;

  const totalLeads = leads.length;
  const leadsConvertidos = leads.filter(
    (lead: Lead) => lead.status === "Agendamento realizado"
  ).length;
  const taxaConversao =
    totalLeads > 0 ? Math.round((leadsConvertidos / totalLeads) * 100) : 0;

  const consultasHoje = consultas.filter(
    (consulta: Consulta) => consulta.data === hojeIso
  ).length;

  const consultasConfirmadas = consultas.filter(
    (consulta: Consulta) => consulta.status === "Confirmada"
  ).length;

  const consultasAguardando = consultas.filter(
    (consulta: Consulta) => consulta.status === "Aguardando"
  ).length;

  const graficoGeral = [
    {
      label: "Pacientes",
      valor: totalPacientes,
      classe: "bg-blue-500",
      valorFormatado: String(totalPacientes),
    },
    {
      label: "Consultas hoje",
      valor: consultasHoje,
      classe: "bg-[#1A1F4D]",
      valorFormatado: String(consultasHoje),
    },
    {
      label: "Leads",
      valor: totalLeads,
      classe: "bg-[#D4AF37]",
      valorFormatado: String(totalLeads),
    },
    {
      label: "Pendências",
      valor: pagamentosPendentes,
      classe: "bg-red-500",
      valorFormatado: String(pagamentosPendentes),
    },
  ];

  const maiorValorGraficoGeral = Math.max(
    ...graficoGeral.map((item) => item.valor),
    1
  );

  const graficoFinanceiro = [
    {
      label: "Recebido",
      valor: faturamentoRecebido,
      classe: "bg-green-500",
    },
    {
      label: "Em aberto",
      valor: totalEmAberto,
      classe: "bg-red-500",
    },
  ];

  const totalFinanceiroGrafico = Math.max(
    graficoFinanceiro.reduce((acc, item) => acc + item.valor, 0),
    1
  );

  function navegarPara(href: string) {
    router.push(href);
  }

  function renderCardsPorPerfil(role: UserRole) {
    switch (role) {
      case "admin":
        return (
          <>
            <Card
              titulo="Agenda do dia"
              texto={`${consultasHoje} consultas agendadas hoje`}
              href="/agenda"
              onClick={() => navegarPara("/agenda")}
            />
            <Card
              titulo="Pacientes"
              texto={`${totalPacientes} cadastrados no sistema`}
              href="/pacientes"
              onClick={() => navegarPara("/pacientes")}
            />
            <Card
              titulo="Financeiro"
              texto={`${formatarMoeda(faturamentoRecebido)} recebidos`}
              href="/financeiro"
              onClick={() => navegarPara("/financeiro")}
            />
            <Card
              titulo="Leads"
              texto={`${totalLeads} leads em acompanhamento`}
              href="/leads"
              onClick={() => navegarPara("/leads")}
            />
          </>
        );

      case "recepcao":
        return (
          <>
            <Card
              titulo="Agenda do dia"
              texto={`${consultasHoje} consultas para hoje`}
              href="/agenda"
              onClick={() => navegarPara("/agenda")}
            />
            <Card
              titulo="Pacientes"
              texto={`${totalPacientes} pacientes cadastrados`}
              href="/pacientes"
              onClick={() => navegarPara("/pacientes")}
            />
            <Card
              titulo="Retornos"
              texto={`${retornosPendentes} pacientes aguardando retorno`}
              href="/pacientes"
              onClick={() => navegarPara("/pacientes")}
            />
            <Card
              titulo="Aguardando"
              texto={`${consultasAguardando} consultas aguardando confirmação`}
              href="/agenda"
              onClick={() => navegarPara("/agenda")}
            />
          </>
        );

      case "dentista":
        return (
          <>
            <Card
              titulo="Agenda clínica"
              texto={`${consultasHoje} atendimentos previstos hoje`}
              href="/agenda"
              onClick={() => navegarPara("/agenda")}
            />
            <Card
              titulo="Pacientes em tratamento"
              texto={`${pacientesEmTratamento} pacientes em andamento`}
              href="/pacientes"
              onClick={() => navegarPara("/pacientes")}
            />
            <Card
              titulo="Consultas confirmadas"
              texto={`${consultasConfirmadas} confirmadas`}
              href="/agenda"
              onClick={() => navegarPara("/agenda")}
            />
            <Card
              titulo="Finalizados"
              texto={`${pacientesFinalizados} tratamentos concluídos`}
              href="/pacientes"
              onClick={() => navegarPara("/pacientes")}
            />
          </>
        );

      case "financeiro":
        return (
          <>
            <Card
              titulo="Faturamento"
              texto={`${formatarMoeda(faturamentoRecebido)} recebidos`}
              href="/financeiro"
              onClick={() => navegarPara("/financeiro")}
            />
            <Card
              titulo="Pagamentos pendentes"
              texto={`${pagamentosPendentes} lançamentos pendentes/atrasados`}
              href="/financeiro"
              onClick={() => navegarPara("/financeiro")}
            />
            <Card
              titulo="Em aberto"
              texto={formatarMoeda(totalEmAberto)}
              href="/financeiro"
              onClick={() => navegarPara("/financeiro")}
            />
            <Card
              titulo="Total de lançamentos"
              texto={`${lancamentos.length} lançamentos cadastrados`}
              href="/financeiro"
              onClick={() => navegarPara("/financeiro")}
            />
          </>
        );

      case "crc":
        return (
          <>
            <Card
              titulo="Agenda do dia"
              texto={`${consultasHoje} agendamentos para hoje`}
              href="/agenda"
              onClick={() => navegarPara("/agenda")}
            />
            <Card
              titulo="Leads"
              texto={`${totalLeads} leads em acompanhamento`}
              href="/leads"
              onClick={() => navegarPara("/leads")}
            />
            <Card
              titulo="Financeiro"
              texto={`${pagamentosPendentes} pacientes com pendência`}
              href="/financeiro"
              onClick={() => navegarPara("/financeiro")}
            />
            <Card
              titulo="Conversão"
              texto={`${taxaConversao}% de leads convertidos`}
              href="/leads"
              onClick={() => navegarPara("/leads")}
            />
          </>
        );

      default:
        return null;
    }
  }

  if (!usuario || !carregouDados) {
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
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">
              {saudacao}, {usuario.nome}
            </h1>
            <p className="mt-2 text-gray-600 capitalize">{dataFormatada}</p>
            <p className="mt-1 text-gray-600">
              Você entrou como{" "}
              <span className="font-semibold capitalize">{usuario.role}</span>
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={resetarDadosSistema}
              className="bg-white border border-red-300 text-red-600 px-5 py-3 rounded-xl font-bold hover:bg-red-50"
            >
              Resetar dados
            </button>

            <button
              onClick={sair}
              className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="grid xl:grid-cols-[1.45fr_1fr] gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Visão geral do sistema</h2>
              <p className="text-sm text-gray-500 mt-1">
                Resumo visual dos principais números do CO Hub.
              </p>
            </div>

            <div className="h-64 flex items-end gap-4">
              {graficoGeral.map((item) => (
                <div
                  key={item.label}
                  className="flex-1 flex flex-col items-center gap-3"
                >
                  <div className="text-sm font-semibold">
                    {item.valorFormatado}
                  </div>

                  <div className="w-full h-44 bg-gray-100 rounded-2xl flex items-end p-2">
                    <div
                      className={`w-full rounded-xl transition-all duration-300 ${item.classe}`}
                      style={{
                        height: `${(item.valor / maiorValorGraficoGeral) * 100}%`,
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
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Financeiro rápido</h2>
              <p className="text-sm text-gray-500 mt-1">
                Comparativo entre recebido e em aberto.
              </p>
            </div>

            <div className="space-y-4">
              {graficoFinanceiro.map((item) => {
                const largura = (item.valor / totalFinanceiroGrafico) * 100;

                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        {item.label}
                      </span>
                      <span className="text-sm font-bold">
                        {formatarMoeda(item.valor)}
                      </span>
                    </div>

                    <div className="w-full h-4 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.classe}`}
                        style={{ width: `${largura}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 mt-6">
                <LinhaResumo label="Pacientes cadastrados" valor={totalPacientes} />
                <LinhaResumo label="Consultas hoje" valor={consultasHoje} />
                <LinhaResumo label="Leads ativos" valor={totalLeads} />
                <LinhaResumo
                  label="Recebido"
                  valorTexto={formatarMoeda(faturamentoRecebido)}
                />
                <LinhaResumo
                  label="Em aberto"
                  valorTexto={formatarMoeda(totalEmAberto)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {renderCardsPorPerfil(usuario.role)}
        </div>
      </section>
    </main>
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
    <div className="flex items-center justify-between border-b border-gray-200 py-2 last:border-b-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-bold">{valorTexto ?? valor ?? 0}</span>
    </div>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}