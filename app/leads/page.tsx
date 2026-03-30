"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getUsuarioLogado, usuarioTemPermissao, User } from "../../utils/auth";

type Lead = {
  nome: string;
  interesse: string;
  status: string;
  origem: string;
};

export default function LeadsPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);

  const [leads, setLeads] = useState<Lead[]>([
    {
      nome: "Mariana Costa",
      interesse: "Implante",
      status: "Aguardando retorno",
      origem: "Instagram",
    },
    {
      nome: "Carlos Henrique",
      interesse: "Lente dental",
      status: "Agendamento realizado",
      origem: "WhatsApp",
    },
    {
      nome: "Fernanda Alves",
      interesse: "Clareamento",
      status: "Em negociação",
      origem: "Indicação",
    },
    {
      nome: "Rafaela Souza",
      interesse: "Avaliação geral",
      status: "Novo lead",
      origem: "Site",
    },
  ]);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [novoLead, setNovoLead] = useState<Lead>({
    nome: "",
    interesse: "",
    status: "Novo lead",
    origem: "",
  });

  useEffect(() => {
  const usuarioLogado = getUsuarioLogado();

  if (!usuarioLogado) {
    router.push("/login");
    return;
  }

  if (!usuarioTemPermissao(usuarioLogado, ["admin", "crc"])) {
    router.push("/dashboard");
    return;
  }

  setUsuario(usuarioLogado);
}, [router]);

  function adicionarLead(e: React.FormEvent) {
    e.preventDefault();

    if (!novoLead.nome || !novoLead.interesse || !novoLead.origem) {
      return;
    }

    setLeads((estadoAtual) => [novoLead, ...estadoAtual]);

    setNovoLead({
      nome: "",
      interesse: "",
      status: "Novo lead",
      origem: "",
    });

    setMostrarFormulario(false);
  }

  if (!usuario) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 text-[#1A1F4D]">
        Carregando...
      </main>
    );
  }

  const totalLeads = leads.length;
  const totalConvertidos = leads.filter(
    (lead) => lead.status === "Agendamento realizado"
  ).length;
  const taxaConversao =
    totalLeads > 0 ? Math.round((totalConvertidos / totalLeads) * 100) : 0;

  return (
    <main className="flex min-h-screen bg-gray-100 text-[#1A1F4D]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 p-8">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Leads</h1>
            <p className="text-gray-600 mt-2">
              Acompanhe contatos, interesses e conversões da clínica.
            </p>
          </div>

          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
          >
            {mostrarFormulario ? "Fechar formulário" : "Novo Lead"}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <ResumoCard titulo="Leads do mês" valor={String(totalLeads)} />
          <ResumoCard titulo="Conversões" valor={String(totalConvertidos)} />
          <ResumoCard titulo="Taxa de conversão" valor={`${taxaConversao}%`} />
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={adicionarLead}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">Cadastrar novo lead</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome do lead"
                value={novoLead.nome}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, nome: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              />

              <input
                type="text"
                placeholder="Interesse"
                value={novoLead.interesse}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, interesse: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              />

              <select
                value={novoLead.status}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, status: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              >
                <option>Novo lead</option>
                <option>Em negociação</option>
                <option>Aguardando retorno</option>
                <option>Agendamento realizado</option>
              </select>

              <input
                type="text"
                placeholder="Origem"
                value={novoLead.origem}
                onChange={(e) =>
                  setNovoLead({ ...novoLead, origem: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[#1A1F4D] bg-white"
              />
            </div>

            <button
              type="submit"
              className="mt-4 bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
            >
              Salvar lead
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-4 bg-[#1A1F4D] text-white font-semibold p-4">
            <span>Nome</span>
            <span>Interesse</span>
            <span>Status</span>
            <span>Origem</span>
          </div>

          {leads.map((lead, index) => (
            <div
              key={index}
              className="grid grid-cols-4 p-4 border-t border-gray-200 text-sm items-center"
            >
              <span>{lead.nome}</span>
              <span>{lead.interesse}</span>
              <span>
                <StatusBadge status={lead.status} />
              </span>
              <span>{lead.origem}</span>
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
    "Novo lead": "bg-blue-100 text-blue-700",
    "Em negociação": "bg-yellow-100 text-yellow-700",
    "Aguardando retorno": "bg-orange-100 text-orange-700",
    "Agendamento realizado": "bg-green-100 text-green-700",
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