"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, logoutUsuario, User } from "@/utils/auth";

type PerfilUsuario =
  | "mentor"
  | "mentorado"
  | "financeiro"
  | "progresso"
  | "modulos";

type StatusUsuario = "Ativo" | "Pendente" | "Inativo";

type UsuarioSistema = {
  id: string;
  nome: string;
  email: string;
  role: PerfilUsuario;
  telefone: string | null;
  status: StatusUsuario | null;
  created_at: string;
};

type ModalAcao = "editar" | "inativar" | "excluir" | null;

export default function UsuariosPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [busca, setBusca] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modalAcao, setModalAcao] = useState<ModalAcao>(null);
  const [usuarioSelecionado, setUsuarioSelecionado] =
    useState<UsuarioSistema | null>(null);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("123456");
  const [perfil, setPerfil] = useState<PerfilUsuario>("mentorado");

  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editPerfil, setEditPerfil] = useState<PerfilUsuario>("mentorado");
  const [editStatus, setEditStatus] = useState<StatusUsuario>("Ativo");

  useEffect(() => {
    const usuarioAtual = getUsuarioLogado();

    if (!usuarioAtual) {
      router.replace("/login");
      return;
    }

    if (usuarioAtual.role === "mentorado") {
      router.replace("/mentorado/dashboard");
      return;
    }

    setUsuario(usuarioAtual);
    carregarUsuarios();
  }, [router]);

  async function pegarToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }

  async function carregarUsuarios() {
    setCarregando(true);
    setErro("");

    const token = await pegarToken();

    if (!token) {
      setErro("Sessão expirada. Entre novamente.");
      setCarregando(false);
      return;
    }

    const resposta = await fetch("/api/admin/usuarios", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await resposta.json();

    if (!resposta.ok) {
      setErro(json.error ?? "Erro ao carregar usuários.");
      setCarregando(false);
      return;
    }

    setUsuarios(json.usuarios ?? []);
    setCarregando(false);
  }

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((item) =>
      `${item.nome} ${item.email} ${item.role} ${item.status ?? ""}`
        .toLowerCase()
        .includes(busca.toLowerCase())
    );
  }, [usuarios, busca]);

  const resumo = useMemo(() => {
    return {
      total: usuarios.length,
      ativos: usuarios.filter((item) => (item.status ?? "Ativo") === "Ativo")
        .length,
      inativos: usuarios.filter((item) => item.status === "Inativo").length,
      mentorados: usuarios.filter((item) => item.role === "mentorado").length,
      mentores: usuarios.filter((item) => item.role === "mentor").length,
    };
  }, [usuarios]);

  function sair() {
    logoutUsuario();
    supabase.auth.signOut();
    router.replace("/login");
  }

  function limparFormulario() {
    setNome("");
    setEmail("");
    setTelefone("");
    setSenha("123456");
    setPerfil("mentorado");
  }

  function fecharModal() {
    setModalAcao(null);
    setUsuarioSelecionado(null);
    setEditNome("");
    setEditEmail("");
    setEditTelefone("");
    setEditPerfil("mentorado");
    setEditStatus("Ativo");
  }

  function abrirEditar(item: UsuarioSistema) {
    setUsuarioSelecionado(item);
    setEditNome(item.nome);
    setEditEmail(item.email);
    setEditTelefone(item.telefone ?? "");
    setEditPerfil(item.role);
    setEditStatus(item.status ?? "Ativo");
    setErro("");
    setSucesso("");
    setModalAcao("editar");
  }

  function abrirInativar(item: UsuarioSistema) {
    setUsuarioSelecionado(item);
    setErro("");
    setSucesso("");
    setModalAcao("inativar");
  }

  function abrirExcluir(item: UsuarioSistema) {
    setUsuarioSelecionado(item);
    setErro("");
    setSucesso("");
    setModalAcao("excluir");
  }

  async function criarUsuario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setSucesso("");
    setSalvando(true);

    const token = await pegarToken();

    if (!token) {
      setErro("Sessão expirada. Entre novamente.");
      setSalvando(false);
      return;
    }

    const resposta = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nome,
        email,
        telefone,
        senha,
        role: perfil,
      }),
    });

    const json = await resposta.json();

    if (!resposta.ok) {
      setErro(json.error ?? "Erro ao criar usuário.");
      setSalvando(false);
      return;
    }

    setUsuarios((atual) => [json.usuario, ...atual]);
    limparFormulario();
    setMostrarFormulario(false);
    setSucesso("Usuário criado com sucesso.");
    setSalvando(false);
  }

  async function salvarEdicao(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!usuarioSelecionado) return;

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const { error } = await supabase
        .from("profiles")
        .update({
          nome: editNome.trim(),
          email: editEmail.trim(),
          telefone: editTelefone.trim() || null,
          role: editPerfil,
          status: editStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usuarioSelecionado.id);

      if (error) {
        throw new Error(error.message);
      }

      setUsuarios((atual) =>
        atual.map((item) =>
          item.id === usuarioSelecionado.id
            ? {
                ...item,
                nome: editNome.trim(),
                email: editEmail.trim(),
                telefone: editTelefone.trim() || null,
                role: editPerfil,
                status: editStatus,
              }
            : item
        )
      );

      setSucesso("Usuário atualizado com sucesso.");
      fecharModal();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o usuário."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarInativacao() {
    if (!usuarioSelecionado) return;

    const novoStatus: StatusUsuario =
      usuarioSelecionado.status === "Inativo" ? "Ativo" : "Inativo";

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const { error } = await supabase
        .from("profiles")
        .update({
          status: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usuarioSelecionado.id);

      if (error) {
        throw new Error(error.message);
      }

      setUsuarios((atual) =>
        atual.map((item) =>
          item.id === usuarioSelecionado.id
            ? {
                ...item,
                status: novoStatus,
              }
            : item
        )
      );

      setSucesso(
        novoStatus === "Inativo"
          ? "Usuário inativado com sucesso."
          : "Usuário reativado com sucesso."
      );

      fecharModal();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o status do usuário."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!usuarioSelecionado) return;

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", usuarioSelecionado.id);

      if (error) {
        throw new Error(error.message);
      }

      setUsuarios((atual) =>
        atual.filter((item) => item.id !== usuarioSelecionado.id)
      );

      setSucesso("Usuário removido da lista com sucesso.");
      fecharModal();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o usuário."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] text-[#08163F]">
        Carregando usuários...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuario.nome} role={usuario.role} />

      <section className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-black/5 bg-white/80 px-8 backdrop-blur-xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-400">
              Área da mentora
            </p>
            <h1 className="text-xl font-black">Usuários</h1>
          </div>

          <button
            onClick={sair}
            className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Sair
          </button>
        </header>

        <div className="h-[calc(100vh-82px)] overflow-y-auto px-8 py-10">
          <section className="mb-8 overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-8 text-white shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                  Gestão de acessos
                </p>

                <h2 className="mt-3 text-4xl font-black">
                  Usuários do CEO Club
                </h2>

                <p className="mt-3 max-w-2xl text-[#D9DEE7]">
                  Cadastre, edite e acompanhe mentoras, mentoradas e perfis
                  internos em uma única central.
                </p>
              </div>

              <button
                onClick={() => setMostrarFormulario((atual) => !atual)}
                className="rounded-2xl bg-white px-6 py-4 font-black text-[#08163F] shadow-lg transition hover:brightness-95"
              >
                {mostrarFormulario ? "Fechar formulário" : "+ Novo usuário"}
              </button>
            </div>
          </section>

          <section className="mb-7 grid gap-5 xl:grid-cols-5">
            <KPI titulo="Total" valor={resumo.total} destaque />
            <KPI titulo="Ativos" valor={resumo.ativos} />
            <KPI titulo="Inativos" valor={resumo.inativos} />
            <KPI titulo="Mentoradas" valor={resumo.mentorados} />
            <KPI titulo="Mentoras" valor={resumo.mentores} />
          </section>

          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mb-6 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
              {sucesso}
            </div>
          )}

          {mostrarFormulario && (
            <form
              onSubmit={criarUsuario}
              className="mb-8 rounded-[32px] bg-white p-7 shadow-lg"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-black text-[#050816]">
                  Novo usuário
                </h3>

                <p className="mt-2 text-sm font-semibold text-gray-500">
                  Crie o acesso inicial e defina o perfil da pessoa dentro da
                  plataforma.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <Campo label="Nome">
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Dra. Ana Martins"
                    className="input-ceo"
                  />
                </Campo>

                <Campo label="E-mail">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@ceoclubmentoria.com.br"
                    className="input-ceo"
                  />
                </Campo>

                <Campo label="Telefone">
                  <input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(15) 99999-9999"
                    className="input-ceo"
                  />
                </Campo>

                <Campo label="Senha temporária">
                  <input
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="input-ceo"
                  />
                </Campo>

                <Campo label="Perfil">
                  <select
                    value={perfil}
                    onChange={(e) =>
                      setPerfil(e.target.value as PerfilUsuario)
                    }
                    className="input-ceo"
                  >
                    <option value="mentorado">Mentorada</option>
                    <option value="mentor">Mentora</option>
                    <option value="modulos">Módulos</option>
                    <option value="progresso">Progresso</option>
                    <option value="financeiro">Financeiro</option>
                  </select>
                </Campo>
              </div>

              <div className="mt-6 rounded-2xl bg-yellow-50 p-5">
                <p className="font-black text-yellow-800">Senha temporária</p>
                <p className="mt-2 text-sm font-bold leading-relaxed text-yellow-700">
                  Para o MVP, a mentora pode criar uma senha temporária e
                  repassar para a pessoa cadastrada. Depois adicionamos o fluxo
                  de recuperação de senha por e-mail.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-4">
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-2xl bg-[#08163F] px-7 py-4 font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando ? "Criando..." : "Criar usuário"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    limparFormulario();
                    setMostrarFormulario(false);
                  }}
                  className="rounded-2xl bg-[#f3f5f8] px-7 py-4 font-black text-[#08163F] transition hover:bg-white hover:shadow-md"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="mb-6 flex gap-3 rounded-[26px] bg-white p-4 shadow-lg">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail, perfil ou status..."
              className="w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-5 py-4 font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
            />

            <button
              onClick={carregarUsuarios}
              className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
            >
              Atualizar
            </button>
          </div>

          <section className="grid gap-6 xl:grid-cols-[1fr_390px]">
            <div className="space-y-5">
              {carregando ? (
                <div className="rounded-[30px] bg-white p-8 text-center font-black shadow-lg">
                  Carregando lista...
                </div>
              ) : usuariosFiltrados.length === 0 ? (
                <div className="rounded-[30px] bg-white p-8 text-center font-black shadow-lg">
                  Nenhum usuário encontrado.
                </div>
              ) : (
                usuariosFiltrados.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[30px] bg-white p-6 shadow-lg"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                          <PerfilBadge perfil={item.role} />
                          <StatusBadge status={item.status ?? "Ativo"} />
                        </div>

                        <h3 className="text-2xl font-black text-[#050816]">
                          {item.nome}
                        </h3>

                        <p className="mt-2 text-sm font-semibold text-gray-500">
                          {item.email}
                        </p>

                        {item.telefone && (
                          <p className="mt-1 text-sm font-semibold text-gray-400">
                            {item.telefone}
                          </p>
                        )}
                      </div>

                      <div className="grid min-w-[240px] grid-cols-2 gap-3">
                        <MiniInfo
                          label="Perfil"
                          value={traduzirPerfil(item.role)}
                        />
                        <MiniInfo
                          label="Criado em"
                          value={new Date(item.created_at).toLocaleDateString(
                            "pt-BR"
                          )}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
                      <button
                        onClick={() => abrirEditar(item)}
                        className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => abrirInativar(item)}
                        className={`rounded-2xl px-5 py-3 text-sm font-black shadow-md transition hover:brightness-105 ${
                          item.status === "Inativo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {item.status === "Inativo" ? "Reativar" : "Inativar"}
                      </button>

                      <button
                        onClick={() => abrirExcluir(item)}
                        className="rounded-2xl bg-red-50 px-5 py-3 text-sm font-black text-red-700 shadow-md transition hover:brightness-105"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <aside className="space-y-6">
              <Card titulo="Central de acesso">
                <div className="space-y-4">
                  <Regra numero="1" texto="Cadastre o usuário e escolha o perfil." />
                  <Regra numero="2" texto="Defina uma senha temporária para o primeiro acesso." />
                  <Regra numero="3" texto="Edite dados, altere status ou remova acessos quando necessário." />
                  <Regra numero="4" texto="Use perfis diferentes para separar mentoradas, financeiro, módulos e progresso." />
                </div>
              </Card>

              <Card titulo="Próxima melhoria">
                <p className="text-sm font-semibold leading-relaxed text-gray-500">
                  Depois do domínio e dos e-mails profissionais, adicionamos o
                  fluxo de “Esqueci minha senha” com envio de link oficial para
                  o e-mail personalizado.
                </p>
              </Card>
            </aside>
          </section>
        </div>
      </section>

      {modalAcao === "editar" && usuarioSelecionado && (
        <Modal titulo="Editar usuário" onClose={fecharModal}>
          <form onSubmit={salvarEdicao}>
            <div className="grid gap-5 md:grid-cols-2">
              <Campo label="Nome">
                <input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="input-ceo"
                />
              </Campo>

              <Campo label="E-mail">
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="input-ceo"
                />
              </Campo>

              <Campo label="Telefone">
                <input
                  value={editTelefone}
                  onChange={(e) => setEditTelefone(e.target.value)}
                  className="input-ceo"
                />
              </Campo>

              <Campo label="Perfil">
                <select
                  value={editPerfil}
                  onChange={(e) =>
                    setEditPerfil(e.target.value as PerfilUsuario)
                  }
                  className="input-ceo"
                >
                  <option value="mentorado">Mentorada</option>
                  <option value="mentor">Mentora</option>
                  <option value="modulos">Módulos</option>
                  <option value="progresso">Progresso</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </Campo>

              <Campo label="Status">
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as StatusUsuario)
                  }
                  className="input-ceo"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </Campo>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-2xl bg-[#08163F] px-6 py-4 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>

              <button
                type="button"
                onClick={fecharModal}
                className="rounded-2xl bg-[#f3f5f8] px-6 py-4 font-black text-[#08163F]"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modalAcao === "inativar" && usuarioSelecionado && (
        <Modal
          titulo={
            usuarioSelecionado.status === "Inativo"
              ? "Reativar usuário"
              : "Inativar usuário"
          }
          onClose={fecharModal}
        >
          <p className="text-sm font-semibold leading-7 text-gray-500">
            {usuarioSelecionado.status === "Inativo"
              ? `Deseja reativar o acesso de ${usuarioSelecionado.nome}?`
              : `Deseja inativar o acesso de ${usuarioSelecionado.nome}? O perfil continuará salvo, mas ficará marcado como inativo.`}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={confirmarInativacao}
              disabled={salvando}
              className="rounded-2xl bg-[#08163F] px-6 py-4 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando
                ? "Processando..."
                : usuarioSelecionado.status === "Inativo"
                ? "Reativar"
                : "Inativar"}
            </button>

            <button
              onClick={fecharModal}
              className="rounded-2xl bg-[#f3f5f8] px-6 py-4 font-black text-[#08163F]"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {modalAcao === "excluir" && usuarioSelecionado && (
        <Modal titulo="Excluir usuário" onClose={fecharModal}>
          <div className="rounded-2xl bg-red-50 p-5">
            <p className="font-black text-red-700">Atenção</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-red-600">
              Esta ação remove o perfil de {usuarioSelecionado.nome} da lista.
              Antes de excluir, confirme se não há dados importantes vinculados
              a este usuário.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={confirmarExclusao}
              disabled={salvando}
              className="rounded-2xl bg-red-600 px-6 py-4 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando ? "Excluindo..." : "Excluir usuário"}
            </button>

            <button
              onClick={fecharModal}
              className="rounded-2xl bg-[#f3f5f8] px-6 py-4 font-black text-[#08163F]"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .input-ceo {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          padding: 1rem;
          font-weight: 700;
          color: #08163f;
          outline: none;
          transition: 0.2s ease;
        }

        .input-ceo::placeholder {
          color: #9ca3af;
        }

        .input-ceo:focus {
          border-color: #12317c;
          box-shadow: 0 0 0 4px rgba(18, 49, 124, 0.1);
          background: white;
        }
      `}</style>
    </main>
  );
}

function traduzirPerfil(perfil: PerfilUsuario) {
  const labels: Record<PerfilUsuario, string> = {
    mentor: "Mentora",
    mentorado: "Mentorada",
    financeiro: "Financeiro",
    progresso: "Progresso",
    modulos: "Módulos",
  };

  return labels[perfil];
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="text-sm font-black text-gray-500">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function KPI({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-[26px] p-6 shadow-lg ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`text-sm font-bold ${
          destaque ? "text-[#C9CED6]" : "text-gray-500"
        }`}
      >
        {titulo}
      </p>
      <p className="mt-4 text-3xl font-black">{valor}</p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <p className="mt-1 font-black text-[#08163F]">{value}</p>
    </div>
  );
}

function Card({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-6">
        <h3 className="text-2xl font-black text-[#050816]">{titulo}</h3>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}

function Regra({ numero, texto }: { numero: string; texto: string }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-[#f9fafb] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#08163F] text-sm font-black text-white">
        {numero}
      </div>

      <p className="text-sm font-bold leading-relaxed text-gray-600">{texto}</p>
    </div>
  );
}

function PerfilBadge({ perfil }: { perfil: PerfilUsuario }) {
  const classes: Record<PerfilUsuario, string> = {
    mentor: "bg-purple-100 text-purple-700",
    mentorado: "bg-blue-100 text-blue-700",
    financeiro: "bg-green-100 text-green-700",
    progresso: "bg-yellow-100 text-yellow-700",
    modulos: "bg-indigo-100 text-indigo-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${classes[perfil]}`}
    >
      {traduzirPerfil(perfil)}
    </span>
  );
}

function StatusBadge({ status }: { status: StatusUsuario }) {
  const classes: Record<StatusUsuario, string> = {
    Ativo: "bg-green-100 text-green-700",
    Pendente: "bg-yellow-100 text-yellow-700",
    Inativo: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}
    >
      {status}
    </span>
  );
}

function Modal({
  titulo,
  children,
  onClose,
}: {
  titulo: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[34px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-7 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
              Usuários
            </p>

            <h2 className="mt-3 text-3xl font-black">{titulo}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-7">{children}</div>
      </div>
    </div>
  );
}