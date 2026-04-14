"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useLocalStorage } from "../../utils/useLocalStorage";
import { getUsuarioLogado, usuarioTemPermissao, User } from "../../utils/auth";

type Protocolo = {
  id: number;
  titulo: string;
  categoria: string;
  responsavel: string;
  status: string;
  etapas: string[];
};

const STORAGE_KEY_PROTOCOLOS = "cohub_protocolos";

const protocoloInicial: Protocolo = {
  id: 0,
  titulo: "",
  categoria: "",
  responsavel: "",
  status: "Ativo",
  etapas: [],
};

const protocolosIniciais: Protocolo[] = [
  {
    id: 1,
    titulo: "Protocolo de Implante",
    categoria: "Cirúrgico",
    responsavel: "Ana Lucia Dentista",
    status: "Ativo",
    etapas: [
      "Avaliação inicial",
      "Exames de imagem",
      "Planejamento cirúrgico",
      "Cirurgia",
      "Pós-operatório",
      "Retorno",
    ],
  },
  {
    id: 2,
    titulo: "Protocolo de Clareamento",
    categoria: "Estético",
    responsavel: "Dr. Marcelo",
    status: "Em revisão",
    etapas: [
      "Avaliação",
      "Profilaxia",
      "Aplicação",
      "Orientações",
      "Retorno",
    ],
  },
];

export default function ProtocolosPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [novaEtapa, setNovaEtapa] = useState("");

  const [novoProtocolo, setNovoProtocolo] = useState<Protocolo>({
    ...protocoloInicial,
    id: Date.now(),
  });

  const [protocolos, setProtocolos, carregouProtocolos] =
    useLocalStorage<Protocolo[]>(STORAGE_KEY_PROTOCOLOS, protocolosIniciais);

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

    if (!usuarioTemPermissao(usuarioLogado, ["admin", "dentista"])) {
      router.push("/dashboard");
      return;
    }

    setUsuario(usuarioLogado);
  }, [router]);

  function limparFormulario() {
    setNovoProtocolo({
      ...protocoloInicial,
      id: Date.now(),
    });
    setNovaEtapa("");
    setEditandoId(null);
  }

  function abrirFormulario() {
    if (mostrarFormulario) {
      limparFormulario();
      setMostrarFormulario(false);
      return;
    }

    limparFormulario();
    setMostrarFormulario(true);
  }

  function adicionarEtapa() {
    const etapaLimpa = novaEtapa.trim();
    if (!etapaLimpa) return;

    setNovoProtocolo((estadoAtual) => ({
      ...estadoAtual,
      etapas: [...estadoAtual.etapas, etapaLimpa],
    }));

    setNovaEtapa("");
  }

  function removerEtapa(index: number) {
    setNovoProtocolo((estadoAtual) => ({
      ...estadoAtual,
      etapas: estadoAtual.etapas.filter((_, i) => i !== index),
    }));
  }

  function salvarProtocolo(e: React.FormEvent) {
    e.preventDefault();

    if (
      !novoProtocolo.titulo ||
      !novoProtocolo.categoria ||
      !novoProtocolo.responsavel ||
      novoProtocolo.etapas.length === 0
    ) {
      return;
    }

    if (editandoId !== null) {
      setProtocolos((estadoAtual: Protocolo[]) =>
        estadoAtual.map((protocolo: Protocolo) =>
          protocolo.id === editandoId ? novoProtocolo : protocolo
        )
      );
    } else {
      setProtocolos((estadoAtual: Protocolo[]) => [
        { ...novoProtocolo, id: Date.now() },
        ...estadoAtual,
      ]);
    }

    limparFormulario();
    setMostrarFormulario(false);
  }

  function editarProtocolo(protocolo: Protocolo) {
    setNovoProtocolo(protocolo);
    setEditandoId(protocolo.id);
    setNovaEtapa("");
    setMostrarFormulario(true);
  }

  function excluirProtocolo(id: number) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este protocolo?"
    );

    if (!confirmar) return;

    setProtocolos((estadoAtual: Protocolo[]) =>
      estadoAtual.filter((protocolo: Protocolo) => protocolo.id !== id)
    );
  }

  if (!usuario || !carregouProtocolos) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 text-[#1A1F4D]">
        Carregando...
      </main>
    );
  }

  const ativos = protocolos.filter(
    (p: Protocolo) => p.status === "Ativo"
  ).length;

  const totalEtapas = protocolos.reduce(
    (acc: number, protocolo: Protocolo) => acc + protocolo.etapas.length,
    0
  );

  return (
    <main className="flex min-h-screen bg-gray-100 text-[#1A1F4D]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 p-8">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Protocolos</h1>
            <p className="text-gray-600 mt-2">
              Crie fluxos clínicos com etapas para acompanhar o progresso dos pacientes.
            </p>
          </div>

          <button
            onClick={abrirFormulario}
            className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
          >
            {mostrarFormulario ? "Fechar formulário" : "Novo protocolo"}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <ResumoCard titulo="Total de protocolos" valor={String(protocolos.length)} />
          <ResumoCard titulo="Ativos" valor={String(ativos)} />
          <ResumoCard titulo="Total de etapas" valor={String(totalEtapas)} />
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={salvarProtocolo}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">
              {editandoId !== null ? "Editar protocolo" : "Cadastrar protocolo"}
            </h2>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Título do protocolo"
                value={novoProtocolo.titulo}
                onChange={(e) =>
                  setNovoProtocolo({ ...novoProtocolo, titulo: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
              />

              <input
                type="text"
                placeholder="Categoria"
                value={novoProtocolo.categoria}
                onChange={(e) =>
                  setNovoProtocolo({
                    ...novoProtocolo,
                    categoria: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
              />

              <input
                type="text"
                placeholder="Responsável"
                value={novoProtocolo.responsavel}
                onChange={(e) =>
                  setNovoProtocolo({
                    ...novoProtocolo,
                    responsavel: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
              />

              <select
                value={novoProtocolo.status}
                onChange={(e) =>
                  setNovoProtocolo({ ...novoProtocolo, status: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
              >
                <option>Ativo</option>
                <option>Em revisão</option>
                <option>Inativo</option>
              </select>
            </div>

            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold mb-3">Etapas do protocolo</h3>

              <div className="flex gap-3 flex-wrap mb-4">
                <input
                  type="text"
                  placeholder="Digite uma etapa"
                  value={novaEtapa}
                  onChange={(e) => setNovaEtapa(e.target.value)}
                  className="flex-1 min-w-[240px] border border-gray-300 rounded-xl px-4 py-3 bg-white"
                />

                <button
                  type="button"
                  onClick={adicionarEtapa}
                  className="bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
                >
                  Adicionar etapa
                </button>
              </div>

              <div className="space-y-2">
                {novoProtocolo.etapas.length > 0 ? (
                  novoProtocolo.etapas.map((etapa, index) => (
                    <div
                      key={`${etapa}-${index}`}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3"
                    >
                      <span className="text-sm">
                        {index + 1}. {etapa}
                      </span>

                      <button
                        type="button"
                        onClick={() => removerEtapa(index)}
                        className="text-red-600 font-semibold hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    Nenhuma etapa adicionada ainda.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-3 flex-wrap">
              <button
                type="submit"
                className="bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
              >
                {editandoId !== null ? "Salvar alterações" : "Salvar protocolo"}
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

        <div className="space-y-4">
          {protocolos.map((protocolo: Protocolo) => (
            <div
              key={protocolo.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-semibold">{protocolo.titulo}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {protocolo.categoria} • {protocolo.responsavel}
                  </p>

                  <div className="mt-3">
                    <StatusBadge status={protocolo.status} />
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => editarProtocolo(protocolo)}
                    className="text-[#1A1F4D] font-semibold hover:underline"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => excluirProtocolo(protocolo.id)}
                    className="text-red-600 font-semibold hover:underline"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="font-semibold mb-3">Etapas</h3>

                <div className="grid md:grid-cols-2 gap-3">
                  {protocolo.etapas.map((etapa, index) => (
                    <div
                      key={`${protocolo.id}-${index}`}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm"
                    >
                      {index + 1}. {etapa}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
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

function StatusBadge({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    Ativo: "bg-green-100 text-green-700",
    "Em revisão": "bg-yellow-100 text-yellow-700",
    Inativo: "bg-red-100 text-red-700",
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