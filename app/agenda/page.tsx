"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import FichaOverlay from "@/components/FichaOverlay";
import { useLocalStorage } from "../../utils/useLocalStorage";
import { getUsuarioLogado, usuarioTemPermissao, User } from "../../utils/auth";

type ConsultaStatus =
  | "Agendada"
  | "Confirmada"
  | "Compareceu"
  | "Faltou"
  | "Cancelou";

type ConsultaAgenda = {
  id: number;
  paciente: string;
  cpfPaciente: string;
  profissional: string;
  data: string;
  horario: string;
  procedimento: string;
  status: ConsultaStatus;
  observacoes: string;
};

type Paciente = {
  nome: string;
  cpf: string;
  telefone: string;
  procedimento: string;
  status: string;
};

const STORAGE_KEY_AGENDA = "cohub_agenda";
const STORAGE_KEY_PACIENTES = "cohub_pacientes";

const consultasIniciais: ConsultaAgenda[] = [
  {
    id: 1,
    paciente: "Carlos Henrique",
    cpfPaciente: "987.654.321-00",
    profissional: "Dra. Beatriz",
    data: "2026-04-08",
    horario: "09:00",
    procedimento: "Avaliação estética",
    status: "Confirmada",
    observacoes: "Paciente pediu atendimento pontual.",
  },
  {
    id: 2,
    paciente: "Mariana Costa",
    cpfPaciente: "123.456.789-00",
    profissional: "Dr. Rafael",
    data: "2026-04-09",
    horario: "14:30",
    procedimento: "Retorno de implante",
    status: "Agendada",
    observacoes: "",
  },
  {
    id: 3,
    paciente: "Rafaela Souza",
    cpfPaciente: "555.666.777-88",
    profissional: "Dra. Camila",
    data: "2026-04-10",
    horario: "11:00",
    procedimento: "Limpeza",
    status: "Faltou",
    observacoes: "Entrar em contato para remarcar.",
  },
];

const consultaInicial: ConsultaAgenda = {
  id: 0,
  paciente: "",
  cpfPaciente: "",
  profissional: "",
  data: "",
  horario: "",
  procedimento: "",
  status: "Agendada",
  observacoes: "",
};

export default function AgendaPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroData, setFiltroData] = useState("");
  const [modoOverlay, setModoOverlay] = useState<
    "nova" | "visualizar" | "editar" | null
  >(null);
  const [consultaSelecionada, setConsultaSelecionada] =
    useState<ConsultaAgenda | null>(null);
  const [novaConsulta, setNovaConsulta] =
    useState<ConsultaAgenda>(consultaInicial);

  const [consultas, setConsultas, carregouConsultas] =
    useLocalStorage<ConsultaAgenda[]>(STORAGE_KEY_AGENDA, consultasIniciais);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);

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
      const pacientesSalvos = localStorage.getItem(STORAGE_KEY_PACIENTES);
      const dados = pacientesSalvos ? JSON.parse(pacientesSalvos) : [];
      setPacientes(Array.isArray(dados) ? dados : []);
    } catch {
      setPacientes([]);
    }
  }, [carregouConsultas]);

  function sairDoSistema() {
    localStorage.removeItem("cohub_user");
    router.push("/login");
  }

  function abrirNovaConsulta() {
    setNovaConsulta({
      ...consultaInicial,
      id: Date.now(),
      data: getHojeIso(),
    });
    setConsultaSelecionada(null);
    setModoOverlay("nova");
  }

  function abrirConsulta(consulta: ConsultaAgenda) {
    setConsultaSelecionada(consulta);
    setNovaConsulta(consulta);
    setModoOverlay("visualizar");
  }

  function iniciarEdicao() {
    if (!consultaSelecionada) return;
    setNovaConsulta(consultaSelecionada);
    setModoOverlay("editar");
  }

  function cancelarEdicao() {
    if (consultaSelecionada) {
      setNovaConsulta(consultaSelecionada);
      setModoOverlay("visualizar");
      return;
    }

    fecharModal();
  }

  function fecharModal() {
    setConsultaSelecionada(null);
    setNovaConsulta(consultaInicial);
    setModoOverlay(null);
  }

  function selecionarPaciente(cpf: string) {
    const paciente = pacientes.find((item) => item.cpf === cpf);

    if (!paciente) {
      setNovaConsulta((estadoAtual) => ({
        ...estadoAtual,
        paciente: "",
        cpfPaciente: "",
        procedimento: "",
      }));
      return;
    }

    setNovaConsulta((estadoAtual) => ({
      ...estadoAtual,
      paciente: paciente.nome,
      cpfPaciente: paciente.cpf,
      procedimento:
        estadoAtual.procedimento.trim() || paciente.procedimento || "",
    }));
  }

  function salvarNovaConsulta(e: React.FormEvent) {
    e.preventDefault();

    if (
      !novaConsulta.paciente.trim() ||
      !novaConsulta.profissional.trim() ||
      !novaConsulta.data.trim() ||
      !novaConsulta.horario.trim() ||
      !novaConsulta.procedimento.trim()
    ) {
      alert("Preencha paciente, profissional, data, horário e procedimento.");
      return;
    }

    const conflito = consultas.some(
      (consulta) =>
        consulta.profissional === novaConsulta.profissional &&
        consulta.data === novaConsulta.data &&
        consulta.horario === novaConsulta.horario
    );

    if (conflito) {
      alert("Já existe uma consulta nesse horário para esse profissional.");
      return;
    }

    const consultaFinal = {
      ...novaConsulta,
      id: Date.now(),
    };

    setConsultas((estadoAtual) => [...estadoAtual, consultaFinal]);
    atualizarHistoricoPaciente(consultaFinal);
    fecharModal();
  }

  function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();

    if (!consultaSelecionada) return;

    if (
      !novaConsulta.paciente.trim() ||
      !novaConsulta.profissional.trim() ||
      !novaConsulta.data.trim() ||
      !novaConsulta.horario.trim() ||
      !novaConsulta.procedimento.trim()
    ) {
      alert("Preencha paciente, profissional, data, horário e procedimento.");
      return;
    }

    const conflito = consultas.some(
      (consulta) =>
        consulta.id !== consultaSelecionada.id &&
        consulta.profissional === novaConsulta.profissional &&
        consulta.data === novaConsulta.data &&
        consulta.horario === novaConsulta.horario
    );

    if (conflito) {
      alert("Já existe uma consulta nesse horário para esse profissional.");
      return;
    }

    setConsultas((estadoAtual) =>
      estadoAtual.map((consulta) =>
        consulta.id === consultaSelecionada.id ? novaConsulta : consulta
      )
    );

    atualizarHistoricoPaciente(novaConsulta);
    setConsultaSelecionada(novaConsulta);
    setModoOverlay("visualizar");
  }

  function excluirConsulta() {
    if (!consultaSelecionada) return;

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir a consulta de ${consultaSelecionada.paciente}?`
    );

    if (!confirmar) return;

    setConsultas((estadoAtual) =>
      estadoAtual.filter((consulta) => consulta.id !== consultaSelecionada.id)
    );

    fecharModal();
  }

  function atualizarStatusRapido(
    consultaId: number,
    status: ConsultaStatus
  ) {
    let consultaAtualizada: ConsultaAgenda | null = null;

    setConsultas((estadoAtual) =>
      estadoAtual.map((consulta) => {
        if (consulta.id !== consultaId) return consulta;

        consultaAtualizada = { ...consulta, status };
        return consultaAtualizada;
      })
    );

    if (consultaAtualizada) {
      atualizarHistoricoPaciente(consultaAtualizada);
      if (consultaSelecionada?.id === consultaId) {
        setConsultaSelecionada(consultaAtualizada);
        setNovaConsulta(consultaAtualizada);
      }
    }
  }

  function atualizarHistoricoPaciente(consulta: ConsultaAgenda) {
    if (typeof window === "undefined" || !consulta.cpfPaciente) return;

    try {
      const pacientesSalvos = localStorage.getItem(STORAGE_KEY_PACIENTES);
      const listaPacientes: any[] = pacientesSalvos
        ? JSON.parse(pacientesSalvos)
        : [];

      if (!Array.isArray(listaPacientes)) return;

      const pacientesAtualizados = listaPacientes.map((paciente) => {
        if (paciente.cpf !== consulta.cpfPaciente) return paciente;

        const historicoAtual = Array.isArray(paciente.historicoConsultas)
          ? paciente.historicoConsultas
          : [];

        const observacaoBase =
          consulta.observacoes?.trim() ||
          `${consulta.procedimento} com ${consulta.profissional} às ${consulta.horario}.`;

        const novoRegistro = {
          data: consulta.data,
          status: normalizarStatusHistorico(consulta.status),
          observacao: observacaoBase,
        };

        const historicoSemDuplicado = historicoAtual.filter(
          (item: any) =>
            !(
              item.data === consulta.data &&
              typeof item.observacao === "string" &&
              item.observacao.includes(consulta.horario)
            )
        );

        return {
          ...paciente,
          historicoConsultas: [...historicoSemDuplicado, novoRegistro].sort(
            (a, b) => a.data.localeCompare(b.data)
          ),
        };
      });

      localStorage.setItem(
        STORAGE_KEY_PACIENTES,
        JSON.stringify(pacientesAtualizados)
      );
      setPacientes(pacientesAtualizados);
    } catch {
      //
    }
  }

  const consultasFiltradas = useMemo(() => {
    return [...consultas]
      .filter((consulta) => {
        const termo = busca.toLowerCase();

        const bateBusca =
          consulta.paciente.toLowerCase().includes(termo) ||
          consulta.profissional.toLowerCase().includes(termo) ||
          consulta.procedimento.toLowerCase().includes(termo);

        const bateStatus =
          filtroStatus === "Todos" ? true : consulta.status === filtroStatus;

        const bateData = filtroData ? consulta.data === filtroData : true;

        return bateBusca && bateStatus && bateData;
      })
      .sort((a, b) => {
        const dataA = `${a.data}T${a.horario}`;
        const dataB = `${b.data}T${b.horario}`;
        return dataA.localeCompare(dataB);
      });
  }, [consultas, busca, filtroStatus, filtroData]);

  const totalConsultas = consultas.length;
  const consultasHoje = consultas.filter(
    (consulta) => consulta.data === getHojeIso()
  ).length;
  const confirmadas = consultas.filter(
    (consulta) => consulta.status === "Confirmada"
  ).length;
  const faltas = consultas.filter(
    (consulta) => consulta.status === "Faltou"
  ).length;

  const overlayAberto =
    modoOverlay === "nova" ||
    modoOverlay === "visualizar" ||
    modoOverlay === "editar";

  if (!usuario || !carregouConsultas) {
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
            <h1 className="text-3xl font-bold">Agenda</h1>
            <p className="text-gray-600 mt-2">
              Organize consultas, confirme atendimentos e acompanhe faltas.
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
              onClick={abrirNovaConsulta}
              className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
            >
              Nova consulta
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <ResumoCard titulo="Total de consultas" valor={String(totalConsultas)} />
          <ResumoCard titulo="Hoje" valor={String(consultasHoje)} />
          <ResumoCard titulo="Confirmadas" valor={String(confirmadas)} />
          <ResumoCard titulo="Faltas" valor={String(faltas)} />
        </div>

        <div className="grid xl:grid-cols-[1.2fr_240px_220px] gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <input
              type="text"
              placeholder="Buscar por paciente, profissional ou procedimento"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white placeholder:text-gray-400"
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-white border border-gray-300 rounded-xl px-4 py-3"
          >
            <option>Todos</option>
            <option>Agendada</option>
            <option>Confirmada</option>
            <option>Compareceu</option>
            <option>Faltou</option>
            <option>Cancelou</option>
          </select>

          <input
            type="date"
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            className="bg-white border border-gray-300 rounded-xl px-4 py-3"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 bg-[#1A1F4D] text-white font-semibold p-4 text-sm">
            <span>Paciente</span>
            <span>Profissional</span>
            <span>Data</span>
            <span>Horário</span>
            <span>Procedimento</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          {consultasFiltradas.length > 0 ? (
            consultasFiltradas.map((consulta) => (
              <div
                key={consulta.id}
                className="grid grid-cols-7 p-4 border-t border-gray-200 text-sm items-center gap-3 hover:bg-gray-50 transition"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => abrirConsulta(consulta)}
                >
                  <p className="font-medium">{consulta.paciente}</p>
                  {consulta.cpfPaciente && (
                    <p className="text-xs text-gray-500 mt-1">
                      {consulta.cpfPaciente}
                    </p>
                  )}
                </div>

                <span>{consulta.profissional}</span>
                <span>{formatarData(consulta.data)}</span>
                <span>{consulta.horario}</span>
                <span>{consulta.procedimento}</span>
                <span>
                  <StatusBadge status={consulta.status} />
                </span>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => atualizarStatusRapido(consulta.id, "Confirmada")}
                    className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 font-semibold hover:brightness-95"
                  >
                    Confirmar
                  </button>

                  <button
                    type="button"
                    onClick={() => atualizarStatusRapido(consulta.id, "Compareceu")}
                    className="px-3 py-2 rounded-lg bg-green-100 text-green-700 font-semibold hover:brightness-95"
                  >
                    Check-in
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              Nenhuma consulta encontrada.
            </div>
          )}
        </div>

        <FichaOverlay
          aberto={overlayAberto}
          titulo={
            modoOverlay === "nova"
              ? "Nova consulta"
              : modoOverlay === "editar"
              ? "Editar consulta"
              : "Detalhes da consulta"
          }
          subtitulo={
            modoOverlay === "nova"
              ? "Cadastre um novo agendamento para a clínica."
              : modoOverlay === "editar"
              ? "Atualize os dados da consulta."
              : "Visualize e acompanhe os dados completos do agendamento."
          }
          onFechar={fecharModal}
          acoes={
            modoOverlay === "visualizar" && consultaSelecionada ? (
              <>
                <button
                  type="button"
                  onClick={iniciarEdicao}
                  className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110 transition"
                >
                  Editar consulta
                </button>

                <button
                  type="button"
                  onClick={excluirConsulta}
                  className="bg-red-500 text-white px-5 py-3 rounded-xl font-bold hover:brightness-110 transition"
                >
                  Excluir consulta
                </button>
              </>
            ) : modoOverlay === "editar" ? (
              <button
                type="button"
                onClick={cancelarEdicao}
                className="bg-white/10 text-white px-5 py-3 rounded-xl font-bold hover:bg-white/20 transition"
              >
                Cancelar edição
              </button>
            ) : null
          }
        >
          {overlayAberto && (
            <>
              {modoOverlay === "visualizar" && consultaSelecionada ? (
                <div className="space-y-6">
                  <InfoSection titulo="Resumo da consulta">
                    <InfoGrid>
                      <InfoItem label="Paciente" value={consultaSelecionada.paciente} />
                      <InfoItem
                        label="CPF do paciente"
                        value={consultaSelecionada.cpfPaciente || "-"}
                      />
                      <InfoItem
                        label="Profissional"
                        value={consultaSelecionada.profissional}
                      />
                      <InfoItem
                        label="Procedimento"
                        value={consultaSelecionada.procedimento}
                      />
                      <InfoItem
                        label="Data"
                        value={formatarData(consultaSelecionada.data)}
                      />
                      <InfoItem label="Horário" value={consultaSelecionada.horario} />
                    </InfoGrid>
                  </InfoSection>

                  <InfoSection titulo="Status e observações">
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      <StatusBadge status={consultaSelecionada.status} />

                      <button
                        type="button"
                        onClick={() =>
                          atualizarStatusRapido(
                            consultaSelecionada.id,
                            "Confirmada"
                          )
                        }
                        className="px-4 py-2 rounded-xl bg-blue-100 text-blue-700 font-semibold"
                      >
                        Marcar como confirmada
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          atualizarStatusRapido(
                            consultaSelecionada.id,
                            "Compareceu"
                          )
                        }
                        className="px-4 py-2 rounded-xl bg-green-100 text-green-700 font-semibold"
                      >
                        Marcar comparecimento
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          atualizarStatusRapido(consultaSelecionada.id, "Faltou")
                        }
                        className="px-4 py-2 rounded-xl bg-orange-100 text-orange-700 font-semibold"
                      >
                        Marcar falta
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          atualizarStatusRapido(
                            consultaSelecionada.id,
                            "Cancelou"
                          )
                        }
                        className="px-4 py-2 rounded-xl bg-red-100 text-red-700 font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-1">Observações</p>
                      <p className="font-medium text-[#1A1F4D]">
                        {consultaSelecionada.observacoes || "-"}
                      </p>
                    </div>
                  </InfoSection>

                  {consultaSelecionada.cpfPaciente && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/pacientes?paciente=${encodeURIComponent(
                              consultaSelecionada.cpfPaciente
                            )}`
                          )
                        }
                        className="bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
                      >
                        Abrir ficha do paciente
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={
                    modoOverlay === "nova" ? salvarNovaConsulta : salvarEdicao
                  }
                >
                  <div className="grid lg:grid-cols-2 gap-6">
                    <BlocoFormulario titulo="Paciente e profissional">
                      <div className="grid md:grid-cols-2 gap-4">
                        <select
                          value={novaConsulta.cpfPaciente}
                          onChange={(e) => selecionarPaciente(e.target.value)}
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white md:col-span-2"
                        >
                          <option value="">Selecionar paciente</option>
                          {pacientes
                            .slice()
                            .sort((a, b) =>
                              a.nome.localeCompare(b.nome, "pt-BR")
                            )
                            .map((paciente) => (
                              <option key={paciente.cpf} value={paciente.cpf}>
                                {paciente.nome} • {paciente.cpf}
                              </option>
                            ))}
                        </select>

                        <input
                          type="text"
                          placeholder="Paciente"
                          value={novaConsulta.paciente}
                          onChange={(e) =>
                            setNovaConsulta({
                              ...novaConsulta,
                              paciente: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="Profissional"
                          value={novaConsulta.profissional}
                          onChange={(e) =>
                            setNovaConsulta({
                              ...novaConsulta,
                              profissional: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="CPF do paciente"
                          value={novaConsulta.cpfPaciente}
                          onChange={(e) =>
                            setNovaConsulta({
                              ...novaConsulta,
                              cpfPaciente: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="text"
                          placeholder="Procedimento"
                          value={novaConsulta.procedimento}
                          onChange={(e) =>
                            setNovaConsulta({
                              ...novaConsulta,
                              procedimento: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />
                      </div>
                    </BlocoFormulario>

                    <BlocoFormulario titulo="Agendamento">
                      <div className="grid md:grid-cols-2 gap-4">
                        <input
                          type="date"
                          value={novaConsulta.data}
                          onChange={(e) =>
                            setNovaConsulta({
                              ...novaConsulta,
                              data: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <input
                          type="time"
                          value={novaConsulta.horario}
                          onChange={(e) =>
                            setNovaConsulta({
                              ...novaConsulta,
                              horario: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                        />

                        <select
                          value={novaConsulta.status}
                          onChange={(e) =>
                            setNovaConsulta({
                              ...novaConsulta,
                              status: e.target.value as ConsultaStatus,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white md:col-span-2"
                        >
                          <option>Agendada</option>
                          <option>Confirmada</option>
                          <option>Compareceu</option>
                          <option>Faltou</option>
                          <option>Cancelou</option>
                        </select>

                        <textarea
                          placeholder="Observações"
                          value={novaConsulta.observacoes}
                          onChange={(e) =>
                            setNovaConsulta({
                              ...novaConsulta,
                              observacoes: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white min-h-[120px] md:col-span-2"
                        />
                      </div>
                    </BlocoFormulario>
                  </div>

                  <button
                    type="submit"
                    className="mt-6 bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
                  >
                    {modoOverlay === "nova"
                      ? "Salvar consulta"
                      : "Salvar alterações"}
                  </button>
                </form>
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

function StatusBadge({ status }: { status: ConsultaStatus }) {
  const estilos: Record<ConsultaStatus, string> = {
    Agendada: "bg-yellow-100 text-yellow-700",
    Confirmada: "bg-blue-100 text-blue-700",
    Compareceu: "bg-green-100 text-green-700",
    Faltou: "bg-orange-100 text-orange-700",
    Cancelou: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${estilos[status]}`}
    >
      {status}
    </span>
  );
}

function BlocoFormulario({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-5">
      <h3 className="text-xl font-semibold mb-