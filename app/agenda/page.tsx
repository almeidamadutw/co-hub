"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useLocalStorage } from "../../utils/useLocalStorage";
import { getUsuarioLogado, usuarioTemPermissao, User } from "../../utils/auth";

type Consulta = {
  id: number;
  paciente: string;
  profissional: string;
  data: string;
  horario: string;
  procedimento: string;
  status: string;
};

const STORAGE_KEY_AGENDA = "cohub_agenda";

const profissionais = ["Ana Lucia Dentista", "Dr. Marcelo", "Dra. Beatriz"];

const horarios = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

const consultaInicial: Consulta = {
  id: 0,
  paciente: "",
  profissional: "",
  data: "",
  horario: "",
  procedimento: "",
  status: "Confirmada",
};

const consultasIniciais: Consulta[] = [
  {
    id: 1,
    paciente: "Mariana Costa",
    profissional: "Ana Lucia Dentista",
    data: "2026-03-24",
    horario: "09:00",
    procedimento: "Implante",
    status: "Confirmada",
  },
  {
    id: 2,
    paciente: "Carlos Henrique",
    profissional: "Ana Lucia Dentista",
    data: "2026-03-24",
    horario: "10:00",
    procedimento: "Lente dental",
    status: "Aguardando",
  },
  {
    id: 3,
    paciente: "Fernanda Alves",
    profissional: "Dr. Marcelo",
    data: "2026-03-25",
    horario: "14:00",
    procedimento: "Clareamento",
    status: "Concluída",
  },
  {
    id: 4,
    paciente: "Rafaela Souza",
    profissional: "Dra. Beatriz",
    data: "2026-03-26",
    horario: "15:00",
    procedimento: "Limpeza",
    status: "Cancelada",
  },
  {
    id: 5,
    paciente: "Juliana Mendes",
    profissional: "Dr. Marcelo",
    data: "2026-03-27",
    horario: "09:00",
    procedimento: "Avaliação",
    status: "Confirmada",
  },
];

export default function AgendaPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState<
    "lista" | "calendario" | "semanal"
  >("lista");
  const [diaSelecionado, setDiaSelecionado] = useState("2026-03-24");
  const [busca, setBusca] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [erroFormulario, setErroFormulario] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [filtroProfissional, setFiltroProfissional] = useState("Todos");

  const [novaConsulta, setNovaConsulta] = useState<Consulta>({
    ...consultaInicial,
    id: Date.now(),
  });

  const [consultas, setConsultas, carregouConsultas] =
    useLocalStorage<Consulta[]>(STORAGE_KEY_AGENDA, consultasIniciais);

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

  function limparFormulario() {
    setNovaConsulta({
      ...consultaInicial,
      id: Date.now(),
    });
    setEditandoId(null);
    setErroFormulario("");
  }

  function abrirNovaConsulta() {
    limparFormulario();
    setMostrarFormulario((atual) => !atual);
  }

  function existeConflito(consulta: Consulta) {
    return consultas.some(
      (item: Consulta) =>
        item.id !== consulta.id &&
        item.profissional === consulta.profissional &&
        item.data === consulta.data &&
        item.horario === consulta.horario
    );
  }

  function salvarConsulta(e: React.FormEvent) {
    e.preventDefault();
    setErroFormulario("");

    if (
      !novaConsulta.paciente ||
      !novaConsulta.profissional ||
      !novaConsulta.data ||
      !novaConsulta.horario ||
      !novaConsulta.procedimento
    ) {
      setErroFormulario("Preencha todos os campos obrigatórios.");
      return;
    }

    if (existeConflito(novaConsulta)) {
      setErroFormulario(
        "Já existe uma consulta para esse profissional nesse mesmo dia e horário."
      );
      return;
    }

    if (editandoId !== null) {
      setConsultas((estadoAtual: Consulta[]) =>
        estadoAtual.map((consulta: Consulta) =>
          consulta.id === editandoId ? novaConsulta : consulta
        )
      );
    } else {
      setConsultas((estadoAtual: Consulta[]) => [
        { ...novaConsulta, id: Date.now() },
        ...estadoAtual,
      ]);
    }

    limparFormulario();
    setMostrarFormulario(false);
  }

  function editarConsulta(consulta: Consulta) {
    setNovaConsulta(consulta);
    setEditandoId(consulta.id);
    setMostrarFormulario(true);
    setErroFormulario("");
  }

  function excluirConsulta(id: number) {
    setConsultas((estadoAtual: Consulta[]) =>
      estadoAtual.filter((consulta: Consulta) => consulta.id !== id)
    );
  }

  function imprimirAgenda() {
    window.print();
  }

  const consultasFiltradas = useMemo(() => {
    return consultas.filter((consulta: Consulta) => {
      const bateBusca = consulta.paciente
        .toLowerCase()
        .includes(busca.toLowerCase());

      const bateProfissional =
        filtroProfissional === "Todos" ||
        consulta.profissional === filtroProfissional;

      return bateBusca && bateProfissional;
    });
  }, [consultas, busca, filtroProfissional]);

  const consultasDoDia = useMemo(() => {
    return consultas
      .filter((consulta: Consulta) => {
        const bateDia = consulta.data === diaSelecionado;
        const bateProfissional =
          filtroProfissional === "Todos" ||
          consulta.profissional === filtroProfissional;

        return bateDia && bateProfissional;
      })
      .sort((a: Consulta, b: Consulta) => a.horario.localeCompare(b.horario));
  }, [consultas, diaSelecionado, filtroProfissional]);

  const profissionaisVisiveis =
    filtroProfissional === "Todos"
      ? profissionais
      : profissionais.filter((p: string) => p === filtroProfissional);

  const diasSemana = useMemo(() => {
    const base = new Date(`${diaSelecionado}T12:00:00`);
    const diaDaSemana = base.getDay();
    const diferencaParaSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;

    const segunda = new Date(base);
    segunda.setDate(base.getDate() + diferencaParaSegunda);

    return Array.from({ length: 7 }, (_, index) => {
      const dia = new Date(segunda);
      dia.setDate(segunda.getDate() + index);
      return formatarDataISO(dia);
    });
  }, [diaSelecionado]);

  const consultasSemana = useMemo(() => {
    return consultas.filter((consulta: Consulta) => {
      const bateDia = diasSemana.includes(consulta.data);
      const bateProfissional =
        filtroProfissional === "Todos" ||
        consulta.profissional === filtroProfissional;

      return bateDia && bateProfissional;
    });
  }, [consultas, diasSemana, filtroProfissional]);

  if (!usuario || !carregouConsultas) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 text-[#1A1F4D]">
        Carregando...
      </main>
    );
  }

  const totalConsultas = consultas.length;
  const confirmadas = consultas.filter(
    (consulta: Consulta) => consulta.status === "Confirmada"
  ).length;
  const aguardando = consultas.filter(
    (consulta: Consulta) => consulta.status === "Aguardando"
  ).length;

  return (
    <main className="flex min-h-screen bg-gray-100 text-[#1A1F4D]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 p-8">
        <div className="print-title hidden">
          <h1 className="text-2xl font-bold">Agenda - CO Hub by Casal Odonto</h1>
          <p className="text-sm text-gray-600 mt-1">
            Data selecionada: {formatarData(diaSelecionado)}
          </p>
          <p className="text-sm text-gray-600">
            Profissional: {filtroProfissional}
          </p>
        </div>

        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Agenda</h1>
            <p className="text-gray-600 mt-2">
              Organize consultas, horários e profissionais da clínica.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setModoVisualizacao("lista")}
              className={`px-4 py-3 rounded-xl font-bold ${
                modoVisualizacao === "lista"
                  ? "bg-[#1A1F4D] text-white"
                  : "bg-white border border-gray-300 text-[#1A1F4D]"
              }`}
            >
              Lista
            </button>

            <button
              onClick={() => setModoVisualizacao("calendario")}
              className={`px-4 py-3 rounded-xl font-bold ${
                modoVisualizacao === "calendario"
                  ? "bg-[#1A1F4D] text-white"
                  : "bg-white border border-gray-300 text-[#1A1F4D]"
              }`}
            >
              Calendário
            </button>

            <button
              onClick={() => setModoVisualizacao("semanal")}
              className={`px-4 py-3 rounded-xl font-bold ${
                modoVisualizacao === "semanal"
                  ? "bg-[#1A1F4D] text-white"
                  : "bg-white border border-gray-300 text-[#1A1F4D]"
              }`}
            >
              Semanal
            </button>

            <button
              onClick={imprimirAgenda}
              className="bg-white border border-gray-300 text-[#1A1F4D] px-5 py-3 rounded-xl font-bold hover:bg-gray-50"
            >
              Imprimir Agenda
            </button>

            <button
              onClick={abrirNovaConsulta}
              className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
            >
              {mostrarFormulario ? "Fechar formulário" : "Nova Consulta"}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <ResumoCard titulo="Total de consultas" valor={String(totalConsultas)} />
          <ResumoCard titulo="Confirmadas" valor={String(confirmadas)} />
          <ResumoCard titulo="Aguardando" valor={String(aguardando)} />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6 no-print">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <input
              type="text"
              placeholder="Buscar consulta por nome do paciente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white placeholder:text-gray-400"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <select
              value={filtroProfissional}
              onChange={(e) => setFiltroProfissional(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
            >
              <option>Todos</option>
              {profissionais.map((profissional: string) => (
                <option key={profissional} value={profissional}>
                  {profissional}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={salvarConsulta}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 no-print"
          >
            <h2 className="text-xl font-semibold mb-4">
              {editandoId !== null ? "Editar consulta" : "Cadastrar nova consulta"}
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome do paciente"
                value={novaConsulta.paciente}
                onChange={(e) =>
                  setNovaConsulta({ ...novaConsulta, paciente: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              />

              <select
                value={novaConsulta.profissional}
                onChange={(e) =>
                  setNovaConsulta({
                    ...novaConsulta,
                    profissional: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              >
                <option value="">Selecione o profissional</option>
                {profissionais.map((profissional: string) => (
                  <option key={profissional} value={profissional}>
                    {profissional}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={novaConsulta.data}
                onChange={(e) =>
                  setNovaConsulta({ ...novaConsulta, data: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              />

              <select
                value={novaConsulta.horario}
                onChange={(e) =>
                  setNovaConsulta({ ...novaConsulta, horario: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              >
                <option value="">Selecione o horário</option>
                {horarios.map((hora: string) => (
                  <option key={hora} value={hora}>
                    {hora}
                  </option>
                ))}
              </select>

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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              />

              <select
                value={novaConsulta.status}
                onChange={(e) =>
                  setNovaConsulta({ ...novaConsulta, status: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              >
                <option>Confirmada</option>
                <option>Aguardando</option>
                <option>Concluída</option>
                <option>Cancelada</option>
              </select>
            </div>

            {erroFormulario && (
              <p className="mt-4 text-sm font-medium text-red-600">
                {erroFormulario}
              </p>
            )}

            <div className="mt-4 flex gap-3 flex-wrap">
              <button
                type="submit"
                className="bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
              >
                {editandoId !== null ? "Salvar alterações" : "Salvar consulta"}
              </button>

              <button
                type="button"
                onClick={limparFormulario}
                className="bg-white border border-gray-300 text-[#1A1F4D] px-5 py-3 rounded-xl font-bold hover:bg-gray-50"
              >
                Limpar
              </button>
            </div>
          </form>
        )}

        {modoVisualizacao === "lista" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-8 bg-[#1A1F4D] text-white font-semibold p-4">
              <span>Paciente</span>
              <span>Profissional</span>
              <span>Data</span>
              <span>Horário</span>
              <span>Procedimento</span>
              <span>Status</span>
              <span>Ações</span>
              <span></span>
            </div>

            {consultasFiltradas.map((consulta: Consulta) => (
              <div
                key={consulta.id}
                className="grid grid-cols-8 p-4 border-t border-gray-200 text-sm items-center"
              >
                <span>{consulta.paciente}</span>
                <span>{consulta.profissional}</span>
                <span>{formatarData(consulta.data)}</span>
                <span>{consulta.horario}</span>
                <span>{consulta.procedimento}</span>
                <span>
                  <StatusBadge status={consulta.status} />
                </span>

                <button
                  onClick={() => editarConsulta(consulta)}
                  className="text-[#1A1F4D] font-semibold hover:underline text-left"
                >
                  Editar
                </button>

                <button
                  onClick={() => excluirConsulta(consulta.id)}
                  className="text-red-600 font-semibold hover:underline text-left"
                >
                  Excluir
                </button>
              </div>
            ))}
          </div>
        )}

        {modoVisualizacao === "calendario" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6 no-print">
              <div>
                <h2 className="text-xl font-semibold">Visão calendário por profissional</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Visualize os horários do dia separados por profissional.
                </p>
              </div>

              <input
                type="date"
                value={diaSelecionado}
                onChange={(e) => setDiaSelecionado(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              />
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-x-auto">
              <div
                className="grid bg-[#1A1F4D] text-white font-semibold min-w-[900px]"
                style={{
                  gridTemplateColumns: `100px repeat(${profissionaisVisiveis.length}, minmax(220px, 1fr))`,
                }}
              >
                <div className="p-4 border-r border-white/10">Horário</div>
                {profissionaisVisiveis.map((profissional: string) => (
                  <div key={profissional} className="p-4 border-l border-white/10">
                    {profissional}
                  </div>
                ))}
              </div>

              {horarios.map((hora: string) => (
                <div
                  key={hora}
                  className="grid min-w-[900px] border-t border-gray-200"
                  style={{
                    gridTemplateColumns: `100px repeat(${profissionaisVisiveis.length}, minmax(220px, 1fr))`,
                  }}
                >
                  <div className="p-4 bg-gray-50 font-medium text-sm border-r border-gray-200">
                    {hora}
                  </div>

                  {profissionaisVisiveis.map((profissional: string) => {
                    const consultaNoHorario = consultasDoDia.find(
                      (consulta: Consulta) =>
                        consulta.horario === hora &&
                        consulta.profissional === profissional
                    );

                    return (
                      <div
                        key={`${hora}-${profissional}`}
                        className="p-3 border-l border-gray-200 min-h-[110px]"
                      >
                        {consultaNoHorario ? (
                          <div
                            className={`rounded-2xl p-4 border-l-4 h-full ${estiloCardCalendario(
                              consultaNoHorario.status
                            )}`}
                          >
                            <h3 className="font-bold text-sm">
                              {consultaNoHorario.paciente}
                            </h3>

                            <p className="text-sm text-gray-600 mt-1">
                              {consultaNoHorario.procedimento}
                            </p>

                            <div className="mt-3 flex gap-2 flex-wrap items-center">
                              <StatusBadge status={consultaNoHorario.status} />

                              <button
                                onClick={() => editarConsulta(consultaNoHorario)}
                                className="text-xs font-semibold text-[#1A1F4D] hover:underline"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() => excluirConsulta(consultaNoHorario.id)}
                                className="text-xs font-semibold text-red-600 hover:underline"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center text-sm text-gray-400">
                            Horário livre
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {modoVisualizacao === "semanal" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6 no-print">
              <div>
                <h2 className="text-xl font-semibold">Visão semanal</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Veja a semana inteira de forma rápida.
                </p>
              </div>

              <input
                type="date"
                value={diaSelecionado}
                onChange={(e) => setDiaSelecionado(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              />
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-x-auto">
              <div
                className="grid bg-[#1A1F4D] text-white font-semibold min-w-[1200px]"
                style={{
                  gridTemplateColumns: `100px repeat(${diasSemana.length}, minmax(160px, 1fr))`,
                }}
              >
                <div className="p-4 border-r border-white/10">Horário</div>
                {diasSemana.map((dia: string) => (
                  <div key={dia} className="p-4 border-l border-white/10">
                    {formatarDiaSemana(dia)}
                    <div className="text-xs font-normal mt-1">
                      {formatarData(dia)}
                    </div>
                  </div>
                ))}
              </div>

              {horarios.map((hora: string) => (
                <div
                  key={hora}
                  className="grid min-w-[1200px] border-t border-gray-200"
                  style={{
                    gridTemplateColumns: `100px repeat(${diasSemana.length}, minmax(160px, 1fr))`,
                  }}
                >
                  <div className="p-4 bg-gray-50 font-medium text-sm border-r border-gray-200">
                    {hora}
                  </div>

                  {diasSemana.map((dia: string) => {
                    const consultasNoSlot = consultasSemana.filter(
                      (consulta: Consulta) =>
                        consulta.data === dia && consulta.horario === hora
                    );

                    return (
                      <div
                        key={`${dia}-${hora}`}
                        className="p-2 border-l border-gray-200 min-h-[120px] space-y-2"
                      >
                        {consultasNoSlot.length > 0 ? (
                          consultasNoSlot.map((consulta: Consulta) => (
                            <div
                              key={consulta.id}
                              className={`rounded-xl p-3 border-l-4 ${estiloCardCalendario(
                                consulta.status
                              )}`}
                            >
                              <h3 className="font-bold text-xs">{consulta.paciente}</h3>
                              <p className="text-xs text-gray-600 mt-1">
                                {consulta.profissional}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {consulta.procedimento}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex items-center text-xs text-gray-400">
                            Livre
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        <style jsx global>{`
          @media print {
            aside,
            button,
            input,
            form,
            .no-print {
              display: none !important;
            }

            body,
            main,
            section {
              background: white !important;
            }

            section {
              padding: 0 !important;
              width: 100% !important;
            }

            .print-title {
              display: block !important;
              margin-bottom: 20px;
              color: #1a1f4d;
            }
          }
        `}</style>
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

function StatusBadge({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    Confirmada: "bg-green-100 text-green-700",
    Aguardando: "bg-yellow-100 text-yellow-700",
    Concluída: "bg-blue-100 text-blue-700",
    Cancelada: "bg-red-100 text-red-700",
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

function formatarData(data: string) {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDiaSemana(data: string) {
  const dias = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  const dia = new Date(`${data}T12:00:00`).getDay();
  return dias[dia];
}

function estiloCardCalendario(status: string) {
  const estilos: Record<string, string> = {
    Confirmada: "bg-green-50 border-green-500",
    Aguardando: "bg-yellow-50 border-yellow-500",
    Concluída: "bg-blue-50 border-blue-500",
    Cancelada: "bg-red-50 border-red-500",
  };

  return estilos[status] || "bg-gray-50 border-gray-400";
}