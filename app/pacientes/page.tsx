"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useLocalStorage } from "../../utils/useLocalStorage";
import { getUsuarioLogado, usuarioTemPermissao, User } from "../../utils/auth";

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

const STORAGE_KEY_PACIENTES = "cohub_pacientes";

const pacientesIniciais: Paciente[] = [
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
  },
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
};

export default function PacientesPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busca, setBusca] = useState("");
  const [novoPaciente, setNovoPaciente] = useState<Paciente>(pacienteInicial);

  const [pacientes, setPacientes, carregouPacientes] = useLocalStorage<Paciente[]>(
    STORAGE_KEY_PACIENTES,
    pacientesIniciais
  );

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

  function sairDoSistema() {
    localStorage.removeItem("cohub_user");
    router.push("/login");
  }

  function adicionarPaciente(e: React.FormEvent) {
    e.preventDefault();

    if (
      !novoPaciente.nome ||
      !novoPaciente.telefone ||
      !novoPaciente.cpf ||
      !novoPaciente.procedimento
    ) {
      return;
    }

    const cpfJaExiste = pacientes.some((paciente) => paciente.cpf === novoPaciente.cpf);
    if (cpfJaExiste) {
      alert("Já existe um paciente cadastrado com esse CPF.");
      return;
    }

    setPacientes((estadoAtual) => [novoPaciente, ...estadoAtual]);
    setNovoPaciente(pacienteInicial);
    setMostrarFormulario(false);
  }

  function iniciarEdicaoNoModal() {
    if (!pacienteSelecionado) return;
    setNovoPaciente(pacienteSelecionado);
    setModoEdicao(true);
  }

  function cancelarEdicaoNoModal() {
    if (pacienteSelecionado) {
      setNovoPaciente(pacienteSelecionado);
    } else {
      setNovoPaciente(pacienteInicial);
    }
    setModoEdicao(false);
  }

  function salvarEdicaoNoModal(e: React.FormEvent) {
    e.preventDefault();

    if (!pacienteSelecionado) return;

    if (
      !novoPaciente.nome ||
      !novoPaciente.telefone ||
      !novoPaciente.cpf ||
      !novoPaciente.procedimento
    ) {
      return;
    }

    const cpfDuplicado = pacientes.some(
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
    setModoEdicao(false);
  }

  function excluirPaciente() {
    if (!pacienteSelecionado) return;

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir o paciente ${pacienteSelecionado.nome}?`
    );

    if (!confirmar) return;

    setPacientes((estadoAtual) =>
      estadoAtual.filter((paciente) => paciente.cpf !== pacienteSelecionado.cpf)
    );

    setPacienteSelecionado(null);
    setModoEdicao(false);
    setNovoPaciente(pacienteInicial);
  }

  function fecharModal() {
    setPacienteSelecionado(null);
    setModoEdicao(false);
    setNovoPaciente(pacienteInicial);
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

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter((paciente) =>
      paciente.nome.toLowerCase().includes(busca.toLowerCase())
    );
  }, [pacientes, busca]);

  const totalPacientes = pacientes.length;
  const emTratamento = pacientes.filter(
    (paciente) => paciente.status === "Em tratamento"
  ).length;
  const retornosPendentes = pacientes.filter(
    (paciente) => paciente.status === "Retorno pendente"
  ).length;
  const finalizados = pacientes.filter(
    (paciente) => paciente.status === "Finalizado"
  ).length;

  if (!usuario || !carregouPacientes) {
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
              onClick={() => {
                setMostrarFormulario(!mostrarFormulario);
                setModoEdicao(false);
                setNovoPaciente(pacienteInicial);
              }}
              className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
            >
              {mostrarFormulario ? "Fechar formulário" : "Novo Paciente"}
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
          <input
            type="text"
            placeholder="Buscar paciente por nome"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white placeholder:text-gray-400"
          />
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={adicionarPaciente}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-6">
              Cadastrar novo paciente
            </h2>

            <div className="mb-6">
              <label className="block font-medium mb-2">Foto do paciente</label>

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

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Dados pessoais</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={novoPaciente.nome}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, nome: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                />

                <input
                  type="text"
                  placeholder="Telefone"
                  value={novoPaciente.telefone}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, telefone: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                />

                <input
                  type="text"
                  placeholder="CPF"
                  value={novoPaciente.cpf}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, cpf: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                />

                <input
                  type="text"
                  placeholder="RG"
                  value={novoPaciente.rg}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, rg: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Endereço</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="CEP"
                  value={novoPaciente.cep}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, cep: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                />

                <input
                  type="text"
                  placeholder="Rua"
                  value={novoPaciente.rua}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, rua: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                />

                <input
                  type="text"
                  placeholder="Número"
                  value={novoPaciente.numero}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, numero: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                />

                <input
                  type="text"
                  placeholder="Bairro"
                  value={novoPaciente.bairro}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, bairro: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                />

                <input
                  type="text"
                  placeholder="Cidade"
                  value={novoPaciente.cidade}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, cidade: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                />

                <input
                  type="text"
                  placeholder="Estado"
                  value={novoPaciente.estado}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, estado: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Dados clínicos</h3>

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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                />

                <select
                  value={novoPaciente.status}
                  onChange={(e) =>
                    setNovoPaciente({ ...novoPaciente, status: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                >
                  <option>Avaliação agendada</option>
                  <option>Em tratamento</option>
                  <option>Finalizado</option>
                  <option>Retorno pendente</option>
                </select>
              </div>

              <textarea
                placeholder="Observações"
                value={novoPaciente.observacoes}
                onChange={(e) =>
                  setNovoPaciente({
                    ...novoPaciente,
                    observacoes: e.target.value,
                  })
                }
                className="w-full mt-4 border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white min-h-[120px]"
              />
            </div>

            <button
              type="submit"
              className="mt-2 bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
            >
              Salvar paciente
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-5 bg-[#1A1F4D] text-white font-semibold p-4">
            <span>Paciente</span>
            <span>Telefone</span>
            <span>CPF</span>
            <span>Procedimento</span>
            <span>Status</span>
          </div>

          {pacientesFiltrados.length > 0 ? (
            pacientesFiltrados.map((paciente, index) => (
              <div
                key={index}
                onClick={() => setPacienteSelecionado(paciente)}
                className="grid grid-cols-5 p-4 border-t border-gray-200 text-sm items-center cursor-pointer hover:bg-gray-50 transition"
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
                  <span>{paciente.nome}</span>
                </div>

                <span>{paciente.telefone}</span>
                <span>{paciente.cpf}</span>
                <span>{paciente.procedimento}</span>
                <span>
                  <StatusBadge status={paciente.status} />
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              Nenhum paciente encontrado.
            </div>
          )}
        </div>

        {pacienteSelecionado && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="bg-[#1A1F4D] text-white px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold">
                    {modoEdicao ? "Editar Paciente" : "Ficha do Paciente"}
                  </h2>
                  <p className="text-white/70 text-sm mt-1">
                    {modoEdicao
                      ? "Atualize as informações do cadastro"
                      : "Informações completas do cadastro"}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {!modoEdicao ? (
                    <button
                      onClick={iniciarEdicaoNoModal}
                      className="bg-[#D4AF37] text-white px-4 py-2 rounded-xl font-semibold hover:brightness-110"
                    >
                      Editar paciente
                    </button>
                  ) : (
                    <button
                      onClick={cancelarEdicaoNoModal}
                      className="bg-white/10 hover:bg-white/20 transition px-4 py-2 rounded-xl font-semibold"
                    >
                      Cancelar edição
                    </button>
                  )}

                  {!modoEdicao && (
                    <button
                      onClick={excluirPaciente}
                      className="bg-red-600 text-white px-4 py-2 rounded-xl font-semibold hover:brightness-110"
                    >
                      Excluir paciente
                    </button>
                  )}

                  <button
                    onClick={fecharModal}
                    className="bg-red-500 text-white px-4 py-2 rounded-xl font-semibold hover:brightness-110"
                  >
                    Sair do paciente
                  </button>

                  <button
                    onClick={fecharModal}
                    className="bg-white/10 hover:bg-white/20 transition px-4 py-2 rounded-xl font-semibold"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              {modoEdicao ? (
                <form onSubmit={salvarEdicaoNoModal} className="p-6 space-y-6">
                  <div className="grid md:grid-cols-[220px_1fr] gap-6">
                    <div>
                      {novoPaciente.foto ? (
                        <img
                          src={novoPaciente.foto}
                          alt={novoPaciente.nome}
                          className="w-full h-64 object-cover rounded-2xl border border-gray-200"
                        />
                      ) : (
                        <div className="w-full h-64 rounded-2xl border border-gray-200 bg-[#1A1F4D]/5 flex items-center justify-center text-5xl font-bold text-[#1A1F4D]">
                          {novoPaciente.nome
                            ? novoPaciente.nome.slice(0, 2).toUpperCase()
                            : "NP"}
                        </div>
                      )}

                      <label className="mt-4 w-full cursor-pointer bg-[#1A1F4D] text-white px-4 py-3 rounded-xl font-medium hover:brightness-110 flex items-center justify-center text-center">
                        Alterar foto
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={handleFotoChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                        <h3 className="text-lg font-bold mb-4">Dados pessoais</h3>

                        <div className="grid md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="Nome completo"
                            value={novoPaciente.nome}
                            onChange={(e) =>
                              setNovoPaciente({
                                ...novoPaciente,
                                nome: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
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
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                          />

                          <input
                            type="text"
                            placeholder="CPF"
                            value={novoPaciente.cpf}
                            onChange={(e) =>
                              setNovoPaciente({
                                ...novoPaciente,
                                cpf: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                          />

                          <input
                            type="text"
                            placeholder="RG"
                            value={novoPaciente.rg}
                            onChange={(e) =>
                              setNovoPaciente({
                                ...novoPaciente,
                                rg: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
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
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white md:col-span-2"
                          />
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                        <h3 className="text-lg font-bold mb-4">Endereço</h3>

                        <div className="grid md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="CEP"
                            value={novoPaciente.cep}
                            onChange={(e) =>
                              setNovoPaciente({
                                ...novoPaciente,
                                cep: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                          />

                          <input
                            type="text"
                            placeholder="Rua"
                            value={novoPaciente.rua}
                            onChange={(e) =>
                              setNovoPaciente({
                                ...novoPaciente,
                                rua: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                          />

                          <input
                            type="text"
                            placeholder="Número"
                            value={novoPaciente.numero}
                            onChange={(e) =>
                              setNovoPaciente({
                                ...novoPaciente,
                                numero: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                          />

                          <input
                            type="text"
                            placeholder="Bairro"
                            value={novoPaciente.bairro}
                            onChange={(e) =>
                              setNovoPaciente({
                                ...novoPaciente,
                                bairro: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                          />

                          <input
                            type="text"
                            placeholder="Cidade"
                            value={novoPaciente.cidade}
                            onChange={(e) =>
                              setNovoPaciente({
                                ...novoPaciente,
                                cidade: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                          />

                          <input
                            type="text"
                            placeholder="Estado"
                            value={novoPaciente.estado}
                            onChange={(e) =>
                              setNovoPaciente({
                                ...novoPaciente,
                                estado: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                          />
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                        <h3 className="text-lg font-bold mb-4">Dados clínicos</h3>

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
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                          />

                          <select
                            value={novoPaciente.status}
                            onChange={(e) =>
                              setNovoPaciente({
                                ...novoPaciente,
                                status: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
                          >
                            <option>Avaliação agendada</option>
                            <option>Em tratamento</option>
                            <option>Finalizado</option>
                            <option>Retorno pendente</option>
                          </select>
                        </div>

                        <textarea
                          placeholder="Observações"
                          value={novoPaciente.observacoes}
                          onChange={(e) =>
                            setNovoPaciente({
                              ...novoPaciente,
                              observacoes: e.target.value,
                            })
                          }
                          className="w-full mt-4 border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white min-h-[120px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={cancelarEdicaoNoModal}
                      className="px-5 py-3 rounded-xl font-bold border border-gray-300 text-[#1A1F4D] hover:bg-gray-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
                    >
                      Salvar alterações
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 grid md:grid-cols-[220px_1fr] gap-6">
                  <div>
                    {pacienteSelecionado.foto ? (
                      <img
                        src={pacienteSelecionado.foto}
                        alt={pacienteSelecionado.nome}
                        className="w-full h-64 object-cover rounded-2xl border border-gray-200"
                      />
                    ) : (
                      <div className="w-full h-64 rounded-2xl border border-gray-200 bg-[#1A1F4D]/5 flex items-center justify-center text-5xl font-bold text-[#1A1F4D]">
                        {pacienteSelecionado.nome.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <BlocoDetalhe
                      titulo="Dados pessoais"
                      itens={[
                        ["Nome", pacienteSelecionado.nome],
                        ["Telefone", pacienteSelecionado.telefone],
                        ["CPF", pacienteSelecionado.cpf],
                        ["RG", pacienteSelecionado.rg],
                        [
                          "Nascimento",
                          formatarData(pacienteSelecionado.dataNascimento),
                        ],
                      ]}
                    />

                    <BlocoDetalhe
                      titulo="Endereço"
                      itens={[
                        ["CEP", pacienteSelecionado.cep],
                        ["Rua", pacienteSelecionado.rua],
                        ["Número", pacienteSelecionado.numero],
                        ["Bairro", pacienteSelecionado.bairro],
                        ["Cidade", pacienteSelecionado.cidade],
                        ["Estado", pacienteSelecionado.estado],
                      ]}
                    />

                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                      <h3 className="text-lg font-bold mb-4">Dados clínicos</h3>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Procedimento</p>
                          <p className="font-semibold mt-1">
                            {pacienteSelecionado.procedimento}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">Status</p>
                          <div className="mt-1">
                            <StatusBadge status={pacienteSelecionado.status} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-gray-500 text-sm">Observações</p>
                        <p className="mt-1 text-sm text-[#1A1F4D]">
                          {pacienteSelecionado.observacoes || "Sem observações."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
    "Avaliação agendada": "bg-blue-100 text-blue-700",
    "Em tratamento": "bg-yellow-100 text-yellow-700",
    Finalizado: "bg-green-100 text-green-700",
    "Retorno pendente": "bg-orange-100 text-orange-700",
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

function BlocoDetalhe({
  titulo,
  itens,
}: {
  titulo: string;
  itens: [string, string][];
}) {
  return (
    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
      <h3 className="text-lg font-bold mb-4">{titulo}</h3>

      <div className="grid md:grid-cols-2 gap-4 text-sm">
        {itens.map(([label, valor]) => (
          <div key={label}>
            <p className="text-gray-500">{label}</p>
            <p className="font-semibold mt-1">{valor || "-"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatarData(data: string) {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}