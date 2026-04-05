"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PainelCadastro from "@/components/PainelCadastro";
import { useLocalStorage } from "../../utils/useLocalStorage";
import { getUsuarioLogado, usuarioTemPermissao, User } from "../../utils/auth";

type Protocolo = {
  id: number;
  titulo: string;
  categoria: string;
  responsavel: string;
  status: string;
};

const STORAGE_KEY_PROTOCOLOS = "cohub_protocolos";

const protocoloInicial: Protocolo = {
  id: 0,
  titulo: "",
  categoria: "",
  responsavel: "",
  status: "Ativo",
};

const protocolosIniciais: Protocolo[] = [
  {
    id: 1,
    titulo: "Protocolo de Implante",
    categoria: "Cirúrgico",
    responsavel: "Ana Lucia Dentista",
    status: "Ativo",
  },
  {
    id: 2,
    titulo: "Protocolo de Clareamento",
    categoria: "Estético",
    responsavel: "Dr. Marcelo",
    status: "Em revisão",
  },
  {
    id: 3,
    titulo: "Protocolo de Avaliação Inicial",
    categoria: "Atendimento",
    responsavel: "Dra. Beatriz",
    status: "Ativo",
  },
];

export default function ProtocolosPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [protocoloSelecionadoId, setProtocoloSelecionadoId] = useState<number | null>(null);

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

  useEffect(() => {
    if (protocolos.length > 0 && protocoloSelecionadoId === null) {
      setProtocoloSelecionadoId(protocolos[0].id);
    }
  }, [protocolos, protocoloSelecionadoId]);

  function limparFormulario() {
    setNovoProtocolo({
      ...protocoloInicial,
      id: Date.now(),
    });
    setEditandoId(null);
  }

  function fecharFormulario() {
    limparFormulario();
    setMostrarFormulario(false);
  }

  function abrirFormulario() {
    if (mostrarFormulario) {
      fecharFormulario();
      return;
    }

    limparFormulario();
    setMostrarFormulario(true);
  }

  function salvarProtocolo(e: React.FormEvent) {
    e.preventDefault();

    if (
      !novoProtocolo.titulo.trim() ||
      !novoProtocolo.categoria.trim() ||
      !novoProtocolo.responsavel.trim()
    ) {
      return;
    }

    if (editandoId !== null) {
      setProtocolos((estadoAtual: Protocolo[]) =>
        estadoAtual.map((protocolo: Protocolo) =>
          protocolo.id === editandoId ? novoProtocolo : protocolo
        )
      );
      setProtocoloSelecionadoId(novoProtocolo.id);
    } else {
      const protocoloCriado = {
        ...novoProtocolo,
        id: Date.now(),
      };

      setProtocolos((estadoAtual: Protocolo[]) => [
        protocoloCriado,
        ...estadoAtual,
      ]);
      setProtocoloSelecionadoId(protocoloCriado.id);
    }

    fecharFormulario();
  }

  function editarProtocolo(protocolo: Protocolo) {
    setNovoProtocolo(protocolo);
    setEditandoId(protocolo.id);
    setMostrarFormulario(true);
    setProtocoloSelecionadoId(protocolo.id);
  }

  function excluirProtocolo(id: number) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este protocolo?"
    );

    if (!confirmar) return;

    const atualizados = protocolos.filter((protocolo) => protocolo.id !== id);
    setProtocolos(atualizados);

    if (protocoloSelecionadoId === id) {
      setProtocoloSelecionadoId(atualizados[0]?.id ?? null);
    }
  }

  const protocolosFiltrados = useMemo(() => {
    return protocolos.filter((protocolo) => {
      const termo = busca.toLowerCase().trim();

      const correspondeBusca =
        protocolo.titulo.toLowerCase().includes(termo) ||
        protocolo.categoria.toLowerCase().includes(termo) ||
        protocolo.responsavel.toLowerCase().includes(termo);

      const correspondeStatus =
        filtroStatus === "Todos" || protocolo.status === filtroStatus;

      return correspondeBusca && correspondeStatus;
    });
  }, [protocolos, busca, filtroStatus]);

  const protocoloSelecionado =
    protocolos.find((p) => p.id === protocoloSelecionadoId) || null;

  if (!usuario || !carregouProtocolos) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 text-[#1A1F4D]">
        Carregando...
      </main>
    );
  }

  const ativos = protocolos.filter((p) => p.status === "Ativo").length;
  const revisao = protocolos.filter((p) => p.status === "Em revisão").length;
  const inativos = protocolos.filter((p) => p.status === "Inativo").length;

  return (
    <main className="flex min-h-screen bg-[#F5F7FB] text-[#1A1F4D]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">Protocolos</h1>
              <p className="text-gray-600 mt-2">
                Visualize, organize e acompanhe os protocolos clínicos e operacionais.
              </p>
            </div>

            <button
              onClick={abrirFormulario}
              className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110 transition"
            >
              {mostrarFormulario ? "Fechar cadastro" : "Novo protocolo"}
            </button>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <ResumoCard
              titulo="Total de protocolos"
              valor={String(protocolos.length)}
              subtitulo="Todos os registros"
            />
            <ResumoCard
              titulo="Ativos"
              valor={String(ativos)}
              subtitulo="Protocolos em uso"
            />
            <ResumoCard
              titulo="Em revisão"
              valor={String(revisao)}
              subtitulo="Aguardando ajustes"
            />
            <ResumoCard
              titulo="Inativos"
              valor={String(inativos)}
              subtitulo="Protocolos pausados"
            />
          </div>

          <PainelCadastro
            aberto={mostrarFormulario}
            titulo={editandoId !== null ? "Editar protocolo" : "Cadastrar protocolo"}
            subtitulo="Preencha os dados do protocolo no mesmo padrão visual das outras telas."
            onFechar={fecharFormulario}
          >
            <form onSubmit={salvarProtocolo}>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Título do protocolo"
                  value={novoProtocolo.titulo}
                  onChange={(e) =>
                    setNovoProtocolo({ ...novoProtocolo, titulo: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:border-[#D4AF37]"
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:border-[#D4AF37]"
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:border-[#D4AF37]"
                />

                <select
                  value={novoProtocolo.status}
                  onChange={(e) =>
                    setNovoProtocolo({ ...novoProtocolo, status: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:border-[#D4AF37]"
                >
                  <option>Ativo</option>
                  <option>Em revisão</option>
                  <option>Inativo</option>
                </select>
              </div>

              <div className="mt-5 flex gap-3 flex-wrap">
                <button
                  type="submit"
                  className="bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110 transition"
                >
                  {editandoId !== null ? "Salvar alterações" : "Salvar protocolo"}
                </button>

                <button
                  type="button"
                  onClick={limparFormulario}
                  className="bg-white border border-gray-300 text-[#1A1F4D] px-5 py-3 rounded-xl font-bold hover:bg-gray-50 transition"
                >
                  Limpar
                </button>
              </div>
            </form>
          </PainelCadastro>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5 mb-6">
            <div className="grid lg:grid-cols-[1.5fr,220px,180px] gap-4">
              <input
                type="text"
                placeholder="Buscar por título, categoria ou responsável"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:border-[#D4AF37]"
              />

              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white outline-none focus:border-[#D4AF37]"
              >
                <option>Todos</option>
                <option>Ativo</option>
                <option>Em revisão</option>
                <option>Inativo</option>
              </select>

              <div className="rounded-xl bg-[#1A1F4D] text-white px-4 py-3 flex items-center justify-center font-semibold">
                {protocolosFiltrados.length} resultado(s)
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-[1.5fr,370px] gap-6">
            <div className="space-y-4">
              {protocolosFiltrados.length > 0 ? (
                protocolosFiltrados.map((protocolo) => (
                  <div
                    key={protocolo.id}
                    onClick={() => setProtocoloSelecionadoId(protocolo.id)}
                    className={`bg-white rounded-2xl shadow-sm border p-5 cursor-pointer transition ${
                      protocoloSelecionadoId === protocolo.id
                        ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/20"
                        : "border-gray-200 hover:border-[#D4AF37]/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-xl font-semibold">{protocolo.titulo}</h2>
                          <StatusBadge status={protocolo.status} />
                        </div>

                        <div className="grid md:grid-cols-3 gap-3 mt-4">
                          <InfoMini titulo="Categoria" valor={protocolo.categoria} />
                          <InfoMini titulo="Responsável" valor={protocolo.responsavel} />
                          <InfoMini titulo="Código" valor={`#${protocolo.id}`} />
                        </div>
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editarProtocolo(protocolo);
                          }}
                          className="text-[#1A1F4D] font-semibold hover:underline"
                        >
                          Editar
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            excluirProtocolo(protocolo.id);
                          }}
                          className="text-red-600 font-semibold hover:underline"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                  Nenhum protocolo encontrado com os filtros informados.
                </div>
              )}
            </div>

            <aside className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-fit sticky top-6">
              <div className="mb-5">
                <h2 className="text-xl font-semibold">Visão detalhada</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Acompanhe as informações do protocolo selecionado.
                </p>
              </div>

              {protocoloSelecionado ? (
                <>
                  <div className="rounded-2xl bg-[#1A1F4D] text-white p-5 mb-5">
                    <p className="text-xs uppercase tracking-wide opacity-80">
                      Protocolo selecionado
                    </p>
                    <h3 className="text-2xl font-bold mt-2">
                      {protocoloSelecionado.titulo}
                    </h3>
                    <div className="mt-3">
                      <StatusBadge status={protocoloSelecionado.status} invertido />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <InfoBloco label="Título" value={protocoloSelecionado.titulo} />
                    <InfoBloco label="Categoria" value={protocoloSelecionado.categoria} />
                    <InfoBloco label="Responsável" value={protocoloSelecionado.responsavel} />
                    <InfoBloco label="Status" value={protocoloSelecionado.status} />
                    <InfoBloco label="Identificador" value={`#${protocoloSelecionado.id}`} />
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  Selecione um protocolo para ver os detalhes.
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function ResumoCard({
  titulo,
  valor,
  subtitulo,
}: {
  titulo: string;
  valor: string;
  subtitulo: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
      <p className="text-sm font-semibold text-gray-500">{titulo}</p>
      <p className="text-3xl font-bold text-[#1A1F4D] mt-2">{valor}</p>
      <p className="text-sm text-gray-400 mt-2">{subtitulo}</p>
    </div>
  );
}

function StatusBadge({
  status,
  invertido = false,
}: {
  status: string;
  invertido?: boolean;
}) {
  const estilosPadrao: Record<string, string> = {
    Ativo: "bg-green-100 text-green-700 border border-green-200",
    "Em revisão": "bg-yellow-100 text-yellow-700 border border-yellow-200",
    Inativo: "bg-red-100 text-red-700 border border-red-200",
  };

  const estilosInvertidos: Record<string, string> = {
    Ativo: "bg-white/15 text-white border border-white/20",
    "Em revisão": "bg-white/15 text-white border border-white/20",
    Inativo: "bg-white/15 text-white border border-white/20",
  };

  const estilos = invertido ? estilosInvertidos : estilosPadrao;

  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
        estilos[status] ||
        (invertido
          ? "bg-white/15 text-white border border-white/20"
          : "bg-gray-100 text-gray-700 border border-gray-200")
      }`}
    >
      {status}
    </span>
  );
}

function InfoMini({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
      <p className="text-xs text-gray-400 font-semibold">{titulo}</p>
      <p className="text-sm font-medium mt-1">{valor}</p>
    </div>
  );
}

function InfoBloco({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-400 font-semibold">{label}</p>
      <p className="text-sm font-medium mt-1">{value}</p>
    </div>
  );
}