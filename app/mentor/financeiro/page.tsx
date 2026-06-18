"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/utils/supabase";
import { getUsuarioLogado, usuarioTemPermissao, User } from "@/utils/auth";
import MentoradoLoading from "@/components/MentoradoLoading";

type StatusCobranca = "Pago" | "Pendente" | "Atrasado" | "Cancelado";

type Mentorado = {
  id: string;
  nome: string;
  email: string;
  codigo_inscricao: string | null;
};

type Cobranca = {
  id: string;
  mentorado_id: string;
  titulo: string;
  descricao: string | null;
  valor_total: number;
  quantidade_parcelas: number;
  parcela_atual: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: StatusCobranca;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

type CobrancaComMentorado = Cobranca & {
  mentoradoNome: string;
  mentoradoEmail: string;
  mentoradoCodigo: string;
};

type FormularioCobranca = {
  mentorado_id: string;
  titulo: string;
  descricao: string;
  valor_total: string;
  quantidade_parcelas: string;
  parcela_atual: string;
  valor_parcela: string;
  data_vencimento: string;
  data_pagamento: string;
  forma_pagamento: string;
  status: StatusCobranca;
  observacao: string;
};

type ParcelaPreview = {
  numero: number;
  total: number;
  valor: number;
  vencimento: string;
  status: StatusCobranca;
};

const formularioInicial: FormularioCobranca = {
  mentorado_id: "",
  titulo: "",
  descricao: "",
  valor_total: "",
  quantidade_parcelas: "1",
  parcela_atual: "1",
  valor_parcela: "",
  data_vencimento: "",
  data_pagamento: "",
  forma_pagamento: "Pix",
  status: "Pendente",
  observacao: "",
};

const statusOptions: StatusCobranca[] = [
  "Pago",
  "Pendente",
  "Atrasado",
  "Cancelado",
];

const formasPagamento = ["Crédito", "Débito", "Pix", "Boleto", "Dinheiro"];

export default function FinanceiroPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"Todos" | StatusCobranca>(
    "Todos"
  );

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioCobranca>(formularioInicial);

  const [mostrarPreviewParcelas, setMostrarPreviewParcelas] = useState(false);
  const [cobrancaSelecionada, setCobrancaSelecionada] =
    useState<CobrancaComMentorado | null>(null);
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState<string[]>([]);

  useEffect(() => {
    const usuarioLogado = getUsuarioLogado();

    if (!usuarioLogado) {
      router.push("/login");
      return;
    }

    if (!usuarioTemPermissao(usuarioLogado, ["mentor", "financeiro"])) {
      router.push("/mentorado/dashboard");
      return;
    }

    setUsuario(usuarioLogado);
  }, [router]);

  useEffect(() => {
    if (!usuario) return;

    carregarDados();
  }, [usuario]);

  async function carregarDados() {
    setCarregando(true);
    setErro("");
    setSucesso("");

    const { data: mentoradosData, error: mentoradosError } = await supabase
      .from("profiles")
      .select("id, nome, email, codigo_inscricao")
      .eq("role", "mentorado")
      .order("created_at", { ascending: false });

    if (mentoradosError) {
      setErro(mentoradosError.message);
      setCarregando(false);
      return;
    }

    const { data: cobrancasData, error: cobrancasError } = await supabase
      .from("financeiro_cobrancas")
      .select(
        "id, mentorado_id, titulo, descricao, valor_total, quantidade_parcelas, parcela_atual, valor_parcela, data_vencimento, data_pagamento, forma_pagamento, status, observacao, created_at, updated_at"
      )
      .order("data_vencimento", { ascending: true });

    if (cobrancasError) {
      setErro(cobrancasError.message);
      setCarregando(false);
      return;
    }

    setMentorados((mentoradosData ?? []) as Mentorado[]);
    setCobrancas((cobrancasData ?? []) as Cobranca[]);
    setCarregando(false);
  }

  const mentoradoSelecionado = useMemo(() => {
    return mentorados.find((item) => item.id === formulario.mentorado_id) ?? null;
  }, [mentorados, formulario.mentorado_id]);

  const cobrancasComMentorado = useMemo<CobrancaComMentorado[]>(() => {
    return cobrancas.map((cobranca) => {
      const mentorado = mentorados.find(
        (item) => item.id === cobranca.mentorado_id
      );

      return {
        ...cobranca,
        mentoradoNome: mentorado?.nome ?? "Mentorado não encontrado",
        mentoradoEmail: mentorado?.email ?? "",
        mentoradoCodigo: mentorado?.codigo_inscricao ?? "",
      };
    });
  }, [cobrancas, mentorados]);

  const cobrancasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return cobrancasComMentorado.filter((cobranca) => {
      const textoBusca = normalizarTexto(
        [
          cobranca.mentoradoNome,
          cobranca.mentoradoEmail,
          cobranca.mentoradoCodigo,
          cobranca.titulo,
          cobranca.status,
          cobranca.forma_pagamento,
        ].join(" ")
      );

      const bateBusca = !termo || textoBusca.includes(termo);
      const bateStatus =
        filtroStatus === "Todos" || cobranca.status === filtroStatus;

      return bateBusca && bateStatus;
    });
  }, [cobrancasComMentorado, busca, filtroStatus]);

  const todasFiltradasSelecionadas = useMemo(() => {
    if (cobrancasFiltradas.length === 0) return false;

    return cobrancasFiltradas.every((item) =>
      parcelasSelecionadas.includes(item.id)
    );
  }, [cobrancasFiltradas, parcelasSelecionadas]);

  const resumoSelecionado = useMemo(() => {
    const selecionadas = cobrancasComMentorado.filter((item) =>
      parcelasSelecionadas.includes(item.id)
    );

    return {
      quantidade: selecionadas.length,
      valor: selecionadas.reduce(
        (acc, item) => acc + Number(item.valor_parcela || 0),
        0
      ),
    };
  }, [cobrancasComMentorado, parcelasSelecionadas]);

  const resumo = useMemo(() => {
    const totalPrevisto = cobrancas.reduce(
      (acc, item) => acc + Number(item.valor_parcela || 0),
      0
    );

    const recebido = cobrancas
      .filter((item) => item.status === "Pago")
      .filter((item) =>
        estaNoMesAtual(item.data_pagamento || item.data_vencimento)
      )
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const aberto = cobrancas
      .filter((item) => item.status === "Pendente" || item.status === "Atrasado")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const atrasado = cobrancas
      .filter((item) => item.status === "Atrasado")
      .reduce((acc, item) => acc + Number(item.valor_parcela || 0), 0);

    const vencendoHoje = cobrancas.filter((item) => {
      const hoje = formatarDataISO(new Date());
      return item.data_vencimento === hoje && item.status === "Pendente";
    }).length;

    return {
      totalPrevisto,
      recebido,
      aberto,
      atrasado,
      vencendoHoje,
      quantidadeAtrasada: cobrancas.filter((item) => item.status === "Atrasado")
        .length,
      quantidadeTotal: cobrancas.length,
    };
  }, [cobrancas]);

  const previewParcelas = useMemo<ParcelaPreview[]>(() => {
    const valorTotal = moedaInputParaNumero(formulario.valor_total);
    const quantidadeParcelas = Number(formulario.quantidade_parcelas);
    const valorParcelaManual = moedaInputParaNumero(formulario.valor_parcela);

    if (
      !formulario.data_vencimento ||
      valorTotal <= 0 ||
      quantidadeParcelas <= 0
    ) {
      return [];
    }

    const valorParcela =
      valorParcelaManual > 0
        ? valorParcelaManual
        : Number((valorTotal / quantidadeParcelas).toFixed(2));

    const vencimentoBase = new Date(`${formulario.data_vencimento}T12:00:00`);

    return Array.from({ length: quantidadeParcelas }, (_, index) => {
      const dataVencimento = new Date(vencimentoBase);
      dataVencimento.setMonth(vencimentoBase.getMonth() + index);

      return {
        numero: index + 1,
        total: quantidadeParcelas,
        valor: valorParcela,
        vencimento: formatarDataISO(dataVencimento),
        status: index === 0 ? formulario.status : "Pendente",
      };
    });
  }, [
    formulario.valor_total,
    formulario.valor_parcela,
    formulario.quantidade_parcelas,
    formulario.data_vencimento,
    formulario.status,
  ]);

  function limparFormulario() {
    setFormulario(formularioInicial);
    setEditandoId(null);
    setMostrarPreviewParcelas(false);
    setErro("");
    setSucesso("");
  }

  function abrirNovoLancamento() {
    limparFormulario();
    setMostrarFormulario(true);
  }

  function fecharFormulario() {
    limparFormulario();
    setMostrarFormulario(false);
  }

  function editarCobranca(cobranca: CobrancaComMentorado) {
    setFormulario({
      mentorado_id: cobranca.mentorado_id,
      titulo: cobranca.titulo,
      descricao: cobranca.descricao ?? "",
      valor_total: numeroParaMoedaInput(cobranca.valor_total),
      quantidade_parcelas: String(cobranca.quantidade_parcelas),
      parcela_atual: String(cobranca.parcela_atual),
      valor_parcela: numeroParaMoedaInput(cobranca.valor_parcela),
      data_vencimento: cobranca.data_vencimento,
      data_pagamento: cobranca.data_pagamento ?? "",
      forma_pagamento: cobranca.forma_pagamento ?? "Pix",
      status: cobranca.status,
      observacao: cobranca.observacao ?? "",
    });

    setEditandoId(cobranca.id);
    setCobrancaSelecionada(null);
    setMostrarPreviewParcelas(false);
    setMostrarFormulario(true);
    setErro("");
    setSucesso("");
  }

  function gerarPreviewParcelas() {
    setErro("");
    setSucesso("");

    const valorTotal = moedaInputParaNumero(formulario.valor_total);
    const quantidadeParcelas = Number(formulario.quantidade_parcelas);

    if (
      !formulario.mentorado_id ||
      !formulario.titulo.trim() ||
      !formulario.data_vencimento ||
      valorTotal <= 0 ||
      quantidadeParcelas <= 0
    ) {
      setErro(
        "Preencha mentorado, título, valor total, quantidade de parcelas e vencimento para visualizar as parcelas."
      );
      return;
    }

    setMostrarPreviewParcelas(true);
  }

  function atualizarCampoFormulario(
    campo: keyof FormularioCobranca,
    valor: string
  ) {
    const valorFinal =
      campo === "valor_total" || campo === "valor_parcela"
        ? formatarMoedaInput(valor)
        : valor;

    setFormulario((estadoAtual) => ({
      ...estadoAtual,
      [campo]: valorFinal,
    }));

    if (
      campo === "valor_total" ||
      campo === "valor_parcela" ||
      campo === "quantidade_parcelas" ||
      campo === "data_vencimento" ||
      campo === "status"
    ) {
      setMostrarPreviewParcelas(false);
    }

    setErro("");
    setSucesso("");
  }

  async function salvarCobranca(e: FormEvent) {
    e.preventDefault();

    setErro("");
    setSucesso("");

    const valorTotal = moedaInputParaNumero(formulario.valor_total);
    const quantidadeParcelas = Number(formulario.quantidade_parcelas);
    const parcelaAtual = Number(formulario.parcela_atual);
    const valorParcelaManual = moedaInputParaNumero(formulario.valor_parcela);

    if (
      !formulario.mentorado_id ||
      !formulario.titulo.trim() ||
      !formulario.data_vencimento ||
      valorTotal <= 0 ||
      quantidadeParcelas <= 0 ||
      parcelaAtual <= 0
    ) {
      setErro(
        "Preencha mentorado, título, valor total, quantidade de parcelas e vencimento."
      );
      return;
    }

    if (parcelaAtual > quantidadeParcelas) {
      setErro("A parcela atual não pode ser maior que o total de parcelas.");
      return;
    }

    try {
      setSalvando(true);

      if (editandoId) {
        if (valorParcelaManual <= 0) {
          setErro("Informe o valor da parcela.");
          setSalvando(false);
          return;
        }

        const payload = {
          mentorado_id: formulario.mentorado_id,
          titulo: formulario.titulo.trim(),
          descricao: textoOuVazio(formulario.descricao),
          valor_total: valorTotal,
          quantidade_parcelas: quantidadeParcelas,
          parcela_atual: parcelaAtual,
          valor_parcela: valorParcelaManual,
          data_vencimento: formulario.data_vencimento,
          data_pagamento:
            formulario.status === "Pago"
              ? formulario.data_pagamento || formatarDataISO(new Date())
              : formulario.data_pagamento || null,
          forma_pagamento: formulario.forma_pagamento || null,
          status: formulario.status,
          observacao: textoOuNull(formulario.observacao),
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("financeiro_cobrancas")
          .update(payload)
          .eq("id", editandoId);

        if (error) {
          throw new Error(formatarErroSupabase(error));
        }

        setSucesso("Lançamento atualizado com sucesso.");
      } else {
        const valorParcela =
          valorParcelaManual > 0
            ? valorParcelaManual
            : Number((valorTotal / quantidadeParcelas).toFixed(2));

        const vencimentoBase = new Date(
          `${formulario.data_vencimento}T12:00:00`
        );

        const parcelas = Array.from(
          { length: quantidadeParcelas },
          (_, index) => {
            const dataVencimento = new Date(vencimentoBase);
            dataVencimento.setMonth(vencimentoBase.getMonth() + index);

            const statusParcela: StatusCobranca =
              index === 0 ? formulario.status : "Pendente";

            return {
              mentorado_id: formulario.mentorado_id,
              titulo: formulario.titulo.trim(),
              descricao: textoOuVazio(formulario.descricao),
              valor_total: valorTotal,
              quantidade_parcelas: quantidadeParcelas,
              parcela_atual: index + 1,
              valor_parcela: valorParcela,
              data_vencimento: formatarDataISO(dataVencimento),
              data_pagamento:
                statusParcela === "Pago" ? formatarDataISO(new Date()) : null,
              forma_pagamento: formulario.forma_pagamento || null,
              status: statusParcela,
              observacao: textoOuNull(formulario.observacao),
              updated_at: new Date().toISOString(),
            };
          }
        );

        const { error } = await supabase
          .from("financeiro_cobrancas")
          .insert(parcelas);

        if (error) {
          throw new Error(formatarErroSupabase(error));
        }

        setSucesso(
          quantidadeParcelas > 1
            ? "Parcelas criadas com sucesso."
            : "Lançamento criado com sucesso."
        );
      }

      await carregarDados();
      fecharFormulario();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o lançamento."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarStatus(id: string, status: StatusCobranca) {
    try {
      setErro("");
      setSucesso("");

      const payload = {
        status,
        data_pagamento: status === "Pago" ? formatarDataISO(new Date()) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("financeiro_cobrancas")
        .update(payload)
        .eq("id", id);

      if (error) throw new Error(formatarErroSupabase(error));

      await carregarDados();
      setCobrancaSelecionada(null);
      setSucesso(`Lançamento marcado como ${status.toLowerCase()}.`);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o status."
      );
    }
  }

  function alternarSelecaoParcela(id: string) {
    setParcelasSelecionadas((selecionadasAtuais) =>
      selecionadasAtuais.includes(id)
        ? selecionadasAtuais.filter((item) => item !== id)
        : [...selecionadasAtuais, id]
    );
  }

  function alternarSelecaoTodasFiltradas() {
    if (todasFiltradasSelecionadas) {
      setParcelasSelecionadas((selecionadasAtuais) =>
        selecionadasAtuais.filter(
          (id) => !cobrancasFiltradas.some((item) => item.id === id)
        )
      );
      return;
    }

    setParcelasSelecionadas((selecionadasAtuais) => {
      const idsFiltrados = cobrancasFiltradas.map((item) => item.id);
      return Array.from(new Set([...selecionadasAtuais, ...idsFiltrados]));
    });
  }

  function limparSelecaoParcelas() {
    setParcelasSelecionadas([]);
  }

  async function excluirParcelasSelecionadas() {
    if (parcelasSelecionadas.length === 0) {
      setErro("Selecione pelo menos uma parcela para excluir.");
      return;
    }

    const confirmar = window.confirm(
      `Deseja excluir ${parcelasSelecionadas.length} parcela(s) selecionada(s)?`
    );

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      const { error } = await supabase
        .from("financeiro_cobrancas")
        .delete()
        .in("id", parcelasSelecionadas);

      if (error) throw new Error(formatarErroSupabase(error));

      setParcelasSelecionadas([]);
      setCobrancaSelecionada(null);
      await carregarDados();
      setSucesso("Parcelas selecionadas excluídas com sucesso.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir as parcelas selecionadas."
      );
    }
  }

  async function excluirCobranca(id: string) {
    const confirmar = window.confirm("Deseja excluir este lançamento?");

    if (!confirmar) return;

    try {
      setErro("");
      setSucesso("");

      const { error } = await supabase
        .from("financeiro_cobrancas")
        .delete()
        .eq("id", id);

      if (error) throw new Error(formatarErroSupabase(error));

      setParcelasSelecionadas((selecionadasAtuais) =>
        selecionadasAtuais.filter((item) => item !== id)
      );
      await carregarDados();
      setCobrancaSelecionada(null);
      setSucesso("Lançamento excluído com sucesso.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o lançamento."
      );
    }
  }

  if (!usuario || carregando) {
    return <MentoradoLoading mensagem="Carregando financeiro..." />;
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-[#f3f5f8] text-[#08163F]">
      <Sidebar
        nome={usuario.nome}
        role={usuario.role}
        acessoSuporte={Boolean(
          (usuario as User & { acesso_suporte?: boolean }).acesso_suporte
        )}
      />

      <section className="relative min-w-0 flex-1 overflow-x-hidden p-4 sm:p-5 lg:p-6">
        <div className="pointer-events-none absolute right-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-[#12317C]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-140px] left-[18%] h-[320px] w-[320px] rounded-full bg-[#07122F]/10 blur-3xl" />

        <div className="relative z-10 mx-auto w-full max-w-[1440px]">
          <section className="mb-4 min-w-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-4 text-white shadow-[0_18px_45px_rgba(8,22,63,0.16)] sm:p-5 lg:rounded-[26px] lg:p-6">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#C9CED6] sm:text-xs">
                  Financeiro CEO Club
                </p>

                <h1 className="max-w-4xl break-words text-xl font-black leading-tight sm:text-2xl lg:text-3xl">
                  Gestão financeira da mentoria
                </h1>

                <p className="mt-2 max-w-2xl break-words text-sm font-medium leading-6 text-[#D9DEE7]">
                  Cadastre cobranças, acompanhe parcelas e organize os
                  vencimentos de cada mentorado em um só painel.
                </p>
              </div>

              <button
                onClick={abrirNovoLancamento}
                className="rounded-2xl px-5 py-3 text-sm font-black text-[#08163F] shadow-[0_10px_24px_rgba(191,195,201,0.30)] transition hover:brightness-105"
                style={{
                  background:
                    "linear-gradient(180deg, #F3F4F6 0%, #D1D5DB 55%, #9CA3AF 100%)",
                }}
              >
                Novo lançamento
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MiniInfo
                titulo="Lançamentos"
                valor={String(resumo.quantidadeTotal)}
              />
              <MiniInfo
                titulo="Vencendo hoje"
                valor={String(resumo.vencendoHoje)}
              />
              <MiniInfo
                titulo="Com atraso"
                valor={String(resumo.quantidadeAtrasada)}
              />
            </div>
          </section>

          <section className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResumoCard
              titulo="Total previsto"
              valor={formatarMoeda(resumo.totalPrevisto)}
              destaque
            />

            <ResumoCard
              titulo="Recebido no mês"
              valor={formatarMoeda(resumo.recebido)}
            />

            <ResumoCard titulo="Em aberto" valor={formatarMoeda(resumo.aberto)} />

            <ResumoCard
              titulo="Atrasado"
              valor={formatarMoeda(resumo.atrasado)}
              alerta={resumo.quantidadeAtrasada > 0}
            />
          </section>

          <section className="mb-4 min-w-0 rounded-[20px] border border-white/50 bg-white/85 p-4 shadow-[0_14px_35px_rgba(15,23,42,0.07)] backdrop-blur-sm sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(200px,0.7fr)]">
              <input
                type="text"
                placeholder="Buscar por mentorado, e-mail, inscrição, cobrança ou status"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#08163F] outline-none placeholder:text-slate-400 focus:border-[#12317C]"
              />

              <select
                value={filtroStatus}
                onChange={(e) =>
                  setFiltroStatus(e.target.value as "Todos" | StatusCobranca)
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#08163F] outline-none focus:border-[#12317C]"
              >
                <option value="Todos">Todos os status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {erro && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              {sucesso}
            </div>
          )}

          {mostrarFormulario && (
            <form
              onSubmit={salvarCobranca}
              className="mb-4 min-w-0 rounded-[20px] border border-white/50 bg-white/90 p-4 shadow-[0_14px_35px_rgba(15,23,42,0.07)] backdrop-blur-sm sm:p-5"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    {editandoId ? "Editar lançamento" : "Novo lançamento"}
                  </p>

                  <h2 className="mt-1 break-words text-xl font-black text-[#08163F] sm:text-2xl">
                    Dados da cobrança
                  </h2>

                  <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-slate-500">
                    Informe o mentorado, valor, vencimento e forma de pagamento.
                    Para cobranças parceladas, o sistema cria uma linha para
                    cada parcela.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharFormulario}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-[#08163F] transition hover:bg-slate-200"
                >
                  Fechar
                </button>
              </div>

              {mentoradoSelecionado && (
                <div className="mb-4 min-w-0 rounded-[18px] border border-slate-200 bg-[#f9fafb] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Mentorado selecionado
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <InfoInline
                      label="Nome"
                      value={mentoradoSelecionado.nome}
                    />
                    <InfoInline
                      label="Código"
                      value={mentoradoSelecionado.codigo_inscricao || "—"}
                    />
                    <InfoInline
                      label="E-mail"
                      value={mentoradoSelecionado.email}
                    />
                  </div>
                </div>
              )}

              <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:gap-4">
                <CampoFinanceiro
                  label="Mentorado"
                  ajuda="Escolha o perfil que receberá esta cobrança."
                >
                  <select
                    value={formulario.mentorado_id}
                    onChange={(e) =>
                      atualizarCampoFormulario("mentorado_id", e.target.value)
                    }
                    className="input-financeiro"
                  >
                    <option value="">Selecione o mentorado</option>

                    {mentorados.map((mentorado) => (
                      <option key={mentorado.id} value={mentorado.id}>
                        {mentorado.codigo_inscricao ?? "—"} · {mentorado.nome} ·{" "}
                        {mentorado.email}
                      </option>
                    ))}
                  </select>
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Título da cobrança"
                  ajuda="Nome do lançamento, como mensalidade, parcela ou pacote."
                >
                  <input
                    type="text"
                    placeholder="Ex: Mensalidade CEO Club"
                    value={formulario.titulo}
                    onChange={(e) =>
                      atualizarCampoFormulario("titulo", e.target.value)
                    }
                    className="input-financeiro"
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Valor total"
                  ajuda="Valor completo do acordo. Em parcelas, pode ser dividido automaticamente."
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 12.000,00"
                    value={formulario.valor_total}
                    onChange={(e) =>
                      atualizarCampoFormulario("valor_total", e.target.value)
                    }
                    className="input-financeiro"
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Valor da parcela"
                  ajuda="Pode preencher manualmente. Se deixar vazio, será calculado pelo total dividido pelas parcelas."
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 1.000,00"
                    value={formulario.valor_parcela}
                    onChange={(e) =>
                      atualizarCampoFormulario("valor_parcela", e.target.value)
                    }
                    className="input-financeiro"
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Quantidade de parcelas"
                  ajuda={
                    editandoId
                      ? "Na edição, mantenha o total original para evitar desalinhamento."
                      : "Total de parcelas que serão geradas."
                  }
                >
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 12"
                    value={formulario.quantidade_parcelas}
                    onChange={(e) =>
                      atualizarCampoFormulario(
                        "quantidade_parcelas",
                        e.target.value
                      )
                    }
                    disabled={Boolean(editandoId)}
                    className={`input-financeiro ${
                      editandoId
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : ""
                    }`}
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Parcela atual"
                  ajuda="Número da parcela deste lançamento."
                >
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 1"
                    value={formulario.parcela_atual}
                    onChange={(e) =>
                      atualizarCampoFormulario("parcela_atual", e.target.value)
                    }
                    disabled={!editandoId}
                    className={`input-financeiro ${
                      !editandoId
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : ""
                    }`}
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Data de vencimento"
                  ajuda="Dia limite para pagamento."
                >
                  <input
                    type="date"
                    value={formulario.data_vencimento}
                    onChange={(e) =>
                      atualizarCampoFormulario(
                        "data_vencimento",
                        e.target.value
                      )
                    }
                    className="input-financeiro"
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Data de pagamento"
                  ajuda="Use somente quando o pagamento já tiver sido realizado."
                >
                  <input
                    type="date"
                    value={formulario.data_pagamento}
                    onChange={(e) =>
                      atualizarCampoFormulario(
                        "data_pagamento",
                        e.target.value
                      )
                    }
                    className="input-financeiro"
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Status"
                  ajuda="Situação atual da cobrança."
                >
                  <select
                    value={formulario.status}
                    onChange={(e) =>
                      atualizarCampoFormulario(
                        "status",
                        e.target.value as StatusCobranca
                      )
                    }
                    className="input-financeiro"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Forma de pagamento"
                  ajuda="Método combinado para o pagamento."
                >
                  <select
                    value={formulario.forma_pagamento}
                    onChange={(e) =>
                      atualizarCampoFormulario(
                        "forma_pagamento",
                        e.target.value
                      )
                    }
                    className="input-financeiro"
                  >
                    {formasPagamento.map((forma) => (
                      <option key={forma} value={forma}>
                        {forma}
                      </option>
                    ))}
                  </select>
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Descrição opcional"
                  ajuda="Pode deixar em branco. Use só se quiser detalhar a cobrança."
                >
                  <textarea
                    placeholder="Ex: Parcela referente à mentoria anual CEO Club."
                    value={formulario.descricao}
                    onChange={(e) =>
                      atualizarCampoFormulario("descricao", e.target.value)
                    }
                    className="input-financeiro min-h-[88px]"
                  />
                </CampoFinanceiro>

                <CampoFinanceiro
                  label="Observações internas"
                  ajuda="Use para acordos, descontos, comprovantes ou ajustes."
                >
                  <textarea
                    placeholder="Ex: Desconto combinado, aguardando comprovante..."
                    value={formulario.observacao}
                    onChange={(e) =>
                      atualizarCampoFormulario("observacao", e.target.value)
                    }
                    className="input-financeiro min-h-[88px]"
                  />
                </CampoFinanceiro>
              </div>

              {!editandoId && (
                <div className="mt-5 rounded-[20px] border border-slate-200 bg-[#f9fafb] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                        Prévia das parcelas
                      </p>

                      <h3 className="mt-1 break-words text-lg font-black text-[#08163F]">
                        Confira antes de salvar
                      </h3>

                      <p className="mt-2 max-w-2xl break-words text-sm font-semibold leading-6 text-slate-500">
                        A prévia mostra cada parcela, valor e vencimento.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={gerarPreviewParcelas}
                      className="rounded-xl bg-[#08163F] px-4 py-2.5 text-sm font-black text-white transition hover:brightness-110"
                    >
                      Gerar prévia
                    </button>
                  </div>

                  {mostrarPreviewParcelas && previewParcelas.length > 0 && (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="grid grid-cols-[0.5fr_1fr_1fr_0.8fr] bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C] p-3 text-xs font-black uppercase tracking-[0.12em] text-white">
                        <span>Parcela</span>
                        <span>Vencimento</span>
                        <span>Valor</span>
                        <span>Status</span>
                      </div>

                      <div className="max-h-[260px] divide-y divide-slate-100 overflow-y-auto">
                        {previewParcelas.map((parcela) => (
                          <div
                            key={`${parcela.numero}-${parcela.vencimento}`}
                            className="grid grid-cols-[0.5fr_1fr_1fr_0.8fr] items-center p-3 text-sm"
                          >
                            <span className="font-black text-[#08163F]">
                              {parcela.numero}/{parcela.total}
                            </span>

                            <span className="font-semibold text-slate-600">
                              {formatarData(parcela.vencimento)}
                            </span>

                            <span className="font-black text-[#08163F]">
                              {formatarMoeda(parcela.valor)}
                            </span>

                            <span>
                              <StatusBadge status={parcela.status} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-[#08163F] px-4 py-2.5 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvando
                    ? "Salvando..."
                    : editandoId
                    ? "Salvar alterações"
                    : "Salvar lançamento"}
                </button>

                <button
                  type="button"
                  onClick={limparFormulario}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-[#0B1D59] transition hover:bg-slate-50"
                >
                  Limpar
                </button>
              </div>
            </form>
          )}

          <section className="min-w-0 overflow-x-auto rounded-[20px] border border-white/50 bg-white/85 shadow-xl shadow-slate-200/70 backdrop-blur-sm sm:rounded-[24px]">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white/90 p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Seleção de parcelas
                </p>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  {resumoSelecionado.quantidade > 0
                    ? `${resumoSelecionado.quantidade} parcela(s) selecionada(s) · ${formatarMoeda(resumoSelecionado.valor)}`
                    : "Marque uma ou mais parcelas para excluir em lote."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={alternarSelecaoTodasFiltradas}
                  disabled={cobrancasFiltradas.length === 0}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-black text-[#08163F] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  {todasFiltradasSelecionadas
                    ? "Desmarcar filtradas"
                    : "Selecionar filtradas"}
                </button>

                <button
                  type="button"
                  onClick={limparSelecaoParcelas}
                  disabled={parcelasSelecionadas.length === 0}
                  className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  Limpar seleção
                </button>

                <button
                  type="button"
                  onClick={excluirParcelasSelecionadas}
                  disabled={parcelasSelecionadas.length === 0}
                  className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  Excluir selecionadas
                </button>
              </div>
            </div>

            <div className="grid min-w-[1080px] grid-cols-[0.35fr_1.2fr_1fr_0.6fr_0.6fr_0.7fr_0.6fr_0.7fr] bg-gradient-to-r from-[#07122F] via-[#0A1E55] to-[#12317C] p-3 text-sm font-semibold text-white">
              <span className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={todasFiltradasSelecionadas}
                  onChange={alternarSelecaoTodasFiltradas}
                  disabled={cobrancasFiltradas.length === 0}
                  className="h-4 w-4 cursor-pointer accent-[#D1D5DB] disabled:cursor-not-allowed"
                  aria-label="Selecionar todas as parcelas filtradas"
                />
              </span>
              <span>Mentorado</span>
              <span>Cobrança</span>
              <span>Parcela</span>
              <span>Valor</span>
              <span>Vencimento</span>
              <span>Status</span>
              <span>Ações</span>
            </div>

            {cobrancasFiltradas.length === 0 ? (
              <div className="p-10 text-center text-sm font-semibold text-slate-500">
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cobrancasFiltradas.map((item) => (
                  <div
                    key={item.id}
                    className={`grid min-w-[1080px] grid-cols-[0.35fr_1.2fr_1fr_0.6fr_0.6fr_0.7fr_0.6fr_0.7fr] items-center p-3 text-left text-xs transition sm:text-sm ${
                      parcelasSelecionadas.includes(item.id)
                        ? "bg-blue-50/60"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={parcelasSelecionadas.includes(item.id)}
                        onChange={() => alternarSelecaoParcela(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 cursor-pointer accent-[#08163F]"
                        aria-label={`Selecionar parcela ${item.parcela_atual}/${item.quantidade_parcelas} de ${item.mentoradoNome}`}
                      />
                    </span>

                    <button
                      type="button"
                      onClick={() => setCobrancaSelecionada(item)}
                      className="min-w-0 text-left"
                    >
                      <strong className="block truncate">{item.mentoradoNome}</strong>
                      <small className="block truncate text-xs text-slate-400">
                        {item.mentoradoCodigo || "—"} · {item.mentoradoEmail}
                      </small>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCobrancaSelecionada(item)}
                      className="min-w-0 truncate text-left font-semibold text-slate-700"
                    >
                      {item.titulo}
                    </button>

                    <span className="font-bold text-slate-600">
                      {item.parcela_atual}/{item.quantidade_parcelas}
                    </span>

                    <span className="font-black text-[#08163F]">
                      {formatarMoeda(Number(item.valor_parcela))}
                    </span>

                    <span className="font-semibold text-slate-600">
                      {formatarData(item.data_vencimento)}
                    </span>

                    <span>
                      <StatusBadge status={item.status} />
                    </span>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => atualizarStatus(item.id, "Pago")}
                        className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Pago
                      </button>

                      <button
                        type="button"
                        onClick={() => setCobrancaSelecionada(item)}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      {cobrancaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[min(96vw,48rem)] overflow-hidden rounded-[24px] bg-white shadow-2xl sm:rounded-[30px]">
            <div className="bg-gradient-to-br from-[#07122F] via-[#0A1E55] to-[#12317C] p-5 text-white sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-200">
                    Detalhes do lançamento
                  </p>

                  <h2 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">
                    {cobrancaSelecionada.titulo}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-blue-100">
                    Código {cobrancaSelecionada.mentoradoCodigo || "—"} ·{" "}
                    {cobrancaSelecionada.mentoradoNome}
                  </p>
                </div>

                <button
                  onClick={() => setCobrancaSelecionada(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>

              <div className="mt-5">
                <StatusBadge status={cobrancaSelecionada.status} />
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:p-6 md:grid-cols-2">
              <InfoBox
                label="Código do mentorado"
                value={cobrancaSelecionada.mentoradoCodigo || "—"}
              />

              <InfoBox
                label="E-mail"
                value={cobrancaSelecionada.mentoradoEmail || "—"}
              />

              <InfoBox
                label="Valor da parcela"
                value={formatarMoeda(Number(cobrancaSelecionada.valor_parcela))}
              />

              <InfoBox
                label="Valor total"
                value={formatarMoeda(Number(cobrancaSelecionada.valor_total))}
              />

              <InfoBox
                label="Parcela"
                value={`${cobrancaSelecionada.parcela_atual}/${cobrancaSelecionada.quantidade_parcelas}`}
              />

              <InfoBox
                label="Vencimento"
                value={formatarData(cobrancaSelecionada.data_vencimento)}
              />

              <InfoBox
                label="Pagamento"
                value={
                  cobrancaSelecionada.data_pagamento
                    ? formatarData(cobrancaSelecionada.data_pagamento)
                    : "—"
                }
              />

              <InfoBox
                label="Forma de pagamento"
                value={cobrancaSelecionada.forma_pagamento || "—"}
              />

              <div className="rounded-2xl bg-[#f9fafb] p-5 md:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Descrição e observações
                </p>

                <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                  {cobrancaSelecionada.observacao ||
                    cobrancaSelecionada.descricao ||
                    "Nenhuma informação adicional adicionada."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  onClick={() => editarCobranca(cobrancaSelecionada)}
                  className="rounded-xl bg-[#08163F] px-4 py-2.5 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                >
                  Editar
                </button>

                <button
                  onClick={() => atualizarStatus(cobrancaSelecionada.id, "Pago")}
                  className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                >
                  Marcar como pago
                </button>

                <button
                  onClick={() =>
                    atualizarStatus(cobrancaSelecionada.id, "Pendente")
                  }
                  className="rounded-xl bg-yellow-50 px-4 py-2.5 text-sm font-black text-yellow-700 transition hover:bg-yellow-100"
                >
                  Marcar pendente
                </button>

                <button
                  onClick={() =>
                    atualizarStatus(cobrancaSelecionada.id, "Atrasado")
                  }
                  className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-100"
                >
                  Marcar atraso
                </button>

                <button
                  onClick={() =>
                    atualizarStatus(cobrancaSelecionada.id, "Cancelado")
                  }
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  onClick={() => excluirCobranca(cobrancaSelecionada.id)}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:brightness-110"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-financeiro {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          background: white;
          padding: 0.68rem 0.9rem;
          color: #08163f;
          font-weight: 700;
          font-size: 0.875rem;
          outline: none;
          transition: 0.2s ease;
        }

        .input-financeiro::placeholder {
          color: #94a3b8;
        }

        .input-financeiro:focus {
          border-color: #12317c;
          box-shadow: 0 0 0 4px rgba(18, 49, 124, 0.1);
        }
      `}</style>
    </main>
  );
}

function CampoFinanceiro({
  label,
  ajuda,
  children,
}: {
  label: string;
  ajuda: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="break-words text-sm font-black text-[#08163F]">{label}</span>

      <p className="mt-1 min-h-[32px] break-words text-xs font-semibold leading-5 text-slate-500">
        {ajuda}
      </p>

      <div className="mt-2">{children}</div>
    </label>
  );
}

function ResumoCard({
  titulo,
  valor,
  destaque,
  alerta,
}: {
  titulo: string;
  valor: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-[20px] border border-white/50 p-4 shadow-[0_14px_35px_rgba(15,23,42,0.07)] backdrop-blur-sm sm:p-5 ${
        destaque
          ? "bg-[#071A55] text-white"
          : alerta
          ? "bg-red-50 text-red-700"
          : "bg-white/85 text-[#08163F]"
      }`}
    >
      <h2
        className={`break-words text-xs font-black sm:text-sm ${
          destaque ? "text-blue-100" : alerta ? "text-red-600" : "text-slate-500"
        }`}
      >
        {titulo}
      </h2>

      <p className="mt-3 break-words text-xl font-black leading-tight sm:text-2xl lg:text-3xl">{valor}</p>
    </div>
  );
}

function MiniInfo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
        {titulo}
      </p>
      <p className="mt-2 break-words text-lg font-black text-white sm:text-xl">{valor}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    Pago: "bg-emerald-100 text-emerald-700",
    Pendente: "bg-yellow-100 text-yellow-700",
    Atrasado: "bg-red-100 text-red-700",
    Cancelado: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-black ${
        estilos[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#f9fafb] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-base font-black text-[#08163F]">
        {value}
      </p>
    </div>
  );
}

function InfoInline({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-[#08163F]">
        {value}
      </p>
    </div>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function formatarData(data: string) {
  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) return "—";

  return `${dia}/${mes}/${ano}`;
}

function formatarMoedaInput(valor: string) {
  const apenasNumeros = valor.replace(/\D/g, "");

  if (!apenasNumeros) return "";

  const numero = Number(apenasNumeros) / 100;

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
}

function moedaInputParaNumero(valor: string) {
  if (!valor) return 0;

  const numeroNormalizado = valor.replace(/\./g, "").replace(",", ".");

  return Number(numeroNormalizado) || 0;
}

function numeroParaMoedaInput(valor: number | string | null | undefined) {
  const numero = Number(valor || 0);

  if (!numero) return "";

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
}

function formatarDataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}


function estaNoMesAtual(data: string | null | undefined) {
  if (!data) return false;

  const hoje = new Date();
  const dataComparada = new Date(`${data}T12:00:00`);

  return (
    dataComparada.getFullYear() === hoje.getFullYear() &&
    dataComparada.getMonth() === hoje.getMonth()
  );
}

function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function textoOuNull(texto: string) {
  const valor = texto.trim();
  return valor ? valor : null;
}

function textoOuVazio(texto: string) {
  return texto.trim();
}

function formatarErroSupabase(error: {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}) {
  return [error.message, error.details, error.hint, error.code]
    .filter(Boolean)
    .join(" | ");
}