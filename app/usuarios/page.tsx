"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import FichaOverlay from "@/components/FichaOverlay";
import { useLocalStorage } from "../../utils/useLocalStorage";
import { getUsuarioLogado, usuarioTemPermissao, User } from "../../utils/auth";

type PerfilUsuario = "admin" | "recepcao" | "dentista" | "financeiro" | "crc";

type UsuarioSistema = {
  id: number;
  nome: string;
  email: string;
  role: PerfilUsuario;
  status: "Ativo" | "Inativo";
  ultimoAcesso: string;
  observacoes: string;
};

const STORAGE_KEY_USUARIOS = "cohub_usuarios";

const usuarioInicial: UsuarioSistema = {
  id: 0,
  nome: "",
  email: "",
  role: "recepcao",
  status: "Ativo",
  ultimoAcesso: "",
  observacoes: "",
};

const usuariosIniciais: UsuarioSistema[] = [
  {
    id: 1,
    nome: "Luciana Paula Santos Rocha",
    email: "luciana@cohub.com",
    role: "admin",
    status: "Ativo",
    ultimoAcesso: "2026-04-03 08:42",
    observacoes: "Acesso total ao sistema.",
  },
  {
    id: 2,
    nome: "Ana Lucia Dentista",
    email: "ana.lucia@cohub.com",
    role: "dentista",
    status: "Ativo",
    ultimoAcesso: "2026-04-03 09:10",
    observacoes: "Responsável por atendimentos clínicos.",
  },
  {
    id: 3,
    nome: "Marcelo Oliveira",
    email: "marcelo@cohub.com",
    role: "dentista",
    status: "Ativo",
    ultimoAcesso: "2026-04-02 17:35",
    observacoes: "Atuação em protocolos estéticos.",
  },
  {
    id: 4,
    nome: "Juliana Recepção",
    email: "juliana@cohub.com",
    role: "recepcao",
    status: "Ativo",
    ultimoAcesso: "2026-04-03 07:58",
    observacoes: "Controle de agenda e recepção.",
  },
  {
    id: 5,
    nome: "Paulo Financeiro",
    email: "paulo@cohub.com",
    role: "financeiro",
    status: "Inativo",
    ultimoAcesso: "2026-03-28 14:20",
    observacoes: "Usuário temporariamente desativado.",
  },
];

export default function UsuariosPage() {
  const router = useRouter();

  const [usuarioLogado, setUsuarioLogado] = useState<User | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<UsuarioSistema | null>(null);
  const [modoFicha, setModoFicha] = useState<"novo" | "visualizar" | "editar" | null>(null);
  const [novoUsuario, setNovoUsuario] = useState<UsuarioSistema>({
    ...usuarioInicial,
    id: Date.now(),
  });

  const [usuarios, setUsuarios, carregouUsuarios] =
    useLocalStorage<UsuarioSistema[]>(STORAGE_KEY_USUARIOS, usuariosIniciais);

  useEffect(() => {
    const usuarioAtual = getUsuarioLogado();

    if (!usuarioAtual) {
      router.push("/login");
      return;
    }

    if (!usuarioTemPermissao(usuarioAtual, ["admin"])) {
      router.push("/dashboard");
      return;
    }

    setUsuarioLogado(usuarioAtual);
  }, [router]);

  function abrirNovoUsuario() {
    const vazio = {
      ...usuarioInicial,
      id: Date.now(),
      ultimoAcesso: "-",
    };

    setNovoUsuario(vazio);
    setUsuarioSelecionado(vazio);
    setModoFicha("novo");
  }

  function abrirUsuario(usuario: UsuarioSistema) {
    setUsuarioSelecionado(usuario);
    setNovoUsuario(usuario);
    setModoFicha("visualizar");
  }

  function editarUsuario(usuario: UsuarioSistema) {
    setUsuarioSelecionado(usuario);
    setNovoUsuario(usuario);
    setModoFicha("editar");
  }

  function fecharFicha() {
    setUsuarioSelecionado(null);
    setModoFicha(null);
    setNovoUsuario({
      ...usuarioInicial,
      id: Date.now(),
    });
  }

  function salvarUsuario(e: React.FormEvent) {
    e.preventDefault();

    if (!novoUsuario.nome.trim() || !novoUsuario.email.trim()) {
      alert("Preencha nome e email.");
      return;
    }

    const emailDuplicado = usuarios.some(
      (usuario) =>
        usuario.email.toLowerCase() === novoUsuario.email.toLowerCase() &&
        usuario.id !== novoUsuario.id
    );

    if (emailDuplicado) {
      alert("Já existe um usuário com esse email.");
      return;
    }

    if (modoFicha === "editar" && usuarioSelecionado) {
      setUsuarios((estadoAtual) =>
        estadoAtual.map((usuario) =>
          usuario.id === usuarioSelecionado.id ? novoUsuario : usuario
        )
      );
    } else {
      const criado: UsuarioSistema = {
        ...novoUsuario,
        id: Date.now(),
        ultimoAcesso: "Nunca acessou",
      };

      setUsuarios((estadoAtual) => [criado, ...estadoAtual]);
    }

    fecharFicha();
  }

  function excluirUsuario(id: number) {
    const usuario = usuarios.find((item) => item.id === id);
    if (!usuario) return;

    const confirmar = window.confirm(
      `Tem certeza que deseja excluir o usuário ${usuario.nome}?`
    );

    if (!confirmar) return;

    setUsuarios((estadoAtual) => estadoAtual.filter((item) => item.id !== id));

    if (usuarioSelecionado?.id === id) {
      fecharFicha();
    }
  }

  function alternarStatus(id: number) {
    setUsuarios((estadoAtual) =>
      estadoAtual.map((usuario) => {
        if (usuario.id !== id) return usuario;

        return {
          ...usuario,
          status: usuario.status === "Ativo" ? "Inativo" : "Ativo",
        };
      })
    );

    if (usuarioSelecionado?.id === id) {
      setUsuarioSelecionado((atual) =>
        atual
          ? {
              ...atual,
              status: atual.status === "Ativo" ? "Inativo" : "Ativo",
            }
          : null
      );

      setNovoUsuario((atual) => ({
        ...atual,
        status: atual.status === "Ativo" ? "Inativo" : "Ativo",
      }));
    }
  }

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((usuario) => {
      const termo = busca.toLowerCase().trim();

      const bateBusca =
        usuario.nome.toLowerCase().includes(termo) ||
        usuario.email.toLowerCase().includes(termo) ||
        usuario.role.toLowerCase().includes(termo);

      const bateStatus =
        filtroStatus === "Todos" || usuario.status === filtroStatus;

      return bateBusca && bateStatus;
    });
  }, [usuarios, busca, filtroStatus]);

  const totalUsuarios = usuarios.length;
  const usuariosAtivos = usuarios.filter((usuario) => usuario.status === "Ativo").length;
  const usuariosInativos = usuarios.filter((usuario) => usuario.status === "Inativo").length;
  const admins = usuarios.filter((usuario) => usuario.role === "admin").length;

  if (!usuarioLogado || !carregouUsuarios) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 text-[#1A1F4D]">
        Carregando...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#F5F7FB] text-[#1A1F4D]">
      <Sidebar nome={usuarioLogado.nome} role={usuarioLogado.role} />

      <section className="flex-1 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">Usuários</h1>
              <p className="text-gray-600 mt-2">
                Gerencie usuários ativos, permissões e acessos do sistema.
              </p>
            </div>

            <button
              onClick={abrirNovoUsuario}
              className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110 transition"
            >
              Novo usuário
            </button>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <ResumoCard titulo="Total de usuários" valor={String(totalUsuarios)} />
            <ResumoCard titulo="Ativos" valor={String(usuariosAtivos)} />
            <ResumoCard titulo="Inativos" valor={String(usuariosInativos)} />
            <ResumoCard titulo="Admins" valor={String(admins)} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-5 mb-6">
            <div className="grid lg:grid-cols-[1.5fr,220px] gap-4">
              <input
                type="text"
                placeholder="Buscar por nome, email ou perfil"
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
                <option>Inativo</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {usuariosFiltrados.length > 0 ? (
              usuariosFiltrados.map((usuario) => (
                <div
                  key={usuario.id}
                  onClick={() => abrirUsuario(usuario)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:border-[#D4AF37]/50 transition"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-xl font-semibold">{usuario.nome}</h2>
                        <StatusBadge status={usuario.status} />
                        <RoleBadge role={usuario.role} />
                      </div>

                      <div className="grid md:grid-cols-3 gap-3 mt-4">
                        <InfoMini titulo="Email" valor={usuario.email} />
                        <InfoMini titulo="Último acesso" valor={usuario.ultimoAcesso} />
                        <InfoMini titulo="Código" valor={`#${usuario.id}`} />
                      </div>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          editarUsuario(usuario);
                        }}
                        className="text-[#1A1F4D] font-semibold hover:underline"
                      >
                        Editar
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alternarStatus(usuario.id);
                        }}
                        className="text-orange-600 font-semibold hover:underline"
                      >
                        {usuario.status === "Ativo" ? "Inativar" : "Ativar"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          excluirUsuario(usuario.id);
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
                Nenhum usuário encontrado com os filtros informados.
              </div>
            )}
          </div>

          <FichaOverlay
            aberto={!!usuarioSelecionado}
            titulo={
              modoFicha === "novo"
                ? "Cadastrar usuário"
                : modoFicha === "editar"
                ? "Editar usuário"
                : "Ficha do usuário"
            }
            subtitulo="Gerencie os dados e permissões do usuário."
            onFechar={fecharFicha}
            acoes={
              usuarioSelecionado && (
                <>
                  {modoFicha === "visualizar" && (
                    <>
                      <button
                        type="button"
                        onClick={() => editarUsuario(usuarioSelecionado)}
                        className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110 transition"
                      >
                        Editar usuário
                      </button>

                      <button
                        type="button"
                        onClick={() => alternarStatus(usuarioSelecionado.id)}
                        className="bg-orange-500 text-white px-5 py-3 rounded-xl font-bold hover:brightness-110 transition"
                      >
                        {usuarioSelecionado.status === "Ativo" ? "Inativar" : "Ativar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => excluirUsuario(usuarioSelecionado.id)}
                        className="bg-red-500 text-white px-5 py-3 rounded-xl font-bold hover:brightness-110 transition"
                      >
                        Excluir usuário
                      </button>
                    </>
                  )}

                  {modoFicha === "editar" && (
                    <button
                      type="button"
                      onClick={() => abrirUsuario(novoUsuario)}
                      className="bg-white/10 text-white px-5 py-3 rounded-xl font-bold hover:bg-white/20 transition"
                    >
                      Cancelar edição
                    </button>
                  )}
                </>
              )
            }
          >
            {usuarioSelecionado && (modoFicha === "novo" || modoFicha === "editar") ? (
              <form onSubmit={salvarUsuario}>
                <div className="grid lg:grid-cols-2 gap-6">
                  <BlocoFormulario titulo="Dados do usuário">
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Nome completo"
                        value={novoUsuario.nome}
                        onChange={(e) =>
                          setNovoUsuario({ ...novoUsuario, nome: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                      />

                      <input
                        type="email"
                        placeholder="Email"
                        value={novoUsuario.email}
                        onChange={(e) =>
                          setNovoUsuario({ ...novoUsuario, email: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                      />

                      <select
                        value={novoUsuario.role}
                        onChange={(e) =>
                          setNovoUsuario({
                            ...novoUsuario,
                            role: e.target.value as PerfilUsuario,
                          })
                        }
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                      >
                        <option value="admin">Admin</option>
                        <option value="recepcao">Recepção</option>
                        <option value="dentista">Dentista</option>
                        <option value="financeiro">Financeiro</option>
                        <option value="crc">CRC</option>
                      </select>

                      <select
                        value={novoUsuario.status}
                        onChange={(e) =>
                          setNovoUsuario({
                            ...novoUsuario,
                            status: e.target.value as "Ativo" | "Inativo",
                          })
                        }
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
                      >
                        <option>Ativo</option>
                        <option>Inativo</option>
                      </select>
                    </div>
                  </BlocoFormulario>

                  <BlocoFormulario titulo="Observações">
                    <textarea
                      placeholder="Anotações internas"
                      value={novoUsuario.observacoes}
                      onChange={(e) =>
                        setNovoUsuario({
                          ...novoUsuario,
                          observacoes: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white min-h-[180px]"
                    />
                  </BlocoFormulario>
                </div>

                <button
                  type="submit"
                  className="mt-6 bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
                >
                  {modoFicha === "editar" ? "Salvar alterações" : "Salvar usuário"}
                </button>
              </form>
            ) : usuarioSelecionado ? (
              <div className="grid md:grid-cols-2 gap-6">
                <InfoBloco label="Nome" value={usuarioSelecionado.nome} />
                <InfoBloco label="Email" value={usuarioSelecionado.email} />
                <InfoBloco label="Perfil" value={formatarRole(usuarioSelecionado.role)} />
                <InfoBloco label="Status" value={usuarioSelecionado.status} />
                <InfoBloco label="Último acesso" value={usuarioSelecionado.ultimoAcesso} />
                <InfoBloco
                  label="Observações"
                  value={usuarioSelecionado.observacoes || "-"}
                />
              </div>
            ) : null}
          </FichaOverlay>
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

function RoleBadge({ role }: { role: PerfilUsuario }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#1A1F4D]/10 text-[#1A1F4D]">
      {formatarRole(role)}
    </span>
  );
}

function InfoMini({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
      <p className="text-xs text-gray-400 font-semibold">{titulo}</p>
      <p className="text-sm font-medium mt-1">{valor || "-"}</p>
    </div>
  );
}

function InfoBloco({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-[#1A1F4D] mt-2">{value || "-"}</p>
    </div>
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
      <h3 className="text-xl font-semibold mb-4 text-[#1A1F4D]">{titulo}</h3>
      {children}
    </div>
  );
}

function formatarRole(role: PerfilUsuario) {
  const labels: Record<PerfilUsuario, string> = {
    admin: "Admin",
    recepcao: "Recepção",
    dentista: "Dentista",
    financeiro: "Financeiro",
    crc: "CRC",
  };

  return labels[role];
}