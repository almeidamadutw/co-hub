"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SuporteSidebar from "@/components/SuporteSidebar";
import {
  rotaInicialUsuario,
  sincronizarUsuarioComSessao,
  User,
  usuarioTemAcessoSuporte,
} from "@/utils/auth";
import { obterCabecalhoAutorizacao } from "@/utils/apiAuthClient";
import { registrarLogSuporte } from "@/utils/suporteLogs";
import { supabase } from "@/utils/supabase";

type Perfil = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  role: string | null;
  status: string | null;
  codigo_inscricao: string | null;
  acesso_suporte: boolean | null;
  precisa_trocar_senha: boolean | null;
  trocas_senha: number | null;
  ultima_troca_senha: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type TicketUsuario = {
  id: string;
  usuario_id: string | null;
  email_usuario: string | null;
  status: string | null;
};

type LogUsuario = {
  id: string;
  entidade_id: string | null;
  acao: string;
  descricao: string;
  suporte_nome: string | null;
  created_at: string | null;
};

type NovoUsuarioForm = {
  nome: string;
  email: string;
  telefone: string;
  role: string;
  status: string;
  codigo_inscricao: string;
  senha: string;
  acesso_suporte: boolean;
};

type EdicaoAcesso = {
  role: string;
  status: string;
  acesso_suporte: boolean;
};

const novoUsuarioInicial: NovoUsuarioForm = {
  nome: "",
  email: "",
  telefone: "",
  role: "mentorado",
  status: "ativo",
  codigo_inscricao: "",
  senha: "",
  acesso_suporte: false,
};

const perfisDeAcesso = [
  { label: "Mentor", value: "mentor" },
  { label: "Mentorado", value: "mentorado" },
  { label: "Financeiro", value: "financeiro" },
  { label: "Suporte", value: "suporte" },
];

const statusOpcoes = [
  { label: "Ativo", value: "ativo" },
  { label: "Pendente", value: "pendente" },
  { label: "Inativo", value: "inativo" },
  { label: "Bloqueado", value: "bloqueado" },
  { label: "Cancelado", value: "cancelado" },
  { label: "Suspenso", value: "suspenso" },
];

function normalizar(valor: string | null) {
  return (valor || "").trim().toLowerCase();
}

function formatarData(data: string | null, fallback = "Não registrado") {
  if (!data) return fallback;

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return fallback;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(valor);
}

function formatarPerfil(role: string | null) {
  const valor = normalizar(role);

  if (valor === "mentor") return "Mentor";
  if (valor === "mentorado") return "Mentorado";
  if (valor === "financeiro") return "Financeiro";
  if (valor === "suporte") return "Suporte";

  return "Sem perfil";
}

function formatarStatus(status: string | null) {
  const valor = normalizar(status);

  if (valor === "ativo") return "Ativo";
  if (valor === "pendente") return "Pendente";
  if (valor === "inativo") return "Inativo";
  if (valor === "bloqueado") return "Bloqueado";
  if (valor === "cancelado") return "Cancelado";
  if (valor === "suspenso") return "Suspenso";

  return "Sem status";
}

function temAcessoTi(perfil: Perfil) {
  return normalizar(perfil.role) === "suporte" || Boolean(perfil.acesso_suporte);
}

function temProblemaAcesso(
  perfil: Perfil,
  verificarConfirmacaoEmail = true
) {
  return (
    !normalizar(perfil.role) ||
    !normalizar(perfil.status) ||
    normalizar(perfil.status) !== "ativo" ||
    Boolean(perfil.precisa_trocar_senha) ||
    (verificarConfirmacaoEmail && !perfil.email_confirmed_at)
  );
}

function telefoneWhatsApp(telefone: string | null) {
  const numeros = (telefone || "").replace(/\D/g, "");
  if (!numeros) return "";

  return numeros.length === 10 || numeros.length === 11
    ? `55${numeros}`
    : numeros;
}

function limparDescricao(descricao: string) {
  return descricao
    .replace(/\brole\b/gi, "perfil")
    .replace(/\btickets?\b/gi, "chamado")
    .replace(/\blogs?\b/gi, "histórico");
}

export default function SuporteUsuariosPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [tickets, setTickets] = useState<TicketUsuario[]>([]);
  const [logs, setLogs] = useState<LogUsuario[]>([]);

  const [busca, setBusca] = useState("");
  const [perfilFiltro, setPerfilFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [acessoFiltro, setAcessoFiltro] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("recentes");

  const [perfilSelecionadoId, setPerfilSelecionadoId] = useState<string | null>(
    null
  );
  const [edicao, setEdicao] = useState<EdicaoAcesso | null>(null);
  const [mostrarNovoUsuario, setMostrarNovoUsuario] = useState(false);
  const [novoUsuario, setNovoUsuario] =
    useState<NovoUsuarioForm>(novoUsuarioInicial);

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [criandoUsuario, setCriandoUsuario] = useState(false);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [avisoAuth, setAvisoAuth] = useState("");

  async function carregarUsuarios(mostrarCarregamento = false) {
    if (mostrarCarregamento) setAtualizando(true);
    setErro("");

    try {
      const headers = await obterCabecalhoAutorizacao();

      const [respostaUsuarios, respostaTickets, respostaLogs] =
        await Promise.all([
          fetch("/api/admin/usuarios", {
            headers,
            cache: "no-store",
          }),
          supabase
            .from("suporte_tickets")
            .select("id, usuario_id, email_usuario, status")
            .limit(500),
          supabase
            .from("suporte_logs")
            .select(
              "id, entidade_id, acao, descricao, suporte_nome, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(300),
        ]);

      const payload = await respostaUsuarios.json().catch(() => null);

      if (!respostaUsuarios.ok) {
        throw new Error(
          payload?.error || "Não foi possível carregar os usuários."
        );
      }

      if (respostaTickets.error) {
        throw new Error(
          `Não foi possível carregar os chamados: ${respostaTickets.error.message}`
        );
      }

      if (respostaLogs.error) {
        throw new Error(
          `Não foi possível carregar o histórico: ${respostaLogs.error.message}`
        );
      }

      setPerfis((payload?.usuarios || []) as Perfil[]);
      setTickets((respostaTickets.data || []) as TicketUsuario[]);
      setLogs((respostaLogs.data || []) as LogUsuario[]);
      setAvisoAuth(payload?.aviso_auth || "");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os usuários."
      );
    } finally {
      setAtualizando(false);
    }
  }

  useEffect(() => {
    async function carregar() {
      const user = await sincronizarUsuarioComSessao();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!usuarioTemAcessoSuporte(user)) {
        router.replace(rotaInicialUsuario(user));
        return;
      }

      setUsuario(user);

      const buscaInicial = new URLSearchParams(window.location.search).get(
        "busca"
      );

      if (buscaInicial) {
        setBusca(buscaInicial);
      }

      await carregarUsuarios();
      setCarregando(false);
    }

    void carregar();
  }, [router]);

  const resumo = useMemo(() => {
    const verificarConfirmacaoEmail = !avisoAuth;

    return {
      total: perfis.length,
      problemas: perfis.filter((perfil) =>
        temProblemaAcesso(perfil, verificarConfirmacaoEmail)
      ).length,
      restritos: perfis.filter((perfil) => {
        const status = normalizar(perfil.status);
        return Boolean(status && status !== "ativo");
      }).length,
      acessoTi: perfis.filter(temAcessoTi).length,
    };
  }, [avisoAuth, perfis]);

  const perfisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const verificarConfirmacaoEmail = !avisoAuth;

    return perfis
      .filter((perfil) => {
        const perfilAtual = normalizar(perfil.role);
        const statusAtual = normalizar(perfil.status);

        const passaPerfil =
          perfilFiltro === "todos" || perfilAtual === perfilFiltro;

        const passaStatus =
          statusFiltro === "todos" ||
          statusAtual === statusFiltro ||
          (statusFiltro === "restritos" &&
            Boolean(statusAtual && statusAtual !== "ativo"));

        const passaAcesso =
          acessoFiltro === "todos" ||
          (acessoFiltro === "com_acesso" && temAcessoTi(perfil)) ||
          (acessoFiltro === "sem_acesso" && !temAcessoTi(perfil)) ||
          (acessoFiltro === "problemas" &&
            temProblemaAcesso(perfil, verificarConfirmacaoEmail));

        const textoBusca = [
          perfil.nome,
          perfil.email,
          perfil.telefone,
          perfil.codigo_inscricao,
          perfil.role,
          perfil.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          passaPerfil &&
          passaStatus &&
          passaAcesso &&
          (!termo || textoBusca.includes(termo))
        );
      })
      .sort((a, b) => {
        if (ordenacao === "nome") {
          return (a.nome || a.email || "").localeCompare(
            b.nome || b.email || "",
            "pt-BR"
          );
        }

        if (ordenacao === "problemas") {
          return (
            Number(temProblemaAcesso(b, verificarConfirmacaoEmail)) -
            Number(temProblemaAcesso(a, verificarConfirmacaoEmail))
          );
        }

        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });
  }, [
    acessoFiltro,
    avisoAuth,
    busca,
    ordenacao,
    perfilFiltro,
    perfis,
    statusFiltro,
  ]);

  const perfilSelecionado = useMemo(
    () =>
      perfis.find((perfil) => perfil.id === perfilSelecionadoId) || null,
    [perfilSelecionadoId, perfis]
  );

  const ticketsDoUsuario = useMemo(() => {
    if (!perfilSelecionado) return [];

    return tickets.filter(
      (ticket) =>
        ticket.usuario_id === perfilSelecionado.id ||
        (perfilSelecionado.email &&
          normalizar(ticket.email_usuario) ===
            normalizar(perfilSelecionado.email))
    );
  }, [perfilSelecionado, tickets]);

  const logsDoUsuario = useMemo(() => {
    if (!perfilSelecionado) return [];

    return logs
      .filter((log) => log.entidade_id === perfilSelecionado.id)
      .slice(0, 8);
  }, [logs, perfilSelecionado]);

  const edicaoAlterada = useMemo(() => {
    if (!perfilSelecionado || !edicao) return false;

    return (
      normalizar(perfilSelecionado.role) !== normalizar(edicao.role) ||
      normalizar(perfilSelecionado.status) !== normalizar(edicao.status) ||
      Boolean(perfilSelecionado.acesso_suporte) !== edicao.acesso_suporte
    );
  }, [edicao, perfilSelecionado]);

  function abrirUsuario(perfil: Perfil) {
    setPerfilSelecionadoId(perfil.id);
    setEdicao({
      role: normalizar(perfil.role),
      status: normalizar(perfil.status),
      acesso_suporte: Boolean(perfil.acesso_suporte),
    });
    setErro("");
    setMensagem("");
  }

  function fecharUsuario() {
    setPerfilSelecionadoId(null);
    setEdicao(null);
  }

  function atualizarNovoUsuario(
    campo: keyof NovoUsuarioForm,
    valor: string | boolean
  ) {
    setNovoUsuario((atual) => ({
      ...atual,
      [campo]: valor,
      ...(campo === "role" && valor === "suporte"
        ? { acesso_suporte: false }
        : {}),
    }));
    setErro("");
    setMensagem("");
  }

  function gerarSenhaTemporaria() {
    const caracteres =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const valores = new Uint32Array(10);
    window.crypto.getRandomValues(valores);
    const parteAleatoria = Array.from(valores)
      .map((valor) => caracteres[valor % caracteres.length])
      .join("");

    atualizarNovoUsuario("senha", `Cc9!${parteAleatoria}`);
  }

  async function criarUsuario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuario) return;

    setErro("");
    setMensagem("");

    const nome = novoUsuario.nome.trim();
    const email = novoUsuario.email.trim().toLowerCase();
    const senha = novoUsuario.senha.trim();

    if (!nome || !email || !senha) {
      setErro("Preencha nome, e-mail e senha temporária.");
      return;
    }

    if (senha.length < 8) {
      setErro("A senha temporária precisa ter pelo menos 8 caracteres.");
      return;
    }

    const confirmar = window.confirm(
      `Deseja criar o acesso para ${nome} com o e-mail ${email}?`
    );

    if (!confirmar) return;

    setCriandoUsuario(true);

    try {
      const headers = await obterCabecalhoAutorizacao();
      const resposta = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          email,
          senha,
          telefone: novoUsuario.telefone.trim(),
          role: novoUsuario.role,
          status: novoUsuario.status,
          codigo_inscricao: novoUsuario.codigo_inscricao.trim(),
          acesso_suporte:
            novoUsuario.role === "suporte"
              ? false
              : novoUsuario.acesso_suporte,
        }),
      });

      const payload = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(payload?.error || "Não foi possível criar o usuário.");
      }

      await registrarLogSuporte({
        suporte: usuario,
        acao: "criacao_usuario",
        entidade: "profiles",
        entidadeId: payload?.usuario?.id || null,
        descricao: `Criou o acesso de ${nome} com perfil ${formatarPerfil(
          novoUsuario.role
        )}.`,
        metadata: {
          usuario_criado_id: payload?.usuario?.id || null,
          usuario_criado_email: email,
          perfil: novoUsuario.role,
          status: novoUsuario.status,
          acesso_suporte: novoUsuario.acesso_suporte,
        },
      });

      setMensagem("Usuário criado com sucesso.");
      setNovoUsuario(novoUsuarioInicial);
      setMostrarNovoUsuario(false);
      await carregarUsuarios();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o usuário."
      );
    } finally {
      setCriandoUsuario(false);
    }
  }

  async function salvarAcessos() {
    if (!usuario || !perfilSelecionado || !edicao) return;

    setErro("");
    setMensagem("");

    if (perfilSelecionado.id === usuario.id) {
      setErro(
        "Sua própria conta fica protegida. Outro usuário de suporte deve alterar seus acessos."
      );
      return;
    }

    if (!edicao.role || !edicao.status) {
      setErro("Selecione o perfil principal e o status antes de salvar.");
      return;
    }

    if (!edicaoAlterada) return;

    const confirmar = window.confirm(
      `Deseja salvar as alterações de acesso para ${
        perfilSelecionado.nome ||
        perfilSelecionado.email ||
        "este usuário"
      }?`
    );

    if (!confirmar) return;

    setSalvandoId(perfilSelecionado.id);

    const { error } = await supabase.rpc(
      "suporte_atualizar_acessos_profile",
      {
        p_profile_id: perfilSelecionado.id,
        p_role: edicao.role,
        p_status: edicao.status,
        p_acesso_suporte:
          edicao.role === "suporte" ? false : edicao.acesso_suporte,
      }
    );

    setSalvandoId(null);

    if (error) {
      setErro(`Não foi possível salvar os acessos: ${error.message}`);
      return;
    }

    setMensagem("Acessos atualizados e registrados no histórico.");
    await carregarUsuarios();

    setEdicao({
      role: edicao.role,
      status: edicao.status,
      acesso_suporte:
        edicao.role === "suporte" ? false : edicao.acesso_suporte,
    });
  }

  async function copiarEmail(email: string | null) {
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
      setMensagem("E-mail copiado.");
    } catch {
      setErro("Não foi possível copiar o e-mail.");
    }
  }

  async function excluirUsuario() {
    if (!usuario || !perfilSelecionado) return;

    setErro("");
    setMensagem("");

    if (perfilSelecionado.id === usuario.id) {
      setErro("Você não pode excluir a própria conta.");
      return;
    }

    if (normalizar(perfilSelecionado.status) !== "cancelado") {
      setErro(
        "Cancele o usuário e salve a alteração antes de excluí-lo."
      );
      return;
    }

    if (edicaoAlterada) {
      setErro("Salve ou cancele as alterações pendentes antes da exclusão.");
      return;
    }

    const confirmacao = window.prompt(
      `Esta ação removerá o login de ${
        perfilSelecionado.nome ||
        perfilSelecionado.email ||
        "este usuário"
      } e ocultará a conta da lista. Digite EXCLUIR para confirmar.`
    );

    if (confirmacao?.trim().toUpperCase() !== "EXCLUIR") return;

    setExcluindoId(perfilSelecionado.id);

    try {
      const headers = await obterCabecalhoAutorizacao();
      const resposta = await fetch("/api/admin/usuarios", {
        method: "DELETE",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: perfilSelecionado.id }),
      });

      const payload = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          payload?.error || "Não foi possível excluir o usuário."
        );
      }

      fecharUsuario();
      setMensagem(
        payload?.aviso ||
          "Usuário excluído com segurança. O histórico foi preservado."
      );
      await carregarUsuarios();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o usuário."
      );
    } finally {
      setExcluindoId(null);
    }
  }

  function abrirChamados(perfil: Perfil) {
    router.push(
      `/suporte/tickets?usuario=${encodeURIComponent(
        perfil.email || perfil.nome || ""
      )}`
    );
  }

  function abrirResetSenha(perfil: Perfil) {
    router.push(
      `/suporte/reset-senha?busca=${encodeURIComponent(
        perfil.email || perfil.nome || ""
      )}`
    );
  }

  function limparFiltros() {
    setBusca("");
    setPerfilFiltro("todos");
    setStatusFiltro("todos");
    setAcessoFiltro("todos");
  }

  if (carregando || !usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f8] px-5 text-[#08163F]">
        <div className="w-full max-w-sm rounded-[24px] bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">
            CEO Club
          </p>
          <h1 className="mt-3 text-2xl font-black">
            Carregando usuários...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <SuporteSidebar nome={usuario.nome} role={usuario.role} />

      <section className="relative min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/90 px-4 py-2 backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 sm:text-xs">
              Suporte e T.I.
            </p>
            <h1 className="truncate text-base font-black sm:text-lg md:text-xl">
              Usuários e acessos
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void carregarUsuarios(true)}
              disabled={atualizando}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#08163F] shadow-lg transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 sm:text-sm"
            >
              {atualizando ? "Atualizando..." : "Atualizar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarNovoUsuario((atual) => !atual);
                setErro("");
                setMensagem("");
              }}
              className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:text-sm"
            >
              {mostrarNovoUsuario ? "Fechar cadastro" : "+ Novo usuário"}
            </button>
          </div>
        </header>

        <section className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          {erro && (
            <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {erro}
            </div>
          )}

          {mensagem && (
            <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700">
              {mensagem}
            </div>
          )}

          {avisoAuth && (
            <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
              {avisoAuth}
            </div>
          )}

          {mostrarNovoUsuario && (
            <form
              onSubmit={criarUsuario}
              className="mb-4 rounded-[24px] bg-white p-5 shadow-lg shadow-slate-200/70"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                    Cadastro seguro
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[#050816]">
                    Criar novo usuário
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    O acesso será criado no Supabase Auth e vinculado ao perfil.
                  </p>
                </div>
                <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-black text-[#12317C]">
                  Auth + Perfil
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Campo label="Nome completo">
                  <input
                    value={novoUsuario.nome}
                    onChange={(evento) =>
                      atualizarNovoUsuario("nome", evento.target.value)
                    }
                    placeholder="Nome do usuário"
                    className="input-suporte"
                  />
                </Campo>

                <Campo label="E-mail">
                  <input
                    type="email"
                    value={novoUsuario.email}
                    onChange={(evento) =>
                      atualizarNovoUsuario("email", evento.target.value)
                    }
                    placeholder="email@exemplo.com"
                    className="input-suporte"
                  />
                </Campo>

                <Campo label="Telefone">
                  <input
                    value={novoUsuario.telefone}
                    onChange={(evento) =>
                      atualizarNovoUsuario("telefone", evento.target.value)
                    }
                    placeholder="(00) 00000-0000"
                    className="input-suporte"
                  />
                </Campo>

                <Campo label="Código de inscrição">
                  <input
                    value={novoUsuario.codigo_inscricao}
                    onChange={(evento) =>
                      atualizarNovoUsuario(
                        "codigo_inscricao",
                        evento.target.value
                      )
                    }
                    placeholder="Opcional"
                    className="input-suporte"
                  />
                </Campo>

                <Campo label="Perfil principal">
                  <select
                    value={novoUsuario.role}
                    onChange={(evento) =>
                      atualizarNovoUsuario("role", evento.target.value)
                    }
                    className="input-suporte"
                  >
                    {perfisDeAcesso.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Status">
                  <select
                    value={novoUsuario.status}
                    onChange={(evento) =>
                      atualizarNovoUsuario("status", evento.target.value)
                    }
                    className="input-suporte"
                  >
                    {statusOpcoes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Senha temporária">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novoUsuario.senha}
                      onChange={(evento) =>
                        atualizarNovoUsuario("senha", evento.target.value)
                      }
                      placeholder="Mínimo 8 caracteres"
                      className="input-suporte"
                    />
                    <button
                      type="button"
                      onClick={gerarSenhaTemporaria}
                      className="rounded-2xl bg-[#eef2ff] px-3 text-xs font-black text-[#12317C]"
                    >
                      Gerar
                    </button>
                  </div>
                </Campo>

                <Campo label="Permissão adicional">
                  <label className="flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-[#f9fafb] px-4 py-3">
                    <span className="text-sm font-black text-[#08163F]">
                      Acesso Suporte/T.I.
                    </span>
                    <input
                      type="checkbox"
                      checked={
                        novoUsuario.role === "suporte" ||
                        novoUsuario.acesso_suporte
                      }
                      disabled={novoUsuario.role === "suporte"}
                      onChange={(evento) =>
                        atualizarNovoUsuario(
                          "acesso_suporte",
                          evento.target.checked
                        )
                      }
                      className="h-5 w-5 accent-[#12317C]"
                    />
                  </label>
                </Campo>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={criandoUsuario}
                  className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
                >
                  {criandoUsuario ? "Criando..." : "Criar usuário"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNovoUsuario(novoUsuarioInicial);
                    setMostrarNovoUsuario(false);
                  }}
                  className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F] transition hover:bg-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CardIndicador
              titulo="Usuários"
              valor={resumo.total}
              descricao="Todos os acessos cadastrados"
              tom="azul"
              onClick={limparFiltros}
            />
            <CardIndicador
              titulo="Problemas de acesso"
              valor={resumo.problemas}
              descricao="Contas que precisam de atenção"
              tom="vermelho"
              onClick={() => setAcessoFiltro("problemas")}
            />
            <CardIndicador
              titulo="Inativos ou bloqueados"
              valor={resumo.restritos}
              descricao="Acessos temporariamente impedidos"
              tom="amarelo"
              onClick={() => setStatusFiltro("restritos")}
            />
            <CardIndicador
              titulo="Acesso Suporte/T.I."
              valor={resumo.acessoTi}
              descricao="Perfil suporte ou permissão adicional"
              tom="roxo"
              onClick={() => setAcessoFiltro("com_acesso")}
            />
          </section>

          <section className="mt-4 grid gap-3 rounded-[22px] bg-white p-4 shadow-lg shadow-slate-200/70 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_190px_190px_210px]">
            <Campo label="Buscar usuário">
              <input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Nome, e-mail, telefone ou código"
                className="input-suporte"
              />
            </Campo>

            <Campo label="Perfil">
              <select
                value={perfilFiltro}
                onChange={(evento) => setPerfilFiltro(evento.target.value)}
                className="input-suporte"
              >
                <option value="todos">Todos</option>
                {perfisDeAcesso.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Status">
              <select
                value={statusFiltro}
                onChange={(evento) => setStatusFiltro(evento.target.value)}
                className="input-suporte"
              >
                <option value="todos">Todos</option>
                <option value="restritos">Inativos ou bloqueados</option>
                {statusOpcoes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Acesso e inconsistências">
              <select
                value={acessoFiltro}
                onChange={(evento) => setAcessoFiltro(evento.target.value)}
                className="input-suporte"
              >
                <option value="todos">Todos</option>
                <option value="com_acesso">Com acesso Suporte/T.I.</option>
                <option value="sem_acesso">Sem acesso Suporte/T.I.</option>
                <option value="problemas">Com problema de acesso</option>
              </select>
            </Campo>
          </section>

          <section className="mt-4 overflow-hidden rounded-[24px] bg-white shadow-lg shadow-slate-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-[#f9fafb] to-white p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                  Gestão operacional
                </p>
                <h2 className="mt-1 text-xl font-black text-[#050816]">
                  {perfisFiltrados.length} usuário(s) encontrado(s)
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="rounded-xl bg-[#f3f5f8] px-4 py-2.5 text-xs font-black text-[#08163F] transition hover:bg-slate-200"
                >
                  Limpar filtros
                </button>
                <select
                  value={ordenacao}
                  onChange={(evento) => setOrdenacao(evento.target.value)}
                  aria-label="Ordenar usuários"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-[#08163F] outline-none"
                >
                  <option value="recentes">Mais recentes</option>
                  <option value="nome">Nome</option>
                  <option value="problemas">Problemas primeiro</option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {perfisFiltrados.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-lg font-black text-[#08163F]">
                    Nenhum usuário encontrado
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    Ajuste os filtros ou faça uma nova busca.
                  </p>
                </div>
              )}

              {perfisFiltrados.map((perfil) => {
                const chamados = tickets.filter(
                  (ticket) =>
                    ticket.usuario_id === perfil.id ||
                    (perfil.email &&
                      normalizar(ticket.email_usuario) ===
                        normalizar(perfil.email))
                );
                const chamadosAbertos = chamados.filter(
                  (ticket) => normalizar(ticket.status) !== "resolvido"
                ).length;
                const whatsapp = telefoneWhatsApp(perfil.telefone);

                return (
                  <div
                    key={perfil.id}
                    className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(250px,0.75fr)_190px]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-lg font-black text-[#08163F]">
                          {perfil.nome || "Usuário sem nome"}
                        </h3>
                        {perfil.id === usuario.id && (
                          <Tag destaque>Você</Tag>
                        )}
                        {temProblemaAcesso(perfil, !avisoAuth) && (
                          <Tag alerta>Requer atenção</Tag>
                        )}
                      </div>
                      <p className="mt-1 break-all text-sm font-bold text-gray-500">
                        {perfil.email || "E-mail não informado"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-gray-400">
                        {perfil.telefone || "Telefone não informado"}
                        {perfil.codigo_inscricao
                          ? ` • Código ${perfil.codigo_inscricao}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap content-start gap-2">
                      <Tag>{formatarPerfil(perfil.role)}</Tag>
                      <Tag status={normalizar(perfil.status)}>
                        {formatarStatus(perfil.status)}
                      </Tag>
                      {temAcessoTi(perfil) && <Tag ti>Suporte/T.I.</Tag>}
                      {perfil.precisa_trocar_senha && (
                        <Tag alerta>Troca de senha</Tag>
                      )}
                      {chamadosAbertos > 0 && (
                        <Tag alerta>
                          {chamadosAbertos} chamado(s) aberto(s)
                        </Tag>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <button
                        type="button"
                        onClick={() => abrirUsuario(perfil)}
                        className="rounded-xl bg-[#08163F] px-4 py-2.5 text-xs font-black text-white transition hover:brightness-110"
                      >
                        Ver usuário
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirResetSenha(perfil)}
                        className="rounded-xl bg-[#eef2ff] px-3 py-2.5 text-xs font-black text-[#12317C] transition hover:bg-[#e0e7ff]"
                      >
                        Senha
                      </button>
                      {whatsapp && (
                        <a
                          href={`https://wa.me/${whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </section>
      </section>

      {perfilSelecionado && edicao && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Fechar detalhes do usuário"
            onClick={fecharUsuario}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          />

          <aside className="absolute left-1/2 top-1/2 flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[820px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] bg-[#f3f5f8] shadow-[0_28px_90px_rgba(8,22,63,0.35)] sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]">
            <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#040B1F] via-[#071A4A] to-[#0A2A6D] p-5 text-white sm:p-6">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
                  Detalhes e acessos
                </p>
                <h2 className="mt-2 break-words text-2xl font-black">
                  {perfilSelecionado.nome || "Usuário sem nome"}
                </h2>
                <p className="mt-1 break-all text-sm font-semibold text-white/70">
                  {perfilSelecionado.email || "E-mail não informado"}
                </p>
              </div>
              <button
                type="button"
                onClick={fecharUsuario}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black text-white transition hover:bg-white/15"
              >
                Fechar
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoDetalhe
                  label="Último acesso"
                  value={formatarData(perfilSelecionado.last_sign_in_at)}
                />
                <InfoDetalhe
                  label="E-mail confirmado"
                  value={
                    perfilSelecionado.email_confirmed_at
                      ? "Sim"
                      : "Não confirmado"
                  }
                />
                <InfoDetalhe
                  label="Criado em"
                  value={formatarData(perfilSelecionado.created_at)}
                />
                <InfoDetalhe
                  label="Última atualização"
                  value={formatarData(perfilSelecionado.updated_at)}
                />
              </div>

              <div className="rounded-[22px] bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                  Ações rápidas
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copiarEmail(perfilSelecionado.email)}
                    className="rounded-xl bg-[#f3f5f8] px-4 py-2.5 text-xs font-black text-[#08163F]"
                  >
                    Copiar e-mail
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirResetSenha(perfilSelecionado)}
                    className="rounded-xl bg-[#eef2ff] px-4 py-2.5 text-xs font-black text-[#12317C]"
                  >
                    Resetar senha
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirChamados(perfilSelecionado)}
                    className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-700"
                  >
                    Ver chamados ({ticketsDoUsuario.length})
                  </button>
                  {telefoneWhatsApp(perfilSelecionado.telefone) && (
                    <a
                      href={`https://wa.me/${telefoneWhatsApp(
                        perfilSelecionado.telefone
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700"
                    >
                      Abrir WhatsApp
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-[22px] bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                  Perfil e permissões
                </p>
                <h3 className="mt-1 text-xl font-black text-[#08163F]">
                  Controle de acesso
                </h3>

                {perfilSelecionado.id === usuario.id && (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
                    Sua própria conta fica protegida. Outro usuário de suporte
                    deve alterar seu perfil, status ou acesso T.I.
                  </div>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Campo label="Perfil principal">
                    <select
                      value={edicao.role}
                      onChange={(evento) =>
                        setEdicao((atual) =>
                          atual
                            ? {
                                ...atual,
                                role: evento.target.value,
                                ...(evento.target.value === "suporte"
                                  ? { acesso_suporte: false }
                                  : {}),
                              }
                            : atual
                        )
                      }
                      disabled={perfilSelecionado.id === usuario.id}
                      className="input-suporte"
                    >
                      <option value="">Sem perfil</option>
                      {perfisDeAcesso.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Status">
                    <select
                      value={edicao.status}
                      onChange={(evento) =>
                        setEdicao((atual) =>
                          atual
                            ? { ...atual, status: evento.target.value }
                            : atual
                        )
                      }
                      disabled={perfilSelecionado.id === usuario.id}
                      className="input-suporte"
                    >
                      <option value="">Sem status</option>
                      {statusOpcoes.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </div>

                <label className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-[#f9fafb] p-4">
                  <div>
                    <p className="text-sm font-black text-[#08163F]">
                      Acesso adicional ao Suporte/T.I.
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
                      Mantém o perfil principal e libera também todas as telas
                      técnicas.
                    </p>
                    {edicao.role === "suporte" && (
                      <p className="mt-2 text-xs font-black text-[#12317C]">
                        O próprio perfil Suporte já possui esse acesso.
                      </p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={
                      edicao.role === "suporte" || edicao.acesso_suporte
                    }
                    disabled={
                      perfilSelecionado.id === usuario.id ||
                      edicao.role === "suporte"
                    }
                    onChange={(evento) =>
                      setEdicao((atual) =>
                        atual
                          ? {
                              ...atual,
                              acesso_suporte: evento.target.checked,
                            }
                          : atual
                      )
                    }
                    className="mt-1 h-6 w-6 shrink-0 accent-[#12317C]"
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void salvarAcessos()}
                    disabled={
                      perfilSelecionado.id === usuario.id ||
                      !edicaoAlterada ||
                      salvandoId === perfilSelecionado.id
                    }
                    className="rounded-2xl bg-[#08163F] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvandoId === perfilSelecionado.id
                      ? "Salvando..."
                      : "Salvar alterações"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEdicao({
                        role: normalizar(perfilSelecionado.role),
                        status: normalizar(perfilSelecionado.status),
                        acesso_suporte: Boolean(
                          perfilSelecionado.acesso_suporte
                        ),
                      })
                    }
                    disabled={!edicaoAlterada}
                    className="rounded-2xl bg-[#f3f5f8] px-5 py-3 text-sm font-black text-[#08163F] disabled:opacity-50"
                  >
                    Cancelar alterações
                  </button>
                </div>
              </div>

              {normalizar(perfilSelecionado.status) === "cancelado" &&
                perfilSelecionado.id !== usuario.id && (
                  <div className="rounded-[22px] border border-red-200 bg-red-50 p-5 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
                      Exclusão segura
                    </p>
                    <h3 className="mt-1 text-xl font-black text-red-950">
                      Excluir usuário
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-red-800">
                      Remove o login e os dados pessoais da conta. Chamados,
                      financeiro, progresso e demais registros operacionais
                      continuam preservados.
                    </p>
                    {edicaoAlterada && (
                      <p className="mt-3 text-xs font-black text-red-700">
                        Salve ou cancele as alterações pendentes para liberar a
                        exclusão.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => void excluirUsuario()}
                      disabled={
                        edicaoAlterada ||
                        excluindoId === perfilSelecionado.id
                      }
                      className="mt-4 rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-200 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {excluindoId === perfilSelecionado.id
                        ? "Excluindo..."
                        : "Excluir usuário"}
                    </button>
                  </div>
                )}

              <div className="rounded-[22px] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                      Auditoria
                    </p>
                    <h3 className="mt-1 text-xl font-black text-[#08163F]">
                      Histórico deste usuário
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/suporte/logs")}
                    className="text-xs font-black text-[#12317C]"
                  >
                    Ver tudo →
                  </button>
                </div>

                <div className="mt-4 divide-y divide-gray-100">
                  {logsDoUsuario.length === 0 && (
                    <p className="py-3 text-sm font-semibold text-gray-500">
                      Nenhuma alteração registrada para este usuário.
                    </p>
                  )}

                  {logsDoUsuario.map((log) => (
                    <div key={log.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#12317C]">
                          {log.acao.replaceAll("_", " ")}
                        </p>
                        <p className="text-xs font-bold text-gray-400">
                          {formatarData(log.created_at)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-bold leading-6 text-[#08163F]">
                        {limparDescricao(log.descricao)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-gray-400">
                        {log.suporte_nome || "Sistema CEO Club"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function CardIndicador({
  titulo,
  valor,
  descricao,
  tom,
  onClick,
}: {
  titulo: string;
  valor: number;
  descricao: string;
  tom: "azul" | "vermelho" | "amarelo" | "roxo";
  onClick: () => void;
}) {
  const cores = {
    azul: "bg-blue-500",
    vermelho: "bg-red-500",
    amarelo: "bg-amber-500",
    roxo: "bg-violet-500",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[22px] bg-white p-5 text-left shadow-lg shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
          {titulo}
        </p>
        <span className={`h-3 w-3 rounded-full ${cores[tom]}`} />
      </div>
      <p className="mt-3 text-4xl font-black text-[#08163F]">{valor}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
        {descricao}
      </p>
    </button>
  );
}

function Tag({
  children,
  destaque = false,
  alerta = false,
  ti = false,
  status,
}: {
  children: ReactNode;
  destaque?: boolean;
  alerta?: boolean;
  ti?: boolean;
  status?: string;
}) {
  let classe = "bg-[#f3f5f8] text-gray-600";

  if (destaque) classe = "bg-[#08163F] text-white";
  if (alerta) classe = "bg-red-50 text-red-700";
  if (ti) classe = "bg-violet-50 text-violet-700";
  if (status === "ativo") classe = "bg-emerald-50 text-emerald-700";
  if (
    status === "inativo" ||
    status === "bloqueado" ||
    status === "cancelado" ||
    status === "suspenso"
  ) {
    classe = "bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${classe}`}
    >
      {children}
    </span>
  );
}

function InfoDetalhe({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-[#08163F]">
        {value}
      </p>
    </div>
  );
}
