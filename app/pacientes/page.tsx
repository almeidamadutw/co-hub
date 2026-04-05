"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import FichaOverlay from "@/components/FichaOverlay";
import AbasFicha from "@/components/AbasFicha";
import HistoricoPaciente from "@/components/HistoricoPaciente";
import { useLocalStorage } from "../../utils/useLocalStorage";
import { getUsuarioLogado, usuarioTemPermissao, User } from "../../utils/auth";
import { ConsultaHistorico } from "@/utils/pacienteScore";

type EtapaTratamento = {
  id: number;
  nome: string;
  concluido: boolean;
};

type ItemOrcamento = {
  id: number;
  nome: string;
  tipo: "Pacote" | "Tratamento avulso";
  valor: number;
};

type Orcamento = {
  id: number;
  titulo: string;
  itens: ItemOrcamento[];
  desconto: number;
  status: "Aberto" | "Aprovado" | "Fechado" | "Recusado";
  observacoes: string;
  criadoEm: string;
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
  historicoConsultas?: ConsultaHistorico[];
  cronogramaTratamento: EtapaTratamento[];
  orcamentos: Orcamento[];
};

type ConsultaAgenda = {
  id: number;
  paciente: string;
  profissional: string;
  data: string;
  horario: string;
  procedimento: string;
  status: string;
};

const STORAGE_KEY_PACIENTES = "cohub_pacientes";
const STORAGE_KEY_AGENDA = "cohub_agenda";

const etapasPadraoTratamento = (): EtapaTratamento[] => [
  { id: 1, nome: "Avaliação inicial", concluido: true },
  { id: 2, nome: "Exames e documentação", concluido: false },
  { id: 3, nome: "Planejamento", concluido: false },
  { id: 4, nome: "Procedimento principal", concluido: false },
  { id: 5, nome: "Retorno", concluido: false },
  { id: 6, nome: "Finalização", concluido: false },
];

const pacientesIniciais: Paciente[] = [
  {
    foto: "",
    nome: "Carlos Henrique",
    telefone: "(15) 98888-2222",
    cpf: "987.654.321-00",
    rg: "98.765.432-1",
    dataNascimento: "1988-11-22",
    cep: "18010-000",
    rua: "Av. Brasil",
    numero: "455",
    bairro: "Campolim",
    cidade: "Sorocaba",
    estado: "SP",
    procedimento: "Lente dental",
    status: "Avaliação agendada",
    observacoes: "Veio por indicação de paciente antigo.",
    historicoConsultas: [
      {
        data: "2026-03-12",
        status: "compareceu",
        observacao: "Primeira consulta.",
      },
      {
        data: "2026-03-19",
        status: "faltou",
        observacao: "Não compareceu e não avisou.",
      },
    ],
    cronogramaTratamento: [
      { id: 1, nome: "Avaliação inicial", concluido: true },
      { id: 2, nome: "Planejamento estético", concluido: true },
      { id: 3, nome: "Mockup", concluido: false },
      { id: 4, nome: "Instalação", concluido: false },
      { id: 5, nome: "Retorno", concluido: false },
    ],
    orcamentos: [
      {
        id: 1,
        titulo: "Lentes dentais superiores",
        desconto: 300,
        status: "Aberto",
        observacoes: "Condição válida por 7 dias.",
        criadoEm: "2026-04-01",
        itens: [
          { id: 1, nome: "Pacote de lentes", tipo: "Pacote", valor: 5200 },
          {
            id: 2,
            nome: "Planejamento digital",
            tipo: "Tratamento avulso",
            valor: 600,
          },
        ],
      },
    ],
  },
  {
    foto: "",
    nome: "Fernanda Alves",
    telefone: "(15) 97777-3333",
    cpf: "111.222.333-44",
    rg: "11.222.333-4",
    dataNascimento: "1992-02-14",
    cep: "18020-000",
    rua: "Rua Afonso",
    numero: "77",
    bairro: "Jardim Europa",
    cidade: "Sorocaba",
    estado: "SP",
    procedimento: "Clareamento",
    status: "Finalizado",
    observacoes: "Paciente satisfeita com resultado final.",
    historicoConsultas: [
      {
        data: "2026-03-02",
        status: "compareceu",
        observacao: "Consulta de planejamento.",
      },
      {
        data: "2026-03-09",
        status: "compareceu",
        observacao: "Procedimento realizado.",
      },
      {
        data: "2026-03-16",
        status: "compareceu",
        observacao: "Retorno final.",
      },
    ],
    cronogramaTratamento: [
      { id: 1, nome: "Avaliação", concluido: true },
      { id: 2, nome: "Clareamento", concluido: true },
      { id: 3, nome: "Retorno", concluido: true },
    ],
    orcamentos: [
      {
        id: 1,
        titulo: "Clareamento consultório",
        desconto: 0,
        status: "Fechado",
        observacoes: "Paciente aprovou e pagou na hora.",
        criadoEm: "2026-03-01",
        itens: [
          {
            id: 1,
            nome: "Clareamento",
            tipo: "Tratamento avulso",
            valor: 900,
          },
        ],
      },
    ],
  },
  {
    foto: "",
    nome: "Mariana Costa",
    telefone: "(15) 99999-1111",
    cpf: "123.456.789-00",
    rg: "12.345.678-9",
    dataNascimento: "1996-05-10",
    cep: "18000-000",
    rua: "Rua das Flores",
    numero: "120",
    bairro: "Centro",
    cidade: "Sorocaba",
    estado: "SP",
    procedimento: "Implante",
    status: "Em tratamento",
    observacoes: "Paciente com retorno agendado para próxima semana.",
    historicoConsultas: [
      {
        data: "2026-03-10",
        status: "compareceu",
        observacao: "Consulta de avaliação inicial.",
      },
      {
        data: "2026-03-17",
        status: "compareceu",
        observacao: "Retorno pós-procedimento.",
      },
      {
        data: "2026-03-24",
        status: "cancelou",
        observacao: "Precisou remarcar.",
      },
    ],
    cronogramaTratamento: [
      { id: 1, nome: "Avaliação inicial", concluido: true },
      { id: 2, nome: "Exames", concluido: true },
      { id: 3, nome: "Cirurgia", concluido: false },
      { id: 4, nome: "Pós-operatório", concluido: false },
      { id: 5, nome: "Prótese", concluido: false },
    ],
    orcamentos: [
      {
        id: 1,
        titulo: "Implante + coroa",
        desconto: 500,
        status: "Aprovado",
        observacoes: "Paciente aprovou parcelamento.",
        criadoEm: "2026-03-08",
        itens: [
          { id: 1, nome: "Pacote implante", tipo: "Pacote", valor: 7800 },
          {
            id: 2,
            nome: "Exames de imagem",
            tipo: "Tratamento avulso",
            valor: 450,
          },
        ],
      },
    ],
  },
  {
    foto: "",
    nome: "Rafaela Souza",
    telefone: "(15) 96666-4444",
    cpf: "555.666.777-88",
    rg: "55.666.777-8",
    dataNascimento: "2000-08-03",
    cep: "18030-000",
    rua: "Rua Esperança",
    numero: "210",
    bairro: "Éden",
    cidade: "Sorocaba",
    estado: "SP",
    procedimento: "Limpeza",
    status: "Retorno pendente",
    observacoes: "Entrar em contato para confirmar retorno.",
    historicoConsultas: [
      {
        data: "2026-03-14",
        status: "compareceu",
        observacao: "Limpeza realizada.",
      },
      {
        data: "2026-03-21",
        status: "faltou",
        observacao: "Não compareceu ao retorno.",
      },
    ],
    cronogramaTratamento: [
      { id: 1, nome: "Avaliação", concluido: true },
      { id: 2, nome: "Limpeza", concluido: true },
      { id: 3, nome: "Retorno", concluido: false },
    ],
    orcamentos: [],
  },
];

const pacienteInicial: Paciente = {
  foto: "",
  nome: "",
  telefone: "",
  cpf: "",
  rg: "",
  dataNascimento: "",
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  procedimento: "",
  status: "Avaliação agendada",
  observacoes: "",
  historicoConsultas: [],
  cronogramaTratamento: etapasPadraoTratamento(),
  orcamentos: [],
};

const orcamentoInicial: Orcamento = {
  id: 0,
  titulo: "",
  itens: [],
  desconto: 0,
  status: "Aberto",
  observacoes: "",
  criadoEm: "",
};

const itemOrcamentoInicial: ItemOrcamento = {
  id: 0,
  nome: "",
  tipo: "Tratamento avulso",
  valor: 0,
};

export default function PacientesPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [pacienteSelecionado, setPacienteSelecionado] =
    useState<Paciente | null>(null);
  const [modoOverlay, setModoOverlay] = useState<
    "novo" | "visualizar" | "editar" | null
  >(null);
  const [busca, setBusca] = useState("");
  const [novoPaciente, setNovoPaciente] = useState<Paciente>(pacienteInicial);
  const [abaFichaAtiva, setAbaFichaAtiva] = useState("dados");
  const [consultasAgenda, setConsultasAgenda] = useState<ConsultaAgenda[]>([]);
  const [novoOrcamento, setNovoOrcamento] = useState<Orcamento>({
    ...orcamentoInicial,
    id: Date.now(),
    criadoEm: getHojeIso(),
  });
  const [novoItemOrcamento, setNovoItemOrcamento] = useState<ItemOrcamento>({
    ...itemOrcamentoInicial,
    id: Date.now(),
  });
  const [novaEtapa, setNovaEtapa] = useState("");

  const [pacientes, setPacientes, carregouPacientes] = useLocalStorage<Paciente[]>(
    STORAGE_KEY_PACIENTES,
    pacientesIniciais
  );

  const pacientesMigrados = useMemo(() => {
    return migrarListaPacientes(pacientes);
  }, [pacientes]);

  useEffect(() => {
    if (!carregouPacientes) return;

    const precisaMigrar = pacientes.some(
      (paciente) =>
        !Array.isArray(paciente.orcamentos) ||
        !Array.isArray(paciente.cronogramaTratamento) ||
        !Array.isArray(paciente.historicoConsultas)
    );

    if (precisaMigrar) {
      setPacientes(pacientesMigrados);
    }
  }, [carregouPacientes, pacientes, pacientesMigrados, setPacientes]);

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

    if (
      !usuarioTemPermissao(usuarioLogado, [
        "admin",
        "recepcao",
        "dentista",
        "crc",
      ])
    ) {
      router.push("/dashboard");
      return;
    }

    setUsuario(usuarioLogado);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const agendaSalva = localStorage.getItem(STORAGE_KEY_AGENDA);
      setConsultasAgenda(agendaSalva ? JSON.parse(agendaSalva) : []);
    } catch {
      setConsultasAgenda([]);
    }
  }, [carregouPacientes]);

  useEffect(() => {
    if (!carregouPacientes || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const cpfPaciente = params.get("paciente");
    if (!cpfPaciente) return;

    const encontrado = pacientesMigrados.find(
      (paciente) => paciente.cpf === cpfPaciente
    );

    if (encontrado) {
      abrirFichaPaciente(encontrado);
    }
  }, [pacientesMigrados, carregouPacientes]);

  function sairDoSistema() {
    localStorage.removeItem("cohub_user");
    router.push("/login");
  }

  function abrirNovoPaciente() {
    setNovoPaciente({
      ...pacienteInicial,
      cronogramaTratamento: etapasPadraoTratamento(),
      orcamentos: [],
      historicoConsultas: [],
    });
    setNovoOrcamento({
      ...orcamentoInicial,
      id: Date.now(),
      criadoEm: getHojeIso(),
    });
    setNovoItemOrcamento({
      ...itemOrcamentoInicial,
      id: Date.now(),
    });
    setNovaEtapa("");
    setAbaFichaAtiva("dados");
    setPacienteSelecionado(null);
    setModoOverlay("novo");
  }

  function adicionarPaciente(e: React.FormEvent) {
    e.preventDefault();

    if (
      !novoPaciente.nome.trim() ||
      !novoPaciente.telefone.trim() ||
      !novoPaciente.cpf.trim() ||
      !novoPaciente.procedimento.trim()
    ) {
      alert("Preencha nome, telefone, CPF e procedimento.");
      return;
    }

    const cpfJaExiste = pacientesMigrados.some(
      (paciente) => paciente.cpf === novoPaciente.cpf
    );

    if (cpfJaExiste) {
      alert("Já existe um paciente cadastrado com esse CPF.");
      return;
    }

    setPacientes((estadoAtual) => [...estadoAtual, novoPaciente]);
    fecharModal();
  }

  function abrirFichaPaciente(paciente: Paciente) {
    setPacienteSelecionado(paciente);
    setNovoPaciente(paciente);
    setNovoOrcamento({
      ...orcamentoInicial,
      id: Date.now(),
      criadoEm: getHojeIso(),
    });
    setNovoItemOrcamento({
      ...itemOrcamentoInicial,
      id: Date.now(),
    });
    setNovaEtapa("");
    setModoOverlay("visualizar");
    setAbaFichaAtiva("dados");
  }

  function iniciarEdicaoNoModal() {
    if (!pacienteSelecionado) return;
    setNovoPaciente(pacienteSelecionado);
    setModoOverlay("editar");
    setAbaFichaAtiva("dados");
  }

  function cancelarEdicaoNoModal() {
    if (pacienteSelecionado) {
      setNovoPaciente(pacienteSelecionado);
      setModoOverlay("visualizar");
    } else {
      setNovoPaciente(pacienteInicial);
      setModoOverlay(null);
    }
  }

  function salvarEdicaoNoModal(e: React.FormEvent) {
    e.preventDefault();

    if (!pacienteSelecionado) return;

    if (
      !novoPaciente.nome.trim() ||
      !novoPaciente.telefone.trim() ||
      !novoPaciente.cpf.trim() ||
      !novoPaciente.procedimento.trim()
    ) {
      alert("Preencha nome, telefone, CPF e procedimento.");
      return;
    }

    const cpfDuplicado = pacientesMigrados.some(
      (paciente) =>
        paciente.cpf === novoPaciente.cpf &&
        paciente.cpf !== pacienteSelecionado.cpf
    );

    if (cpfDuplicado) {
      alert("Já existe outro paciente com esse CPF.");
      return;
    }

    setPacientes((estadoAtual) =>
      estadoAtual.map((paciente) =>
        paciente.cpf === pacienteSelecionado.cpf ? novoPaciente : paciente
      )
    );

    setPacienteSelecionado(novoPaciente);
    setModoOverlay("visualizar");
  }

  function excluirPaciente() {
    if (!pacienteSelecionado) return;

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir o paciente ${pacienteSelecionado.nome}?`
    );

    if (!confirmar) return;

    setPacientes((estadoAtual) =>
      estadoAtual.filter(
        (paciente) => paciente.cpf !== pacienteSelecionado.cpf
      )
    );

    fecharModal();
  }

  function fecharModal() {
    setPacienteSelecionado(null);
    setModoOverlay(null);
    setNovoPaciente({
      ...pacienteInicial,
      cronogramaTratamento: etapasPadraoTratamento(),
      orcamentos: [],
      historicoConsultas: [],
    });
    setNovoOrcamento({
      ...orcamentoInicial,
      id: Date.now(),
      criadoEm: getHojeIso(),
    });
    setNovoItemOrcamento({
      ...itemOrcamentoInicial,
      id: Date.now(),
    });
    setNovaEtapa("");
    setAbaFichaAtiva("dados");
  }

  function handleFotoChange(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onloadend = () => {
      setNovoPaciente((estadoAtual) => ({
        ...estadoAtual,
        foto: leitor.result as string,
      }));
    };
    leitor.readAsDataURL(arquivo);
  }

  function adicionarEtapaAoCronograma() {
    if (!novaEtapa.trim()) return;

    setNovoPaciente((estadoAtual) => ({
      ...estadoAtual,
      cronogramaTratamento: [
        ...estadoAtual.cronogramaTratamento,
        {
          id: Date.now(),
          nome: novaEtapa.trim(),
          concluido: false,
        },
      ],
    }));

    setNovaEtapa("");
  }

  function alternarEtapa(id: number) {
    setNovoPaciente((estadoAtual) => ({
      ...estadoAtual,
      cronogramaTratamento: estadoAtual.cronogramaTratamento.map((etapa) =>
        etapa.id === id ? { ...etapa, concluido: !etapa.concluido } : etapa
      ),
    }));
  }

  function removerEtapa(id: number) {
    setNovoPaciente((estadoAtual) => ({
      ...estadoAtual,
      cronogramaTratamento: estadoAtual.cronogramaTratamento.filter(
        (etapa) => etapa.id !== id
      ),
    }));
  }

  function adicionarItemAoOrcamento() {
    if (!novoItemOrcamento.nome.trim() || novoItemOrcamento.valor <= 0) {
      alert("Preencha o nome do item e um valor válido.");
      return;
    }

    setNovoOrcamento((estadoAtual) => ({
      ...estadoAtual,
      itens: [
        ...estadoAtual.itens,
        {
          ...novoItemOrcamento,
          id: Date.now(),
        },
      ],
    }));

    setNovoItemOrcamento({
      ...itemOrcamentoInicial,
      id: Date.now(),
    });
  }

  function removerItemOrcamento(id: number) {
    setNovoOrcamento((estadoAtual) => ({
      ...estadoAtual,
      itens: estadoAtual.itens.filter((item) => item.id !== id),
    }));
  }

  function salvarOrcamentoNoPaciente() {
    if (!novoOrcamento.titulo.trim() || novoOrcamento.itens.length === 0) {
      alert("Preencha o título do orçamento e adicione pelo menos um item.");
      return;
    }

    setNovoPaciente((estadoAtual) => ({
      ...estadoAtual,
      orcamentos: [
        ...estadoAtual.orcamentos,
        {
          ...novoOrcamento,
          id: Date.now(),
          criadoEm: getHojeIso(),
        },
      ],
    }));

    setNovoOrcamento({
      ...orcamentoInicial,
      id: Date.now(),
      criadoEm: getHojeIso(),
    });
    setNovoItemOrcamento({
      ...itemOrcamentoInicial,
      id: Date.now(),
    });
  }

  const pacientesFiltrados = useMemo(() => {
    return [...pacientesMigrados]
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .filter((paciente) =>
        paciente.nome.toLowerCase().includes(busca.toLowerCase())
      );
  }, [pacientesMigrados, busca]);

  const totalPacientes = pacientesMigrados.length;
  const emTratamento = pacientesMigrados.filter(
    (paciente) => paciente.status === "Em tratamento"
  ).length;
  const retornosPendentes = pacientesMigrados.filter(
    (paciente) => paciente.status === "Retorno pendente"
  ).length;
  const finalizados = pacientesMigrados.filter(
    (paciente) => paciente.status === "Finalizado"
  ).length;

  const aniversariantesHoje = pacientesMigrados.filter((paciente) =>
    isAniversarioHoje(paciente.dataNascimento)
  );

  const aniversariantesSemana = pacientesMigrados.filter((paciente) =>
    isAniversarioNaSemana(paciente.dataNascimento)
  );

  const lembretesBolo = pacientesMigrados.filter((paciente) =>
    temConsultaNaSemanaDoAniversario(paciente, consultasAgenda)
  );

  if (!usuario || !carregouPacientes) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 text-[#1A1F4D]">
        Carregando...
      </main>
    );
  }

  const pacienteExibido =
    modoOverlay === "visualizar" ? pacienteSelecionado : novoPaciente;
  const progressoAtual = calcularProgresso(
    pacienteExibido?.cronogramaTratamento || []
  );
  const overlayAberto =
    modoOverlay === "novo" ||
    modoOverlay === "visualizar" ||
    modoOverlay === "editar";

  return (
    <main className="flex min-h-screen bg-gray-100 text-[#1A1F4D]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 p-8">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Pacientes</h1>
            <p className="text-gray-600 mt-2">
              Gerencie os pacientes cadastrados da clínica.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={sairDoSistema}
              className="bg-red-500 text-white px-4 py-3 rounded-xl font-bold hover:brightness-110"
            >
              Sair do sistema
            </button>

            <button
              onClick={abrirNovoPaciente}
              className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
            >
              Novo paciente
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <ResumoCard titulo="Total de pacientes" valor={String(totalPacientes)} />
          <ResumoCard titulo="Em tratamento" valor={String(emTratamento)} />
          <ResumoCard titulo="Finalizados" valor={String(finalizados)} />
          <ResumoCard
            titulo="Retornos pendentes"
            valor={String(retornosPendentes)}
          />
        </div>

        <div className="grid xl:grid-cols-[1.25fr_1fr] gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Lembretes e relacionamento
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Aniversários e ações especiais com pacientes.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <AlertaCard
                titulo="Aniversariantes de hoje"
                valor={String(aniversariantesHoje.length)}
                texto={
                  aniversariantesHoje.length > 0
                    ? aniversariantesHoje.map((p) => p.nome).join(", ")
                    : "Nenhum paciente faz aniversário hoje."
                }
              />
              <AlertaCard
                titulo="Aniversariantes da semana"
                valor={String(aniversariantesSemana.length)}
                texto={
                  aniversariantesSemana.length > 0
                    ? aniversariantesSemana.map((p) => p.nome).join(", ")
                    : "Sem aniversários nesta semana."
                }
              />
              <AlertaCard
                titulo="Lembrete de bolo"
                valor={String(lembretesBolo.length)}
                texto={
                  lembretesBolo.length > 0
                    ? lembretesBolo
                        .map(
                          (p) =>
                            `${p.nome} tem consulta próxima do aniversário`
                        )
                        .join(" • ")
                    : "Nenhum paciente com consulta na semana do aniversário."
                }
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-xl font-semibold">Orçamentos rápidos</h2>
            <p className="text-sm text-gray-500 mt-1">
              Visão geral dos orçamentos cadastrados nos pacientes.
            </p>

            <div className="mt-4 space-y-3">
              <LinhaResumo
                label="Orçamentos abertos"
                valor={contarOrcamentosPorStatus(pacientesMigrados, "Aberto")}
              />
              <LinhaResumo
                label="Orçamentos aprovados"
                valor={contarOrcamentosPorStatus(
                  pacientesMigrados,
                  "Aprovado"
                )}
              />
              <LinhaResumo
                label="Orçamentos fechados"
                valor={contarOrcamentosPorStatus(pacientesMigrados, "Fechado")}
              />
              <LinhaResumo
                label="Valor potencial"
                valorTexto={formatarMoeda(
                  calcularPotencialOrcamentos(pacientesMigrados)
                )}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
          <input
            type="text"
            placeholder="Buscar paciente por nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white placeholder:text-gray-400"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-6 bg-[#1A1F4D] text-white font-semibold p-4">
            <span>Paciente</span>
            <span>Telefone</span>
            <span>CPF</span>
            <span>Procedimento</span>
            <span>Progresso</span>
            <span>Status</span>
          </div>

          {pacientesFiltrados.length > 0 ? (
            pacientesFiltrados.map((paciente, index) => {
              const progresso = calcularProgresso(
                paciente.cronogramaTratamento
              );
              const aniversarioHoje = isAniversarioHoje(
                paciente.dataNascimento
              );

              return (
                <div
                  key={`${paciente.cpf}-${index}`}
                  onClick={() => abrirFichaPaciente(paciente)}
                  className="grid grid-cols-6 p-4 border-t border-gray-200 text-sm items-center cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    {paciente.foto ? (
                      <img
                        src={paciente.foto}
                        alt={paciente.nome}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#1A1F4D]/10 flex items-center justify-center text-xs font-bold text-[#1A1F4D]">
                        {paciente.nome.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <span className="font-medium">{paciente.nome}</span>
                      {aniversarioHoje && (
                        <p className="text-xs text-pink-600 font-semibold mt-1">
                          🎂 Aniversário hoje
                        </p>
                      )}
                    </div>
                  </div>

                  <span>{paciente.telefone}</span>
                  <span>{paciente.cpf}</span>
                  <span>{paciente.procedimento}</span>
                  <div className="pr-4">
                    <ProgressBar percentual={progresso} />
                  </div>
                  <span>
                    <StatusBadge status={paciente.status} />
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-500">
              Nenhum paciente encontrado.
            </div>
          )}
        </div>

        <FichaOverlay
          aberto={overlayAberto}
          titulo={
            modoOverlay === "novo"
              ? "Novo paciente"
              : modoOverlay === "editar"
              ? "Editar paciente"
              : "Ficha do paciente"
          }
          subtitulo={
            modoOverlay === "novo"
              ? "Cadastre um novo paciente em uma janela completa."
              : modoOverlay === "editar"
              ? "Atualize as informações do cadastro."
              : "Informações completas do cadastro."
          }
          onFechar={fecharModal}
          acoes={
            modoOverlay === "visualizar" && pacienteSelecionado ? (
              <>
                <button
                  type="button"
                  onClick={iniciarEdicaoNoModal}
                  className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110 transition"
                >
                  Editar paciente
                </button>

                <button
                  type="button"
                  onClick={excluirPaciente}
                  className="bg-red-500 text-white px-5 py-3 rounded-xl font-bold hover:brightness-110 transition"
                >
                  Excluir paciente
                </button>
              </>
            ) : modoOverlay === "editar" ? (
              <button
                type="button"
                onClick={cancelarEdicaoNoModal}
                className="bg-white/10 text-white px-5 py-3 rounded-xl font-bold hover:bg-white/20 transition"
              >
                Cancelar edição
              </button>
            ) : null
          }
        >
          {overlayAberto && (
            <>
              {modoOverlay !== "novo" && (
                <AbasFicha
                  abas={[
                    { chave: "dados", label: "Dados gerais" },
                    { chave: "historico", label: "Histórico" },
                    { chave: "orcamentos", label: "Orçamentos" },
                  ]}
                  abaAtiva={abaFichaAtiva}
                  onTrocar={setAbaFichaAtiva}
                />
              )}

              {(modoOverlay === "novo" || modoOverlay === "editar") ? (
                <form onSubmit={modoOverlay === "novo" ? adicionarPaciente : salvarEdicaoNoModal}>
                  <div className="mb-6">
                    <label className="block font-medium mb-2">
                      Foto do paciente
                    </label>

                    <div className="flex items-center gap-4 flex-wrap">
                      <label className="cursor-pointer bg-[#1A1F4D] text-white px-4 py-3 rounded-xl font-medium hover:brightness-110">
                        Selecionar foto / abrir câmera
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={handleFotoChange}
                          className="hidden"
                        />
                      </label>

                      {novoPaciente.foto && (
                        <img
                          src={novoPaciente.foto}
                          alt="Prévia do paciente"
                          className="w-20 h-20 rounded-full object-cover border-2 border-[#D4AF37]"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <BlocoFormulario titulo="Dados pessoais">
                      <div className="grid md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Nome completo"
                          value={novoPaciente.nome}
                          onChange={(e) =>
                            setNovoPaciente({ ...novoPaciente, nome: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="Telefone"
                          value={novoPaciente.telefone}
                          onChange={(e) =>
                            setNovoPaciente({
                              ...novoPaciente,
                              telefone: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="CPF"
                          value={novoPaciente.cpf}
                          onChange={(e) =>
                            setNovoPaciente({ ...novoPaciente, cpf: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="RG"
                          value={novoPaciente.rg}
                          onChange={(e) =>
                            setNovoPaciente({ ...novoPaciente, rg: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="date"
                          value={novoPaciente.dataNascimento}
                          onChange={(e) =>
                            setNovoPaciente({
                              ...novoPaciente,
                              dataNascimento: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />
                      </div>
                    </BlocoFormulario>

                    <BlocoFormulario titulo="Endereço">
                      <div className="grid md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="CEP"
                          value={novoPaciente.cep}
                          onChange={(e) =>
                            setNovoPaciente({ ...novoPaciente, cep: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="Rua"
                          value={novoPaciente.rua}
                          onChange={(e) =>
                            setNovoPaciente({ ...novoPaciente, rua: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="Número"
                          value={novoPaciente.numero}
                          onChange={(e) =>
                            setNovoPaciente({ ...novoPaciente, numero: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="Bairro"
                          value={novoPaciente.bairro}
                          onChange={(e) =>
                            setNovoPaciente({ ...novoPaciente, bairro: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="Cidade"
                          value={novoPaciente.cidade}
                          onChange={(e) =>
                            setNovoPaciente({ ...novoPaciente, cidade: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="Estado"
                          value={novoPaciente.estado}
                          onChange={(e) =>
                            setNovoPaciente({ ...novoPaciente, estado: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />
                      </div>
                    </BlocoFormulario>
                  </div>

                  <BlocoFormulario titulo="Dados clínicos" className="mt-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Procedimento principal"
                        value={novoPaciente.procedimento}
                        onChange={(e) =>
                          setNovoPaciente({
                            ...novoPaciente,
                            procedimento: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                      />

                      <select
                        value={novoPaciente.status}
                        onChange={(e) =>
                          setNovoPaciente({ ...novoPaciente, status: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                      >
                        <option>Avaliação agendada</option>
                        <option>Em tratamento</option>
                        <option>Retorno pendente</option>
                        <option>Finalizado</option>
                      </select>

                      <textarea
                        placeholder="Observações"
                        value={novoPaciente.observacoes}
                        onChange={(e) =>
                          setNovoPaciente({
                            ...novoPaciente,
                            observacoes: e.target.value,
                          })
                        }
                        className="md:col-span-2 w-full border border-gray-300 rounded-xl px-4 py-3 bg-white min-h-[120px]"
                      />
                    </div>
                  </BlocoFormulario>

                  <div className="grid xl:grid-cols-[1fr_1fr] gap-6 mt-6">
                    <BlocoFormulario titulo="Cronograma e progresso">
                      <div className="mb-4">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <p className="text-sm text-gray-500">
                            Progresso do tratamento
                          </p>
                          <p className="text-sm font-semibold">{progressoAtual}%</p>
                        </div>
                        <ProgressBar percentual={progressoAtual} />
                      </div>

                      <div className="flex gap-3 mb-4">
                        <input
                          type="text"
                          placeholder="Nova etapa"
                          value={novaEtapa}
                          onChange={(e) => setNovaEtapa(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />
                        <button
                          type="button"
                          onClick={adicionarEtapaAoCronograma}
                          className="bg-[#1A1F4D] text-white px-4 py-3 rounded-xl font-bold hover:brightness-110"
                        >
                          Adicionar
                        </button>
                      </div>

                      <div className="space-y-3">
                        {novoPaciente.cronogramaTratamento.map((etapa) => (
                          <div
                            key={etapa.id}
                            className="flex items-center justify-between gap-3 bg-[#FAFAFC] border border-gray-200 rounded-2xl px-4 py-3"
                          >
                            <label className="flex items-center gap-3 flex-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={etapa.concluido}
                                onChange={() => alternarEtapa(etapa.id)}
                              />
                              <span
                                className={
                                  etapa.concluido ? "line-through text-gray-400" : ""
                                }
                              >
                                {etapa.nome}
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => removerEtapa(etapa.id)}
                              className="text-red-600 font-semibold hover:underline"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    </BlocoFormulario>

                    <BlocoFormulario titulo="Orçamentos">
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <input
                          type="text"
                          placeholder="Título do orçamento"
                          value={novoOrcamento.titulo}
                          onChange={(e) =>
                            setNovoOrcamento({
                              ...novoOrcamento,
                              titulo: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <select
                          value={novoOrcamento.status}
                          onChange={(e) =>
                            setNovoOrcamento({
                              ...novoOrcamento,
                              status: e.target.value as Orcamento["status"],
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        >
                          <option>Aberto</option>
                          <option>Aprovado</option>
                          <option>Fechado</option>
                          <option>Recusado</option>
                        </select>

                        <input
                          type="number"
                          placeholder="Desconto"
                          value={novoOrcamento.desconto}
                          onChange={(e) =>
                            setNovoOrcamento({
                              ...novoOrcamento,
                              desconto: Number(e.target.value),
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="Observações do orçamento"
                          value={novoOrcamento.observacoes}
                          onChange={(e) =>
                            setNovoOrcamento({
                              ...novoOrcamento,
                              observacoes: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />
                      </div>

                      <div className="grid md:grid-cols-[1.2fr_180px_180px_auto] gap-3 mb-4">
                        <input
                          type="text"
                          placeholder="Nome do item"
                          value={novoItemOrcamento.nome}
                          onChange={(e) =>
                            setNovoItemOrcamento({
                              ...novoItemOrcamento,
                              nome: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <select
                          value={novoItemOrcamento.tipo}
                          onChange={(e) =>
                            setNovoItemOrcamento({
                              ...novoItemOrcamento,
                              tipo: e.target.value as ItemOrcamento["tipo"],
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        >
                          <option>Pacote</option>
                          <option>Tratamento avulso</option>
                        </select>

                        <input
                          type="number"
                          placeholder="Valor"
                          value={novoItemOrcamento.valor}
                          onChange={(e) =>
                            setNovoItemOrcamento({
                              ...novoItemOrcamento,
                              valor: Number(e.target.value),
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <button
                          type="button"
                          onClick={adicionarItemAoOrcamento}
                          className="bg-[#1A1F4D] text-white px-4 py-3 rounded-xl font-bold hover:brightness-110"
                        >
                          Add item
                        </button>
                      </div>

                      <div className="space-y-2 mb-4">
                        {novoOrcamento.itens.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 bg-[#FAFAFC] border border-gray-200 rounded-2xl px-4 py-3"
                          >
                            <div>
                              <p className="font-medium">{item.nome}</p>
                              <p className="text-sm text-gray-500">
                                {item.tipo} • {formatarMoeda(item.valor)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removerItemOrcamento(item.id)}
                              className="text-red-600 font-semibold hover:underline"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="bg-[#FAFAFC] border border-gray-200 rounded-2xl p-4 mb-4">
                        <LinhaResumo
                          label="Subtotal"
                          valorTexto={formatarMoeda(calcularSubtotal(novoOrcamento.itens))}
                        />
                        <LinhaResumo
                          label="Desconto"
                          valorTexto={formatarMoeda(novoOrcamento.desconto)}
                        />
                        <LinhaResumo
                          label="Total"
                          valorTexto={formatarMoeda(calcularTotalOrcamento(novoOrcamento))}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={salvarOrcamentoNoPaciente}
                        className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
                      >
                        Adicionar orçamento ao paciente
                      </button>
                    </BlocoFormulario>
                  </div>

                  <button
                    type="submit"
                    className="mt-6 bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
                  >
                    {modoOverlay === "novo" ? "Salvar paciente" : "Salvar alterações"}
                  </button>
                </form>
              ) : (
                <>
                  {abaFichaAtiva === "dados" && pacienteSelecionado && (
                    <div className="grid lg:grid-cols-[220px_1fr] gap-6">
                      <div className="bg-white rounded-3xl border border-gray-200 p-6 flex items-center justify-center min-h-[220px]">
                        {pacienteSelecionado.foto ? (
                          <img
                            src={pacienteSelecionado.foto}
                            alt={pacienteSelecionado.nome}
                            className="w-40 h-40 rounded-3xl object-cover"
                          />
                        ) : (
                          <div className="text-6xl font-bold text-[#1A1F4D]">
                            {pacienteSelecionado.nome.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <InfoSection titulo="Relacionamento e alertas">
                          <div className="grid md:grid-cols-3 gap-4">
                            <MiniStatusCard
                              titulo="Score"
                              valor={String(calcularScoreLocal(pacienteSelecionado))}
                            />
                            <MiniStatusCard
                              titulo="Progresso"
                              valor={`${calcularProgresso(
                                pacienteSelecionado.cronogramaTratamento
                              )}%`}
                            />
                            <MiniStatusCard
                              titulo="Orçamentos"
                              valor={String((pacienteSelecionado.orcamentos || []).length)}
                            />
                          </div>

                          <div className="mt-4 space-y-2">
                            {isAniversarioHoje(pacienteSelecionado.dataNascimento) && (
                              <AvisoLinha texto="🎂 Hoje é aniversário do paciente." />
                            )}
                            {temConsultaNaSemanaDoAniversario(
                              pacienteSelecionado,
                              consultasAgenda
                            ) && (
                              <AvisoLinha texto="🍰 Comprar bolo: paciente com consulta próxima do aniversário." />
                            )}
                          </div>
                        </InfoSection>

                        <InfoSection titulo="Dados pessoais">
                          <InfoGrid>
                            <InfoItem label="Nome" value={pacienteSelecionado.nome} />
                            <InfoItem
                              label="Telefone"
                              value={pacienteSelecionado.telefone}
                            />
                            <InfoItem label="CPF" value={pacienteSelecionado.cpf} />
                            <InfoItem label="RG" value={pacienteSelecionado.rg} />
                            <InfoItem
                              label="Nascimento"
                              value={formatarData(pacienteSelecionado.dataNascimento)}
                            />
                          </InfoGrid>
                        </InfoSection>

                        <InfoSection titulo="Endereço">
                          <InfoGrid>
                            <InfoItem label="CEP" value={pacienteSelecionado.cep} />
                            <InfoItem label="Rua" value={pacienteSelecionado.rua} />
                            <InfoItem label="Número" value={pacienteSelecionado.numero} />
                            <InfoItem label="Bairro" value={pacienteSelecionado.bairro} />
                            <InfoItem label="Cidade" value={pacienteSelecionado.cidade} />
                            <InfoItem label="Estado" value={pacienteSelecionado.estado} />
                          </InfoGrid>
                        </InfoSection>

                        <InfoSection titulo="Dados clínicos">
                          <InfoGrid>
                            <InfoItem
                              label="Procedimento"
                              value={pacienteSelecionado.procedimento}
                            />
                            <InfoItem
                              label="Status"
                              value={pacienteSelecionado.status}
                            />
                          </InfoGrid>

                          <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-1">
                              Observações
                            </p>
                            <p className="font-medium text-[#1A1F4D]">
                              {pacienteSelecionado.observacoes || "-"}
                            </p>
                          </div>
                        </InfoSection>

                        <InfoSection titulo="Progresso do tratamento">
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm text-gray-500">Andamento</p>
                              <p className="text-sm font-semibold">
                                {calcularProgresso(
                                  pacienteSelecionado.cronogramaTratamento
                                )}
                                %
                              </p>
                            </div>
                            <ProgressBar
                              percentual={calcularProgresso(
                                pacienteSelecionado.cronogramaTratamento
                              )}
                            />
                          </div>

                          <div className="space-y-3">
                            {pacienteSelecionado.cronogramaTratamento.map((etapa) => (
                              <div
                                key={etapa.id}
                                className="flex items-center gap-3 bg-[#FAFAFC] border border-gray-200 rounded-2xl px-4 py-3"
                              >
                                <div
                                  className={`w-4 h-4 rounded-full ${
                                    etapa.concluido
                                      ? "bg-green-500"
                                      : "bg-gray-300"
                                  }`}
                                />
                                <span
                                  className={
                                    etapa.concluido ? "line-through text-gray-400" : ""
                                  }
                                >
                                  {etapa.nome}
                                </span>
                              </div>
                            ))}
                          </div>
                        </InfoSection>
                      </div>
                    </div>
                  )}

                  {abaFichaAtiva === "historico" && pacienteSelecionado && (
                    <HistoricoPaciente
                      historico={pacienteSelecionado.historicoConsultas || []}
                    />
                  )}

                  {abaFichaAtiva === "orcamentos" && pacienteSelecionado && (
                    <div className="space-y-4">
                      {(pacienteSelecionado.orcamentos || []).length > 0 ? (
                        (pacienteSelecionado.orcamentos || []).map((orcamento) => (
                          <div
                            key={orcamento.id}
                            className="bg-white rounded-3xl border border-gray-200 p-5"
                          >
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div>
                                <h3 className="text-xl font-semibold">
                                  {orcamento.titulo}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                  Criado em {formatarData(orcamento.criadoEm)}
                                </p>
                              </div>

                              <StatusOrcamentoBadge status={orcamento.status} />
                            </div>

                            <div className="mt-4 space-y-2">
                              {orcamento.itens.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 bg-[#FAFAFC] border border-gray-200 rounded-2xl px-4 py-3"
                                >
                                  <div>
                                    <p className="font-medium">{item.nome}</p>
                                    <p className="text-sm text-gray-500">
                                      {item.tipo}
                                    </p>
                                  </div>

                                  <p className="font-semibold">
                                    {formatarMoeda(item.valor)}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="mt-4 bg-[#FAFAFC] border border-gray-200 rounded-2xl p-4">
                              <LinhaResumo
                                label="Subtotal"
                                valorTexto={formatarMoeda(
                                  calcularSubtotal(orcamento.itens)
                                )}
                              />
                              <LinhaResumo
                                label="Desconto"
                                valorTexto={formatarMoeda(orcamento.desconto)}
                              />
                              <LinhaResumo
                                label="Total"
                                valorTexto={formatarMoeda(
                                  calcularTotalOrcamento(orcamento)
                                )}
                              />
                            </div>

                            {orcamento.observacoes && (
                              <div className="mt-4">
                                <p className="text-sm text-gray-500 mb-1">
                                  Observações
                                </p>
                                <p className="font-medium text-[#1A1F4D]">
                                  {orcamento.observacoes}
                                </p>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center text-gray-500">
                          Nenhum orçamento cadastrado para este paciente.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </FichaOverlay>
      </section>
    </main>
  );
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="text-2xl font-bold text-[#D4AF37] mt-3">{valor}</p>
    </div>
  );
}

function AlertaCard({
  titulo,
  valor,
  texto,
}: {
  titulo: string;
  valor: string;
  texto: string;
}) {
  return (
    <div className="bg-[#FAFAFC] border border-gray-200 rounded-2xl p-4">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="text-2xl font-bold text-[#1A1F4D] mt-2">{valor}</p>
      <p className="text-sm text-gray-500 mt-2 leading-6">{texto}</p>
    </div>
  );
}

function MiniStatusCard({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="bg-[#FAFAFC] border border-gray-200 rounded-2xl p-4">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="text-xl font-bold text-[#1A1F4D] mt-2">{valor}</p>
    </div>
  );
}

function AvisoLinha({ texto }: { texto: string }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm font-medium text-yellow-700">
      {texto}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    "Em tratamento": "bg-yellow-100 text-yellow-700",
    "Avaliação agendada": "bg-blue-100 text-blue-700",
    "Retorno pendente": "bg-orange-100 text-orange-700",
    Finalizado: "bg-green-100 text-green-700",
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

function StatusOrcamentoBadge({ status }: { status: Orcamento["status"] }) {
  const estilos: Record<Orcamento["status"], string> = {
    Aberto: "bg-yellow-100 text-yellow-700",
    Aprovado: "bg-blue-100 text-blue-700",
    Fechado: "bg-green-100 text-green-700",
    Recusado: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${estilos[status]}`}
    >
      {status}
    </span>
  );
}

function ProgressBar({ percentual }: { percentual: number }) {
  return (
    <div className="w-full">
      <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full bg-[#D4AF37] rounded-full transition-all duration-300"
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

function BlocoFormulario({
  titulo,
  children,
  className = "",
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-3xl border border-gray-200 p-5 ${className}`}>
      <h3 className="text-xl font-semibold mb-4 text-[#1A1F4D]">{titulo}</h3>
      {children}
    </div>
  );
}

function InfoSection({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-5">
      <h3 className="text-xl font-semibold mb-5 text-[#1A1F4D]">{titulo}</h3>
      {children}
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-5">{children}</div>;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-semibold text-[#1A1F4D] mt-1">{value || "-"}</p>
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
    <div className="flex items-center justify-between border-b border-gray-200 py-2 last:border-b-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-bold">{valorTexto ?? valor ?? 0}</span>
    </div>
  );
}

function formatarData(data: string) {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

function getHojeIso() {
  return new Date().toISOString().split("T")[0];
}

function calcularProgresso(cronograma: EtapaTratamento[]) {
  if (!cronograma.length) return 0;
  const concluidas = cronograma.filter((etapa) => etapa.concluido).length;
  return Math.round((concluidas / cronograma.length) * 100);
}

function calcularScoreLocal(paciente: Paciente) {
  const historico = paciente.historicoConsultas || [];
  let score = 50;

  historico.forEach((item) => {
    if (item.status === "compareceu") score += 10;
    if (item.status === "faltou") score -= 15;
    if (item.status === "cancelou") score -= 5;
  });

  const fechados = (paciente.orcamentos || []).filter(
    (orcamento) => orcamento.status === "Fechado"
  ).length;

  score += fechados * 10;

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return score;
}

function isAniversarioHoje(data: string) {
  if (!data) return false;

  const hoje = new Date();
  const [, mes, dia] = data.split("-").map(Number);

  return hoje.getDate() === dia && hoje.getMonth() + 1 === mes;
}

function isAniversarioNaSemana(data: string) {
  if (!data) return false;

  const hoje = new Date();
  const [, mes, dia] = data.split("-").map(Number);

  const aniversarioEsteAno = new Date(hoje.getFullYear(), mes - 1, dia);
  const hojeZerado = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate()
  );

  const diffDias = Math.ceil(
    (aniversarioEsteAno.getTime() - hojeZerado.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return diffDias >= 0 && diffDias <= 7;
}

function temConsultaNaSemanaDoAniversario(
  paciente: Paciente,
  consultas: ConsultaAgenda[]
) {
  if (!paciente.dataNascimento) return false;

  const [, mes, dia] = paciente.dataNascimento.split("-").map(Number);
  const hoje = new Date();
  const aniversarioEsteAno = new Date(hoje.getFullYear(), mes - 1, dia);

  return consultas.some((consulta) => {
    if (consulta.paciente !== paciente.nome) return false;

    const dataConsulta = new Date(`${consulta.data}T12:00:00`);
    const diffDias = Math.abs(
      Math.ceil(
        (dataConsulta.getTime() - aniversarioEsteAno.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    return diffDias <= 7;
  });
}

function calcularSubtotal(itens: ItemOrcamento[]) {
  return itens.reduce((acc, item) => acc + item.valor, 0);
}

function calcularTotalOrcamento(orcamento: Orcamento) {
  return Math.max(calcularSubtotal(orcamento.itens) - orcamento.desconto, 0);
}

function contarOrcamentosPorStatus(
  pacientes: Paciente[],
  status: Orcamento["status"]
) {
  return pacientes.reduce((acc, paciente) => {
    const orcamentos = Array.isArray(paciente.orcamentos)
      ? paciente.orcamentos
      : [];

    return (
      acc +
      orcamentos.filter((orcamento) => orcamento.status === status).length
    );
  }, 0);
}

function calcularPotencialOrcamentos(pacientes: Paciente[]) {
  return pacientes.reduce((acc, paciente) => {
    const orcamentos = Array.isArray(paciente.orcamentos)
      ? paciente.orcamentos
      : [];

    return (
      acc +
      orcamentos.reduce(
        (sub, orcamento) => sub + calcularTotalOrcamento(orcamento),
        0
      )
    );
  }, 0);
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function migrarPacienteAntigo(paciente: Partial<Paciente>): Paciente {
  return {
    foto: paciente.foto || "",
    nome: paciente.nome || "",
    telefone: paciente.telefone || "",
    cpf: paciente.cpf || "",
    rg: paciente.rg || "",
    dataNascimento: paciente.dataNascimento || "",
    cep: paciente.cep || "",
    rua: paciente.rua || "",
    numero: paciente.numero || "",
    bairro: paciente.bairro || "",
    cidade: paciente.cidade || "",
    estado: paciente.estado || "",
    procedimento: paciente.procedimento || "",
    status: paciente.status || "Avaliação agendada",
    observacoes: paciente.observacoes || "",
    historicoConsultas: Array.isArray(paciente.historicoConsultas)
      ? paciente.historicoConsultas
      : [],
    cronogramaTratamento:
      Array.isArray(paciente.cronogramaTratamento) &&
      paciente.cronogramaTratamento.length > 0
        ? paciente.cronogramaTratamento
        : etapasPadraoTratamento(),
    orcamentos: Array.isArray(paciente.orcamentos) ? paciente.orcamentos : [],
  };
}

function migrarListaPacientes(pacientes: Partial<Paciente>[]) {
  return pacientes.map(migrarPacienteAntigo);
}