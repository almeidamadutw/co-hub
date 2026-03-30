"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
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

  const [pacientes, setPacientes] = useState<Paciente[]>([
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
  ]);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busca, setBusca] = useState("");
  const [novoPaciente, setNovoPaciente] = useState<Paciente>(pacienteInicial);

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

    if (!usuarioTemPermissao(usuarioLogado, ["admin", "recepcao", "dentista", "crc"])) {
      router.push("/dashboard");
      return;
    }

    setUsuario(usuarioLogado);
  }, [router]);

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

    setPacientes((estadoAtual) => [novoPaciente, ...estadoAtual]);
    setNovoPaciente(pacienteInicial);
    setMostrarFormulario(false);
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

  if (!usuario) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 text-[#1A1F4D]">
        Carregando...
      </main>
    );
  }

  const totalPacientes = pacientes.length;
  const emTratamento = pacientes.filter(
    (paciente) => paciente.status === "Em tratamento"
  ).length;
  const retornosPendentes = pacientes.filter(
    (paciente) => paciente.status === "Retorno pendente"
  ).length;

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

          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
          >
            {mostrarFormulario ? "Fechar formulário" : "Novo Paciente"}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <ResumoCard titulo="Total de pacientes" valor={String(totalPacientes)} />
          <ResumoCard titulo="Em tratamento" valor={String(emTratamento)} />
          <ResumoCard titulo="Retornos pendentes" valor={String(retornosPendentes)} />
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
            <h2 className="text-xl font-semibold mb-6">Cadastrar novo paciente</h2>

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

          {pacientesFiltrados.map((paciente, index) => (
            <div
              key={index}
              className="grid grid-cols-5 p-4 border-t border-gray-200 text-sm items-center"
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
          ))}
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