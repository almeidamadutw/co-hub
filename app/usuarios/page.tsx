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
type ModalAcao = "editar" | "inativar" | "excluir" | null;

type UsuarioSistema = {
  id: string;
  nome: string;
  email: string;
  role: PerfilUsuario;
  telefone: string | null;
  status: StatusUsuario | null;
  codigo_inscricao?: string | null;
  created_at: string;
};

export default function UsuariosPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);

  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState<PerfilUsuario | "todos">(
    "todos"
  );
  const [filtroStatus, setFiltroStatus] = useState<StatusUsuario | "todos">(
    "todos"
  );

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

    const usuarioValidado = usuarioAtual as User;

    if (usuarioValidado.role === "mentorado") {
      router.replace("/mentorado/dashboard");
      return;
    }

    if (usuarioValidado.role !== "mentor") {
      router.replace("/dashboard");
      return;
    }

    setUsuario(usuarioValidado);
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

    const tipoResposta = resposta.headers.get("content-type") ?? "";
    const json = tipoResposta.includes("application/json")
      ? await resposta.json()
      : { error: await resposta.text() };

    if (!resposta.ok) {
      setErro(json.error ?? "Erro ao carregar usuários.");
      setCarregando(false);
      return;
    }

    setUsuarios(json.usuarios ?? []);
    setCarregando(false);
  }

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return usuarios.filter((item) => {
      const statusAtual = item.status ?? "Ativo";

      const bateBusca =
        !termo ||
        item.nome.toLowerCase().includes(termo) ||
        item.email.toLowerCase().includes(termo) ||
        (item.telefone ?? "").toLowerCase().includes(termo) ||
        (item.codigo_inscricao ?? "").toLowerCase().includes(termo);

      const batePerfil =
        filtroPerfil === "todos" ? true : item.role === filtroPerfil;

      const bateStatus =
        filtroStatus === "todos" ? true : statusAtual === filtroStatus;

      return bateBusca && batePerfil && bateStatus;
    });
  }, [usuarios, busca, filtroPerfil, filtroStatus]);

  const resumo = useMemo(() => {
    const mentorados = usuarios.filter((item) => item.role === "mentorado");
    const mentores = usuarios.filter((item) => item.role === "mentor");
    const ativos = usuarios.filter(
      (item) => (item.status ?? "Ativo") === "Ativo"
    );
    const inativos = usuarios.filter((item) => item.status === "Inativo");
    const pendentes = usuarios.filter((item) => item.status === "Pendente");

    return {
      total: usuarios.length,
      ativos: ativos.length,
      inativos: inativos.length,
      pendentes: pendentes.length,
      mentorados: mentorados.length,
      mentores: mentores.length,
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

  function limparFiltros() {
    setBusca("");
    setFiltroPerfil("todos");
    setFiltroStatus("todos");
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

    const tipoResposta = resposta.headers.get("content-type") ?? "";
    const json = tipoResposta.includes("application/json")
      ? await resposta.json()
      : { error: await resposta.text() };

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

      const token = await pegarToken();

      if (!token) {
        throw new Error("Sessão expirada. Entre novamente.");
      }

      const resposta = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: usuarioSelecionado.id,
          nome: editNome.trim(),
          email: editEmail.trim(),
          telefone: editTelefone.trim() || null,
          role: editPerfil,
          status: editStatus,
        }),
      });

      const tipoResposta = resposta.headers.get("content-type") ?? "";
      const json = tipoResposta.includes("application/json")
        ? await resposta.json()
        : { error: await resposta.text() };

      if (!resposta.ok) {
        throw new Error(json.error ?? "Não foi possível atualizar o usuário.");
      }

      await carregarUsuarios();

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

      const token = await pegarToken();

      if (!token) {
        throw new Error("Sessão expirada. Entre novamente.");
      }

      const resposta = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: usuarioSelecionado.id,
          status: novoStatus,
        }),
      });

      const tipoResposta = resposta.headers.get("content-type") ?? "";
      const json = tipoResposta.includes("application/json")
        ? await resposta.json()
        : { error: await resposta.text() };

      if (!resposta.ok) {
        throw new Error(json.error ?? "Não foi possível alterar o status.");
      }

      await carregarUsuarios();

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

      const token = await pegarToken();

      if (!token) {
        throw new Error("Sessão expirada. Entre novamente.");
      }

      const resposta = await fetch("/api/admin/usuarios", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: usuarioSelecionado.id,
        }),
      });

      const tipoResposta = resposta.headers.get("content-type") ?? "";
      const json = tipoResposta.includes("application/json")
        ? await resposta.json()
        : { error: await resposta.text() };

      if (!resposta.ok) {
        throw new Error(json.error ?? "Não foi possível excluir o usuário.");
      }

      await carregarUsuarios();

      setSucesso("Usuário removido com sucesso.");
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
    return <MentorLoading mensagem="Carregando usuários..." />;
  }

  const usuarioLogado = usuario;

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar nome={usuarioLogado.nome} role={usuarioLogado.role} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/85 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
              Área do mentor
            </p>
            <h1 className="truncate text-base font-black sm:text-lg md:text-xl">Usuários</h1>
          </div>

          <button
            onClick={sair}
            className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
          >
            Sair
          </button>
        </header>

        <div className="relative min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <section className="mb-4 min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-xl sm:p-5 lg:rounded-[26px] lg:p-6">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#C9CED6]">
                  Gestão de acessos
                </p>

                <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                  Usuários do CEO Club
                </h2>

                <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-[#D9DEE7]">
                  Controle os acessos da mentoria, acompanhe status e mantenha
                  cada perfil organizado por função.
                </p>
              </div>

              <button
                onClick={() => setMostrarFormulario((atual) => !atual)}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#08163F] shadow-lg transition hover:brightness-95"
              >
                {mostrarFormulario ? "Fechar formulário" : "+ Novo usuário"}
              </button>
            </div>
          </section>

          <section className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KPI titulo="Total" valor={resumo.total} destaque />
            <KPI titulo="Ativos" valor={resumo.ativos} />
            <KPI titulo="Pendentes" valor={resumo.pendentes} />
            <KPI titulo="Inativos" valor={resumo.inativos} />
            <KPI titulo="Mentorados" valor={resumo.mentorados} />
            <KPI titulo="Mentores" valor={resumo.mentores} />
          </section>

          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mb-4 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
              {sucesso}
            </div>
          )}

          {mostrarFormulario && (
            <form
              onSubmit={criarUsuario}
              className="mb-4 min-w-0 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:rounded-[24px] sm:p-5 lg:p-6"
            >
              <div className="mb-4 flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="break-words text-xl font-black text-[#050816] sm:text-2xl">
                    Novo usuário
                  </h3>

                  <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-gray-500">
                    Crie um acesso inicial, defina o perfil e entregue a senha
                    temporária para o primeiro login.
                  </p>
                </div>

                <span className="w-fit shrink-0 rounded-full bg-[#EEF2FF] px-3 py-1.5 text-xs font-black text-[#08163F]">
                  Senha padrão: 123456
                </span>
              </div>

              <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Campo label="Nome">
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Dr. João Martins"
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
                    <option value="mentorado">Mentorado</option>
                    <option value="mentor">Mentor</option>
                    <option value="modulos">Módulos</option>
                    <option value="progresso">Progresso</option>
                    <option value="financeiro">Financeiro</option>
                  </select>
                </Campo>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando ? "Criando..." : "Criar usuário"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    limparFormulario();
                    setMostrarFormulario(false);
                  }}
                  className="rounded-xl bg-[#f3f5f8] px-4 py-2.5 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <section className="mb-4 min-w-0 rounded-[20px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, e-mail, telefone ou código..."
                className="w-full rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-2.5 text-sm font-bold text-[#08163F] outline-none transition focus:border-[#12317C] focus:ring-4 focus:ring-[#12317C]/10"
              />

              <select
                value={filtroPerfil}
                onChange={(e) =>
                  setFiltroPerfil(e.target.value as PerfilUsuario | "todos")
                }
                className="input-ceo"
              >
                <option value="todos">Todos os perfis</option>
                <option value="mentorado">Mentorados</option>
                <option value="mentor">Mentores</option>
                <option value="financeiro">Financeiro</option>
                <option value="modulos">Módulos</option>
                <option value="progresso">Progresso</option>
              </select>

              <select
                value={filtroStatus}
                onChange={(e) =>
                  setFiltroStatus(e.target.value as StatusUsuario | "todos")
                }
                className="input-ceo"
              >
                <option value="todos">Todos os status</option>
                <option value="Ativo">Ativos</option>
                <option value="Pendente">Pendentes</option>
                <option value="Inativo">Inativos</option>
              </select>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={carregarUsuarios}
                  className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white shadow-lg transition hover:brightness-110 sm:text-sm"
                >
                  Atualizar
                </button>

                <button
                  onClick={limparFiltros}
                  className="rounded-xl bg-[#f3f5f8] px-4 py-2.5 text-xs font-black text-[#08163F] transition hover:bg-white hover:shadow-md sm:text-sm"
                >
                  Limpar
                </button>
              </div>
            </div>

            <p className="mt-4 text-sm font-bold text-gray-500">
              Exibindo {usuariosFiltrados.length} de {usuarios.length} usuário(s).
            </p>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
            <div className="min-w-0 space-y-3">
              {carregando ? (
                <div className="rounded-[22px] bg-white p-5 text-center font-black shadow-lg shadow-slate-200/70">
                  Carregando lista...
                </div>
              ) : usuariosFiltrados.length === 0 ? (
                <div className="rounded-[22px] bg-white p-5 text-center shadow-lg shadow-slate-200/70">
                  <p className="text-xl font-black text-[#08163F]">
                    Nenhum usuário encontrado
                  </p>

                  <p className="mt-2 break-all text-sm font-semibold text-gray-500">
                    Ajuste os filtros ou cadastre um novo acesso.
                  </p>
                </div>
              ) : (
                usuariosFiltrados.map((item) => (
                  <div
                    key={item.id}
                    className="min-w-0 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 sm:p-5"
                  >
                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
                          <PerfilBadge perfil={item.role} />
                          <StatusBadge status={item.status ?? "Ativo"} />
                          {item.codigo_inscricao && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                              Código {item.codigo_inscricao}
                            </span>
                          )}
                        </div>

                        <h3 className="break-words text-xl font-black text-[#050816] sm:text-2xl">
                          {item.nome}
                        </h3>

                        <p className="mt-2 break-all text-sm font-semibold text-gray-500">
                          {item.email}
                        </p>

                        {item.telefone && (
                          <p className="mt-1 text-sm font-semibold text-gray-400">
                            {item.telefone}
                          </p>
                        )}
                      </div>

                      <div className="grid min-w-0 grid-cols-2 gap-3 lg:min-w-[220px]">
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

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 sm:gap-3">
                      <button
                        onClick={() => abrirEditar(item)}
                        className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:brightness-110 sm:text-sm"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => abrirInativar(item)}
                        className={`rounded-xl px-4 py-2.5 text-xs font-black shadow-md transition hover:brightness-105 sm:text-sm ${
                          item.status === "Inativo"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {item.status === "Inativo" ? "Reativar" : "Inativar"}
                      </button>

                      <button
                        onClick={() => abrirExcluir(item)}
                        className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 shadow-md transition hover:brightness-105 sm:text-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <aside className="min-w-0 space-y-4">
              <Card titulo="Resumo de acessos">
                <div className="space-y-3">
                  <ResumoLinha label="Usuários ativos" value={resumo.ativos} />

                  <ResumoLinha
                    label="Usuários pendentes"
                    value={resumo.pendentes}
                  />

                  <ResumoLinha
                    label="Usuários inativos"
                    value={resumo.inativos}
                  />

                  <ResumoLinha
                    label="Perfis internos"
                    value={resumo.total - resumo.mentorados - resumo.mentores}
                  />
                </div>
              </Card>

              <Card titulo="Boas práticas">
                <div className="space-y-4">
                  <Regra
                    numero="1"
                    texto="Use Inativar para suspender acesso sem perder histórico."
                  />

                  <Regra
                    numero="2"
                    texto="Exclua apenas perfis sem dados importantes vinculados."
                  />

                  <Regra
                    numero="3"
                    texto="Mantenha e-mail e telefone atualizados para suporte."
                  />
                </div>
              </Card>
            </aside>
          </section>
        </div>
      </section>

      {modalAcao === "editar" && usuarioSelecionado && (
        <Modal titulo="Editar usuário" onClose={fecharModal}>
          <form onSubmit={salvarEdicao}>
            <div className="mb-4 min-w-0 rounded-2xl bg-[#f9fafb] p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">
                Código de inscrição
              </p>

              <p className="mt-2 break-words text-xl font-black text-[#08163F] sm:text-2xl">
                {usuarioSelecionado.codigo_inscricao || "Sem código cadastrado"}
              </p>

              <p className="mt-2 break-all text-sm font-semibold text-gray-500">
                Este código é gerado no cadastro e não pode ser alterado por
                esta edição.
              </p>
            </div>

            <div className="grid min-w-0 gap-3 md:grid-cols-2">
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
                  <option value="mentorado">Mentorado</option>
                  <option value="mentor">Mentor</option>
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

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>

              <button
                type="button"
                onClick={fecharModal}
                className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F]"
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

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={confirmarInativacao}
              disabled={salvando}
              className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando
                ? "Processando..."
                : usuarioSelecionado.status === "Inativo"
                ? "Reativar"
                : "Inativar"}
            </button>

            <button
              onClick={fecharModal}
              className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F]"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {modalAcao === "excluir" && usuarioSelecionado && (
        <Modal titulo="Excluir usuário" onClose={fecharModal}>
          <div className="rounded-2xl bg-red-50 p-4">
            <p className="font-black text-red-700">Atenção</p>

            <p className="mt-2 text-sm font-semibold leading-7 text-red-600">
              Esta ação remove o acesso de {usuarioSelecionado.nome}. Use esta
              opção apenas quando não houver histórico importante vinculado.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={confirmarExclusao}
              disabled={salvando}
              className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando ? "Excluindo..." : "Excluir usuário"}
            </button>

            <button
              onClick={fecharModal}
              className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F]"
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
          padding: 0.75rem 0.9rem;
          font-size: 0.875rem;
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

function MentorLoading({ mensagem }: { mensagem: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] px-4 text-[#08163F]">
      <div className="w-full max-w-sm rounded-[24px] border border-white/60 bg-white/90 p-6 text-center shadow-xl shadow-slate-200/70 backdrop-blur-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-xs font-black text-white shadow-lg">
          CEO
        </div>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-slate-400">
          CEO Club
        </p>

        <h1 className="mt-2 break-words text-lg font-black leading-tight text-[#08163F] sm:text-xl">
          {mensagem}
        </h1>

        <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#12317C]" />
        </div>
      </div>
    </main>
  );
}

function traduzirPerfil(perfil: PerfilUsuario) {
  const labels: Record<PerfilUsuario, string> = {
    mentor: "Mentor",
    mentorado: "Mentorado",
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
    <label className="min-w-0">
      <span className="break-words text-sm font-black text-gray-500">{label}</span>
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
      className={`min-w-0 overflow-hidden rounded-[20px] p-4 shadow-lg shadow-slate-200/70 sm:p-5 ${
        destaque
          ? "bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] text-white"
          : "bg-white text-[#08163F]"
      }`}
    >
      <p
        className={`break-words text-xs font-black sm:text-sm ${
          destaque ? "text-[#C9CED6]" : "text-gray-500"
        }`}
      >
        {titulo}
      </p>

      <p className="mt-3 break-words text-2xl font-black leading-tight sm:text-3xl">{valor}</p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 break-words font-black text-[#08163F]">{value}</p>
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
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-lg shadow-slate-200/70 sm:rounded-[24px]">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-4 sm:p-5">
        <h3 className="break-words text-xl font-black text-[#050816] sm:text-2xl">{titulo}</h3>
      </div>

      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Regra({ numero, texto }: { numero: string; texto: string }) {
  return (
    <div className="flex min-w-0 gap-3 rounded-2xl bg-[#f9fafb] p-3 sm:p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#08163F] text-sm font-black text-white">
        {numero}
      </div>

      <p className="break-words text-sm font-bold leading-relaxed text-gray-600">{texto}</p>
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
      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${classes[perfil]}`}
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
      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${classes[status]}`}
    >
      {status}
    </span>
  );
}

function ResumoLinha({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-[#f9fafb] p-3 sm:p-4">
      <p className="break-words text-sm font-bold text-gray-500">{label}</p>
      <p className="break-words text-base font-black text-[#08163F] sm:text-lg">{value}</p>
    </div>
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
      <div className="w-full max-w-[min(96vw,44rem)] overflow-hidden rounded-[24px] bg-white shadow-2xl sm:rounded-[30px]">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
              Gestão de acessos
            </p>

            <h2 className="mt-2 break-words text-xl font-black sm:text-2xl">{titulo}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-black text-white transition hover:bg-white/20"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}