"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useLocalStorage } from "../../utils/useLocalStorage";
import { getUsuarioLogado, usuarioTemPermissao, User } from "../../utils/auth";

type UsuarioSistema = {
  id: number;
  nome: string;
  email: string;
  role: string;
  status: string;
};

const STORAGE_KEY_USUARIOS = "cohub_usuarios";

const usuarioInicial: UsuarioSistema = {
  id: 0,
  nome: "",
  email: "",
  role: "recepcao",
  status: "Ativo",
};

const usuariosIniciais: UsuarioSistema[] = [
  {
    id: 1,
    nome: "Luana Admin",
    email: "luadmin@cohub.com",
    role: "admin",
    status: "Ativo",
  },
  {
    id: 2,
    nome: "Recepção CO",
    email: "recepcao@cohub.com",
    role: "recepcao",
    status: "Ativo",
  },
  {
    id: 3,
    nome: "Ana Lucia",
    email: "analucia@cohub.com",
    role: "dentista",
    status: "Ativo",
  },
  {
    id: 4,
    nome: "Financeiro CO",
    email: "financeiro@cohub.com",
    role: "financeiro",
    status: "Ativo",
  },
  {
    id: 5,
    nome: "CRC CO",
    email: "crc@cohub.com",
    role: "crc",
    status: "Ativo",
  },
];

export default function UsuariosPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [novoUsuario, setNovoUsuario] = useState<UsuarioSistema>({
    ...usuarioInicial,
    id: Date.now(),
  });

  const [usuarios, setUsuarios, carregouUsuarios] =
    useLocalStorage<UsuarioSistema[]>(STORAGE_KEY_USUARIOS, usuariosIniciais);

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

    if (!usuarioTemPermissao(usuarioLogado, ["admin"])) {
      router.push("/dashboard");
      return;
    }

    setUsuario(usuarioLogado);
  }, [router]);

  function limparFormulario() {
    setNovoUsuario({
      ...usuarioInicial,
      id: Date.now(),
    });
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

  function salvarUsuario(e: React.FormEvent) {
    e.preventDefault();

    if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.role) {
      return;
    }

    const emailDuplicado = usuarios.some(
      (item: UsuarioSistema) =>
        item.email === novoUsuario.email && item.id !== editandoId
    );

    if (emailDuplicado) {
      alert("Já existe um usuário com esse e-mail.");
      return;
    }

    if (editandoId !== null) {
      setUsuarios((estadoAtual: UsuarioSistema[]) =>
        estadoAtual.map((item: UsuarioSistema) =>
          item.id === editandoId ? novoUsuario : item
        )
      );
    } else {
      setUsuarios((estadoAtual: UsuarioSistema[]) => [
        { ...novoUsuario, id: Date.now() },
        ...estadoAtual,
      ]);
    }

    limparFormulario();
    setMostrarFormulario(false);
  }

  function editarUsuario(item: UsuarioSistema) {
    setNovoUsuario(item);
    setEditandoId(item.id);
    setMostrarFormulario(true);
  }

  function excluirUsuario(id: number) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este usuário?"
    );

    if (!confirmar) return;

    setUsuarios((estadoAtual: UsuarioSistema[]) =>
      estadoAtual.filter((item: UsuarioSistema) => item.id !== id)
    );
  }

  if (!usuario || !carregouUsuarios) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 text-[#1A1F4D]">
        Carregando...
      </main>
    );
  }

  const ativos = usuarios.filter(
    (u: UsuarioSistema) => u.status === "Ativo"
  ).length;

  return (
    <main className="flex min-h-screen bg-gray-100 text-[#1A1F4D]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 p-8">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Usuários</h1>
            <p className="text-gray-600 mt-2">
              Gerencie os perfis com acesso ao sistema.
            </p>
          </div>

          <button
            onClick={abrirFormulario}
            className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
          >
            {mostrarFormulario ? "Fechar formulário" : "Novo usuário"}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <ResumoCard titulo="Total de usuários" valor={String(usuarios.length)} />
          <ResumoCard titulo="Usuários ativos" valor={String(ativos)} />
          <ResumoCard titulo="Perfis cadastrados" valor="5" />
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={salvarUsuario}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
          >
            <h2 className="text-xl font-semibold mb-4">
              {editandoId !== null ? "Editar usuário" : "Cadastrar usuário"}
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome"
                value={novoUsuario.nome}
                onChange={(e) =>
                  setNovoUsuario({ ...novoUsuario, nome: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
              />

              <input
                type="email"
                placeholder="E-mail"
                value={novoUsuario.email}
                onChange={(e) =>
                  setNovoUsuario({ ...novoUsuario, email: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
              />

              <select
                value={novoUsuario.role}
                onChange={(e) =>
                  setNovoUsuario({ ...novoUsuario, role: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
              >
                <option value="admin">admin</option>
                <option value="recepcao">recepcao</option>
                <option value="dentista">dentista</option>
                <option value="financeiro">financeiro</option>
                <option value="crc">crc</option>
              </select>

              <select
                value={novoUsuario.status}
                onChange={(e) =>
                  setNovoUsuario({ ...novoUsuario, status: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white"
              >
                <option>Ativo</option>
                <option>Inativo</option>
              </select>
            </div>

            <div className="mt-4 flex gap-3 flex-wrap">
              <button
                type="submit"
                className="bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
              >
                {editandoId !== null ? "Salvar alterações" : "Salvar usuário"}
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-6 bg-[#1A1F4D] text-white font-semibold p-4">
            <span>Nome</span>
            <span>E-mail</span>
            <span>Perfil</span>
            <span>Status</span>
            <span>Ações</span>
            <span></span>
          </div>

          {usuarios.map((item: UsuarioSistema) => (
            <div
              key={item.id}
              className="grid grid-cols-6 p-4 border-t border-gray-200 text-sm items-center"
            >
              <span>{item.nome}</span>
              <span>{item.email}</span>
              <span className="capitalize">{item.role}</span>
              <span>
                <StatusBadge status={item.status} />
              </span>

              <button
                onClick={() => editarUsuario(item)}
                className="text-[#1A1F4D] font-semibold hover:underline text-left"
              >
                Editar
              </button>

              <button
                onClick={() => excluirUsuario(item.id)}
                className="text-red-600 font-semibold hover:underline text-left"
              >
                Excluir
              </button>
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